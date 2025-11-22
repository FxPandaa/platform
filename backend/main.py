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
from typing import Optional

# --- CONFIGURATIE ---
SECRET_KEY = "super-secret-key-change-this-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Database Setup (SQLite)
# We gebruiken nu een absoluut pad naar /data folder voor persistence
SQLALCHEMY_DATABASE_URL = "sqlite:////data/users.db"
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
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")
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
    service_type: str # nginx, postgres, redis, custom
    custom_image: Optional[str] = None # Optioneel, voor als service_type 'custom' is

class PodInfo(BaseModel):
    name: str
    status: str
    cost: float
    type: str
    age: str
    message: str = None
    pod_ip: str = None
    node_name: str = None
    external_url: str = None # Nieuw veld voor externe toegang

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

        # KOPIEER REGCRED SECRET (voor Docker Hub pull rechten)
        # Dit doen we ALTIJD, ook als de namespace al bestaat (voor re-registratie)
        try:
            # Check of secret al bestaat
            try:
                v1.read_namespaced_secret("regcred", ns_name)
            except client.exceptions.ApiException as e:
                if e.status == 404:
                    # Lees de secret uit admin-platform
                    secret = v1.read_namespaced_secret("regcred", "admin-platform")
                    # Maak hem klaar voor de nieuwe namespace
                    secret.metadata.namespace = ns_name
                    secret.metadata.resource_version = None
                    secret.metadata.uid = None
                    secret.metadata.creation_timestamp = None
                    secret.metadata.owner_references = None
                    # Maak hem aan
                    v1.create_namespaced_secret(namespace=ns_name, body=secret)
                    print(f"Copied regcred to {ns_name}")
        except Exception as e:
            print(f"Warning: Could not copy regcred secret: {e}")

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

def get_safe_label(text: str) -> str:
    # Labels mogen geen spaties bevatten, alleen a-z, 0-9, -, _, .
    return re.sub(r'[^a-zA-Z0-9\-\_\.]', '-', text)

