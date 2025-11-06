# Documentation
- Each pipeline runs inside its own docker container
- Each docker container has a small FastAPI server that can get requests from the outside world and triggers/stops the pipeline
- On trigger, the server fetches the pipeline flowchart from the mongo db database, saves it in a local flowchart.json and builds a dynamic pathway computational graph based on that, and then runs it
- The flowchart.json should have a `nodes` array which is made up of `Node` objects from `lib/`. i.e they should have `node_id`, `category`, and the node specific hyper parameters. It should also have an `edges` array with (from,to) tuples which define the connections between nodes

# Instructions to run a single pipeline
1. Set environment variables inside `pipeline/.env`
   ```
    PATHWAY_LICENSE_KEY=<PATHWAY_LICENSE_KEY>
    MONGO_URI=<MONGODB_CONNECTION_STRING>
    MONGO_DB=pipeline_db
    MONGO_COLLECTION=pipelines
    ```
   - Note if you are running mongo db inside the host device of the docker container, set `MONGODB_URI=mongodb://host.docker.internal:27017`
2. Build the image: `docker build -t pathway_pipeline -f PIPELINE_DOCKERFILE .`
   - Note that we will only build this image once at the start, and it will be used for the entire lifetime of our application
3. Run the container
    `docker run -p 8000:8000 -e PIPELINE_ID=<PIPELINE_ID> pathway_pipeline`
    Here `<PIPELINE_ID>` should be the `_id` in the `pipelines` collection of `pipeline_db` database in mongodb of the pipeline you want to run
4. Start the pipeline with `curl -X POST http://localhost:8000/trigger`
5. Stop it with `curl -X POST http://localhost:8000/stop`
6. Check out `tests/pipeline` for more tools.

# Docker start up api
1. Required docker demon to be running in background.
2. Need to integrate it with our pipeline image generation.