import sys
import subprocess
import os

def setup():
    print("Setting up environment for Guardrails tests...")
    
    venv_dir = "venv"
    if not os.path.exists(venv_dir):
        print(f"Creating virtual environment in {venv_dir}...")
        subprocess.check_call([sys.executable, "-m", "venv", venv_dir])
    
    # Determine pip path
    if sys.platform == "win32":
        pip_cmd = os.path.join(venv_dir, "Scripts", "pip")
    else:
        pip_cmd = os.path.join(venv_dir, "bin", "pip")

    # Install requirements
    print("Installing requirements...")
    try:
        subprocess.check_call([pip_cmd, "install", "-r", "requirements.txt"])
        print("Successfully installed requirements.")
    except subprocess.CalledProcessError:
        print("Failed to install requirements. Please check requirements.txt")
        sys.exit(1)

    print("\nSetup complete!")
    print("To run tests:")
    if sys.platform == "win32":
        print("1. .\\venv\\Scripts\\activate")
    else:
        print("1. source venv/bin/activate")
    print("2. pytest test_guardrails.py")

if __name__ == "__main__":
    setup()