@app.post("/pods")
def create_pod(pod: PodCreate, current_user: User = Depends(get_current_user)):
    ns_name = get_namespace_name(current_user.company_name)
    pod_name = f"{pod.service_type}-{random.randint(1000,9999)}"
    
    # Image selectie
    if pod.service_type == "custom":
        if not pod.custom_image:
            raise HTTPException(status_code=400, detail="Custom image is required for custom service type")
        image = pod.custom_image
        # Sanitize pod name for custom
        pod_name = f"custom-{random.randint(1000,9999)}"
    else:
        image_map = {
            "nginx": "nginx:latest",
            "postgres": "postgres:13",
            "redis": "redis:alpine"
        }
        image = image_map.get(pod.service_type, "nginx:latest")

    # Deployment aanmaken
    target_port = 80
    if pod.service_type == "postgres": target_port = 5432
    if pod.service_type == "redis": target_port = 6379
    
    container = client.V1Container(
        name=pod.service_type if pod.service_type != "custom" else "app",
        image=image,
        ports=[client.V1ContainerPort(container_port=target_port)]
    )
    # Voeg owner label toe zodat we weten van wie hij is
    # BELANGRIJK: Sanitize labels!
    safe_owner = get_safe_label(current_user.username)
    labels = {"app": pod.service_type, "owner": safe_owner, "deployment": pod_name}
    
    template = client.V1PodTemplateSpec(
        metadata=client.V1ObjectMeta(labels=labels),
        spec=client.V1PodSpec(
            containers=[container],
            image_pull_secrets=[client.V1LocalObjectReference(name="regcred")] # Gebruik de secret!
        )
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
        
        # Maak ook een Service aan (NodePort) voor externe toegang
        service = client.V1Service(
            api_version="v1",
            kind="Service",
            metadata=client.V1ObjectMeta(name=pod_name, labels=labels),
            spec=client.V1ServiceSpec(
                selector=labels,
                type="NodePort",
                ports=[client.V1ServicePort(port=target_port, target_port=target_port)]
            )
        )
        v1.create_namespaced_service(namespace=ns_name, body=service)
        
    except client.exceptions.ApiException as e:
        print(f"Create Pod Error: {e}")
        raise HTTPException(status_code=500, detail=f"K8s Error: {e.reason}")
    except Exception as e:
        print(f"Generic Create Pod Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    return {"status": "creating", "name": pod_name}

@app.delete("/company")
def delete_company(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ns_name = get_namespace_name(current_user.company_name)
    
    # 1. Verwijder Namespace (dit verwijdert alle pods, services, secrets, etc.)
    try:
        v1.delete_namespace(name=ns_name)
    except client.exceptions.ApiException as e:
        if e.status != 404:
            raise HTTPException(status_code=500, detail=f"Failed to delete namespace: {e}")
            
    # 2. Verwijder User uit DB
    try:
        db.delete(current_user)
        db.commit()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete user: {e}")
        
    return {"msg": "Company and all resources deleted"}

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
        # Probeer ook de service te verwijderen
        try:
            v1.delete_namespaced_service(name=pod_name, namespace=ns_name)
        except:
            pass
    except client.exceptions.ApiException:
        raise HTTPException(status_code=404, detail="Deployment not found")
        
    return {"status": "deleted"}

@app.get("/my-deployments", response_model=list[PodInfo])
def get_my_deployments(current_user: User = Depends(get_current_user)):
    ns_name = get_namespace_name(current_user.company_name)
    deployments = []
    prices = {"nginx": 5.00, "postgres": 15.00, "redis": 10.00, "custom": 20.00}

    try:
        k8s_deps = apps_v1.list_namespaced_deployment(namespace=ns_name, label_selector=f"owner={current_user.username}")
        for d in k8s_deps.items:
            app_type = d.metadata.labels.get("app", "unknown")
            cost = prices.get(app_type, 20.00)
            
            creation_timestamp = d.metadata.creation_timestamp
            age = "Unknown"
            if creation_timestamp:
                age = str(datetime.now(creation_timestamp.tzinfo) - creation_timestamp).split('.')[0]

            # Haal extra info op van de pods
            message = "Scaling..."
            pod_ip = "Pending"
            node_name = "Pending"
            external_url = None
            
            # Haal Service info op voor NodePort
            try:
                svc = v1.read_namespaced_service(name=d.metadata.name, namespace=ns_name)
                if svc.spec.ports:
                    node_port = svc.spec.ports[0].node_port
                    # We gebruiken het IP van de master node (of waar de user op zit)
                    # In een echte cloud zou je hier de LoadBalancer IP pakken.
                    # Voor nu hardcoden we het IP van de VM die de user gebruikt.
                    external_url = f"http://192.168.154.114:{node_port}"
            except:
                pass

            try:
                pods = v1.list_namespaced_pod(namespace=ns_name, label_selector=f"app={app_type},owner={current_user.username}")
                if pods.items:
                    pod = pods.items[0] # Pak de eerste pod
                    pod_ip = pod.status.pod_ip or "Pending"
                    node_name = pod.spec.node_name or "Pending"
                    
                    # Status message logic
                    if pod.status.container_statuses:
                        for cs in pod.status.container_statuses:
                            if cs.state.waiting:
                                message = f"{cs.state.waiting.reason}: {cs.state.waiting.message or ''}"
                            elif cs.state.terminated:
                                message = f"Terminated: {cs.state.terminated.reason}"
                            elif cs.state.running:
                                message = "Running Healthy"
                    else:
                        message = pod.status.phase
            except Exception:
                message = "Error fetching pod details"

            deployments.append(PodInfo(
                name=d.metadata.name,
                status=f"{d.status.ready_replicas or 0}/{d.spec.replicas} Ready",
                cost=cost,
                type=app_type,
                age=age,
                message=message,
                pod_ip=pod_ip,
                node_name=node_name,
                external_url=external_url
            ))
    except client.exceptions.ApiException:
        pass
        
    return deployments
