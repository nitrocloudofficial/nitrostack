from pydantic import BaseModel
from datetime import datetime

class ReportPackage(BaseModel):
    title: str
    generated_at: str
    markdown_content: str
