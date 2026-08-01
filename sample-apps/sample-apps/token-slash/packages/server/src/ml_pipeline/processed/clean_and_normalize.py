import os
import json
import re
import hashlib
import random

def compute_prompt_hash(text):
    """Computes SHA-256 hash for deduplication."""
    return hashlib.sha256(text.strip().lower().encode('utf-8')).hexdigest()

def clean_and_normalize_prompt(text):
    """Cleans and normalizes prompt text."""
    if not text:
        return ""
    text = str(text).strip()
    # Normalize excessive whitespace
    text = re.sub(r'\r\n|\r', '\n', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r'[ \t]{2,}', ' ', text)
    return text

def calculate_complexity(prompt_text):
    """Calculates heuristic complexity score (1 to 10)."""
    words = len(prompt_text.split())
    complexity = 2
    if words > 80:
        complexity += 1
    if words > 250:
        complexity += 2
    if words > 500:
        complexity += 2

    # Technical complexity indicators
    if re.search(r'```|function|class|interface|sql|python|react|docker|kubernetes|qiskit', prompt_text, re.I):
        complexity += 2
    if re.search(r'proof|theorem|equation|matrix|linearization|optimiz|algorithm|derivative', prompt_text, re.I):
        complexity += 3
    if re.search(r'architect|system design|microservice|database schema|concurrency|async', prompt_text, re.I):
        complexity += 2

    return min(10, max(1, complexity))

def infer_task_type(prompt_text):
    """Classifies task type into standard TokenSlash taxonomy."""
    text_lower = prompt_text.lower()
    if re.search(r'```|function|class|bug|fix|code|refactor|react|python|script|api|component', text_lower):
        return "code_generation"
    elif re.search(r'proof|theorem|equation|math|matrix|calculus|probability', text_lower):
        return "mathematical_reasoning"
    elif re.search(r'summariz|tldr|bullet points|abstract|key points', text_lower):
        return "summarization"
    elif re.search(r'translate|german|french|spanish|chinese|japanese|russian', text_lower):
        return "translation"
    elif re.search(r'architect|system design|schema|microservice|docker|cloud', text_lower):
        return "system_architecture"
    elif re.search(r'creative|story|poem|essay|blog|fiction|character', text_lower):
        return "creative_writing"
    elif re.search(r'research|analyze|evaluate|compare|benchmark|study', text_lower):
        return "research_analysis"
    else:
        return "general_reasoning"

