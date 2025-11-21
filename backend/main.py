from fastapi import FastAPI, HTTPException, Depends, status
from pydantic import BaseModel
from kubernetes import client, config
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
import os
import random
import re

# --- CONFIGURATIE ---
SECRET_KEY = "super-secret-key-change-this-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Database Setup (SQLite)
SQLALCHEMY_DATABASE_URL = "sqlite:///./users.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# K8s Config
try:
    config.load_incluster_config()
except config.ConfigException:
    try:
        config.load_kube_config()
    except config.ConfigException:
        print("Warning: Could not load kubernetes config")

v1 = client.CoreV1Api()
apps_v1 = client.AppsV1Api()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False, # Zet op False om CORS problemen met wildcard * te voorkomen
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- DATABASE MODELS ---
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    company_name = Column(String)

Base.metadata.create_all(bind=engine)

# --- SECURITY ---
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception
    return user

# --- API MODELS ---
class UserCreate(BaseModel):
    username: str
    password: str
    company_name: str

class PodCreate(BaseModel):
    service_type: str # nginx, postgres, redis

class PodInfo(BaseModel):
    name: str
    status: str
    cost: float
    type: str
    age: str

# --- ENDPOINTS ---

def get_namespace_name(company_name: str) -> str:
    # Maak de naam Kubernetes-proof: lowercase, vervang spaties, verwijder vreemde tekens
    clean_name = company_name.lower().replace(" ", "-")
    clean_name = re.sub(r'[^a-z0-9\-]', '', clean_name)
    return f"org-{clean_name}"

@app.post("/register")
def register(user: UserCreate, db: Session = Depends(get_db)):
    try:
        db_user = db.query(User).filter(User.username == user.username).first()
        if db_user:
            raise HTTPException(status_code=400, detail="Username already registered")
        
        hashed_password = get_password_hash(user.password)
        new_user = User(username=user.username, hashed_password=hashed_password, company_name=user.company_name)
        db.add(new_user)
        db.commit()
        
        # Maak direct een namespace voor dit bedrijf
        ns_name = get_namespace_name(user.company_name)
        try:
            ns_body = client.V1Namespace(metadata=client.V1ObjectMeta(name=ns_name))
            v1.create_namespace(body=ns_body)
        except client.exceptions.ApiException as e:
            if e.status != 409: # 409 = Conflict (bestaat al), dat is ok. Andere errors niet.
                print(f"Warning: Could not create namespace: {e}")
        except Exception as e:
            print(f"Warning: Generic error creating namespace: {e}")

        return {"msg": "User created successfully"}
    except Exception as e:
        print(f"Register Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/token")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer", "company": user.company_name}

@app.get("/my-pods", response_model=list[PodInfo])
def get_my_pods(current_user: User = Depends(get_current_user)):
    ns_name = get_namespace_name(current_user.company_name)
    pods = []
    
    # Prijzen tabel
    prices = {"nginx": 5.00, "postgres": 15.00, "redis": 10.00}

    try:
        k8s_pods = v1.list_namespaced_pod(namespace=ns_name, label_selector=f"owner={current_user.username}")
        for p in k8s_pods.items:
            app_type = p.metadata.labels.get("app", "unknown")
            cost = prices.get(app_type, 0.0)
            
            # Bereken leeftijd
            start_time = p.status.start_time
            age = "Unknown"
            if start_time:
                age = str(datetime.now(start_time.tzinfo) - start_time).split('.')[0]

            pods.append(PodInfo(
                name=p.metadata.name,
                status=p.status.phase,
                cost=cost,
                type=app_type,
                age=age
            ))
    except client.exceptions.ApiException:
        pass # Namespace bestaat misschien nog niet of is leeg
        
    return pods

