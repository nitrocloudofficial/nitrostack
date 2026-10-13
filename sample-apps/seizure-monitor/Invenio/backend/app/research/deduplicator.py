"""
Deduplicator

Removes duplicate papers returned by multiple providers.
"""

import re
from typing import List, Dict
from app.research.models import Paper
import logging

logger = logging.getLogger(__name__)

class Deduplicator:
    @staticmethod
    def _clean_title(title: str) -> str:
        """Remove punctuation and convert to lowercase for comparison."""
        if not title:
            return ""
        # Remove non-alphanumeric chars and extra whitespace
        cleaned = re.sub(r'[^a-z0-9]', '', title.lower())
        return cleaned

    @staticmethod
    def deduplicate(papers: List[Paper]) -> List[Paper]:
        """
        Deduplicates a list of papers based on DOI and Title similarity.
        Prioritizes merging information or keeping the most complete record.
        """
        if not papers:
            return []

        # We will keep a map of canonical representations
        unique_by_doi: Dict[str, Paper] = {}
        unique_by_title: Dict[str, Paper] = {}
        
        final_list = []
        
        # Provider hierarchy for tie-breaking: OpenAlex > Crossref > arXiv
        provider_rank = {"openalex": 3, "crossref": 2, "arxiv": 1}

        for paper in papers:
            is_duplicate = False
            target_bucket = None
            key = None
            
            # Check DOI first
            if paper.doi:
                if paper.doi in unique_by_doi:
                    is_duplicate = True
                    target_bucket = unique_by_doi
                    key = paper.doi
                    
            # Fallback to Title match
            if not is_duplicate and paper.title:
                clean_title = Deduplicator._clean_title(paper.title)
                # Only use title match if the title is reasonably long to avoid false positive short titles
                if len(clean_title) > 10 and clean_title in unique_by_title:
                    is_duplicate = True
                    target_bucket = unique_by_title
                    key = clean_title
                    
            if is_duplicate and target_bucket is not None and key is not None:
                # We found a duplicate. Decide which one to keep, or merge data.
                existing = target_bucket[key]
                
                # If current paper is from a higher ranked provider, we might want to swap
                curr_rank = provider_rank.get(paper.source, 0)
                exist_rank = provider_rank.get(existing.source, 0)
                
                # Merge logic: keep the existing one, but enrich it if possible
                if curr_rank > exist_rank:
                    # Swap them as the primary
                    # But retain the higher citation count
                    paper.citation_count = max(paper.citation_count, existing.citation_count)
                    if not paper.pdf_url and existing.pdf_url:
                        paper.pdf_url = existing.pdf_url
                    target_bucket[key] = paper
                else:
                    # Keep existing
                    existing.citation_count = max(paper.citation_count, existing.citation_count)
                    if not existing.pdf_url and paper.pdf_url:
                        existing.pdf_url = paper.pdf_url
            else:
                # It's unique so far
                final_list.append(paper)
                if paper.doi:
                    unique_by_doi[paper.doi] = paper
                if paper.title:
                    clean_title = Deduplicator._clean_title(paper.title)
                    if len(clean_title) > 10:
                        unique_by_title[clean_title] = paper
                        
        # We rebuild the final list from the dictionaries to ensure we return the merged items
        # using a set of IDs to maintain order and avoid double counting
        output = []
        seen_ids = set()
        
        for p in final_list:
            # The actual object might have been swapped in the dicts
            # Find the canonical object
            canonical = p
            if p.doi and p.doi in unique_by_doi:
                canonical = unique_by_doi[p.doi]
            elif p.title:
                clean_t = Deduplicator._clean_title(p.title)
                if clean_t in unique_by_title:
                    canonical = unique_by_title[clean_t]
                    
            if canonical.id not in seen_ids:
                seen_ids.add(canonical.id)
                output.append(canonical)
                
        return output
