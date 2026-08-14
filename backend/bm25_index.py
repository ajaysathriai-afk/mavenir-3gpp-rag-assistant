import pickle
from pathlib import Path
from rank_bm25 import BM25Okapi

from ingest import process_all_documents

BM25_INDEX_PATH = Path(__file__).parent / "bm25_index.pkl"


def build_bm25_index():
    """
    Builds a BM25 keyword index over the same chunks we embedded.
    Unlike embeddings, BM25 doesn't need an API call — it's a
    purely local, statistical keyword-matching algorithm.
    """
    chunks = process_all_documents()
    chunks = [c for c in chunks if c["text"] and c["text"].strip()]

    print(f"Building BM25 index over {len(chunks)} chunks...")

    # BM25 needs tokenized text — simplest approach: lowercase + split on whitespace
    tokenized_texts = [c["text"].lower().split() for c in chunks]

    bm25 = BM25Okapi(tokenized_texts)

    # Save both the index AND the original chunks together —
    # we need the chunks' text/metadata to make sense of BM25's results later
    with open(BM25_INDEX_PATH, "wb") as f:
        pickle.dump({"bm25": bm25, "chunks": chunks}, f)

    print(f"BM25 index saved to {BM25_INDEX_PATH}")


if __name__ == "__main__":
    build_bm25_index()