import os
import time
from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI
import psycopg2

from ingest import process_all_documents

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
BATCH_SIZE = 100


def embed_batch(texts: list[str]) -> list[list[float]]:
    response = client.embeddings.create(model="text-embedding-3-small", input=texts)
    return [item.embedding for item in response.data]


def build_vector_store():
    chunks = process_all_documents()
    chunks = [c for c in chunks if c["text"] and c["text"].strip()]
    print(f"Total usable chunks: {len(chunks)}")

    conn = psycopg2.connect(os.getenv("DATABASE_URL"))
    cur = conn.cursor()

    cur.execute("SELECT COUNT(*) FROM chunks;")
    already_done = cur.fetchone()[0]
    print(f"Already embedded: {already_done} chunks — resuming from there")

    remaining_chunks = chunks[already_done:]
    total = len(remaining_chunks)
    print(f"Remaining to embed: {total} chunks\n")

    for i in range(0, total, BATCH_SIZE):
        batch = remaining_chunks[i:i + BATCH_SIZE]
        texts = [c["text"] for c in batch]

        try:
            embeddings = embed_batch(texts)

            for chunk, embedding in zip(batch, embeddings):
                cur.execute(
                    "INSERT INTO chunks (spec, page, text, embedding) VALUES (%s, %s, %s, %s)",
                    (chunk["spec"], chunk["page"], chunk["text"], embedding),
                )
            conn.commit()

            done = min(i + BATCH_SIZE, total)
            cur.execute("SELECT COUNT(*) FROM chunks;")
            current_total = cur.fetchone()[0]
            print(f"  {done}/{total} remaining chunks embedded (total in DB: {current_total})")

        except Exception as e:
            print(f"\n!!! ERROR on batch starting at index {already_done + i}: {e}")
            print("Stopping here — just re-run the script, it will resume from this point.\n")
            conn.rollback()
            break

        time.sleep(0.3)

    cur.execute("SELECT COUNT(*) FROM chunks;")
    final_count = cur.fetchone()[0]
    print(f"\nFinal count in table: {final_count}")

    cur.close()
    conn.close()


if __name__ == "__main__":
    build_vector_store()