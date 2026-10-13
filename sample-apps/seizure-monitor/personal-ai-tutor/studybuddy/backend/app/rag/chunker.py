from typing import List, Dict, Any, Optional


class DocumentChunker:
    """Utility class for recursively splitting document text into overlapping chunks."""

    def __init__(self, chunk_size: int = 1000, chunk_overlap: int = 200, separators: Optional[List[str]] = None):
        """
        Initialize the recursive document chunker.
        
        Args:
            chunk_size: Target maximum length of each chunk in characters.
            chunk_overlap: Overlap between consecutive chunks in characters.
            separators: List of separators to split text by, ordered by priority.
        """
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.separators = separators or ["\n\n", "\n", ". ", "? ", "! ", " ", ""]

    def split_text(self, text: str) -> List[str]:
        """
        Recursively split text into chunks based on predefined separators.
        
        Args:
            text: Input document string.
            
        Returns:
            List of text chunks.
        """
        if not text or not text.strip():
            return []

        chunks: List[str] = []
        self._split_recursive(text.strip(), self.separators, chunks)
        return self._merge_and_overlap_chunks(chunks)

    def _split_recursive(self, text: str, separators: List[str], final_chunks: List[str]) -> None:
        """Internal helper for recursive text splitting."""
        if len(text) <= self.chunk_size:
            if text.strip():
                final_chunks.append(text.strip())
            return

        if not separators:
            # Hard split if no separators left
            for i in range(0, len(text), self.chunk_size):
                sub = text[i:i + self.chunk_size].strip()
                if sub:
                    final_chunks.append(sub)
            return

        sep = separators[0]
        splits = text.split(sep) if sep else list(text)

        current_piece = ""
        for piece in splits:
            next_candidate = f"{current_piece}{sep}{piece}" if current_piece else piece
            if len(next_candidate) <= self.chunk_size:
                current_piece = next_candidate
            else:
                if current_piece:
                    self._split_recursive(current_piece, separators[1:], final_chunks)
                current_piece = piece

        if current_piece:
            self._split_recursive(current_piece, separators[1:], final_chunks)

    def _merge_and_overlap_chunks(self, raw_chunks: List[str]) -> List[str]:
        """Merge small chunks and apply overlap between consecutive chunks."""
        merged: List[str] = []
        current_chunk = ""

        for piece in raw_chunks:
            if not current_chunk:
                current_chunk = piece
            elif len(current_chunk) + len(piece) + 1 <= self.chunk_size:
                current_chunk = f"{current_chunk}\n{piece}"
            else:
                merged.append(current_chunk)
                # Apply overlap from the tail of current_chunk
                overlap_text = current_chunk[-self.chunk_overlap:] if len(current_chunk) > self.chunk_overlap else current_chunk
                current_chunk = f"{overlap_text}\n{piece}"

        if current_chunk:
            merged.append(current_chunk)

        return merged

    def chunk_document(self, document_data: Dict[str, Any], document_id: str) -> List[Dict[str, Any]]:
        """
        Process extracted document data into chunk objects with metadata.
        
        Args:
            document_data: Dict output from FileProcessor (contains 'text', 'pages', etc.)
            document_id: Unique identifier of the document.
            
        Returns:
            List of dicts containing chunk text and metadata (doc_id, chunk_index, page_num).
        """
        chunk_objects: List[Dict[str, Any]] = []
        chunk_counter = 0

        pages = document_data.get("pages", [])
        if pages:
            for page_info in pages:
                page_num = page_info.get("page", 1)
                page_text = page_info.get("text", "")
                sub_chunks = self.split_text(page_text)
                
                for sc in sub_chunks:
                    chunk_objects.append({
                        "chunk_id": f"{document_id}_{chunk_counter}",
                        "document_id": document_id,
                        "chunk_index": chunk_counter,
                        "page_number": page_num,
                        "text": sc
                    })
                    chunk_counter += 1
        else:
            full_text = document_data.get("text", "")
            sub_chunks = self.split_text(full_text)
            for sc in sub_chunks:
                chunk_objects.append({
                    "chunk_id": f"{document_id}_{chunk_counter}",
                    "document_id": document_id,
                    "chunk_index": chunk_counter,
                    "page_number": 1,
                    "text": sc
                })
                chunk_counter += 1

        return chunk_objects
