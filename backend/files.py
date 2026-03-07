import logging
import os
import sys
from pathlib import Path

from fastapi import FastAPI, HTTPException

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
DOWNLOAD_DIR = Path(os.getenv("DOWNLOAD_DIR", "/tmp/teleoscope/downloads/")).resolve()


def _resolve_download_path(filename: str) -> Path:
    # Route params for filename are expected to be plain file names.
    if not filename or filename in {".", ".."}:
        raise HTTPException(status_code=400, detail="Invalid filename")
    candidate = (DOWNLOAD_DIR / filename).resolve()
    if DOWNLOAD_DIR not in candidate.parents:
        raise HTTPException(status_code=400, detail="Invalid filename")
    return candidate

@app.get("/download/{filename}")
async def download_file(filename: str):
    file_path = _resolve_download_path(filename)

    if file_path.is_file():
        return FileResponse(file_path, filename=filename)

    raise HTTPException(status_code=404, detail="File not found")

