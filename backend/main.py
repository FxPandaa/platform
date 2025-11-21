from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from kubernetes import client, config
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI()

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load K8s config
try:
    config.load_incluster_config()
    print("Loaded in-cluster config")
except config.ConfigException:
    try:
        config.load_kube_config()
        print("Loaded kube config")
    except config.ConfigException:
        print("Could not load kubernetes config")

v1 = client.CoreV1Api()
apps_v1 = client.AppsV1Api()

class WorkspaceRequest(BaseModel):
    customer_name: str
    service_type: str

@app.post("/create-workspace")
def create_workspace(request: WorkspaceRequest):
    customer_name = request.customer_name.lower().replace(" ", "-")
    namespace_name = f"org-{customer_name}"
    
    # 1. Create Namespace
    try:
        ns_body = client.V1Namespace(metadata=client.V1ObjectMeta(name=namespace_name))
        v1.create_namespace(body=ns_body)
    except client.exceptions.ApiException as e:
        if e.status == 409:
            pass # Already exists
        else:
            raise HTTPException(status_code=500, detail=f"Namespace error: {e}")

    # 2. Deploy Nginx Deployment
    deployment_name = f"nginx-{customer_name}"
    container = client.V1Container(
        name="nginx",
        image="nginx:latest",
        ports=[client.V1ContainerPort(container_port=80)]
    )
    template = client.V1PodTemplateSpec(
        metadata=client.V1ObjectMeta(labels={"app": "nginx"}),
        spec=client.V1PodSpec(containers=[container])
    )
    spec = client.V1DeploymentSpec(
        replicas=1,
        selector=client.V1LabelSelector(match_labels={"app": "nginx"}),
        template=template
    )
    deployment = client.V1Deployment(
        api_version="apps/v1",
        kind="Deployment",
        metadata=client.V1ObjectMeta(name=deployment_name),
        spec=spec
    )

    try:
        apps_v1.create_namespaced_deployment(namespace=namespace_name, body=deployment)
    except client.exceptions.ApiException as e:
        if e.status == 409:
             return {"status": "Workspace already exists", "namespace": namespace_name}
        raise HTTPException(status_code=500, detail=f"Deployment error: {e}")

    return {"status": "Workspace created successfully", "namespace": namespace_name}
