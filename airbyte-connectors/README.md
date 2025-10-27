## Guide for using an airbyte connector for a new data source
1. `pip install airbyte-serverless`
2. To use airbyte you need to set the  `PATHWAY_LICENSE_KEY` environment variable in a `.env` file which you can get [here](https://pathway.com/get-license/)
3. Check the list of available sources and the names of their docker images [here](https://docs.airbyte.com/integrations/sources)
4. `abs create <SOURCE_NAME> --image <docker_image_name_for_source>`
5. This creates a `connections/<SOURCE_NAME>.yaml` config file in the current working directory 
   - Remove the `destination` and `remote_runner` sections entirely (pathway doesn't need those)
6. The details of the configuration for each source can be found on its respective page in the airbyte documentation
   - For example, the configuration of finnhub can be found here https://docs.airbyte.com/integrations/sources/finnhub
7. Modify the yaml config accordingly
8. For some sources, you would require an API key provided by the source itself
9. Simply connect to the airbyte connector with 
   ```
   table = pw.airbyte.read(
      process_env_vars_config(
         './connection/<SOURCE_NAME>.yaml
      ),
      streams=[],
      mode = "static" or "streaming",
   )
   ```

### Notes
- `process_env_vars_config` is a custom function defined in `airbyte.py` which injects environment variables into the yaml config file and saves the result in `__connections/<SOURCE_NAME>.yaml` which is then passed to `pw.airbyte.read`
- The list of available streams per source can by found at airbyte's documentation for that source


### DinD problem
- Airbyte runs the data fetching processes in a docker container. However when we deploy our pathway pipeline on Kubernetes/Docker, this will cause a common problem known as DinD.
  
To counter this we have 2 options
1. If the source can be found on (PyPi)[https://pypi.org/search/?q=airbyte-source]
   - then we can directly run the airbyte data fetching process in python by setting `enforce_method="pypi"` kwarg in thw `pw.airbyte.read` method
2. Run the data fetching process remotely on Google Cloud. Pathway provides for this as well. See below link.

All details can be found here
https://pathway.com/developers/api-docs/pathway-io/airbyte/