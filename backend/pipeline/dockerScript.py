# A demo Dockerfile with the same name is to be added in the pipeline folder. 
# The JSON file will be parsed and processed as environment variables within the container
import docker
import json
import os

# client = docker.from_env()

def run_docker_container_with_json(client, json_input_data, tag: str = 'test'):
    
    dockerfile_path = os.path.join(os.path.dirname(__file__), "Dockerfile")
    build_context = os.path.dirname(dockerfile_path)
    client.images.build(path = build_context, dockerfile = dockerfile_path, tag = tag)
    json_string = json.dumps(json_input_data)
    container = client.containers.run(
            "test",
            detach = True,
            environment = {
                "APP_CONFIG": json_string
                }
            )

    for _ in container.logs(stream  = True):
        print(_.decode('utf-8').strip())
    container.reload()

    status = getattr(container, "status", None)

    # raw_logs = container.logs(tail=tail_logs)
    # if isinstance(raw_logs, bytes):
    #     log_lines = [ln for ln in raw_logs.decode("utf-8", errors="replace").splitlines()]
    # else:
    #     log_lines = str(raw_logs).splitlines()
    return {
        "id": container.id,
        "name": container.name,
        "status": status,
    }

def stop_docker_container(client, container_id: str):

    container = client.containers.get(container_id)
    status = getattr(container, "status", None)
    container.reload()

    container.stop()
    container.remove()

    return {
            "id": container.id,
            "name": container.name,
            "status": status,
            "stopped": True
    }