# A demo Dockerfile with the same name is to be added in the pipeline folder. 
# The JSON file will be parsed and processed as environment variables within the container
from typing import Optional
import docker
import os
import logging
from dotenv import load_dotenv
import logging
from utils.logging import get_logger, configure_root

configure_root()
logger = get_logger(__name__)

load_dotenv()

def run_pipeline_container(client: docker.DockerClient,
                           pipeline_id: str):
    """
    Runs a container from the pipeline image.
    """

    # 1. Check if the base pipeline image exists
    try:
        client.images.get(os.getenv("PIPELINE_IMAGE_NAME"))
        logger.info(f"Base image '{os.getenv("PIPELINE_IMAGE_NAME")}' found.")
    except docker.errors.ImageNotFound:
        msg = f"Base image '{os.getenv("PIPELINE_IMAGE_NAME")}' not found. Please build it first."
        logger.error(msg)
        raise docker.errors.ImageNotFound(msg)

   # 2. Check if a container with the same name (pipeline_id) already exists
    try:
        client.containers.get(pipeline_id)
        logger.warning(f"Container '{pipeline_id}' already exists.")
        raise ValueError(f"Container '{pipeline_id}' already exists")
    except docker.errors.NotFound:
        # the container does not exist
        logger.info(f"No existing container named '{pipeline_id}'. Proceeding.")
        pass

    # 3. Run the new container
    container = client.containers.run(
        image=os.getenv("PIPELINE_IMAGE_NAME"),
        name=pipeline_id,    # Use the unique ID to name the container for easy lookup
        detach=True,
        environment={
            "PIPELINE_ID": pipeline_id,
        },
        # Map the container's internal port to a random, available port on the host
        ports={os.getenv("CONTAINER_PORT"): None} 
    )

    # 5. Get the dynamically assigned host port
    container.reload()
    try:
        # This logic works whether the port was specified or assigned
        assigned_port = container.ports[os.getenv("CONTAINER_PORT")][0]['HostPort']
        logger.info(f"Container '{pipeline_id}' (ID: {container.id}) running on host port {assigned_port}")
    except (KeyError, IndexError, TypeError):
        logger.error(f"Could not determine host port for container {container.id}")
        container.stop()
        container.remove()
        raise Exception("Failed to assign host port for the container.")

    return {
        "id": container.id,
        "name": container.name,
        "status": container.status,
        "image": os.getenv("PIPELINE_IMAGE_NAME"),
        "host_port": assigned_port
    }

def stop_docker_container(client: docker.DockerClient, pipeline_id: str):
    """
    Finds a container by its name (pipeline_id) and stops/removes it.
    """
    try:
        container = client.containers.get(pipeline_id) # Find by name
        status_before = container.status
        container_id = container.id
        logger.info(f"Found container '{pipeline_id}' (ID: {container_id}) with status: {status_before}")

        if container.status == "running":
            container.stop()
        container.remove()
        logger.info(f"Stopped and removed container: {pipeline_id}")

        return {
            "id": container_id,
            "name": pipeline_id,
            "status_before": status_before,
            "stopped_and_removed": True
        }
    except docker.errors.NotFound:
        logger.warning(f"Container with name '{pipeline_id}' not found.")
        raise # Re-raise to be caught by the endpoint
