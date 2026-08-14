import pickle
from pathlib import Path

import chromadb
from openai import OpenAI
import os
from dotenv import load_dotenv

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

CHROMA_DIR = Path(__file__).parent / "chroma_db"
BM25_INDEX_PATH = Path(__file__).parent / "bm25_index.pkl"

# Load everything once, at import time, not on every query
chroma_client = chromadb.PersistentClient(path=str(CHROMA_DIR))
collection = chroma_client.get_collection("mavenir_3gpp")

with open(BM25_INDEX_PATH, "rb") as f:
    bm25_data = pickle.load(f)
    bm25_index = bm25_data["bm25"]
    bm25_chunks = bm25_data["chunks"]


def semantic_search(query: str, top_k: int = 20):
    """Embeds the query, searches ChromaDB, returns top_k chunks."""
    response = client.embeddings.create(model="text-embedding-3-small", input=[query])
    query_embedding = response.data[0].embedding

    results = collection.query(query_embeddings=[query_embedding], n_results=top_k)

    # Chroma returns results in a nested-list format; flatten to a simple list
    return [
        {"text": doc, "spec": meta["spec"], "page": meta["page"]}
        for doc, meta in zip(results["documents"][0], results["metadatas"][0])
    ]


def keyword_search(query: str, top_k: int = 20):
    """Tokenizes the query, runs BM25, returns top_k chunks."""
    tokenized_query = query.lower().split()
    scores = bm25_index.get_scores(tokenized_query)

    # Get indices of the top_k highest-scoring chunks
    top_indices = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[:top_k]

    return [bm25_chunks[i] for i in top_indices]


def reciprocal_rank_fusion(semantic_results, keyword_results, k: int = 60):
    """
    Combines two ranked lists into one, using RRF (Part 10.11's pattern).
    A chunk that ranks well in BOTH lists scores higher than one that
    only ranks well in one — this is what makes it genuinely 'hybrid'
    rather than just picking one method.
    """
    scores = {}
    chunk_lookup = {}

    for rank, chunk in enumerate(semantic_results):
        key = (chunk["spec"], chunk["page"], chunk["text"][:50])  # dedup key
        scores[key] = scores.get(key, 0) + 1 / (k + rank + 1)
        chunk_lookup[key] = chunk

    for rank, chunk in enumerate(keyword_results):
        key = (chunk["spec"], chunk["page"], chunk["text"][:50])
        scores[key] = scores.get(key, 0) + 1 / (k + rank + 1)
        chunk_lookup[key] = chunk

    ranked_keys = sorted(scores.keys(), key=lambda k: scores[k], reverse=True)
    return [chunk_lookup[key] for key in ranked_keys]


def hybrid_retrieve(query: str, top_k: int = 5):
    """The main function the rest of the app will call."""
    semantic_results = semantic_search(query, top_k=20)
    keyword_results = keyword_search(query, top_k=20)
    fused = reciprocal_rank_fusion(semantic_results, keyword_results)
    return fused[:top_k]


if __name__ == "__main__":
    # First real end-to-end retrieval test!
    query = "What is network slicing in the 5G system architecture?"
    results = hybrid_retrieve(query)

    print(f"Query: {query}\n")
    for i, r in enumerate(results):
        print(f"--- Result {i+1} (Spec {r['spec']}, Page {r['page']}) ---")
        print(r["text"][:300])
        print()