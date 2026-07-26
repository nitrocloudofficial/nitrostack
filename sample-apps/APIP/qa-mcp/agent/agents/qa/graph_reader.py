import json
from typing import List, Dict, Any, Tuple
from .models import Page, APIEndpoint, Form, Workflow, EntityType

class GraphReader:
    def __init__(self, file_path: str):
        self.file_path = file_path
        
    def read_graph(self) -> Tuple[List[Page], List[APIEndpoint], List[Form], List[Workflow]]:
        with open(self.file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        pages = []
        apis = []
        forms = []
        workflows = []
        
        for item in data.get("entities", []):
            entity_type = item.get("type")
            if entity_type == EntityType.PAGE:
                pages.append(Page(**item))
            elif entity_type == EntityType.API:
                apis.append(APIEndpoint(**item))
            elif entity_type == EntityType.FORM:
                forms.append(Form(**item))
            elif entity_type == EntityType.WORKFLOW:
                workflows.append(Workflow(**item))
                
        return pages, apis, forms, workflows
