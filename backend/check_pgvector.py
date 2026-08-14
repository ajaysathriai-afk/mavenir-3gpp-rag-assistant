import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

conn = psycopg2.connect(os.getenv("DATABASE_URL"))
cur = conn.cursor()

cur.execute("CREATE EXTENSION IF NOT EXISTS vector;")
conn.commit()

cur.execute("SELECT * FROM pg_extension WHERE extname = 'vector';")
result = cur.fetchone()

if result:
    print("✅ pgvector extension is enabled and working")
else:
    print("❌ pgvector extension not found")

cur.close()
conn.close()