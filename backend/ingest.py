from pypdf import PdfReader
from pathlib import Path

RAW_PDF_DIR = Path(__file__).parent.parent / "data" / "raw_pdfs"

def extract_pages(pdf_path: Path):
    """
    Reads a single PDF and returns a list of (page_number, text) tuples.
    We keep page numbers attached because that's what lets us cite
    'this answer came from page 47 of TS 23.501' later.
    """
    reader = PdfReader(pdf_path)
    pages = []
    for i, page in enumerate(reader.pages):
        text = page.extract_text()
        if text and text.strip():  # skip empty pages
            pages.append((i + 1, text))  # +1 so pages are 1-indexed, human-readable
    return pages

import re

def chunk_text(text: str, chunk_size: int = 800, overlap: int = 150):
    sentences = re.split(r'(?<=[.?!])\s+', text)

    chunks = []
    current_sentences = []
    current_length = 0

    for sentence in sentences:
        if current_length + len(sentence) <= chunk_size:
            current_sentences.append(sentence)
            current_length += len(sentence)
        else:
            if current_sentences:
                chunks.append(" ".join(current_sentences).strip())

            # Build overlap from whole trailing sentences, not raw characters
            overlap_sentences = []
            overlap_length = 0
            for s in reversed(current_sentences):
                if overlap_length + len(s) > overlap:
                    break
                overlap_sentences.insert(0, s)
                overlap_length += len(s)

            current_sentences = overlap_sentences + [sentence]
            current_length = sum(len(s) for s in current_sentences)

    if current_sentences:
        chunks.append(" ".join(current_sentences).strip())

    return chunks

def process_all_documents():
    """
    Processes every PDF in raw_pdfs/, chunks every page, and returns
    a list of dicts — each one a chunk plus the metadata needed to
    cite it later (which spec, which page).
    """
    all_chunks = []

    pdf_files = sorted(RAW_PDF_DIR.glob("*.pdf"))
    print(f"Found {len(pdf_files)} PDFs to process")

    for pdf_path in pdf_files:
        spec_number = pdf_path.stem  # e.g. "23.501" from "23.501.pdf"
        pages = extract_pages(pdf_path)

        for page_num, page_text in pages:
            page_chunks = chunk_text(page_text)
            for chunk in page_chunks:
                all_chunks.append({
                    "text": chunk,
                    "spec": spec_number,
                    "page": page_num,
                })

        print(f"  {spec_number}: {len(pages)} pages processed")

    print(f"\nTotal chunks across all documents: {len(all_chunks)}")
    return all_chunks


if __name__ == "__main__":
    chunks = process_all_documents()
    # Preview a couple of chunks with their metadata attached
    print("\n--- Sample chunk with metadata ---")
    print(chunks[500])