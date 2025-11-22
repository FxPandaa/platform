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
networking_v1 = client.NetworkingV1Api()

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
    public_ip: str = None
    node_port: int = None
    group_id: Optional[str] = None # ID om gerelateerde services te linken (bijv. WP + MySQL)

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

@app.get("/pods", response_model=list[PodInfo])
def get_pods(current_user: User = Depends(get_current_user)):
    ns_name = get_namespace_name(current_user.company_name)
    pods = []
    
    # Prijzen tabel
    prices = {"nginx": 5.00, "postgres": 15.00, "redis": 10.00, "custom": 20.00, "wordpress": 20.00, "mysql": 10.00, "uptime": 10.00}

    try:
        # Haal alle pods in de namespace op (geen owner filter)
        k8s_pods = v1.list_namespaced_pod(namespace=ns_name)
        k8s_services = v1.list_namespaced_service(namespace=ns_name)
        
        # Map services to node ports
        service_ports = {}
        for svc in k8s_services.items:
            if svc.spec.selector and 'app' in svc.spec.selector:
                app_label = svc.spec.selector['app']
                if svc.spec.ports:
                    for port in svc.spec.ports:
                        if port.node_port:
                            service_ports[app_label] = port.node_port
                            break

        print(f"Found {len(k8s_pods.items)} pods in namespace {ns_name}")
        
        for p in k8s_pods.items:
            try:
                print(f"Processing pod: {p.metadata.name}")
                
                # Protect against None labels
                labels = p.metadata.labels or {}
                app_type = labels.get("app", "unknown")
                print(f"  App type: {app_type}, Labels: {labels}")
                
                # Cost calculation (strip random suffix to match price keys)
                # app_type is like "nginx-1234", we want "nginx"
                base_type = app_type.split('-')[0] if '-' in app_type else app_type
                cost = prices.get(base_type, 20.00)
                
                # Bereken leeftijd
                start_time = p.status.start_time
                age = "Unknown"
                if start_time:
                    age = str(datetime.now(start_time.tzinfo) - start_time).split('.')[0]

                # NodePort & IP
                # Fix: Look up by app_type (which matches the service selector 'app' label)
                node_port = service_ports.get(app_type)
                public_ip = p.status.host_ip if p.status.host_ip else "Pending"
                
                # Ingress lookup (safe)
                external_url = None
                try:
                    # We assume ingress name is {app_type}-svc-ingress based on create_pod logic
                    ing = networking_v1.read_namespaced_ingress(name=f"{app_type}-svc-ingress", namespace=ns_name)
                    if ing.spec.rules:
                        external_url = f"http://{ing.spec.rules[0].host}"
                except:
                    pass
                
                # Group ID lookup
                group_id = labels.get("service_group")
                
                # Safe field access
                pod_ip = p.status.pod_ip if p.status.pod_ip else None
                node_name = p.spec.node_name if p.spec.node_name else None

                pod_info = PodInfo(
                    name=p.metadata.name,
                    status=p.status.phase,
                    cost=cost,
                    type=app_type,
                    age=age,
                    pod_ip=pod_ip,
                    node_name=node_name,
                    public_ip=public_ip,
                    node_port=node_port,
                    external_url=external_url,
                    group_id=group_id
                )
                pods.append(pod_info)
                print(f"  Successfully added pod {p.metadata.name}")
                
            except Exception as e:
                print(f"ERROR: Skipping pod {p.metadata.name} due to error: {e}")
                import traceback
                traceback.print_exc()
                continue

    except Exception as e:
        print(f"CRITICAL ERROR in get_pods: {e}")
        import traceback
        traceback.print_exc()
        # Return what we have so far instead of crashing
        pass
    
    print(f"Returning {len(pods)} pods to frontend")
    return pods

def get_safe_label(text: str) -> str:
    # Labels mogen geen spaties bevatten, alleen a-z, 0-9, -, _, .
    return re.sub(r'[^a-zA-Z0-9\-\_\.]', '-', text)

