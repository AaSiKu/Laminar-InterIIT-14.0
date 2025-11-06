### Easy Workflow

#### Local set up
1. if you are on linux or Mac you can directly run the following script cmd, if you are on windows please use a WSL or git bash terminal
2. Have python installed in you device
```
    chmod +x deploy/localSetup.sh
    ./deploy/localSetup.sh
```
3. This script will run the api server in the background on `8081` port with `--reload` enabled, we can add more servers later.
4. To stop the servers you will need to kill the process using `kill <PID>` (PID can be found form the script output)
5. All the logs of the servers can be found inside `/logs/` folders