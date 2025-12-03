from fastapi import FastAPI, HTTPException, Depends, status
from pydantic import BaseModel
from kubernetes import client, config
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from sqlalchemy import create_engine, Column, Integer, String, Boolean
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
custom_api = client.CustomObjectsApi()  # For metrics API
autoscaling_v1 = client.AutoscalingV1Api()  # For HPA
batch_v1 = client.BatchV1Api()  # For CronJobs/Jobs

app = FastAPI()

# Health check endpoint
@app.get("/health")
def health_check():
    return {"status": "healthy"}

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
    is_admin = Column(Boolean, default=False)

Base.metadata.create_all(bind=engine)

# --- MIGRATION: Add is_admin column if not exists ---
def migrate_database():
    from sqlalchemy import inspect, text
    inspector = inspect(engine)
    columns = [col['name'] for col in inspector.get_columns('users')]
    if 'is_admin' not in columns:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 0"))
            conn.commit()
            print("[MIGRATION] Added is_admin column to users table")

try:
    migrate_database()
except Exception as e:
    print(f"[MIGRATION] Note: {e}")

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

# --- CREATE DEFAULT ADMIN ---
def create_default_admin():
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.username == "admin").first()
        if not admin:
            hashed_pw = get_password_hash("admin123")
            admin = User(username="admin", hashed_password=hashed_pw, company_name="Platform Admin", is_admin=True)
            db.add(admin)
            db.commit()
            print("[STARTUP] Default admin user created (username: admin, password: admin123)")
        else:
            # Reset admin password and ensure is_admin flag
            admin.hashed_password = get_password_hash("admin123")
            admin.is_admin = True
            db.commit()
            print("[STARTUP] Admin user password reset and is_admin flag updated")
    except Exception as e:
        print(f"[STARTUP] Error creating admin: {e}")
    finally:
        db.close()

create_default_admin()

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
    env_vars: Optional[dict] = None # Custom environment variables

# EUSUITE Configuration - Dylan's Office 365 Suite
EUSUITE_APPS = {
    "eusuite-login": {
        "name": "EUSuite Login",
        "description": "Authentication & Login Portal",
        "image": "dylan016504/eusuite-login:latest",
        "port": 3000,
        "env": {}
    },
    "eusuite-dashboard": {
        "name": "EUSuite Dashboard",
        "description": "Main Dashboard & App Launcher",
        "image": "dylan016504/eusuite-dashboard:latest",
        "port": 3001,
        "env": {}
    },
    "eumail-frontend": {
        "name": "EUMail",
        "description": "Email Service (Frontend)",
        "image": "dylan016504/eumail-frontend:latest",
        "port": 3002,
        "env": {}
    },
    "eumail-backend": {
        "name": "EUMail API",
        "description": "Email Service (Backend)",
        "image": "dylan016504/eumail-backend:latest",
        "port": 4002,
        "env": {}
    },
    "eucloud-frontend": {
        "name": "EUCloud",
        "description": "Cloud Storage (Frontend)",
        "image": "dylan016504/eucloud-frontend:latest",
        "port": 3003,
        "env": {}
    },
    "eucloud-backend": {
        "name": "EUCloud API",
        "description": "Cloud Storage (Backend)",
        "image": "dylan016504/eucloud-backend:latest",
        "port": 4003,
        "env": {}
    },
    "eutype-frontend": {
        "name": "EUType",
        "description": "Document Editor (Frontend)",
        "image": "dylan016504/eutype-frontend:latest",
        "port": 3004,
        "env": {}
    },
    "eugroups-frontend": {
        "name": "EUGroups",
        "description": "Team Communication (Frontend)",
        "image": "dylan016504/eugroups-frontend:latest",
        "port": 3005,
        "env": {}
    },
    "eugroups-backend": {
        "name": "EUGroups API",
        "description": "Team Communication (Backend)",
        "image": "dylan016504/eugroups-backend:latest",
        "port": 4005,
        "env": {}
    },
    "eugroups-media": {
        "name": "EUGroups Media",
        "description": "Media Server for Teams",
        "image": "dylan016504/eugroups-media-server:latest",
        "port": 4006,
        "env": {}
    },
    "euadmin-frontend": {
        "name": "EUAdmin",
        "description": "Admin Portal (Frontend)",
        "image": "dylan016504/euadmin-frontend:latest",
        "port": 3006,
        "env": {}
    },
    "euadmin-backend": {
        "name": "EUAdmin API",
        "description": "Admin Portal (Backend)",
        "image": "dylan016504/euadmin-backend:latest",
        "port": 4007,
        "env": {}
    }
}

class PodInfo(BaseModel):
    name: str
    status: str
    cost: float
    type: str
    age: str
    message: Optional[str] = None
    pod_ip: Optional[str] = None
    node_name: Optional[str] = None
    external_url: Optional[str] = None # Nieuw veld voor externe toegang
    public_ip: Optional[str] = None
    node_port: Optional[int] = None
    group_id: Optional[str] = None # ID om gerelateerde services te linken (bijv. WP + MySQL)
    cpu_usage: Optional[str] = None # CPU usage (e.g., "50m" = 50 millicores)
    memory_usage: Optional[str] = None # Memory usage (e.g., "128Mi")
    cpu_limit: Optional[str] = None
    memory_limit: Optional[str] = None
    # Feature status fields
    has_storage: Optional[bool] = False
    storage_size: Optional[str] = None
    has_autoscaling: Optional[bool] = False
    replicas: Optional[str] = None  # e.g., "1/3" (current/max)
    has_auto_backup: Optional[bool] = False
    backup_count: Optional[int] = 0

class PodMetrics(BaseModel):
    name: str
    cpu_usage: str
    memory_usage: str
    cpu_percent: Optional[float] = None
    memory_percent: Optional[float] = None

class EnvVarUpdate(BaseModel):
    env_vars: dict # {"KEY": "value", "KEY2": "value2"}

class StorageConfig(BaseModel):
    size: str = "1Gi"  # e.g., "1Gi", "5Gi", "10Gi"
    
class ScalingConfig(BaseModel):
    min_replicas: int = 1
    max_replicas: int = 5
    cpu_threshold: int = 70  # Scale up when CPU > 70%

class BackupInfo(BaseModel):
    name: str
    timestamp: str
    size: str
    database: str

# Storage quota per company (in Gi)
COMPANY_STORAGE_QUOTA = 50  # 50Gi total per company

# --- ENDPOINTS ---

def get_namespace_name(company_name: str) -> str:
    # Maak de naam Kubernetes-proof: lowercase, vervang spaties, verwijder vreemde tekens
    clean_name = company_name.lower().replace(" ", "-")
    clean_name = re.sub(r'[^a-z0-9\-]', '', clean_name)
    return f"org-{clean_name}"

def find_deployment_from_pod_name(pod_name: str, namespace: str):
    """Extract and find deployment from pod name (pods have random suffixes like nginx-1234-abc123-xyz)"""
    parts = pod_name.split('-')
    if len(parts) >= 3:
        # Try progressively shorter names until we find the deployment
        for i in range(len(parts) - 1, 0, -1):
            try_name = '-'.join(parts[:i])
            try:
                deployment = apps_v1.read_namespaced_deployment(name=try_name, namespace=namespace)
                return deployment
            except:
                continue
        raise HTTPException(status_code=404, detail="Deployment not found")
    else:
        try:
            return apps_v1.read_namespaced_deployment(name=pod_name, namespace=namespace)
        except client.exceptions.ApiException as e:
            if e.status == 404:
                raise HTTPException(status_code=404, detail="Deployment not found")
            raise