def create_ingress(ns_name: str, service_name: str, port: int, host: str):
    ingress = client.V1Ingress(
        api_version="networking.k8s.io/v1",
        kind="Ingress",
        metadata=client.V1ObjectMeta(name=f"{service_name}-ingress", annotations={
            "kubernetes.io/ingress.class": "traefik"
        }),
        spec=client.V1IngressSpec(
            rules=[
                client.V1IngressRule(
                    host=host,
                    http=client.V1HTTPIngressRuleValue(
                        paths=[
                            client.V1HTTPIngressPath(
                                path="/",
                                path_type="Prefix",
                                backend=client.V1IngressBackend(
                                    service=client.V1IngressServiceBackend(
                                        name=service_name,
                                        port=client.V1ServiceBackendPort(number=port)
                                    )
                                )
                            )
                        ]
                    )
                )
            ]
        )
    )
    try:
        networking_v1.create_namespaced_ingress(namespace=ns_name, body=ingress)
    except client.exceptions.ApiException as e:
        print(f"Warning: Could not create ingress: {e}")

@app.post("/pods")
def create_pod(pod: PodCreate, current_user: User = Depends(get_current_user)):
    print(f"Received create_pod request: {pod}") # Debug log
    ns_name = get_namespace_name(current_user.company_name)
    pod_name = f"{pod.service_type}-{random.randint(1000,9999)}"
    safe_owner = get_safe_label(current_user.username)
    
    # --- MARKETPLACE LOGIC ---
    
    if pod.service_type == "wordpress":
        # Generate Group ID for linking services
        group_id = str(random.randint(10000, 99999))

        # 1. MySQL Deployment
        mysql_name = f"mysql-{random.randint(1000,9999)}"
        mysql_labels = {"app": mysql_name, "owner": safe_owner, "service_group": group_id}
        mysql_env = [
            client.V1EnvVar(name="MYSQL_ROOT_PASSWORD", value="secret"),
            client.V1EnvVar(name="MYSQL_DATABASE", value="wordpress"),
            client.V1EnvVar(name="MYSQL_USER", value="wordpress"),
            client.V1EnvVar(name="MYSQL_PASSWORD", value="wordpress")
        ]
        
        mysql_container = client.V1Container(
            name="mysql",
            image="mysql:5.7",
            ports=[client.V1ContainerPort(container_port=3306)],
            env=mysql_env
        )
        
        mysql_deployment = client.V1Deployment(
            api_version="apps/v1",
            kind="Deployment",
            metadata=client.V1ObjectMeta(name=mysql_name, labels=mysql_labels),
            spec=client.V1DeploymentSpec(
                replicas=1,
                selector=client.V1LabelSelector(match_labels=mysql_labels),
                template=client.V1PodTemplateSpec(
                    metadata=client.V1ObjectMeta(labels=mysql_labels),
                    spec=client.V1PodSpec(
                        containers=[mysql_container]
                        # No imagePullSecrets for public images
                    )
                )
            )
        )
        apps_v1.create_namespaced_deployment(namespace=ns_name, body=mysql_deployment)
        
        # MySQL Service (NodePort voor visibility in dashboard)
        mysql_service = client.V1Service(
            api_version="v1",
            kind="Service",
            metadata=client.V1ObjectMeta(name=mysql_name, labels={"service_group": group_id}),
            spec=client.V1ServiceSpec(
                selector={"app": mysql_name},
                type="NodePort",
                ports=[client.V1ServicePort(port=3306, target_port=3306)]
            )
        )
        v1.create_namespaced_service(namespace=ns_name, body=mysql_service)
        
        # 2. WordPress Deployment
        wp_labels = {"app": pod_name, "owner": safe_owner, "service_group": group_id}
        wp_env = [
            client.V1EnvVar(name="WORDPRESS_DB_HOST", value=mysql_name),
            client.V1EnvVar(name="WORDPRESS_DB_USER", value="wordpress"),
            client.V1EnvVar(name="WORDPRESS_DB_PASSWORD", value="wordpress"),
            client.V1EnvVar(name="WORDPRESS_DB_NAME", value="wordpress")
        ]
        
        wp_container = client.V1Container(
            name="wordpress",
            image="wordpress:latest",
            ports=[client.V1ContainerPort(container_port=80)],
            env=wp_env
        )
        
        wp_deployment = client.V1Deployment(
            api_version="apps/v1",
            kind="Deployment",
            metadata=client.V1ObjectMeta(name=pod_name, labels=wp_labels),
            spec=client.V1DeploymentSpec(
                replicas=1,
                selector=client.V1LabelSelector(match_labels=wp_labels),
                template=client.V1PodTemplateSpec(
                    metadata=client.V1ObjectMeta(labels=wp_labels),
                    spec=client.V1PodSpec(
                        containers=[wp_container]
                        # No imagePullSecrets for public images
                    )
                )
            )
        )
        apps_v1.create_namespaced_deployment(namespace=ns_name, body=wp_deployment)
        
        # WordPress Service
        wp_service = client.V1Service(
            api_version="v1",
            kind="Service",
            metadata=client.V1ObjectMeta(name=f"{pod_name}-svc", labels={"service_group": group_id}),
            spec=client.V1ServiceSpec(
                selector={"app": pod_name},
                type="NodePort",
                ports=[client.V1ServicePort(port=80, target_port=80)]
            )
        )
        v1.create_namespaced_service(namespace=ns_name, body=wp_service)
        
        # Ingress for professional domain
        host = f"{pod_name}.{ns_name}.192.168.154.114.sslip.io"
        create_ingress(ns_name, f"{pod_name}-svc", 80, host)
        
        return {"message": f"WordPress site {pod_name} created successfully"}

    # --- STANDARD LOGIC ---
    
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
            "redis": "redis:alpine",
            "uptime-kuma": "louislam/uptime-kuma:1"
        }
        image = image_map.get(pod.service_type, "nginx:latest")

    # Deployment aanmaken
    target_port = 80
    env_vars = []
    
    if pod.service_type == "postgres": 
        target_port = 5432
        env_vars.append(client.V1EnvVar(name="POSTGRES_PASSWORD", value="mysecretpassword"))
        
    if pod.service_type == "redis": target_port = 6379
    if pod.service_type == "uptime-kuma": target_port = 3001
    
    container = client.V1Container(
        name=pod.service_type if pod.service_type != "custom" else "app",
        image=image,
        ports=[client.V1ContainerPort(container_port=target_port)],
        env=env_vars
    )
    
    labels = {"app": pod_name, "owner": safe_owner} # Gebruik pod_name als app label voor unieke service mapping
    
    # Alleen imagePullSecrets toevoegen voor custom images of als we zeker weten dat het nodig is
    # Voor publieke images (nginx, postgres, etc) is het niet nodig en kan het errors geven als de secret niet klopt
    image_pull_secrets = []
    if pod.service_type == "custom":
         image_pull_secrets = [client.V1LocalObjectReference(name="regcred")]

    template = client.V1PodTemplateSpec(
        metadata=client.V1ObjectMeta(labels=labels),
        spec=client.V1PodSpec(
            containers=[container],
            image_pull_secrets=image_pull_secrets
        )
    )
    
    deployment = client.V1Deployment(
        api_version="apps/v1",
        kind="Deployment",
        metadata=client.V1ObjectMeta(name=pod_name, labels=labels),
        spec=client.V1DeploymentSpec(
            replicas=1,
            selector=client.V1LabelSelector(match_labels=labels),
            template=template
        )
    )

    try:
        apps_v1.create_namespaced_deployment(namespace=ns_name, body=deployment)
        
        # Maak ook een Service aan (NodePort) voor externe toegang
        service = client.V1Service(
            api_version="v1",
            kind="Service",
            metadata=client.V1ObjectMeta(name=f"{pod_name}-svc"),
            spec=client.V1ServiceSpec(
                selector={"app": pod_name},
                type="NodePort",
                ports=[client.V1ServicePort(port=target_port, target_port=target_port)]
            )
        )
        v1.create_namespaced_service(namespace=ns_name, body=service)
        
        # Create Ingress for professional domain (except for databases)
        if pod.service_type not in ["postgres", "redis", "mysql"]:
            host = f"{pod_name}.{ns_name}.192.168.154.114.sslip.io"
            create_ingress(ns_name, f"{pod_name}-svc", target_port, host)
        
        return {"message": f"Pod {pod_name} created successfully"}
    except client.exceptions.ApiException as e:
        raise HTTPException(status_code=500, detail=str(e))
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
    deleted_resources = []
    
    try:
        # First, check if this pod has a service_group (is part of a multi-service deployment like WordPress)
        try:
            pods_in_ns = v1.list_namespaced_pod(namespace=ns_name)
            target_pod = None
            for p in pods_in_ns.items:
                if p.metadata.name == pod_name:
                    target_pod = p
                    break
            
            # If the pod has a group_id, delete all resources in that group
            if target_pod and target_pod.metadata.labels:
                group_id = target_pod.metadata.labels.get("service_group")
                if group_id:
                    # Delete all deployments with this group_id
                    deps = apps_v1.list_namespaced_deployment(namespace=ns_name, label_selector=f"service_group={group_id}")
                    for dep in deps.items:
                        try:
                            apps_v1.delete_namespaced_deployment(name=dep.metadata.name, namespace=ns_name)
                            deleted_resources.append(f"deployment/{dep.metadata.name}")
                        except:
                            pass
                    
                    # Delete all services with this group_id or matching names
                    svcs = v1.list_namespaced_service(namespace=ns_name)
                    for svc in svcs.items:
                        if svc.metadata.labels and svc.metadata.labels.get("service_group") == group_id:
                            try:
                                v1.delete_namespaced_service(name=svc.metadata.name, namespace=ns_name)
                                deleted_resources.append(f"service/{svc.metadata.name}")
                            except:
                                pass
                        # Also check if service name matches deployment names
                        for dep in deps.items:
                            if svc.metadata.name.startswith(dep.metadata.name):
                                try:
                                    v1.delete_namespaced_service(name=svc.metadata.name, namespace=ns_name)
                                    deleted_resources.append(f"service/{svc.metadata.name}")
                                except:
                                    pass
                    
                    # Delete ingresses
                    ings = networking_v1.list_namespaced_ingress(namespace=ns_name)
                    for ing in ings.items:
                        if ing.metadata.name.startswith(target_pod.metadata.labels.get("app", "")):
                            try:
                                networking_v1.delete_namespaced_ingress(name=ing.metadata.name, namespace=ns_name)
                                deleted_resources.append(f"ingress/{ing.metadata.name}")
                            except:
                                pass
                    
                    return {"status": "deleted", "resources": deleted_resources}
        except Exception as e:
            print(f"Error checking for service group: {e}")
        
        # Fallback: Single pod/deployment deletion
        # Extract deployment name from pod name (pods have random suffixes)
        deployment_name = '-'.join(pod_name.split('-')[:-2]) if pod_name.count('-') >= 2 else pod_name
        
        # Try to delete deployment
        try:
            apps_v1.delete_namespaced_deployment(name=deployment_name, namespace=ns_name)
            deleted_resources.append(f"deployment/{deployment_name}")
        except:
            # Try with original pod_name as deployment name
            try:
                apps_v1.delete_namespaced_deployment(name=pod_name, namespace=ns_name)
                deleted_resources.append(f"deployment/{pod_name}")
            except:
                pass
        
        # Try to delete service
        service_name = f"{deployment_name}-svc"
        try:
            v1.delete_namespaced_service(name=service_name, namespace=ns_name)
            deleted_resources.append(f"service/{service_name}")
        except:
            try:
                v1.delete_namespaced_service(name=deployment_name, namespace=ns_name)
                deleted_resources.append(f"service/{deployment_name}")
            except:
                pass
        
        # Try to delete ingress
        ingress_name = f"{deployment_name}-svc-ingress"
        try:
            networking_v1.delete_namespaced_ingress(name=ingress_name, namespace=ns_name)
            deleted_resources.append(f"ingress/{ingress_name}")
        except:
            pass
        
        if deleted_resources:
            return {"status": "deleted", "resources": deleted_resources}
        else:
            raise HTTPException(status_code=404, detail="No resources found to delete")
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting pod: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error deleting pod: {str(e)}")

