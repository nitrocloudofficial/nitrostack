"""Granular entity comparators for fine-grained diff detection."""

from typing import Dict, List, Optional, Any, Tuple
from agents.release_intelligence.models.knowledge_graph import (
    PageNode, WorkflowNode, FormNode, UIElement, APIEndpoint, RelationshipEdge, PermissionSetting
)
from agents.release_intelligence.models.graph_diff import EntityDelta


class EntityComparator:
    """Helper methods to compare individual entity attributes."""

    @staticmethod
    def compare_pages(old_page: PageNode, new_page: PageNode) -> Tuple[Optional[EntityDelta], Optional[Dict[str, str]], Optional[Dict[str, str]]]:
        """Compare two page nodes. Returns (delta, rename_dict, move_dict)."""
        field_changes: Dict[str, Any] = {}
        rename_info: Optional[Dict[str, str]] = None
        move_info: Optional[Dict[str, str]] = None

        if old_page.title != new_page.title:
            field_changes["title"] = {"old": old_page.title, "new": new_page.title}
            rename_info = {"id": old_page.id, "old_title": old_page.title, "new_title": new_page.title}

        if old_page.url_path != new_page.url_path:
            field_changes["url_path"] = {"old": old_page.url_path, "new": new_page.url_path}
            move_info = {"id": old_page.id, "old_path": old_page.url_path, "new_path": new_page.url_path}

        if old_page.permissions != new_page.permissions:
            field_changes["permissions"] = {"old": old_page.permissions, "new": new_page.permissions}

        # Compare UI Elements
        old_elems = {e.id: e for e in old_page.elements}
        new_elems = {e.id: e for e in new_page.elements}

        added_elem_ids = [eid for eid in new_elems if eid not in old_elems]
        removed_elem_ids = [eid for eid in old_elems if eid not in new_elems]
        
        if added_elem_ids:
            field_changes["added_elements"] = added_elem_ids
        if removed_elem_ids:
            field_changes["removed_elements"] = removed_elem_ids

        delta = None
        if field_changes:
            delta = EntityDelta(
                entity_id=old_page.id,
                entity_type="Page",
                name=new_page.title,
                changes=field_changes
            )

        return delta, rename_info, move_info

    @staticmethod
    def compare_workflows(old_wf: WorkflowNode, new_wf: WorkflowNode) -> Optional[EntityDelta]:
        """Compare two workflow nodes."""
        field_changes: Dict[str, Any] = {}

        if old_wf.name != new_wf.name:
            field_changes["name"] = {"old": old_wf.name, "new": new_wf.name}

        if old_wf.description != new_wf.description:
            field_changes["description"] = {"old": old_wf.description, "new": new_wf.description}

        if len(old_wf.steps) != len(new_wf.steps) or [s.action for s in old_wf.steps] != [s.action for s in new_wf.steps]:
            field_changes["steps"] = {
                "old": [s.model_dump() for s in old_wf.steps],
                "new": [s.model_dump() for s in new_wf.steps]
            }

        if field_changes:
            return EntityDelta(
                entity_id=old_wf.id,
                entity_type="Workflow",
                name=new_wf.name,
                changes=field_changes
            )
        return None

    @staticmethod
    def compare_forms(old_form: FormNode, new_form: FormNode) -> Optional[EntityDelta]:
        """Compare two form nodes."""
        field_changes: Dict[str, Any] = {}

        if old_form.name != new_form.name:
            field_changes["name"] = {"old": old_form.name, "new": new_form.name}

        if old_form.submit_action != new_form.submit_action:
            field_changes["submit_action"] = {"old": old_form.submit_action, "new": new_form.submit_action}

        old_fields = {f.id: f.name for f in old_form.fields}
        new_fields = {f.id: f.name for f in new_form.fields}

        if old_fields != new_fields:
            field_changes["fields"] = {"old": old_fields, "new": new_fields}

        if field_changes:
            return EntityDelta(
                entity_id=old_form.id,
                entity_type="Form",
                name=new_form.name,
                changes=field_changes
            )
        return None

    @staticmethod
    def compare_api_endpoints(old_api: APIEndpoint, new_api: APIEndpoint) -> Optional[EntityDelta]:
        """Compare two API endpoints."""
        field_changes: Dict[str, Any] = {}

        if old_api.method != new_api.method or old_api.path != new_api.path:
            field_changes["endpoint"] = {
                "old": f"{old_api.method} {old_api.path}",
                "new": f"{new_api.method} {new_api.path}"
            }

        if old_api.request_schema != new_api.request_schema:
            field_changes["request_schema"] = {"old": old_api.request_schema, "new": new_api.request_schema}

        if old_api.response_schema != new_api.response_schema:
            field_changes["response_schema"] = {"old": old_api.response_schema, "new": new_api.response_schema}

        if field_changes:
            return EntityDelta(
                entity_id=old_api.id,
                entity_type="APIEndpoint",
                name=f"{new_api.method} {new_api.path}",
                changes=field_changes
            )
        return None
