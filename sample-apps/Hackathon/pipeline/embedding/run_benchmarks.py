"""
HELIX: Advanced Enterprise Cognitive Genome Platform - Dataset QA Benchmark Runner
Runs the ground-truth benchmark queries against the live RAG & GraphRAG pipeline and evaluates accuracy.
"""

import os
import sys
import json
import urllib.request
from pathlib import Path

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from pipeline.embedding.rag import RAGPipeline


def run_benchmark():
    print("=" * 95)
    print("📋 HELIX Cognitive Genome Platform - QA Benchmark Evaluation Suite")
    print("=" * 95)

    benchmark_path = PROJECT_ROOT / "zna_dataset" / "ground_truth" / "benchmark_queries.json"
    if not benchmark_path.exists():
        print(f"Error: Benchmark dataset not found at {benchmark_path}")
        sys.exit(1)

    with open(benchmark_path, "r", encoding="utf-8") as f:
        all_queries = json.load(f)

    # Filter distinct queries
    seen_questions = set()
    distinct_queries = []
    for q in all_queries:
        question = q["question"]
        if question not in seen_questions:
            seen_questions.add(question)
            distinct_queries.append(q)

    # Initialize RAG Pipeline
    print("\n[+] Initializing Hybrid RAG & GraphRAG Pipeline...")
    rag = RAGPipeline()

    print(f"[+] Loaded {len(distinct_queries)} distinct benchmark questions from dataset.")
    print("-" * 95)
    print(f"{'No.':<4} | {'Difficulty':<25} | {'Question':<58}")
    print("-" * 95)
    for idx, q in enumerate(distinct_queries[:6], 1):
        print(f"{idx:<4} | {q.get('difficulty', 'General'):<25} | {q['question'][:55]}...")
    print("-" * 95)

    print("\n🚀 Executing evaluation on benchmark sample...")
    correct_count = 0
    total_eval = min(5, len(distinct_queries))

    for idx, q in enumerate(distinct_queries[:total_eval], 1):
        question = q["question"]
        expected = q["expected_answer"]
        difficulty = q.get("difficulty", "General")
        expected_entities = q.get("expected_entities", [])

        print(f"\n[{idx}/{total_eval}] Question ({difficulty}): {question}")
        print(f"    Expected Answer: {expected}")
        
        # Run through RAG Pipeline
        res = rag.answer_question(question)
        answer = res["answer"]
        confidence = res["confidence_score"]

        print(f"    Generated Answer: {answer}")
        print(f"    Confidence Score: {confidence}")

        # Check if the expected answer or key entities exist in the generated response (case-insensitive)
        matched = False
        if expected.lower() in answer.lower():
            matched = True
        elif any(ent.lower() in answer.lower() for ent in expected_entities):
            matched = True

        if matched:
            print("    ✅ Evaluation Check: PASSED")
            correct_count += 1
        else:
            print("    ❌ Evaluation Check: FAILED (Low entity/answer overlap)")

    accuracy = (correct_count / total_eval) * 100
    print("\n" + "=" * 95)
    print(f"🏆 BENCHMARK EVALUATION SUMMARY")
    print(f"   Total Queries Processed: {total_eval}")
    print(f"   Successful Matches     : {correct_count} / {total_eval}")
    print(f"   Accuracy Score         : {accuracy:.2f}%")
    print("=" * 95)


if __name__ == "__main__":
    run_benchmark()
