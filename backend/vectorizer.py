from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List
from FlagEmbedding import BGEM3FlagModel
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

app = FastAPI()

# Load the model once at startup
model = BGEM3FlagModel("BAAI/bge-m3", use_fp16=True)
logging.info("Model loaded successfully.")

# Define request and response data models
class Document(BaseModel):
    _id: str
    text: str

class VectorResponse(BaseModel):
    id: str
    vector: List[float]

@app.post('/vectorize', response_model=List[VectorResponse])
async def vectorize(documents: List[Document]):
    try:
        # Extract text from documents and perform model inference
        texts = [doc.text for doc in documents]
        raw_embeddings = model.encode(texts)['dense_vecs']
        embeddings = [embedding.tolist() for embedding in raw_embeddings]

        # Prepare the response
        result = [{'id': doc._id, 'vector': embedding} for doc, embedding in zip(documents, embeddings)]
        return result

    except Exception as e:
        logging.error(f"Error during vectorization: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