@app.get("/pods/{pod_name}/logs")
def get_pod_logs(pod_name: str, current_user: User = Depends(get_current_user)):
    ns_name = get_namespace_name(current_user.company_name)
    try:
        logs = v1.read_namespaced_pod_log(name=pod_name, namespace=ns_name, tail_lines=100)
        return {"logs": logs}
    except client.exceptions.ApiException as e:
        raise HTTPException(status_code=404, detail="Logs not found")

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
                # We proberen de service te vinden. De naamgeving is soms inconsistent (wel/niet -svc suffix)
                # We proberen eerst met -svc suffix (standaard voor nieuwe pods)
                svc_name = d.metadata.name + "-svc"
                try:
                    svc = v1.read_namespaced_service(name=svc_name, namespace=ns_name)
                except client.exceptions.ApiException:
                    # Fallback: probeer zonder suffix (voor oude pods) of met andere naam
                    svc_name = d.metadata.name
                    svc = v1.read_namespaced_service(name=svc_name, namespace=ns_name)

                # Probeer Ingress te vinden
                try:
                    ing = networking_v1.read_namespaced_ingress(name=svc_name + "-ingress", namespace=ns_name)
                    if ing.spec.rules:
                        external_url = f"http://{ing.spec.rules[0].host}"
                except:
                    pass
                
                # Fallback naar NodePort als Ingress niet bestaat of faalde
                if not external_url and svc.spec.ports:
                    node_port = svc.spec.ports[0].node_port
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
