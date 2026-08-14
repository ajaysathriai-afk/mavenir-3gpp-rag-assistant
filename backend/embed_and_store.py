import os
import time
from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI
import chromadb

from ingest import process_all_documents

load_dotenv()  # loads OPENAI_API_KEY from .env

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

CHROMA_DIR = Path(__file__).parent / "chroma_db"
BATCH_SIZE = 100  # how many chunks we embed per API call


def embed_batch(texts: list[str]) -> list[list[float]]:
    """
    Sends a batch of texts to OpenAI's embeddings API in ONE call,
    gets back one vector per text. Batching like this is what keeps
    21,000+ chunks from taking forever or hitting rate limits.
    """
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=texts,
    )
    return [item.embedding for item in response.data]


def build_vector_store():
    chunks = process_all_documents()
    chunks = [c for c in chunks if c["text"] and c["text"].strip()]
    print(f"Total usable chunks: {len(chunks)}")

    chroma_client = chromadb.PersistentClient(path=str(CHROMA_DIR))
    collection = chroma_client.get_or_create_collection(name="mavenir_3gpp")

    already_done = collection.count()
    print(f"Already embedded: {already_done} chunks — resuming from there")

    remaining_chunks = chunks[already_done:]
    total = len(remaining_chunks)
    print(f"Remaining to embed: {total} chunks\n")

    for i in range(0, total, BATCH_SIZE):
        batch = remaining_chunks[i:i + BATCH_SIZE]
        texts = [c["text"] for c in batch]
        global_index = already_done + i  # keeps IDs unique across the whole run

        try:
            embeddings = embed_batch(texts)
            collection.add(
                ids=[f"{c['spec']}_p{c['page']}_{global_index+j}" for j, c in enumerate(batch)],
                embeddings=embeddings,
                documents=texts,
                metadatas=[{"spec": c["spec"], "page": c["page"]} for c in batch],
            )
            done = min(i + BATCH_SIZE, total)
            print(f"  {done}/{total} remaining chunks embedded (total in DB: {collection.count()})")

        except Exception as e:
            print(f"\n!!! ERROR on batch starting at index {global_index}: {e}")
            print("Stopping here — just re-run the script, it will resume from this point.\n")
            break

        time.sleep(0.3)  # small pause between batches to avoid rate-limit issues

    print(f"\nFinal count in collection: {collection.count()}")


if __name__ == "__main__":
    build_vector_store()
