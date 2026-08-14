import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

conn = psycopg2.connect(os.getenv("DATABASE_URL"))
cur = conn.cursor()

cur.execute("""
    CREATE TABLE IF NOT EXISTS chunks (
        id SERIAL PRIMARY KEY,
        spec TEXT NOT NULL,
        page INTEGER NOT NULL,
        text TEXT NOT NULL,
        embedding VECTOR(1536)
    );
""")

cur.execute("""
    CREATE INDEX IF NOT EXISTS chunks_embedding_idx
    ON chunks USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);
""")

conn.commit()
print("✅ Table and index created")

cur.close()
conn.close()