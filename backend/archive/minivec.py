import os
from FlagEmbedding import BGEM3FlagModel

def test_model():
    model = BGEM3FlagModel("BAAI/bge-m3", use_fp16=True)
    sample_text = ["This is a test sentence."]
    raw_embeddings = model.encode(sample_text)["dense_vecs"]
    print("Embeddings:", raw_embeddings)

if __name__ == "__main__":
    test_model()
