import os
import sys
import logging
from fastapi import FastAPI

from dotenv import load_dotenv
load_dotenv("~/Teleoscope")
load_dotenv("./")
load_dotenv()

from fastapi.responses import FileResponse
# Load environment variables

app = FastAPI()
# Initialize logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s: %(levelname)s/%(processName)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S,%f',
    handlers=[logging.StreamHandler(sys.stdout)]
)

# Function to check if required environment variables are set
def check_env_var(var_name: str):
    value = os.getenv(var_name)
    if not value:
        raise EnvironmentError(f"{var_name} environment variable is not set. Please configure it before running the script.")
    return value

# Check and load environment variables
DOWNLOAD_DIR = check_env_var("DOWNLOAD_DIR")

@app.get("/download/{filename}")
async def download_file(filename: str):
    file_path = os.path.join(DOWNLOAD_DIR, filename)
    
    if os.path.exists(file_path):
        return FileResponse(file_path, filename=filename)
    else:
        return {"error": "File not found"}