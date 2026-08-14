import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI

from retrieve import hybrid_retrieve

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

app = FastAPI(title="Mavenir 3GPP RAG Chatbot")

# Allows your Lovable/Vercel frontend (a different origin) to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # we'll tighten this once we know the real frontend URL
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    question: str


SYSTEM_PROMPT = """You are a technical assistant answering questions about 3GPP telecom standards.

CRITICAL RULES:
1. Answer ONLY using the provided context below. Do not use any outside knowledge.
2. If the context does not contain enough information to answer confidently, say
   "I don't have enough information in the provided documents to answer this accurately."
   Do NOT guess or fill gaps with assumptions.
3. When you answer, cite the specific spec number and page for each claim, like this: [23.501, p.221].
4. Be precise and technical — this is for engineers who need accurate information, not simplified explanations.
"""


def build_context_block(chunks: list[dict]) -> str:
    """Formats retrieved chunks into a labeled block the model can cite from."""
    parts = []
    for c in chunks:
        parts.append(f"[Source: {c['spec']}, Page {c['page']}]\n{c['text']}")
    return "\n\n---\n\n".join(parts)


from fastapi.responses import StreamingResponse
import json


@app.post("/chat")
async def chat(request: ChatRequest):
    retrieved_chunks = hybrid_retrieve(request.question, top_k=5)
    context = build_context_block(retrieved_chunks)
    sources = [{"spec": c["spec"], "page": c["page"]} for c in retrieved_chunks]

    user_message = f"""Context from 3GPP specifications:

{context}

---

Question: {request.question}"""

    def event_stream():
        stream = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            temperature=0.2,
            stream=True,
        )
        for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield f"data: {json.dumps({'t': delta})}\n\n"

        yield f"data: {json.dumps({'sources': sources})}\n\n"
        yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")

@app.get("/")
def health_check():
    return {"status": "running", "service": "Mavenir 3GPP RAG Chatbot"}