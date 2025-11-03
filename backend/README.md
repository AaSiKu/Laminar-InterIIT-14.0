# Instructions to run a single pipeline
1. Set environment variables inside `pipeline/.env`
   ```
    PATHWAY_LICENSE_KEY=<PATHWAY_LICENSE_KEY>
    MONGO_URI=<MONGODB_CONNECTION_STRING>
    MONGO_DB=pipeline_db
    MONGO_COLLECTION=pipelines
    ```
   - Note if you are running mongo db inside the host device of the docker container, set `MONGODB_URI=mongodb://host.docker.internal:27017`
2. Build the image: `docker build pathway_pipeline -f PIPELINE_DOCKERFILE .`
   - Note that we will only build this image once at the start, and it will be used for the entire lifetime of our application
3. Run the container
    `docker run -p 8000:8000 -e PIPELINE_ID=<PIPELINE_ID> pathway_pipeline`
    Here `<PIPELINE_ID>` should be the `_id` in the `pipelines` collection of `pipeline_db` database in mongodb of the pipeline you want to run
4. Start the pipeline with `curl -X POST http://localhost:8000/trigger`
5. Stop it with `curl -X POST http://localhost:8000/stop`