def ensure_regcred_in_namespace(ns_name: str):
    """Ensure regcred secret exists in the given namespace by copying from admin-platform"""
    try:
        # Check if secret already exists
        v1.read_namespaced_secret("regcred", ns_name)
        print(f"✓ regcred already exists in {ns_name}")
        return True
    except client.exceptions.ApiException as e:
        if e.status == 404:
            # Secret doesn't exist, copy it
            print(f"⚠ regcred not found in {ns_name}, copying from admin-platform...")
            try:
                secret = v1.read_namespaced_secret("regcred", "admin-platform")
                secret.metadata.namespace = ns_name
                secret.metadata.resource_version = None
                secret.metadata.uid = None
                secret.metadata.creation_timestamp = None
                secret.metadata.owner_references = None
                v1.create_namespaced_secret(namespace=ns_name, body=secret)
                print(f"✓ Successfully copied regcred to {ns_name}")
                return True
            except Exception as copy_error:
                print(f"✗ Failed to copy regcred: {copy_error}")
                return False
        else:
            print(f"✗ Error checking regcred: {e}")
            return False
    except Exception as e:
        print(f"✗ Unexpected error with regcred: {e}")
        return False

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
    
    # Ensure regcred exists in user's namespace (fix for existing namespaces) - skip for admins
    if not user.is_admin:
        ns_name = get_namespace_name(user.company_name)
        ensure_regcred_in_namespace(ns_name)
    
    access_token = create_access_token(data={"sub": user.username})
    return {
        "access_token": access_token, 
        "token_type": "bearer", 
        "company": user.company_name,
        "is_admin": user.is_admin
    }

