import pickle
from pathlib import Path

import psycopg2
from pgvector.psycopg2 import register_vector
from openai import OpenAI
import os
from dotenv import load_dotenv

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

BM25_INDEX_PATH = Path(__file__).parent / "bm25_index.pkl"

# Connect once, at import time
conn = psycopg2.connect(os.getenv("DATABASE_URL"))
register_vector(conn)

with open(BM25_INDEX_PATH, "rb") as f:
    bm25_data = pickle.load(f)
    bm25_index = bm25_data["bm25"]
    bm25_chunks = bm25_data["chunks"]


from pgvector.psycopg2 import register_vector
from pgvector import Vector

def semantic_search(query: str, top_k: int = 20):
    response = client.embeddings.create(model="text-embedding-3-small", input=[query])
    query_embedding = Vector(response.data[0].embedding)

    cur = conn.cursor()
    cur.execute(
        """
        SELECT spec, page, text
        FROM chunks
        ORDER BY embedding <=> %s
        LIMIT %s
        """,
        (query_embedding, top_k),
    )
    results = cur.fetchall()
    cur.close()

    return [{"spec": row[0], "page": row[1], "text": row[2]} for row in results]


def keyword_search(query: str, top_k: int = 20):
    tokenized_query = query.lower().split()
    scores = bm25_index.get_scores(tokenized_query)
    top_indices = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[:top_k]
    return [bm25_chunks[i] for i in top_indices]


def reciprocal_rank_fusion(semantic_results, keyword_results, k: int = 60):
    scores = {}
    chunk_lookup = {}

    for rank, chunk in enumerate(semantic_results):
        key = (chunk["spec"], chunk["page"], chunk["text"][:50])
        scores[key] = scores.get(key, 0) + 1 / (k + rank + 1)
        chunk_lookup[key] = chunk

    for rank, chunk in enumerate(keyword_results):
        key = (chunk["spec"], chunk["page"], chunk["text"][:50])
        scores[key] = scores.get(key, 0) + 1 / (k + rank + 1)
        chunk_lookup[key] = chunk

    ranked_keys = sorted(scores.keys(), key=lambda k: scores[k], reverse=True)
    return [chunk_lookup[key] for key in ranked_keys]


def hybrid_retrieve(query: str, top_k: int = 5):
    semantic_results = semantic_search(query, top_k=20)
    keyword_results = keyword_search(query, top_k=20)
    fused = reciprocal_rank_fusion(semantic_results, keyword_results)
    return fused[:top_k]


if __name__ == "__main__":
    query = "What is network slicing in the 5G system?"
    results = hybrid_retrieve(query)

    print(f"Query: {query}\n")
    for i, r in enumerate(results):
        print(f"--- Result {i+1} (Spec {r['spec']}, Page {r['page']}) ---")
        print(r["text"][:300])
        print()