import subprocess
import sys

packages = [
    "litellm",
    "fastmcp",
    "pytest",
    "python-dotenv",
    "google-generativeai",
    "uvicorn",
    "fastapi"
]

def install():
    print("Installing dependencies...")
    for package in packages:
        print(f"Installing {package}...")
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", package])
        except subprocess.CalledProcessError as e:
            print(f"Failed to install {package}: {e}")
    print("All dependencies installed.")

if __name__ == "__main__":
    install()
