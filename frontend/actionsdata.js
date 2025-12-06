const actionsDta = 
    {
  "actions": [
    {
      "action_id": "restart-nginx",
      "method": "script",
      "service": "nginx-service",
      "definition": "Restarts the Nginx web server...",
      "requires_approval": true,
      "risk_level": "medium",
      "validated": false,
      "execution": {
        "script_path": "/Scripts/restart_nginx.sh",
        "command": "bash /Scripts/restart_nginx.sh",
        "timeout_seconds": 300
      },
      "parameters": {},
      "secrets": ["ssh_host", "ssh_username", "ssh_password", "ssh_port"],
      "action_metadata": {
        "ssh_connection": {
          "host": "localhost",
          "port": 2222
        }
      }
    },
    {
      "action_id": "cool",
      "method": "script",
      "service": "nginx-service",
      "definition": "Restarts the Nginx web server...",
      "requires_approval": true,
      "risk_level": "medium",
      "validated": false,
      "execution": {
        "script_path": "/Scripts/restart_nginx.sh",
        "command": "bash /Scripts/restart_nginx.sh",
        "timeout_seconds": 300
      },
      "parameters": {},
      "secrets": ["ssh_host", "ssh_username", "ssh_password", "ssh_port"],
      "action_metadata": {
        "ssh_connection": {
          "host": "localhost",
          "port": 2222
        }
      }
    },
    {
      "action_id": "smth else",
      "method": "script",
      "service": "nginx-service",
      "definition": "Restarts the Nginx web server...",
      "requires_approval": true,
      "risk_level": "medium",
      "validated": false,
      "execution": {
        "script_path": "/Scripts/restart_nginx.sh",
        "command": "bash /Scripts/restart_nginx.sh",
        "timeout_seconds": 300
      },
      "parameters": {},
      "secrets": ["ssh_host", "ssh_username", "ssh_password", "ssh_port"],
      "action_metadata": {
        "ssh_connection": {
          "host": "localhost",
          "port": 2222
        }
      }
    },
    {
      "action_id": "hehe",
      "method": "script",
      "service": "nginx-service",
      "definition": "Restarts the Nginx web server...",
      "requires_approval": true,
      "risk_level": "medium",
      "validated": false,
      "execution": {
        "script_path": "/Scripts/restart_nginx.sh",
        "command": "bash /Scripts/restart_nginx.sh",
        "timeout_seconds": 300
      },
      "parameters": {},
      "secrets": ["ssh_host", "ssh_username", "ssh_password", "ssh_port"],
      "action_metadata": {
        "ssh_connection": {
          "host": "localhost",
          "port": 2222
        }
      }
    },
    {
      "action_id": "test",
      "method": "script",
      "service": "nginx-service",
      "definition": "Restarts the Nginx web server...",
      "requires_approval": true,
      "risk_level": "medium",
      "validated": false,
      "execution": {
        "script_path": "/Scripts/restart_nginx.sh",
        "command": "bash /Scripts/restart_nginx.sh",
        "timeout_seconds": 300
      },
      "parameters": {},
      "secrets": ["ssh_host", "ssh_username", "ssh_password", "ssh_port"],
      "action_metadata": {
        "ssh_connection": {
          "host": "localhost",
          "port": 2222
        }
      }
    }
  ],
  "total": 6
}


export default actionsDta;