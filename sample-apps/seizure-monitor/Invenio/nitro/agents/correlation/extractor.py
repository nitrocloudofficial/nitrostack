import re
from typing import List, Dict, Tuple
from sklearn.feature_extraction.text import TfidfVectorizer
from nitro.agents.research.models import Paper

class EntityExtractor:
    def __init__(self):
        # Heuristic patterns for methods and datasets
        self.method_patterns = [
            r'(?i)(?:using|via|based on|approach|algorithm|model)\s+([A-Z][a-zA-Z\-]+(?:\s+[A-Z][a-zA-Z\-]+){0,2})',
            r'(?i)([A-Z][a-zA-Z\-]+(?:\s+[A-Z][a-zA-Z\-]+){0,2})\s+(?:method|algorithm|architecture|network)'
        ]
        
        self.dataset_patterns = [
            r'(?i)([A-Z][a-zA-Z0-9\-]+(?:\s+[A-Z][a-zA-Z0-9\-]+){0,2})\s+(?:dataset|corpus|benchmark)'
        ]

    def extract_entities(self, papers: List[Paper]) -> Dict[str, Dict[str, List[str]]]:
        """Extracts concepts, methods, and datasets for each paper."""
        results = {}
        
        # Build corpus for TF-IDF
        corpus = []
        paper_ids = []
        for p in papers:
            text = f"{p.title} {p.abstract if p.abstract else ''}"
            corpus.append(text)
            paper_ids.append(p.id or p.doi or p.title)
            
        # 1. TF-IDF for Concepts
        concepts_by_paper = {pid: [] for pid in paper_ids}
        if corpus:
            try:
                # Use a custom regex to only capture actual words
                vectorizer = TfidfVectorizer(max_features=100, stop_words='english', ngram_range=(1, 2), token_pattern=r'(?u)\b[a-zA-Z_][a-zA-Z0-9_]+\b')
                tfidf_matrix = vectorizer.fit_transform(corpus)
                feature_names = vectorizer.get_feature_names_out()
                
                for i, pid in enumerate(paper_ids):
                    # Get top 5 concepts for this paper
                    row = tfidf_matrix.getrow(i).toarray()[0]
                    top_indices = row.argsort()[-5:][::-1]
                    concepts = [feature_names[idx] for idx in top_indices if row[idx] > 0.1]
                    concepts_by_paper[pid] = concepts
            except ValueError:
                # Raised if vocabulary is empty
                pass

        # 2. Regex for Methods & Datasets
        for p, pid in zip(papers, paper_ids):
            text = f"{p.title} {p.abstract if p.abstract else ''}"
            
            methods = set()
            for pattern in self.method_patterns:
                matches = re.findall(pattern, text)
                for m in matches:
                    if len(m) > 3 and m.lower() not in ['the', 'this', 'a', 'an']:
                        methods.add(m.strip())
                        
            datasets = set()
            for pattern in self.dataset_patterns:
                matches = re.findall(pattern, text)
                for m in matches:
                    if len(m) > 3:
                        datasets.add(m.strip())
            
            results[pid] = {
                "concepts": concepts_by_paper[pid],
                "methods": list(methods)[:5],
                "datasets": list(datasets)[:5]
            }
            
        return results
