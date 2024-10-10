import os

import sys
import logging

from fastapi import FastAPI

from dotenv import load_dotenv
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


# Check and load environment variables
DOWNLOAD_DIR = os.getenv("DOWNLOAD_DIR", "/tmp/teleoscope/downloads/")

@app.get("/download/{filename}")
async def download_file(filename: str):
    file_path = os.path.join(DOWNLOAD_DIR, filename)
    
    if os.path.exists(file_path):
        return FileResponse(file_path, filename=filename)
    else:
        return {"error": "File not found"}