@app.get("/pods", response_model=list[PodInfo])
def get_pods(current_user: User = Depends(get_current_user)):
    ns_name = get_namespace_name(current_user.company_name)
    pods = []
    
    print(f"[GET /pods] Fetching pods for namespace: {ns_name}")
    
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

                # Determine detailed status
                status = p.status.phase
                message = None
                if p.status.container_statuses:
                    for container_status in p.status.container_statuses:
                        if container_status.state.waiting:
                            status = container_status.state.waiting.reason
                            message = container_status.state.waiting.message
                            break
                        if container_status.state.terminated:
                            status = container_status.state.terminated.reason
                            message = container_status.state.terminated.message
                            break

                # ===== Feature Status Lookup =====
                has_storage = False
                storage_size = None
                has_autoscaling = False
                replicas = None
                has_auto_backup = False
                backup_count = 0
                
                try:
                    # Check for PVC (storage)
                    pvc_name = f"{app_type}-pvc"
                    try:
                        pvc = v1.read_namespaced_persistent_volume_claim(name=pvc_name, namespace=ns_name)
                        has_storage = True
                        storage_size = pvc.spec.resources.requests.get("storage", "?")
                    except:
                        pass
                    
                    # Check for HPA (autoscaling)
                    hpa_name = f"{app_type}-hpa"
                    try:
                        hpa = autoscaling_v1.read_namespaced_horizontal_pod_autoscaler(name=hpa_name, namespace=ns_name)
                        has_autoscaling = True
                        current = hpa.status.current_replicas or 1
                        max_rep = hpa.spec.max_replicas
                        replicas = f"{current}/{max_rep}"
                    except:
                        pass
                    
                    # Check for auto-backup CronJob
                    cronjob_name = f"autobackup-{app_type}"
                    try:
                        batch_v1.read_namespaced_cron_job(name=cronjob_name, namespace=ns_name)
                        has_auto_backup = True
                    except:
                        pass
                    
                    # Count manual backups
                    try:
                        jobs = batch_v1.list_namespaced_job(namespace=ns_name, label_selector=f"backup-for={app_type}")
                        backup_count = len(jobs.items)
                    except:
                        pass
                except Exception as feature_err:
                    print(f"  Warning: Could not fetch feature status: {feature_err}")

                pod_info = PodInfo(
                    name=p.metadata.name,
                    status=status,
                    cost=cost,
                    type=app_type,
                    age=age,
                    pod_ip=pod_ip,
                    node_name=node_name,
                    public_ip=public_ip,
                    node_port=node_port,
                    external_url=external_url,
                    group_id=group_id,
                    message=message,
                    has_storage=has_storage,
                    storage_size=storage_size,
                    has_autoscaling=has_autoscaling,
                    replicas=replicas,
                    has_auto_backup=has_auto_backup,
                    backup_count=backup_count
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
    
    # Ensure regcred exists in user namespace (copy from admin-platform if missing)
    print(f"[CREATE POD] Ensuring regcred in {ns_name}...")
    if not ensure_regcred_in_namespace(ns_name):
        raise HTTPException(status_code=500, detail="Failed to configure Docker Hub credentials. Please contact administrator.")

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
                        containers=[mysql_container],
                        image_pull_secrets=[client.V1LocalObjectReference(name="regcred")]
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
                        containers=[wp_container],
                        image_pull_secrets=[client.V1LocalObjectReference(name="regcred")]
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
    
    # Always use regcred for Docker Hub authentication to avoid rate limits
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


# ==================== METRICS API ====================
@app.get("/pods/{pod_name}/metrics", response_model=PodMetrics)
def get_pod_metrics(pod_name: str, current_user: User = Depends(get_current_user)):
    """Get CPU and memory usage for a specific pod"""
    ns_name = get_namespace_name(current_user.company_name)
    
    print(f"[METRICS] Fetching metrics for pod: {pod_name} in namespace: {ns_name}")
    
    # Default response
    default_response = PodMetrics(
        name=pod_name,
        cpu_usage="N/A",
        memory_usage="N/A",
        cpu_percent=None,
        memory_percent=None
    )
    
    try:
        # First verify the pod exists
        try:
            pod = v1.read_namespaced_pod(name=pod_name, namespace=ns_name)
            print(f"[METRICS] Pod found: {pod.metadata.name}")
        except client.exceptions.ApiException as e:
            print(f"[METRICS] Pod not found: {e}")
            return default_response
        except Exception as e:
            print(f"[METRICS] Error reading pod: {e}")
            return default_response
        
        # Try to get metrics from metrics.k8s.io API
        try:
            metrics = custom_api.get_namespaced_custom_object(
                group="metrics.k8s.io",
                version="v1beta1",
                namespace=ns_name,
                plural="pods",
                name=pod_name
            )
            print(f"[METRICS] Got metrics response")
        except client.exceptions.ApiException as e:
            print(f"[METRICS] Metrics API error: {e.status} - {e.reason}")
            return default_response
        except Exception as e:
            print(f"[METRICS] Error getting metrics: {e}")
            return default_response
        
        # Parse metrics from response
        total_cpu_nano = 0
        total_memory_bytes = 0
        
        containers = metrics.get("containers", [])
        if not containers:
            print("[METRICS] No containers in metrics response")
            return default_response
            
        for container in containers:
            usage = container.get("usage", {})
            print(f"[METRICS] Container usage: {usage}")
            
            # CPU is in nanocores (e.g., "12345678n") or millicores (e.g., "100m")
            cpu_str = usage.get("cpu", "0n")
            try:
                if cpu_str.endswith("n"):
                    total_cpu_nano += int(cpu_str[:-1])
                elif cpu_str.endswith("m"):
                    total_cpu_nano += int(cpu_str[:-1]) * 1000000
                elif cpu_str.endswith("u"):
                    total_cpu_nano += int(cpu_str[:-1]) * 1000
                else:
                    total_cpu_nano += int(float(cpu_str) * 1000000000)
            except (ValueError, TypeError) as e:
                print(f"[METRICS] Error parsing CPU: {e}")
            
            # Memory is in bytes (e.g., "12345Ki", "100Mi", "1Gi")
            mem_str = usage.get("memory", "0")
            try:
                if mem_str.endswith("Ki"):
                    total_memory_bytes += int(mem_str[:-2]) * 1024
                elif mem_str.endswith("Mi"):
                    total_memory_bytes += int(mem_str[:-2]) * 1024 * 1024
                elif mem_str.endswith("Gi"):
                    total_memory_bytes += int(mem_str[:-2]) * 1024 * 1024 * 1024
                elif mem_str.endswith("K"):
                    total_memory_bytes += int(mem_str[:-1]) * 1000
                elif mem_str.endswith("M"):
                    total_memory_bytes += int(mem_str[:-1]) * 1000000
                elif mem_str.endswith("G"):
                    total_memory_bytes += int(mem_str[:-1]) * 1000000000
                else:
                    total_memory_bytes += int(mem_str)
            except (ValueError, TypeError) as e:
                print(f"[METRICS] Error parsing memory: {e}")
        
        # Convert to human readable
        cpu_milli = total_cpu_nano / 1000000
        cpu_usage = f"{int(cpu_milli)}m"
        
        memory_mi = total_memory_bytes / (1024 * 1024)
        memory_usage = f"{int(memory_mi)}Mi"
        
        print(f"[METRICS] Parsed: CPU={cpu_usage}, Memory={memory_usage}")
        
        # Get resource limits from pod spec for percentage calculation
        cpu_percent = None
        memory_percent = None
        
        if pod.spec.containers:
            for container in pod.spec.containers:
                if container.resources and container.resources.limits:
                    limits = container.resources.limits
                    try:
                        if "cpu" in limits:
                            limit_cpu = limits["cpu"]
                            if limit_cpu.endswith("m"):
                                limit_milli = int(limit_cpu[:-1])
                            else:
                                limit_milli = int(float(limit_cpu) * 1000)
                            if limit_milli > 0:
                                cpu_percent = round((cpu_milli / limit_milli) * 100, 1)
                        
                        if "memory" in limits:
                            limit_mem = limits["memory"]
                            if limit_mem.endswith("Mi"):
                                limit_bytes = int(limit_mem[:-2]) * 1024 * 1024
                            elif limit_mem.endswith("Gi"):
                                limit_bytes = int(limit_mem[:-2]) * 1024 * 1024 * 1024
                            else:
                                limit_bytes = int(limit_mem)
                            if limit_bytes > 0:
                                memory_percent = round((total_memory_bytes / limit_bytes) * 100, 1)
                    except (ValueError, TypeError) as e:
                        print(f"[METRICS] Error calculating percentages: {e}")
        
        return PodMetrics(
            name=pod_name,
            cpu_usage=cpu_usage,
            memory_usage=memory_usage,
            cpu_percent=cpu_percent,
            memory_percent=memory_percent
        )
        
    except Exception as e:
        print(f"[METRICS] Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return default_response


# ==================== ENVIRONMENT VARIABLES API ====================
@app.get("/pods/{pod_name}/env")
def get_pod_env(pod_name: str, current_user: User = Depends(get_current_user)):
    """Get environment variables for a pod's deployment"""
    ns_name = get_namespace_name(current_user.company_name)
    
    try:
        # Extract deployment name from pod name (pods have random suffixes like nginx-1234-abc123-xyz)
        # The deployment name is everything before the last two dash-separated parts
        parts = pod_name.split('-')
        if len(parts) >= 3:
            # Try progressively shorter names until we find the deployment
            for i in range(len(parts) - 1, 0, -1):
                try_name = '-'.join(parts[:i])
                try:
                    deployment = apps_v1.read_namespaced_deployment(name=try_name, namespace=ns_name)
                    break
                except:
                    continue
            else:
                raise HTTPException(status_code=404, detail="Deployment not found")
        else:
            deployment = apps_v1.read_namespaced_deployment(name=pod_name, namespace=ns_name)
        
        # Extract env vars from first container
        env_vars = {}
        if deployment.spec.template.spec.containers:
            container = deployment.spec.template.spec.containers[0]
            if container.env:
                for env in container.env:
                    # Skip secret refs, only return plain values
                    if env.value is not None:
                        env_vars[env.name] = env.value
                    elif env.value_from:
                        env_vars[env.name] = "(secret)"
        
        return {"env_vars": env_vars, "deployment_name": deployment.metadata.name}
        
    except HTTPException:
        raise
    except client.exceptions.ApiException as e:
        if e.status == 404:
            raise HTTPException(status_code=404, detail="Deployment not found")
        raise HTTPException(status_code=500, detail=f"Error fetching env vars: {e.reason}")
    except Exception as e:
        print(f"Error fetching env vars for {pod_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/pods/{pod_name}/env")
def update_pod_env(pod_name: str, env_update: EnvVarUpdate, current_user: User = Depends(get_current_user)):
    """Update environment variables for a pod's deployment (triggers rolling restart)"""
    ns_name = get_namespace_name(current_user.company_name)
    
    try:
        # Find the deployment
        parts = pod_name.split('-')
        deployment = None
        deployment_name = None
        
        if len(parts) >= 3:
            for i in range(len(parts) - 1, 0, -1):
                try_name = '-'.join(parts[:i])
                try:
                    deployment = apps_v1.read_namespaced_deployment(name=try_name, namespace=ns_name)
                    deployment_name = try_name
                    break
                except:
                    continue
        
        if not deployment:
            try:
                deployment = apps_v1.read_namespaced_deployment(name=pod_name, namespace=ns_name)
                deployment_name = pod_name
            except:
                raise HTTPException(status_code=404, detail="Deployment not found")
        
        # Update environment variables
        if deployment.spec.template.spec.containers:
            container = deployment.spec.template.spec.containers[0]
            
            # Build new env list, preserving secrets
            new_env = []
            existing_secrets = {}
            
            if container.env:
                for env in container.env:
                    if env.value_from:
                        # Preserve secret refs
                        existing_secrets[env.name] = env
            
            # Add updated env vars
            for key, value in env_update.env_vars.items():
                if key in existing_secrets:
                    new_env.append(existing_secrets[key])
                else:
                    new_env.append(client.V1EnvVar(name=key, value=value))
            
            container.env = new_env
            
            # Apply the update
            apps_v1.patch_namespaced_deployment(
                name=deployment_name,
                namespace=ns_name,
                body=deployment
            )
            
            return {"message": f"Environment variables updated for {deployment_name}. Pod will restart."}
        
        raise HTTPException(status_code=400, detail="No containers found in deployment")
        
    except HTTPException:
        raise
    except client.exceptions.ApiException as e:
        raise HTTPException(status_code=500, detail=f"Error updating env vars: {e.reason}")
    except Exception as e:
        print(f"Error updating env vars for {pod_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


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


# ==================== PERSISTENT STORAGE API ====================

def get_company_storage_usage(ns_name: str) -> float:
    """Get total storage used by a company in Gi"""
    total_gi = 0.0
    try:
        pvcs = v1.list_namespaced_persistent_volume_claim(namespace=ns_name)
        for pvc in pvcs.items:
            if pvc.spec.resources.requests:
                storage = pvc.spec.resources.requests.get("storage", "0")
                # Parse storage string (e.g., "1Gi", "500Mi")
                if storage.endswith("Gi"):
                    total_gi += float(storage[:-2])
                elif storage.endswith("Mi"):
                    total_gi += float(storage[:-2]) / 1024
                elif storage.endswith("Ti"):
                    total_gi += float(storage[:-2]) * 1024
    except:
        pass
    return total_gi


@app.get("/storage/quota")
def get_storage_quota(current_user: User = Depends(get_current_user)):
    """Get storage quota and usage for the company"""
    ns_name = get_namespace_name(current_user.company_name)
    used = get_company_storage_usage(ns_name)
    
    return {
        "quota_gi": COMPANY_STORAGE_QUOTA,
        "used_gi": round(used, 2),
        "available_gi": round(COMPANY_STORAGE_QUOTA - used, 2),
        "percent_used": round((used / COMPANY_STORAGE_QUOTA) * 100, 1)
    }


@app.post("/pods/{pod_name}/storage")
def add_storage_to_deployment(pod_name: str, storage_config: StorageConfig, current_user: User = Depends(get_current_user)):
    """Add persistent storage to a deployment (creates PVC and mounts it)"""
    ns_name = get_namespace_name(current_user.company_name)
    
    # Check quota
    current_usage = get_company_storage_usage(ns_name)
    requested_gi = float(storage_config.size.replace("Gi", "").replace("Mi", "")) 
    if storage_config.size.endswith("Mi"):
        requested_gi = requested_gi / 1024
    
    if current_usage + requested_gi > COMPANY_STORAGE_QUOTA:
        raise HTTPException(status_code=400, detail=f"Storage quota exceeded. Available: {COMPANY_STORAGE_QUOTA - current_usage:.1f}Gi")
    
    try:
        # Find the deployment from pod name
        deployment = find_deployment_from_pod_name(pod_name, ns_name)
        deployment_name = deployment.metadata.name
        
        pvc_name = f"{deployment_name}-pvc"
        
        # Create PVC
        pvc = client.V1PersistentVolumeClaim(
            api_version="v1",
            kind="PersistentVolumeClaim",
            metadata=client.V1ObjectMeta(name=pvc_name, labels={"app": deployment_name}),
            spec=client.V1PersistentVolumeClaimSpec(
                access_modes=["ReadWriteOnce"],
                resources=client.V1ResourceRequirements(
                    requests={"storage": storage_config.size}
                )
            )
        )
        
        try:
            v1.create_namespaced_persistent_volume_claim(namespace=ns_name, body=pvc)
        except client.exceptions.ApiException as e:
            if e.status != 409:  # Ignore if already exists
                raise
        
        # Determine mount path based on container type
        container_name = deployment.spec.template.spec.containers[0].name
        mount_path = "/data"
        if container_name in ["mysql", "postgres", "postgresql"]:
            mount_path = "/var/lib/mysql" if container_name == "mysql" else "/var/lib/postgresql/data"
        elif container_name == "redis":
            mount_path = "/data"
        elif container_name == "wordpress":
            mount_path = "/var/www/html/wp-content"
        
        # Add volume to deployment
        volumes = deployment.spec.template.spec.volumes or []
        volume_exists = any(v.name == pvc_name for v in volumes)
        
        if not volume_exists:
            volumes.append(client.V1Volume(
                name=pvc_name,
                persistent_volume_claim=client.V1PersistentVolumeClaimVolumeSource(claim_name=pvc_name)
            ))
            deployment.spec.template.spec.volumes = volumes
            
            # Add volume mount to container
            container = deployment.spec.template.spec.containers[0]
            mounts = container.volume_mounts or []
            mounts.append(client.V1VolumeMount(name=pvc_name, mount_path=mount_path))
            container.volume_mounts = mounts
            
            # Apply update
            apps_v1.patch_namespaced_deployment(name=deployment_name, namespace=ns_name, body=deployment)
        
        return {"message": f"Storage {storage_config.size} added to {deployment_name}", "mount_path": mount_path, "pvc_name": pvc_name}
        
    except client.exceptions.ApiException as e:
        if e.status == 404:
            raise HTTPException(status_code=404, detail="Deployment not found")
        raise HTTPException(status_code=500, detail=f"Error adding storage: {e.reason}")


@app.get("/pods/{pod_name}/storage")
def get_deployment_storage(pod_name: str, current_user: User = Depends(get_current_user)):
    """Get storage info for a deployment"""
    ns_name = get_namespace_name(current_user.company_name)
    
    try:
        # Find the deployment from pod name
        deployment = find_deployment_from_pod_name(pod_name, ns_name)
        deployment_name = deployment.metadata.name
        
        # Get mount path from deployment spec
        mount_path = "/data"  # default
        containers = deployment.spec.template.spec.containers
        if containers and containers[0].volume_mounts:
            for vm in containers[0].volume_mounts:
                if vm.name == f"{deployment_name}-storage":
                    mount_path = vm.mount_path
                    break
        
        pvc_name = f"{deployment_name}-pvc"
        pvc = v1.read_namespaced_persistent_volume_claim(name=pvc_name, namespace=ns_name)
        
        return {
            "has_storage": True,
            "volumes": [{
                "pvc_name": pvc_name,
                "size": pvc.spec.resources.requests.get("storage", "Unknown"),
                "mount_path": mount_path,
                "status": pvc.status.phase,
                "access_modes": pvc.spec.access_modes
            }]
        }
    except client.exceptions.ApiException as e:
        if e.status == 404:
            return {"has_storage": False, "volumes": []}
        raise HTTPException(status_code=500, detail=f"Error checking storage: {e.reason}")


@app.delete("/pods/{pod_name}/storage")
def delete_deployment_storage(pod_name: str, current_user: User = Depends(get_current_user)):
    """Remove storage from a deployment"""
    ns_name = get_namespace_name(current_user.company_name)
    
    try:
        # Find the deployment from pod name
        deployment = find_deployment_from_pod_name(pod_name, ns_name)
        deployment_name = deployment.metadata.name
        pvc_name = f"{deployment_name}-pvc"
        
        # Remove volume mount from container
        containers = deployment.spec.template.spec.containers
        if containers[0].volume_mounts:
            containers[0].volume_mounts = [
                vm for vm in containers[0].volume_mounts 
                if vm.name != f"{deployment_name}-storage"
            ]
            if not containers[0].volume_mounts:
                containers[0].volume_mounts = None
        
        # Remove volume from pod spec
        if deployment.spec.template.spec.volumes:
            deployment.spec.template.spec.volumes = [
                v for v in deployment.spec.template.spec.volumes 
                if v.name != f"{deployment_name}-storage"
            ]
            if not deployment.spec.template.spec.volumes:
                deployment.spec.template.spec.volumes = None
        
        # Update deployment
        apps_v1.replace_namespaced_deployment(
            name=deployment_name,
            namespace=ns_name,
            body=deployment
        )
        
        # Delete the PVC
        v1.delete_namespaced_persistent_volume_claim(name=pvc_name, namespace=ns_name)
        
        return {"message": f"Storage removed from {deployment_name}"}
        
    except client.exceptions.ApiException as e:
        if e.status == 404:
            raise HTTPException(status_code=404, detail="Deployment or storage not found")
        raise HTTPException(status_code=500, detail=f"Error removing storage: {e.reason}")


# ==================== AUTO-SCALING API ====================

@app.post("/pods/{pod_name}/scaling")
def configure_autoscaling(pod_name: str, scaling_config: ScalingConfig, current_user: User = Depends(get_current_user)):
    """Configure Horizontal Pod Autoscaler for a deployment"""
    ns_name = get_namespace_name(current_user.company_name)
    
    if scaling_config.min_replicas < 1:
        raise HTTPException(status_code=400, detail="Minimum replicas must be at least 1")
    if scaling_config.max_replicas < scaling_config.min_replicas:
        raise HTTPException(status_code=400, detail="Maximum replicas must be >= minimum replicas")
    if scaling_config.max_replicas > 10:
        raise HTTPException(status_code=400, detail="Maximum replicas cannot exceed 10")
    
    try:
        # Find deployment from pod name
        deployment = find_deployment_from_pod_name(pod_name, ns_name)
        deployment_name = deployment.metadata.name
        
        # Create or update HPA
        hpa_name = f"{deployment_name}-hpa"
        
        hpa = client.V1HorizontalPodAutoscaler(
            api_version="autoscaling/v1",
            kind="HorizontalPodAutoscaler",
            metadata=client.V1ObjectMeta(name=hpa_name),
            spec=client.V1HorizontalPodAutoscalerSpec(
                scale_target_ref=client.V1CrossVersionObjectReference(
                    api_version="apps/v1",
                    kind="Deployment",
                    name=deployment_name
                ),
                min_replicas=scaling_config.min_replicas,
                max_replicas=scaling_config.max_replicas,
                target_cpu_utilization_percentage=scaling_config.cpu_threshold
            )
        )
        
        try:
            # Try to create
            autoscaling_v1.create_namespaced_horizontal_pod_autoscaler(namespace=ns_name, body=hpa)
        except client.exceptions.ApiException as e:
            if e.status == 409:
                # Already exists, update it
                autoscaling_v1.replace_namespaced_horizontal_pod_autoscaler(name=hpa_name, namespace=ns_name, body=hpa)
            else:
                raise
        
        return {
            "message": f"Auto-scaling configured for {deployment_name}",
            "min_replicas": scaling_config.min_replicas,
            "max_replicas": scaling_config.max_replicas,
            "cpu_threshold": scaling_config.cpu_threshold
        }
        
    except client.exceptions.ApiException as e:
        if e.status == 404:
            raise HTTPException(status_code=404, detail="Deployment not found")
        raise HTTPException(status_code=500, detail=f"Error configuring scaling: {e.reason}")


@app.get("/pods/{pod_name}/scaling")
def get_autoscaling_config(pod_name: str, current_user: User = Depends(get_current_user)):
    """Get current auto-scaling configuration for a deployment"""
    ns_name = get_namespace_name(current_user.company_name)
    
    try:
        # Find deployment from pod name
        deployment = find_deployment_from_pod_name(pod_name, ns_name)
        deployment_name = deployment.metadata.name
        hpa_name = f"{deployment_name}-hpa"
        hpa = autoscaling_v1.read_namespaced_horizontal_pod_autoscaler(name=hpa_name, namespace=ns_name)
        
        return {
            "enabled": True,
            "min_replicas": hpa.spec.min_replicas,
            "max_replicas": hpa.spec.max_replicas,
            "cpu_threshold": hpa.spec.target_cpu_utilization_percentage,
            "current_replicas": hpa.status.current_replicas,
            "desired_replicas": hpa.status.desired_replicas
        }
    except client.exceptions.ApiException as e:
        if e.status == 404:
            return {"enabled": False}
        raise HTTPException(status_code=500, detail=f"Error getting scaling config: {e.reason}")


@app.delete("/pods/{pod_name}/scaling")
def disable_autoscaling(pod_name: str, current_user: User = Depends(get_current_user)):
    """Disable auto-scaling for a deployment"""
    ns_name = get_namespace_name(current_user.company_name)
    
    try:
        # Find deployment from pod name
        deployment = find_deployment_from_pod_name(pod_name, ns_name)
        deployment_name = deployment.metadata.name
        hpa_name = f"{deployment_name}-hpa"
        autoscaling_v1.delete_namespaced_horizontal_pod_autoscaler(name=hpa_name, namespace=ns_name)
        return {"message": f"Auto-scaling disabled for {deployment_name}"}
    except client.exceptions.ApiException as e:
        if e.status == 404:
            return {"message": "Auto-scaling was not enabled"}
        raise HTTPException(status_code=500, detail=f"Error disabling scaling: {e.reason}")


# ==================== BACKUP & RESTORE API ====================

@app.post("/pods/{pod_name}/backup")
def create_backup(pod_name: str, current_user: User = Depends(get_current_user)):
    """Create a backup of a database deployment"""
    ns_name = get_namespace_name(current_user.company_name)
    
    try:
        # Find deployment from pod name
        deployment = find_deployment_from_pod_name(pod_name, ns_name)
        deployment_name = deployment.metadata.name
        container = deployment.spec.template.spec.containers[0]
        image = container.image.lower()
        
        timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        backup_name = f"backup-{deployment_name}-{timestamp}"
        
        # Determine backup command based on database type
        if "mysql" in image:
            backup_cmd = [
                "sh", "-c",
                f"mysqldump -u root -p$MYSQL_ROOT_PASSWORD --all-databases > /backup/{backup_name}.sql && echo 'Backup completed'"
            ]
            db_type = "mysql"
        elif "postgres" in image:
            backup_cmd = [
                "sh", "-c", 
                f"pg_dumpall -U postgres > /backup/{backup_name}.sql && echo 'Backup completed'"
            ]
            db_type = "postgres"
        else:
            raise HTTPException(status_code=400, detail="Backup is only supported for MySQL and PostgreSQL databases")
        
        # Create a backup PVC if it doesn't exist
        backup_pvc_name = f"{deployment_name}-backups"
        try:
            v1.read_namespaced_persistent_volume_claim(name=backup_pvc_name, namespace=ns_name)
        except client.exceptions.ApiException as e:
            if e.status == 404:
                backup_pvc = client.V1PersistentVolumeClaim(
                    api_version="v1",
                    kind="PersistentVolumeClaim",
                    metadata=client.V1ObjectMeta(name=backup_pvc_name),
                    spec=client.V1PersistentVolumeClaimSpec(
                        access_modes=["ReadWriteOnce"],
                        resources=client.V1ResourceRequirements(requests={"storage": "5Gi"})
                    )
                )
                v1.create_namespaced_persistent_volume_claim(namespace=ns_name, body=backup_pvc)
        
        # Create a Job to perform the backup
        job_name = f"backup-job-{deployment_name}-{timestamp}"
        
        # Get pod selector
        pod_label = deployment.spec.selector.match_labels.get("app", deployment_name)
        
        # Find the running pod
        pods = v1.list_namespaced_pod(namespace=ns_name, label_selector=f"app={pod_label}")
        if not pods.items:
            raise HTTPException(status_code=400, detail="No running pods found for this deployment")
        
        pod_name = pods.items[0].metadata.name
        
        # Execute backup command in the existing pod using kubectl exec approach
        # We'll create a job that copies data from the database
        
        job = client.V1Job(
            api_version="batch/v1",
            kind="Job",
            metadata=client.V1ObjectMeta(name=job_name, labels={"backup-for": deployment_name}),
            spec=client.V1JobSpec(
                ttl_seconds_after_finished=300,  # Clean up after 5 minutes
                template=client.V1PodTemplateSpec(
                    spec=client.V1PodSpec(
                        restart_policy="Never",
                        containers=[
                            client.V1Container(
                                name="backup",
                                image=container.image,
                                command=backup_cmd,
                                env=container.env,
                                volume_mounts=[
                                    client.V1VolumeMount(name="backup-storage", mount_path="/backup")
                                ]
                            )
                        ],
                        volumes=[
                            client.V1Volume(
                                name="backup-storage",
                                persistent_volume_claim=client.V1PersistentVolumeClaimVolumeSource(
                                    claim_name=backup_pvc_name
                                )
                            )
                        ]
                    )
                )
            )
        )
        
        batch_v1.create_namespaced_job(namespace=ns_name, body=job)
        
        return {
            "message": f"Backup job created for {deployment_name}",
            "backup_name": backup_name,
            "job_name": job_name,
            "database_type": db_type
        }
        
    except HTTPException:
        raise
    except client.exceptions.ApiException as e:
        if e.status == 404:
            raise HTTPException(status_code=404, detail="Deployment not found")
        raise HTTPException(status_code=500, detail=f"Error creating backup: {e.reason}")


@app.get("/pods/{pod_name}/backups")
def list_backups(pod_name: str, current_user: User = Depends(get_current_user)):
    """List all backups for a deployment"""
    ns_name = get_namespace_name(current_user.company_name)
    
    try:
        # Find deployment from pod name
        deployment = find_deployment_from_pod_name(pod_name, ns_name)
        deployment_name = deployment.metadata.name
        
        # List backup jobs
        jobs = batch_v1.list_namespaced_job(namespace=ns_name, label_selector=f"backup-for={deployment_name}")
        
        backups = []
        for job in jobs.items:
            status = "Running"
            if job.status.succeeded:
                status = "Completed"
            elif job.status.failed:
                status = "Failed"
            
            backups.append({
                "name": job.metadata.name,
                "timestamp": job.metadata.creation_timestamp.isoformat() if job.metadata.creation_timestamp else "Unknown",
                "status": status
            })
        
        # Sort by timestamp descending
        backups.sort(key=lambda x: x["timestamp"], reverse=True)
        
        return {"backups": backups}
        
    except client.exceptions.ApiException as e:
        raise HTTPException(status_code=500, detail=f"Error listing backups: {e.reason}")


@app.post("/pods/{pod_name}/restore/{backup_name}")
def restore_backup(pod_name: str, backup_name: str, current_user: User = Depends(get_current_user)):
    """Restore a database from a backup"""
    ns_name = get_namespace_name(current_user.company_name)
    
    try:
        # Find deployment from pod name
        deployment = find_deployment_from_pod_name(pod_name, ns_name)
        deployment_name = deployment.metadata.name
        container = deployment.spec.template.spec.containers[0]
        image = container.image.lower()
        
        timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        backup_pvc_name = f"{deployment_name}-backups"
        
        # Determine restore command
        if "mysql" in image:
            restore_cmd = [
                "sh", "-c",
                f"mysql -u root -p$MYSQL_ROOT_PASSWORD < /backup/{backup_name}.sql && echo 'Restore completed'"
            ]
        elif "postgres" in image:
            restore_cmd = [
                "sh", "-c",
                f"psql -U postgres < /backup/{backup_name}.sql && echo 'Restore completed'"
            ]
        else:
            raise HTTPException(status_code=400, detail="Restore is only supported for MySQL and PostgreSQL")
        
        # Create restore job
        job_name = f"restore-job-{deployment_name}-{timestamp}"
        
        job = client.V1Job(
            api_version="batch/v1",
            kind="Job",
            metadata=client.V1ObjectMeta(name=job_name),
            spec=client.V1JobSpec(
                ttl_seconds_after_finished=300,
                template=client.V1PodTemplateSpec(
                    spec=client.V1PodSpec(
                        restart_policy="Never",
                        containers=[
                            client.V1Container(
                                name="restore",
                                image=container.image,
                                command=restore_cmd,
                                env=container.env,
                                volume_mounts=[
                                    client.V1VolumeMount(name="backup-storage", mount_path="/backup")
                                ]
                            )
                        ],
                        volumes=[
                            client.V1Volume(
                                name="backup-storage",
                                persistent_volume_claim=client.V1PersistentVolumeClaimVolumeSource(
                                    claim_name=backup_pvc_name
                                )
                            )
                        ]
                    )
                )
            )
        )
        
        batch_v1.create_namespaced_job(namespace=ns_name, body=job)
        
        return {
            "message": f"Restore job created for {deployment_name}",
            "backup_name": backup_name,
            "job_name": job_name
        }
        
    except HTTPException:
        raise
    except client.exceptions.ApiException as e:
        if e.status == 404:
            raise HTTPException(status_code=404, detail="Deployment or backup not found")
        raise HTTPException(status_code=500, detail=f"Error restoring backup: {e.reason}")


@app.post("/pods/{pod_name}/auto-backup")
def configure_auto_backup(pod_name: str, current_user: User = Depends(get_current_user)):
    """Configure automatic daily backups using a CronJob"""
    ns_name = get_namespace_name(current_user.company_name)
    
    try:
        # Find deployment from pod name
        deployment = find_deployment_from_pod_name(pod_name, ns_name)
        deployment_name = deployment.metadata.name
        container = deployment.spec.template.spec.containers[0]
        image = container.image.lower()
        
        backup_pvc_name = f"{deployment_name}-backups"
        
        # Ensure backup PVC exists
        try:
            v1.read_namespaced_persistent_volume_claim(name=backup_pvc_name, namespace=ns_name)
        except client.exceptions.ApiException as e:
            if e.status == 404:
                backup_pvc = client.V1PersistentVolumeClaim(
                    api_version="v1",
                    kind="PersistentVolumeClaim",
                    metadata=client.V1ObjectMeta(name=backup_pvc_name),
                    spec=client.V1PersistentVolumeClaimSpec(
                        access_modes=["ReadWriteOnce"],
                        resources=client.V1ResourceRequirements(requests={"storage": "5Gi"})
                    )
                )
                v1.create_namespaced_persistent_volume_claim(namespace=ns_name, body=backup_pvc)
        
        # Determine backup command
        if "mysql" in image:
            backup_cmd = [
                "sh", "-c",
                "mysqldump -u root -p$MYSQL_ROOT_PASSWORD --all-databases > /backup/backup-$(date +%Y%m%d-%H%M%S).sql"
            ]
        elif "postgres" in image:
            backup_cmd = [
                "sh", "-c",
                "pg_dumpall -U postgres > /backup/backup-$(date +%Y%m%d-%H%M%S).sql"
            ]
        else:
            raise HTTPException(status_code=400, detail="Auto-backup only supported for MySQL and PostgreSQL")
        
        cronjob_name = f"autobackup-{deployment_name}"
        
        # Create CronJob for daily backup at 2 AM
        cronjob = client.V1CronJob(
            api_version="batch/v1",
            kind="CronJob",
            metadata=client.V1ObjectMeta(name=cronjob_name),
            spec=client.V1CronJobSpec(
                schedule="0 2 * * *",  # Daily at 2 AM
                concurrency_policy="Forbid",
                successful_jobs_history_limit=3,
                failed_jobs_history_limit=1,
                job_template=client.V1JobTemplateSpec(
                    spec=client.V1JobSpec(
                        ttl_seconds_after_finished=86400,  # Clean up after 24 hours
                        template=client.V1PodTemplateSpec(
                            spec=client.V1PodSpec(
                                restart_policy="OnFailure",
                                containers=[
                                    client.V1Container(
                                        name="backup",
                                        image=container.image,
                                        command=backup_cmd,
                                        env=container.env,
                                        volume_mounts=[
                                            client.V1VolumeMount(name="backup-storage", mount_path="/backup")
                                        ]
                                    )
                                ],
                                volumes=[
                                    client.V1Volume(
                                        name="backup-storage",
                                        persistent_volume_claim=client.V1PersistentVolumeClaimVolumeSource(
                                            claim_name=backup_pvc_name
                                        )
                                    )
                                ]
                            )
                        )
                    )
                )
            )
        )
        
        try:
            batch_v1.create_namespaced_cron_job(namespace=ns_name, body=cronjob)
        except client.exceptions.ApiException as e:
            if e.status == 409:
                # Already exists
                return {"message": "Auto-backup already configured", "schedule": "Daily at 2 AM"}
            raise
        
        return {
            "message": f"Auto-backup configured for {deployment_name}",
            "schedule": "Daily at 2 AM",
            "cronjob_name": cronjob_name
        }
        
    except HTTPException:
        raise
    except client.exceptions.ApiException as e:
        raise HTTPException(status_code=500, detail=f"Error configuring auto-backup: {e.reason}")


@app.delete("/pods/{pod_name}/auto-backup")
def disable_auto_backup(pod_name: str, current_user: User = Depends(get_current_user)):
    """Disable automatic backups"""
    ns_name = get_namespace_name(current_user.company_name)
    
    try:
        # Find deployment from pod name
        deployment = find_deployment_from_pod_name(pod_name, ns_name)
        deployment_name = deployment.metadata.name
        cronjob_name = f"autobackup-{deployment_name}"
        batch_v1.delete_namespaced_cron_job(name=cronjob_name, namespace=ns_name)
        return {"message": f"Auto-backup disabled for {deployment_name}"}
    except client.exceptions.ApiException as e:
        if e.status == 404:
            return {"message": "Auto-backup was not configured"}
        raise HTTPException(status_code=500, detail=f"Error disabling auto-backup: {e.reason}")


@app.get("/pods/{pod_name}/auto-backup")
def get_auto_backup_status(pod_name: str, current_user: User = Depends(get_current_user)):
    """Check if auto-backup is enabled for a deployment"""
    ns_name = get_namespace_name(current_user.company_name)
    
    try:
        # Find deployment from pod name
        deployment = find_deployment_from_pod_name(pod_name, ns_name)
        deployment_name = deployment.metadata.name
        cronjob_name = f"autobackup-{deployment_name}"
        cronjob = batch_v1.read_namespaced_cron_job(name=cronjob_name, namespace=ns_name)
        
        return {
            "enabled": True,
            "schedule": cronjob.spec.schedule,
            "last_schedule": cronjob.status.last_schedule_time.isoformat() if cronjob.status.last_schedule_time else None
        }
    except client.exceptions.ApiException as e:
        if e.status == 404:
            return {"enabled": False}
        raise HTTPException(status_code=500, detail=f"Error checking auto-backup status: {e.reason}")


# ==================== MONITORING API ====================

@app.get("/monitoring")
def get_monitoring_data(current_user: User = Depends(get_current_user)):
    """Get comprehensive monitoring data for all pods"""
    ns_name = get_namespace_name(current_user.company_name)
    
    prices = {"nginx": 5.00, "postgres": 15.00, "redis": 10.00, "custom": 20.00, "wordpress": 20.00, "mysql": 10.00, "uptime": 10.00}
    
    try:
        # Get all pods
        k8s_pods = v1.list_namespaced_pod(namespace=ns_name)
        
        # Get all deployments for replica info
        deployments = apps_v1.list_namespaced_deployment(namespace=ns_name)
        
        # Get all HPAs
        hpas = []
        try:
            hpa_list = autoscaling_v1.list_namespaced_horizontal_pod_autoscaler(namespace=ns_name)
            hpas = hpa_list.items
        except:
            pass
        
        # Get all PVCs for storage info
        pvcs = []
        try:
            pvc_list = v1.list_namespaced_persistent_volume_claim(namespace=ns_name)
            pvcs = pvc_list.items
        except:
            pass
        
        # Get metrics for all pods (if metrics-server available)
        pod_metrics = {}
        try:
            metrics = custom_api.list_namespaced_custom_object(
                group="metrics.k8s.io",
                version="v1beta1",
                namespace=ns_name,
                plural="pods"
            )
            for item in metrics.get("items", []):
                pod_name = item["metadata"]["name"]
                containers = item.get("containers", [])
                if containers:
                    cpu_str = containers[0].get("usage", {}).get("cpu", "0")
                    memory_str = containers[0].get("usage", {}).get("memory", "0")
                    
                    # Parse CPU (convert nanoCPU to millicores)
                    cpu_value = 0
                    if cpu_str.endswith('n'):
                        cpu_value = int(cpu_str[:-1]) / 1000000  # nano to milli
                    elif cpu_str.endswith('m'):
                        cpu_value = int(cpu_str[:-1])
                    else:
                        cpu_value = int(cpu_str) * 1000  # cores to milli
                    
                    # Parse Memory (convert to Mi)
                    memory_value = 0
                    if memory_str.endswith('Ki'):
                        memory_value = int(memory_str[:-2]) / 1024
                    elif memory_str.endswith('Mi'):
                        memory_value = int(memory_str[:-2])
                    elif memory_str.endswith('Gi'):
                        memory_value = int(memory_str[:-2]) * 1024
                    else:
                        memory_value = int(memory_str) / (1024 * 1024)
                    
                    pod_metrics[pod_name] = {
                        "cpu_millicores": round(cpu_value, 2),
                        "memory_mi": round(memory_value, 2)
                    }
        except Exception as e:
            print(f"Could not fetch pod metrics: {e}")
        
        # Build monitoring data
        pods_data = []
        total_cpu = 0
        total_memory = 0
        status_counts = {"Running": 0, "Pending": 0, "Failed": 0, "Succeeded": 0, "Unknown": 0}
        category_counts = {"app": 0, "db": 0, "cache": 0, "monitoring": 0, "other": 0}
        
        for p in k8s_pods.items:
            labels = p.metadata.labels or {}
            app_type = labels.get("app", "unknown")
            base_type = app_type.split('-')[0] if '-' in app_type else app_type
            
            # Status
            status = p.status.phase
            if p.status.container_statuses:
                for cs in p.status.container_statuses:
                    if cs.state.waiting:
                        status = cs.state.waiting.reason
                        break
            
            # Count statuses
            if status in status_counts:
                status_counts[status] += 1
            elif status in ["CrashLoopBackOff", "Error", "ImagePullBackOff"]:
                status_counts["Failed"] += 1
            else:
                status_counts["Unknown"] += 1
            
            # Category
            if base_type in ["wordpress", "nginx"]:
                category_counts["app"] += 1
            elif base_type in ["postgres", "mysql"]:
                category_counts["db"] += 1
            elif base_type in ["redis"]:
                category_counts["cache"] += 1
            elif base_type in ["uptime"]:
                category_counts["monitoring"] += 1
            else:
                category_counts["other"] += 1
            
            # Metrics
            metrics = pod_metrics.get(p.metadata.name, {"cpu_millicores": 0, "memory_mi": 0})
            total_cpu += metrics["cpu_millicores"]
            total_memory += metrics["memory_mi"]
            
            # Age
            age_hours = 0
            if p.status.start_time:
                delta = datetime.now(p.status.start_time.tzinfo) - p.status.start_time
                age_hours = round(delta.total_seconds() / 3600, 1)
            
            # Restarts
            restarts = 0
            if p.status.container_statuses:
                restarts = sum(cs.restart_count for cs in p.status.container_statuses)
            
            pods_data.append({
                "name": p.metadata.name,
                "type": app_type,
                "status": status,
                "cpu_millicores": metrics["cpu_millicores"],
                "memory_mi": metrics["memory_mi"],
                "age_hours": age_hours,
                "restarts": restarts,
                "cost": prices.get(base_type, 20.00)
            })
        
        # Deployment/HPA info
        deployments_data = []
        for d in deployments.items:
            name = d.metadata.name
            desired = d.spec.replicas or 1
            ready = d.status.ready_replicas or 0
            
            # Check for HPA
            hpa_info = None
            for hpa in hpas:
                if hpa.spec.scale_target_ref.name == name:
                    hpa_info = {
                        "min_replicas": hpa.spec.min_replicas,
                        "max_replicas": hpa.spec.max_replicas,
                        "current_replicas": hpa.status.current_replicas or 1,
                        "cpu_target": hpa.spec.target_cpu_utilization_percentage
                    }
                    break
            
            deployments_data.append({
                "name": name,
                "desired_replicas": desired,
                "ready_replicas": ready,
                "hpa": hpa_info
            })
        
        # Storage info
        storage_data = []
        total_storage_used = 0
        for pvc in pvcs:
            size_str = pvc.spec.resources.requests.get("storage", "0Gi")
            size_gi = float(size_str.replace("Gi", "")) if "Gi" in size_str else 0
            total_storage_used += size_gi
            storage_data.append({
                "name": pvc.metadata.name,
                "size": size_str,
                "status": pvc.status.phase
            })
        
        # Calculate totals
        total_pods = len(k8s_pods.items)
        total_cost = sum(p["cost"] for p in pods_data)
        
        return {
            "summary": {
                "total_pods": total_pods,
                "total_deployments": len(deployments.items),
                "total_cpu_millicores": round(total_cpu, 2),
                "total_memory_mi": round(total_memory, 2),
                "total_storage_gi": round(total_storage_used, 2),
                "storage_quota_gi": COMPANY_STORAGE_QUOTA,
                "total_monthly_cost": round(total_cost, 2),
                "status_counts": status_counts,
                "category_counts": category_counts
            },
            "pods": pods_data,
            "deployments": deployments_data,
            "storage": storage_data,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except client.exceptions.ApiException as e:
        if e.status == 404:
            return {
                "summary": {
                    "total_pods": 0,
                    "total_deployments": 0,
                    "total_cpu_millicores": 0,
                    "total_memory_mi": 0,
                    "total_storage_gi": 0,
                    "storage_quota_gi": COMPANY_STORAGE_QUOTA,
                    "total_monthly_cost": 0,
                    "status_counts": {"Running": 0, "Pending": 0, "Failed": 0, "Succeeded": 0, "Unknown": 0},
                    "category_counts": {"app": 0, "db": 0, "cache": 0, "monitoring": 0, "other": 0}
                },
                "pods": [],
                "deployments": [],
                "storage": [],
                "timestamp": datetime.utcnow().isoformat()
            }
        raise HTTPException(status_code=500, detail=f"Error fetching monitoring data: {e.reason}")

# =============================================
# ADMIN PORTAL ENDPOINTS
# =============================================

def require_admin(current_user: User = Depends(get_current_user)):
    """Dependency to require admin privileges"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user

@app.get("/admin/stats")
def get_admin_stats(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Get platform-wide statistics for admin dashboard"""
    try:
        # Get all non-admin users
        users = db.query(User).filter(User.is_admin == False).all()
        
        # Get unique companies
        companies = set(u.company_name for u in users)
        
        # Count all pods across all namespaces
        total_pods = 0
        total_deployments = 0
        total_cost = 0.0
        
        prices = {"nginx": 5.00, "postgres": 15.00, "redis": 10.00, "custom": 20.00, "wordpress": 20.00, "mysql": 10.00, "uptime": 10.00}
        
        for company in companies:
            ns_name = get_namespace_name(company)
            try:
                pods = v1.list_namespaced_pod(namespace=ns_name)
                deployments = apps_v1.list_namespaced_deployment(namespace=ns_name)
                total_pods += len(pods.items)
                total_deployments += len(deployments.items)
                
                for pod in pods.items:
                    pod_type = pod.metadata.labels.get("type", "custom") if pod.metadata.labels else "custom"
                    total_cost += prices.get(pod_type, 20.00)
            except:
                pass
        
        return {
            "total_companies": len(companies),
            "total_users": len(users),
            "total_pods": total_pods,
            "total_deployments": total_deployments,
            "estimated_monthly_revenue": round(total_cost, 2)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching admin stats: {str(e)}")

@app.get("/admin/companies")
def get_admin_companies(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Get all companies with their users and resource counts"""
    try:
        users = db.query(User).filter(User.is_admin == False).all()
        
        # Group users by company
        companies_map = {}
        for user in users:
            if user.company_name not in companies_map:
                companies_map[user.company_name] = {
                    "name": user.company_name,
                    "namespace": get_namespace_name(user.company_name),
                    "users": [],
                    "pod_count": 0,
                    "deployment_count": 0,
                    "monthly_cost": 0.0
                }
            companies_map[user.company_name]["users"].append({
                "id": user.id,
                "username": user.username
            })
        
        prices = {"nginx": 5.00, "postgres": 15.00, "redis": 10.00, "custom": 20.00, "wordpress": 20.00, "mysql": 10.00, "uptime": 10.00}
        
        # Get resource counts for each company
        for company_name, company_data in companies_map.items():
            try:
                ns_name = company_data["namespace"]
                pods = v1.list_namespaced_pod(namespace=ns_name)
                deployments = apps_v1.list_namespaced_deployment(namespace=ns_name)
                
                company_data["pod_count"] = len(pods.items)
                company_data["deployment_count"] = len(deployments.items)
                
                for pod in pods.items:
                    pod_type = pod.metadata.labels.get("type", "custom") if pod.metadata.labels else "custom"
                    company_data["monthly_cost"] += prices.get(pod_type, 20.00)
                
                company_data["monthly_cost"] = round(company_data["monthly_cost"], 2)
            except:
                pass
        
        return list(companies_map.values())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching companies: {str(e)}")

@app.delete("/admin/companies/{company_name}")
def delete_admin_company(company_name: str, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Delete a company and all its resources"""
    try:
        # Delete all users of this company
        users = db.query(User).filter(User.company_name == company_name).all()
        if not users:
            raise HTTPException(status_code=404, detail="Company not found")
        
        for user in users:
            db.delete(user)
        
        # Delete namespace (this deletes all resources in it)
        ns_name = get_namespace_name(company_name)
        try:
            v1.delete_namespace(name=ns_name)
            print(f"[ADMIN] Deleted namespace: {ns_name}")
        except client.exceptions.ApiException as e:
            if e.status != 404:
                print(f"[ADMIN] Error deleting namespace: {e}")
        
        db.commit()
        return {"msg": f"Company '{company_name}' and all resources deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting company: {str(e)}")

@app.get("/admin/users")
def get_admin_users(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Get all non-admin users"""
    try:
        users = db.query(User).filter(User.is_admin == False).all()
        return [
            {
                "id": u.id,
                "username": u.username,
                "company_name": u.company_name
            }
            for u in users
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching users: {str(e)}")

@app.delete("/admin/users/{user_id}")
def delete_admin_user(user_id: int, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Delete a specific user"""
    try:
        user = db.query(User).filter(User.id == user_id, User.is_admin == False).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found or cannot delete admin")
        
        username = user.username
        company = user.company_name
        
        db.delete(user)
        db.commit()
        
        return {"msg": f"User '{username}' from company '{company}' deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting user: {str(e)}")

# =====================================================================
# EUSUITE DEPLOYMENT - Dylan's Office 365 Suite (1-Click Deploy)
# =====================================================================

@app.get("/eusuite/apps")
def get_eusuite_apps(current_user: User = Depends(get_current_user)):
    """Get list of available EUSUITE apps"""
    return {
        "suite_name": "EUSUITE - European Office Suite",
        "description": "A complete Office 365 alternative by Dylan0165",
        "github": "https://github.com/Dylan0165/EUSUITE",
        "apps": [
            {
                "id": app_id,
                "name": app_info["name"],
                "description": app_info["description"],
                "image": app_info["image"],
                "port": app_info["port"]
            }
            for app_id, app_info in EUSUITE_APPS.items()
        ]
    }

@app.post("/eusuite/deploy")
def deploy_eusuite(current_user: User = Depends(get_current_user)):
    """Deploy the entire EUSUITE stack with one click"""
    ns_name = get_namespace_name(current_user.company_name)
    deployed_apps = []
    failed_apps = []
    
    print(f"[EUSUITE] Starting deployment for {current_user.company_name} in namespace {ns_name}")
    
    # Ensure namespace exists and has regcred
    try:
        v1.read_namespace(name=ns_name)
    except client.exceptions.ApiException:
        ns_body = client.V1Namespace(metadata=client.V1ObjectMeta(name=ns_name))
        v1.create_namespace(body=ns_body)
    
    ensure_regcred_in_namespace(ns_name)
    
    # Generate a unique group ID for this EUSUITE deployment
    group_id = f"eusuite-{datetime.now().strftime('%Y%m%d%H%M%S')}"
    
    for app_id, app_info in EUSUITE_APPS.items():
        try:
            deployment_name = f"eusuite-{app_id}-{current_user.company_name.lower().replace(' ', '-')[:10]}"
            
            print(f"[EUSUITE] Deploying {app_info['name']} as {deployment_name}")
            
            # Create Deployment
            container = client.V1Container(
                name=app_id,
                image=app_info["image"],
                ports=[client.V1ContainerPort(container_port=app_info["port"])],
                resources=client.V1ResourceRequirements(
                    requests={"memory": "128Mi", "cpu": "100m"},
                    limits={"memory": "512Mi", "cpu": "500m"}
                ),
                env=[client.V1EnvVar(name=k, value=v) for k, v in app_info.get("env", {}).items()]
            )
            
            deployment = client.V1Deployment(
                metadata=client.V1ObjectMeta(
                    name=deployment_name,
                    labels={
                        "app": deployment_name,
                        "eusuite-app": app_id,
                        "eusuite-group": group_id,
                        "company": current_user.company_name.lower().replace(' ', '-')
                    }
                ),
                spec=client.V1DeploymentSpec(
                    replicas=1,
                    selector=client.V1LabelSelector(match_labels={"app": deployment_name}),
                    template=client.V1PodTemplateSpec(
                        metadata=client.V1ObjectMeta(labels={
                            "app": deployment_name,
                            "eusuite-app": app_id,
                            "eusuite-group": group_id,
                            "type": "eusuite"
                        }),
                        spec=client.V1PodSpec(
                            containers=[container],
                            image_pull_secrets=[client.V1LocalObjectReference(name="regcred")]
                        )
                    )
                )
            )
            
            try:
                apps_v1.create_namespaced_deployment(namespace=ns_name, body=deployment)
            except client.exceptions.ApiException as e:
                if e.status == 409:  # Already exists
                    apps_v1.replace_namespaced_deployment(name=deployment_name, namespace=ns_name, body=deployment)
                else:
                    raise
            
            # Create Service with NodePort
            service = client.V1Service(
                metadata=client.V1ObjectMeta(
                    name=f"{deployment_name}-svc",
                    labels={"eusuite-app": app_id, "eusuite-group": group_id}
                ),
                spec=client.V1ServiceSpec(
                    type="NodePort",
                    selector={"app": deployment_name},
                    ports=[client.V1ServicePort(port=app_info["port"], target_port=app_info["port"])]
                )
            )
            
            try:
                created_svc = v1.create_namespaced_service(namespace=ns_name, body=service)
                node_port = created_svc.spec.ports[0].node_port
            except client.exceptions.ApiException as e:
                if e.status == 409:  # Already exists
                    existing_svc = v1.read_namespaced_service(name=f"{deployment_name}-svc", namespace=ns_name)
                    node_port = existing_svc.spec.ports[0].node_port
                else:
                    raise
            
            deployed_apps.append({
                "id": app_id,
                "name": app_info["name"],
                "description": app_info["description"],
                "deployment": deployment_name,
                "node_port": node_port,
                "url": f"http://192.168.154.114:{node_port}"
            })
            
            print(f"[EUSUITE] ✓ {app_info['name']} deployed on port {node_port}")
            
        except Exception as e:
            print(f"[EUSUITE] ✗ Failed to deploy {app_info['name']}: {str(e)}")
            failed_apps.append({
                "id": app_id,
                "name": app_info["name"],
                "error": str(e)
            })
    
    return {
        "success": len(failed_apps) == 0,
        "message": f"EUSUITE deployment complete: {len(deployed_apps)} apps deployed, {len(failed_apps)} failed",
        "group_id": group_id,
        "deployed": deployed_apps,
        "failed": failed_apps
    }

@app.delete("/eusuite/undeploy")
def undeploy_eusuite(current_user: User = Depends(get_current_user)):
    """Remove all EUSUITE apps from the user's namespace"""
    ns_name = get_namespace_name(current_user.company_name)
    deleted = []
    
    try:
        # Find all EUSUITE deployments
        deployments = apps_v1.list_namespaced_deployment(
            namespace=ns_name,
            label_selector="type=eusuite"
        )
        
        for dep in deployments.items:
            dep_name = dep.metadata.name
            
            # Delete deployment
            apps_v1.delete_namespaced_deployment(name=dep_name, namespace=ns_name)
            
            # Delete service
            try:
                v1.delete_namespaced_service(name=f"{dep_name}-svc", namespace=ns_name)
            except:
                pass
            
            deleted.append(dep_name)
        
        return {
            "success": True,
            "message": f"EUSUITE undeployed: {len(deleted)} apps removed",
            "deleted": deleted
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error undeploying EUSUITE: {str(e)}")