from typing import Optional
import docker
import os
import logging
from dotenv import load_dotenv
from utils.logging import get_logger, configure_root
import string, secrets

configure_root()
logger = get_logger(__name__)
load_dotenv()


PIPELINE_IMAGE = os.getenv("PIPELINE_IMAGE", "backend-pipeline:latest")
POSTGRES_IMAGE = os.getenv("POSTGRES_IMAGE", "backend-postgres:latest")
AGENTIC_IMAGE = os.getenv("AGENTIC_IMAGE", "backend-agentic:latest")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "admin123")
PIPELINE_CONTAINER_PORT = os.getenv("PIPELINE_CONTAINER_PORT", "8000/tcp")
PIPELINE_ERROR_INDEXING_PORT = os.getenv("PIPELINE_ERROR_INDEXING_PORT", "8001/tcp")
AGENTIC_CONTAINER_PORT = os.getenv("AGENTIC_CONTAINER_PORT", "5333/tcp")

dev = os.getenv("ENVIRONMENT", "prod") == "dev"
dynamic_ports = os.getenv("DYNAMIC_PORTS", "true") == "true"

project_root = os.path.join(os.getcwd(),"backend")


def rand_str(n=12):
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(n))


def run_pipeline_container(client: docker.DockerClient, pipeline_id: str):
    # Ensure images exist
    try:
        client.images.get(PIPELINE_IMAGE)
        logger.info(f"Found image: {PIPELINE_IMAGE}")
    except docker.errors.ImageNotFound:
        logger.error(f"Image not found: {PIPELINE_IMAGE}")
        raise docker.errors.ImageNotFound(f"Image '{PIPELINE_IMAGE}' not found. Run `docker compose build` first.")
    
    try:
        client.images.get(POSTGRES_IMAGE)
        logger.info(f"Found image: {POSTGRES_IMAGE}")
    except docker.errors.ImageNotFound:
        logger.error(f"Image not found: {POSTGRES_IMAGE}")
        raise docker.errors.ImageNotFound(f"Image '{POSTGRES_IMAGE}' not found. Run `docker compose build` first.")
    
    try:
        client.images.get(AGENTIC_IMAGE)
        logger.info(f"Found image: {AGENTIC_IMAGE}")
    except docker.errors.ImageNotFound:
        logger.error(f"Image not found: {AGENTIC_IMAGE}")
        raise docker.errors.ImageNotFound(f"Image '{AGENTIC_IMAGE}' not found. Run `docker compose build` first.")
    
    logger.info("All required images found.")

    # Ensure container does not already exist
    try:
        client.containers.get(pipeline_id)
        raise ValueError(f"Container '{pipeline_id}' already exists")
    except docker.errors.NotFound:
        pass

    # Create a dedicated network for this pipeline instance
    network_name = f"net_{pipeline_id}"
    network = client.networks.create(network_name, driver="bridge")
    logger.info(f"Created network: {network_name}")

    # Generate RW dynamic credentials
    read_user = f"read_{rand_str(6)}".lower()
    read_pass = rand_str(24).lower()
    write_user = f"write_{rand_str(6)}".lower()
    write_pass = rand_str(24).lower()

    # Start Postgres container first
    db_container_name = f"db_{pipeline_id}"
    db_container = client.containers.run(
        image=POSTGRES_IMAGE,
        name=db_container_name,
        detach=True,
        environment={
            "POSTGRES_DB": "db",
            "POSTGRES_USER": "admin",
            "POSTGRES_PASSWORD": POSTGRES_PASSWORD,
            "POSTGRES_READ_USER": read_user,
            "POSTGRES_READ_PASSWORD": read_pass,
            "POSTGRES_WRITE_USER": write_user,
            "POSTGRES_WRITE_PASSWORD": write_pass,

        },
        network=network_name,
        ports={"5432/tcp": 5432 if not dynamic_ports else None},   # dynamic host port
    )

    logger.info(f"Started DB container: {db_container_name}")



    agentic_container_name = f"agentic_{pipeline_id}"
    # Start pipeline container
    agentic_container = client.containers.run(
        image=AGENTIC_IMAGE,
        name=agentic_container_name,
        detach=True,
        environment={
            "POSTGRES_HOST": db_container_name,
            "POSTGRES_DB": "db",
            "POSTGRES_USER": read_user,
            "POSTGRES_PASSWORD": read_pass,
            "RUNBOOK_DATABASE_URL": f"postgresql+asyncpg://{write_user}:{write_pass}@{db_container_name}:5432/db",
            "DATABASE_URL": f"postgresql+asyncpg://{write_user}:{write_pass}@{db_container_name}:5432/db",
            "PATHWAY_API_URL": f"http://{pipeline_id}:{PIPELINE_ERROR_INDEXING_PORT.split('/')[0]}",
        },
        network=network_name,
        ports={AGENTIC_CONTAINER_PORT: AGENTIC_CONTAINER_PORT if not dynamic_ports else None},   # dynamic host port
        volumes=({
            os.path.join(project_root, "agentic"): {
                "bind": "/app/agentic", 
                "mode": "ro"
            },
            os.path.join(project_root, "lib"): {
                "bind": "/app/lib",
                "mode": "ro"
            },
            os.path.join(project_root, "postgres_util.py"): {
                "bind": "/app/postgres_util.py",
                "mode": "ro"
            },
            os.path.join(project_root, "agentic/.env"): {
                "bind": "/app/.env",
                "mode": "ro"
            }
        } if dev else {})
    )

    logger.info(f"Started Agentic container: {agentic_container_name}")


    pipeline_container = client.containers.run(
        image=PIPELINE_IMAGE,
        name=pipeline_id,
        detach=True,
        environment={
            "PIPELINE_ID": pipeline_id,
            "AGENTIC_URL": f"http://{agentic_container_name}:{AGENTIC_CONTAINER_PORT.split('/')[0]}",
            "POSTGRES_HOST": db_container_name,
            "POSTGRES_DB": "db",
            "POSTGRES_USER": write_user,
            "POSTGRES_PASSWORD": write_pass,
            "ERROR_INDEXING_HOST": "0.0.0.0",
            "ERROR_INDEXING_PORT": PIPELINE_ERROR_INDEXING_PORT.split('/')[0],
            "ERRORS_JSON_PATH": "pipeline/errors_table/Errors.json",
            "EMBEDDING_MODEL": "models/text-embedding-004",
        },
        network=network_name,
        ports={
            PIPELINE_CONTAINER_PORT: PIPELINE_CONTAINER_PORT if not dynamic_ports else None,
            PIPELINE_ERROR_INDEXING_PORT: PIPELINE_ERROR_INDEXING_PORT if not dynamic_ports else None,
        },
        volumes=({  
            os.path.join(project_root, "pipeline"): {
                "bind": "/app/pipeline",
                "mode": "ro"
            },
            os.path.join(project_root, "lib"): {
                "bind": "/app/lib",
                "mode": "ro"
            },
            os.path.join(project_root, "postgres_util.py"): {
                "bind": "/app/postgres_util.py",
                "mode": "ro"
            },
            os.path.join(project_root, "pipeline/.env"): {
                "bind": "/app/.env",
                "mode": "ro"
            }
        } if dev else {})
    )

    try:
        pipeline_container.reload()
        agentic_container.reload()
        db_container.reload()
        assigned_pipeline_port = pipeline_container.ports[PIPELINE_CONTAINER_PORT][0]['HostPort']
        assigned_pipeline_error_port = pipeline_container.ports[PIPELINE_ERROR_INDEXING_PORT][0]['HostPort']
        assigned_agentic_port = agentic_container.ports[AGENTIC_CONTAINER_PORT][0]['HostPort']
        assigned_database_port = db_container.ports["5432/tcp"][0]['HostPort']
    except Exception as e:
        logger.error(e)
        pipeline_container.stop()
        pipeline_container.remove()
        db_container.stop()
        db_container.remove()
        agentic_container.stop()
        agentic_container.remove()
        network.remove()
        raise RuntimeError("Failed to determine assigned host port.")

    logger.info(f"Pipeline container running on host port {assigned_pipeline_port}")
    logger.info(f"Pipeline error indexing on host port {assigned_pipeline_error_port}")
    logger.info(f"Agentic container running on host port {assigned_agentic_port}")

    return {
        "pipeline_container_id": pipeline_container.id,
        "db_container_id": db_container.id,
        "agentic_container_id": agentic_container.id,
        "network": network_name,
        "pipeline_host_port": assigned_pipeline_port,
        "pipeline_error_indexing_port": assigned_pipeline_error_port,
        "agentic_host_port": assigned_agentic_port,
        "db_host_port": assigned_database_port,
    }


def stop_docker_container(client: docker.DockerClient, pipeline_id: str):
    db_container_name = f"db_{pipeline_id}"
    agentic_container_name = f"agentic_{pipeline_id}"
    network_name = f"net_{pipeline_id}"

    # Stop pipeline container
    try:
        pipeline_container = client.containers.get(pipeline_id)
        pipeline_container.stop()
        pipeline_container.remove()
        logger.info(f"Removed pipeline container {pipeline_id}")
    except docker.errors.NotFound:
        pass

    # Stop DB container
    try:
        db_container = client.containers.get(db_container_name)
        db_container.stop()
        db_container.remove()
        logger.info(f"Removed DB container {db_container_name}")
    except docker.errors.NotFound:
        pass

    try:
        agentic_container = client.containers.get(agentic_container_name)
        agentic_container.stop()
        agentic_container.remove()
        logger.info(f"Removed Agentic container {agentic_container_name}")
    except docker.errors.NotFound:
        pass

    # Remove network
    try:
        network = client.networks.get(network_name)
        network.remove()
        logger.info(f"Removed network {network_name}")
    except docker.errors.NotFound:
        pass

    return {"pipeline_id": pipeline_id, "cleaned": True}