def process_raw_dataset(raw_dataset_path, output_path):
    """
    Main cleaning and normalization pipeline.
    Deduplicates prompts, removes corrupted rows, normalizes labels & computes target variables.
    """
    print(f"Reading raw dataset from {raw_dataset_path}...")
    if not os.path.exists(raw_dataset_path):
        print("Raw dataset not found. Generating default mock history fallback for cleaning...")
        raw_conversations = []
    else:
        with open(raw_dataset_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            raw_conversations = data.get("rawConversations", [])

    seen_hashes = set()
    cleaned_entries = []

    models = ["gpt-4o-mini", "gpt-4o", "claude-3-5-sonnet", "claude-3-opus", "gemini-3.5-flash", "gemini-3.1-pro", "o3-mini", "o1"]

    for idx, conv in enumerate(raw_conversations):
        msgs = conv.get("messages") or conv.get("items") or conv.get("conversation") or []
        if not isinstance(msgs, list) or len(msgs) == 0:
            continue

        user_msgs = []
        ast_msgs = []
        for m in msgs:
            role = m.get("role") or m.get("from")
            u_str = " ".join(m.get("user", [])) if isinstance(m.get("user"), list) else str(m.get("user", ""))
            if role in ["user", "human"] or (not re.search(r'chat\s*gpt|assistant|gpt|ai', u_str, re.I) and len(u_str) > 0):
                user_msgs.append(m)
            elif role in ["assistant", "gpt"] or re.search(r'chat\s*gpt|assistant|gpt|ai', u_str, re.I):
                ast_msgs.append(m)

        if not user_msgs:
            continue

        raw_text = user_msgs[0].get("content") or user_msgs[0].get("value") or user_msgs[0].get("message") or ""
        if isinstance(raw_text, list):
            raw_text = " ".join(str(x) for x in raw_text)

        cleaned_prompt = clean_and_normalize_prompt(raw_text)
        if len(cleaned_prompt) < 8:  # Skip spam / empty prompts
            continue

        prompt_hash = compute_prompt_hash(cleaned_prompt)
        if prompt_hash in seen_hashes:
            continue  # Deduplication
        seen_hashes.add(prompt_hash)

        resp_text = ast_msgs[0].get("content") or ast_msgs[0].get("value") or ast_msgs[0].get("message") or "" if ast_msgs else ""
        if isinstance(resp_text, list):
            resp_text = " ".join(str(x) for x in resp_text)
        resp_text = clean_and_normalize_prompt(resp_text)

        word_count = len(cleaned_prompt.split())
        input_tokens = int(word_count * 1.35) + 12
        resp_words = len(resp_text.split()) if resp_text else random.randint(50, 400)
        output_tokens = max(35, int(resp_words * 1.35) + 15)

        complexity = calculate_complexity(cleaned_prompt)
        task_type = infer_task_type(cleaned_prompt)
        assigned_model = random.choice(models)

        # Synthetic ground truth labels calibrated with physical realities
        model_tier = 1 if assigned_model in ["gpt-4o-mini", "gemini-3.5-flash"] else (
            2 if assigned_model in ["gpt-4o", "claude-3-5-sonnet"] else (
            3 if assigned_model in ["gemini-3.1-pro", "claude-3-opus"] else 4
        ))
        needed_tier = 1 if complexity <= 3 else (2 if complexity <= 6 else (3 if complexity <= 8 else 4))

        # Latency target (Model 3)
        base_lat = {"gpt-4o-mini": 1.1, "gemini-3.5-flash": 0.9, "gpt-4o": 2.4, "claude-3-5-sonnet": 2.1, "gemini-3.1-pro": 2.2, "claude-3-opus": 4.5, "o3-mini": 3.8, "o1": 6.5}[assigned_model]
        actual_latency = round(base_lat + (output_tokens / 1000.0) * random.uniform(0.8, 1.8), 2)

        # Retry target (Model 2)
        tier_mismatch = max(0, needed_tier - model_tier)
        retry_prob = 0.05 + tier_mismatch * 0.35 + (0.15 if complexity > 7 and model_tier < 3 else 0.0)
        retries_count = int(random.choices([0, 1, 2, 3], weights=[1.0 - min(0.9, retry_prob), min(0.6, retry_prob * 0.7), min(0.3, retry_prob * 0.2), 0.1])[0])

        # Satisfaction target (Model 1: 0 to 100)
        satisfaction_score = max(10, min(100, int(100 - tier_mismatch * 28 - retries_count * 22 + random.uniform(-6, 6))))

        entry = {
            "id": f"tokenslash-clean-{idx+1:05d}",
            "userId": f"user-cohort-{(idx % 15) + 1}",
            "promptText": cleaned_prompt,
            "responseText": resp_text[:500],
            "inputTokens": input_tokens,
            "outputTokens": output_tokens,
            "complexityScore": complexity,
            "taskType": task_type,
            "assignedModel": assigned_model,
            "actualLatencySec": actual_latency,
            "retriesCount": retries_count,
            "satisfactionScore": satisfaction_score
        }
        cleaned_entries.append(entry)

    # Ensure minimum dataset size
    if len(cleaned_entries) < 600:
        print(f"Augmenting cleaned dataset with structured synthetic entries (current: {len(cleaned_entries)})...")
        # Load mock history data if available
        mock_path = os.path.join(os.path.dirname(raw_dataset_path), "..", "data", "mock-history.json")
        if os.path.exists(mock_path):
            with open(mock_path, "r", encoding="utf-8") as f:
                mh = json.load(f)
                for item in mh:
                    comp = item.get("complexityScore", 4)
                    cleaned_entries.append({
                        "id": f"tokenslash-mock-{len(cleaned_entries)+1:05d}",
                        "userId": item.get("userId", "user-mock"),
                        "promptText": item.get("promptText", "Analyze prompt metrics"),
                        "responseText": "Synthetic parsed response",
                        "inputTokens": item.get("inputTokens", 300),
                        "outputTokens": item.get("outputTokens", 450),
                        "complexityScore": comp,
                        "taskType": item.get("taskType", "general_reasoning"),
                        "assignedModel": item.get("modelUsed", "gpt-4o"),
                        "actualLatencySec": item.get("timeToSatisfactionSeconds", 15.0) / 5.0,
                        "retriesCount": item.get("retriesCount", 0),
                        "satisfactionScore": 95 if item.get("userSatisfied", True) else 30
                    })

    output_pkg = {
        "datasetName": "Unified TokenSlash ML Clean Dataset",
        "sampleSize": len(cleaned_entries),
        "entries": cleaned_entries
    }

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output_pkg, f, indent=2)

    print(f"Cleaned dataset saved to {output_path} ({len(cleaned_entries)} entries)")
    return output_path

if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.abspath(__file__))
    raw_path = os.path.join(base_dir, "..", "dataset", "raw_datasets.json")
    out_path = os.path.join(base_dir, "unified_tokenslash_dataset.json")
    process_raw_dataset(raw_path, out_path)
