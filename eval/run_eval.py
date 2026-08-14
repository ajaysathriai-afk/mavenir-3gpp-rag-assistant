import sys
import json
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent / "backend"))

import os
from dotenv import load_dotenv
from openai import OpenAI

from retrieve import hybrid_retrieve
from test_questions import TEST_QUESTIONS

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

SYSTEM_PROMPT = """You are a technical assistant answering questions about 3GPP telecom standards.

CRITICAL RULES:
1. Answer ONLY using the provided context below. Do not use any outside knowledge.
2. If the context does not contain enough information to answer confidently, say
   "I don't have enough information in the provided documents to answer this accurately."
   Do NOT guess or fill gaps with assumptions.
3. When you answer, cite the specific spec number and page for each claim, like this: [23.501, p.221].
4. Be precise and technical — this is for engineers who need accurate information, not simplified explanations.
"""


def get_answer(question: str):
    chunks = hybrid_retrieve(question, top_k=5)
    context = "\n\n---\n\n".join([f"[Source: {c['spec']}, Page {c['page']}]\n{c['text']}" for c in chunks])

    user_message = f"Context:\n\n{context}\n\n---\n\nQuestion: {question}"

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        temperature=0.2,
    )
    return response.choices[0].message.content, chunks, context


def judge_groundedness(answer: str, context: str) -> dict:
    """
    Adversarial groundedness check — actively hunts for ANY claim
    in the answer not traceable to the context, rather than giving
    an overall vibe-based quality score.
    """
    prompt = f"""You are a strict fact-checker, not a quality rater. Your only job is to
find problems — do not be generous.

Context provided to the system:
{context}

System's answer:
{answer}

Go through the answer claim by claim. For EACH factual claim, check: is this claim
DIRECTLY supported by the context above, or is it an addition/inference the context
doesn't actually state?

List any unsupported claims you find, even minor ones (be specific to see if the answer
correctly handled a false premise in the question, if there was one — correctly refusing
or correcting a false premise should score highly, not be penalized).

Respond with JSON only:
{{"score": <0-10, where 10 = every claim is directly traceable to context>, "unsupported_claims": ["<list any found, or empty list>"], "reasoning": "<one sentence>"}}"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        temperature=0,
        response_format={"type": "json_object"},
    )
    return json.loads(response.choices[0].message.content)


def judge_context_relevance(question: str, context: str) -> dict:
    """Asks GPT-4o-mini: was the retrieved context actually relevant to the question?"""
    prompt = f"""You are evaluating RETRIEVAL QUALITY for a RAG system.

Question asked: {question}

Retrieved context:
{context}

How relevant is this retrieved context to actually answering the question?
Respond with JSON only: {{"score": <0-10>, "reasoning": "<one sentence>"}}"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        temperature=0,
        response_format={"type": "json_object"},
    )
    return json.loads(response.choices[0].message.content)


def judge_answer_relevance(question: str, answer: str) -> dict:
    """Asks GPT-4o-mini: does the answer actually address what was asked?"""
    prompt = f"""You are evaluating ANSWER RELEVANCE for a Q&A system.

Question asked: {question}

Answer given: {answer}

Does this answer directly and relevantly address the question asked?
(Note: a correct refusal like "I don't have enough information" IS relevant if the question is genuinely unanswerable.)
Respond with JSON only: {{"score": <0-10>, "reasoning": "<one sentence>"}}"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        temperature=0,
        response_format={"type": "json_object"},
    )
    return json.loads(response.choices[0].message.content)


def run_full_eval():
    results = []

    for i, test_case in enumerate(TEST_QUESTIONS):
        question = test_case["question"]
        expected_refusal = not test_case["should_answer"]

        print(f"\n[{i+1}/{len(TEST_QUESTIONS)}] {question}")

        answer, chunks, context = get_answer(question)
        actually_refused = "don't have enough information" in answer.lower()

        groundedness = judge_groundedness(answer, context)
        context_relevance = judge_context_relevance(question, context)
        answer_relevance = judge_answer_relevance(question, answer)

        refusal_correct = (actually_refused == expected_refusal)

        result = {
            "question": question,
            "answer": answer,
            "expected_refusal": expected_refusal,
            "actually_refused": actually_refused,
            "refusal_correct": refusal_correct,
            "groundedness_score": groundedness["score"],
            "unsupported_claims": groundedness.get("unsupported_claims", []),
            "context_relevance_score": context_relevance["score"],
            "answer_relevance_score": answer_relevance["score"],
        }
        results.append(result)

        print(f"  Refusal correct: {refusal_correct}")
        print(f"  Groundedness: {groundedness['score']}/10")
        print(f"  Context Relevance: {context_relevance['score']}/10")
        print(f"  Answer Relevance: {answer_relevance['score']}/10")

    # Summary
    # Split metrics by expected behavior — averaging these together is misleading
    answerable = [r for r in results if not r["expected_refusal"]]
    unanswerable = [r for r in results if r["expected_refusal"]]

    def avg(items, key):
        return sum(i[key] for i in items) / len(items) if items else 0

    print("\n" + "=" * 50)
    print("FINAL EVALUATION RESULTS")
    print("=" * 50)
    print(f"\n--- Answerable Questions ({len(answerable)}) ---")
    print(f"Groundedness:      {avg(answerable, 'groundedness_score'):.1f}/10")
    print(f"Context Relevance: {avg(answerable, 'context_relevance_score'):.1f}/10")
    print(f"Answer Relevance:  {avg(answerable, 'answer_relevance_score'):.1f}/10")

    print(f"\n--- Unanswerable Questions ({len(unanswerable)}) — low relevance scores here are CORRECT ---")
    print(f"Groundedness:      {avg(unanswerable, 'groundedness_score'):.1f}/10")
    print(f"Context Relevance: {avg(unanswerable, 'context_relevance_score'):.1f}/10 (low = retrieval correctly found nothing relevant)")
    print(f"Answer Relevance:  {avg(unanswerable, 'answer_relevance_score'):.1f}/10 (low = correctly didn't force an answer)")

    refusal_accuracy = sum(r["refusal_correct"] for r in results) / len(results) * 100
    print(f"\nRefusal Accuracy (the key hallucination-prevention metric): {refusal_accuracy:.0f}%")

    # Save full results to a file for the submission writeup
    with open(Path(__file__).parent / "eval_results.json", "w") as f:
        json.dump(results, f, indent=2)
    print(f"\nFull results saved to eval/eval_results.json")


if __name__ == "__main__":
    run_full_eval()