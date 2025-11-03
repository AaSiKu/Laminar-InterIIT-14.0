- Whenever a user builds a new /modifies an existing pipeline and then activates a pipeline a new docker container is initialized 
    - Side note: Any container corresponding to the previous pipeline is deleted
- The container's volume has the main.py file and a flowchart.json 
- The flowchart.json file is the file which defines the pipeline the user has built 
- The main.py file reads the flowchart.json and builds pathway's computational graph dynamically (using toposort). And then runs it.
- For scaling this can be run on Kubernetes (which pathway supports intrinsically)
- We will have a mapping variable that maps node ids to pathway class references
- A small API server that receives 



#### Docker start up api
1. Required docker demon to be running in background.
2. Need to integrate it with our pipeline image generation.