import re
import uuid
from typing import List, Dict, Any
from nitro.agents.research.models import Paper
from .models import Claim

class SentenceExtractor:
    def __init__(self):
        # Heuristic keywords for different claim types
        self.contribution_kws = [
            r"(?i)we propose", r"(?i)we present", r"(?i)we introduce", 
            r"(?i)we show that", r"(?i)this paper", r"(?i)demonstrate",
            r"(?i)novel", r"(?i)state-of-the-art", r"(?i)outperforms"
        ]
        self.limitation_kws = [
            r"(?i)limited by", r"(?i)fails to", r"(?i)however,", 
            r"(?i)remains a challenge", r"(?i)difficult to", r"(?i)suffers from",
            r"(?i)drawback", r"(?i)shortcoming"
        ]
        self.future_work_kws = [
            r"(?i)future work", r"(?i)in the future", r"(?i)further research",
            r"(?i)remains to be explored", r"(?i)open question"
        ]
        self.result_kws = [
            r"(?i)results show", r"(?i)achieves", r"(?i)accuracy of",
            r"(?i)significantly", r"(?i)improved by", r"(?i)reduces"
        ]
        
    def _split_sentences(self, text: str) -> List[str]:
        # Simple heuristic sentence splitter
        sentences = re.split(r'(?<=[.!?])\s+', text.strip())
        return [s for s in sentences if len(s.split()) > 4]

    def _score_confidence(self, paper: Paper) -> float:
        score = 0.5
        if paper.citation_count > 100:
            score += 0.2
        elif paper.citation_count > 10:
            score += 0.1
        if paper.publication_year and paper.publication_year >= 2020:
            score += 0.1
        if paper.pdf_url:
            score += 0.1
        return min(0.95, score)

    def extract_claims(self, papers: List[Paper]) -> List[Claim]:
        claims = []
        for p in papers:
            pid = p.id or p.doi or p.title
            text = p.abstract
            if not text:
                continue
                
            conf = self._score_confidence(p)
            sentences = self._split_sentences(text)
            
            for s in sentences:
                ctype = None
                
                # Check for limitations (has priority because "we show that it fails" should be limitation)
                if any(re.search(kw, s) for kw in self.limitation_kws):
                    ctype = "limitation"
                elif any(re.search(kw, s) for kw in self.future_work_kws):
                    ctype = "future_work"
                elif any(re.search(kw, s) for kw in self.contribution_kws):
                    ctype = "contribution"
                elif any(re.search(kw, s) for kw in self.result_kws):
                    ctype = "result"
                    
                if ctype:
                    claims.append(Claim(
                        id=f"claim_{uuid.uuid4().hex[:8]}",
                        text=s.strip(),
                        type=ctype,
                        paper_id=pid,
                        confidence=conf
                    ))
        return claims