@app.post("/pods")
def create_pod(pod: PodCreate, current_user: User = Depends(get_current_user)):
    ns_name = get_namespace_name(current_user.company_name)
    pod_name = f"{pod.service_type}-{random.randint(1000,9999)}"
    
    # Simpele image selectie
    image_map = {
        "nginx": "nginx:latest",
        "postgres": "postgres:13",
        "redis": "redis:alpine"
    }
    image = image_map.get(pod.service_type, "nginx:latest")

    # Deployment aanmaken
    container = client.V1Container(
        name=pod.service_type,
        image=image,
        ports=[client.V1ContainerPort(container_port=80 if pod.service_type == "nginx" else 5432)]
    )
    # Voeg owner label toe zodat we weten van wie hij is
    labels = {"app": pod.service_type, "owner": current_user.username}
    
    template = client.V1PodTemplateSpec(
        metadata=client.V1ObjectMeta(labels=labels),
        spec=client.V1PodSpec(containers=[container])
    )
    spec = client.V1DeploymentSpec(
        replicas=1,
        selector=client.V1LabelSelector(match_labels=labels),
        template=template
    )
    deployment = client.V1Deployment(
        api_version="apps/v1",
        kind="Deployment",
        metadata=client.V1ObjectMeta(name=pod_name, labels=labels),
        spec=spec
    )

    try:
        apps_v1.create_namespaced_deployment(namespace=ns_name, body=deployment)
    except client.exceptions.ApiException as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {"status": "creating", "name": pod_name}

@app.delete("/pods/{pod_name}")
def delete_pod(pod_name: str, current_user: User = Depends(get_current_user)):
    ns_name = get_namespace_name(current_user.company_name)
    
    # Check eerst of deze pod wel van de user is (via labels zou netter zijn, maar naam check is ook ok voor nu)
    # We verwijderen de deployment, dat ruimt de pod ook op
    try:
        # Deployment naam is vaak prefix van pod naam, maar hier hebben we deployment naam == pod naam prefix logic
        # Voor simpelheid in dit script gaan we ervan uit dat de user de deployment naam stuurt (die we in de frontend tonen)
        # In de frontend sturen we de deployment naam (die we als pod naam tonen in de lijst, even smokkelen)
        
        # Omdat we deployments maken, moeten we deployments verwijderen.
        # De GET /my-pods geeft POD namen terug (bv nginx-1234-xyz). De deployment heet nginx-1234.
        # We moeten de deployment vinden die bij de pod hoort.
        
        # Betere aanpak: We deleten op basis van label selector in de deployment
        # Maar voor nu: we proberen de deployment te vinden die matcht.
        
        # Hack: we deleten de deployment die 'begint' met de naam (zonder de hash)
        # Of we deleten gewoon de deployment met de naam die we bij create teruggaven.
        
        # Laten we het simpel houden: De frontend stuurt de deployment naam.
        # In GET /my-pods moeten we eigenlijk deployments teruggeven ipv pods voor een cleaner overzicht.
        pass
    except Exception:
        pass

    # Nieuwe implementatie voor DELETE: We deleten de deployment direct
    # We moeten de deployment naam weten.
    # Laten we de GET functie aanpassen om Deployments te returnen ipv Pods.
    
    try:
        apps_v1.delete_namespaced_deployment(name=pod_name, namespace=ns_name)
    except client.exceptions.ApiException:
        raise HTTPException(status_code=404, detail="Deployment not found")
        
    return {"status": "deleted"}

@app.get("/my-deployments", response_model=list[PodInfo])
def get_my_deployments(current_user: User = Depends(get_current_user)):
    ns_name = get_namespace_name(current_user.company_name)
    deployments = []
    prices = {"nginx": 5.00, "postgres": 15.00, "redis": 10.00}

    try:
        k8s_deps = apps_v1.list_namespaced_deployment(namespace=ns_name, label_selector=f"owner={current_user.username}")
        for d in k8s_deps.items:
            app_type = d.metadata.labels.get("app", "unknown")
            cost = prices.get(app_type, 0.0)
            
            creation_timestamp = d.metadata.creation_timestamp
            age = "Unknown"
            if creation_timestamp:
                age = str(datetime.now(creation_timestamp.tzinfo) - creation_timestamp).split('.')[0]

            deployments.append(PodInfo(
                name=d.metadata.name,
                status=f"{d.status.ready_replicas or 0}/{d.spec.replicas} Ready",
                cost=cost,
                type=app_type,
                age=age
            ))
    except client.exceptions.ApiException:
        pass
        
    return deployments
