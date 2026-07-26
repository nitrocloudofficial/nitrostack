"""Change Analyzer module categorizing graph deltas into structured Change models."""

from typing import List
from agents.release_intelligence.interfaces import IChangeAnalyzer
from agents.release_intelligence.models.graph_diff import GraphDiff
from agents.release_intelligence.models.change import Change, AffectedComponent
from agents.release_intelligence.utils.constants import ChangeCategory
from agents.release_intelligence.utils.logger import logger


class ChangeAnalyzer(IChangeAnalyzer):
    """Categorizes raw graph differences into structured, strongly typed Change records."""

    def analyze_changes(self, diff: GraphDiff) -> List[Change]:
        """Transform GraphDiff deltas into categorized Change objects.

        Supported categories:
        - Added
        - Modified
        - Removed
        - Renamed
        - Moved
        - Deprecated
        - Relationship Changed
        - Permission Changed
        - Workflow Changed

        Args:
            diff: Calculated GraphDiff model.

        Returns:
            List of categorized Change objects.
        """
        logger.info("Analyzing and categorizing graph differences...")
        changes: List[Change] = []
        change_idx = 1

        # 1. Added Pages
        for page_name in diff.added_pages:
            changes.append(Change(
                id=f"CHG-{change_idx:03d}",
                category=ChangeCategory.ADDED,
                title=f"Page Added: {page_name}",
                description=f"A new page '{page_name}' was introduced in release {diff.new_version_id}.",
                affected_component=AffectedComponent(id=page_name, name=page_name, type="Page"),
                new_value=page_name
            ))
            change_idx += 1

        # 2. Removed Pages
        for page_name in diff.removed_pages:
            changes.append(Change(
                id=f"CHG-{change_idx:03d}",
                category=ChangeCategory.REMOVED,
                title=f"Page Removed: {page_name}",
                description=f"Page '{page_name}' was removed in release {diff.new_version_id}.",
                affected_component=AffectedComponent(id=page_name, name=page_name, type="Page"),
                old_value=page_name
            ))
            change_idx += 1

        # 3. Modified Pages
        for mod in diff.modified_pages:
            changes.append(Change(
                id=f"CHG-{change_idx:03d}",
                category=ChangeCategory.MODIFIED,
                title=f"Page Modified: {mod.name}",
                description=f"Page '{mod.name}' attributes updated: {list(mod.changes.keys())}.",
                affected_component=AffectedComponent(id=mod.entity_id, name=mod.name, type="Page"),
                metadata=mod.changes
            ))
            change_idx += 1

        # 4. Renamed Pages
        for r in diff.renamed_pages:
            changes.append(Change(
                id=f"CHG-{change_idx:03d}",
                category=ChangeCategory.RENAMED,
                title=f"Page Renamed: '{r.get('old_title')}' -> '{r.get('new_title')}'",
                description=f"Page title changed from '{r.get('old_title')}' to '{r.get('new_title')}'.",
                affected_component=AffectedComponent(id=r.get("id", ""), name=r.get("new_title", ""), type="Page"),
                old_value=r.get("old_title"),
                new_value=r.get("new_title")
            ))
            change_idx += 1

        # 5. Moved Pages
        for m in diff.moved_pages:
            changes.append(Change(
                id=f"CHG-{change_idx:03d}",
                category=ChangeCategory.MOVED,
                title=f"Page Path Changed: '{m.get('old_path')}' -> '{m.get('new_path')}'",
                description=f"Page URL path shifted from '{m.get('old_path')}' to '{m.get('new_path')}'.",
                affected_component=AffectedComponent(id=m.get("id", ""), name=m.get("id", ""), type="Page"),
                old_value=m.get("old_path"),
                new_value=m.get("new_path")
            ))
            change_idx += 1

        # 6. Workflows (Added, Removed, Workflow Changed)
        for wf_name in diff.added_workflows:
            changes.append(Change(
                id=f"CHG-{change_idx:03d}",
                category=ChangeCategory.ADDED,
                title=f"Workflow Added: {wf_name}",
                description=f"New user workflow '{wf_name}' introduced.",
                affected_component=AffectedComponent(id=wf_name, name=wf_name, type="Workflow"),
                new_value=wf_name
            ))
            change_idx += 1

        for wf_name in diff.removed_workflows:
            changes.append(Change(
                id=f"CHG-{change_idx:03d}",
                category=ChangeCategory.REMOVED,
                title=f"Workflow Removed: {wf_name}",
                description=f"Workflow '{wf_name}' removed from application.",
                affected_component=AffectedComponent(id=wf_name, name=wf_name, type="Workflow"),
                old_value=wf_name
            ))
            change_idx += 1

        for mod_wf in diff.modified_workflows:
            changes.append(Change(
                id=f"CHG-{change_idx:03d}",
                category=ChangeCategory.WORKFLOW_CHANGED,
                title=f"Workflow Modified: {mod_wf.name}",
                description=f"Steps or details updated in workflow '{mod_wf.name}'.",
                affected_component=AffectedComponent(id=mod_wf.entity_id, name=mod_wf.name, type="Workflow"),
                metadata=mod_wf.changes
            ))
            change_idx += 1

        # 7. Forms (Added, Removed, Modified)
        for form_name in diff.added_forms:
            changes.append(Change(
                id=f"CHG-{change_idx:03d}",
                category=ChangeCategory.ADDED,
                title=f"Form Added: {form_name}",
                description=f"New form '{form_name}' introduced.",
                affected_component=AffectedComponent(id=form_name, name=form_name, type="Form"),
                new_value=form_name
            ))
            change_idx += 1

        for form_name in diff.removed_forms:
            changes.append(Change(
                id=f"CHG-{change_idx:03d}",
                category=ChangeCategory.REMOVED,
                title=f"Form Removed: {form_name}",
                description=f"Form '{form_name}' removed.",
                affected_component=AffectedComponent(id=form_name, name=form_name, type="Form"),
                old_value=form_name
            ))
            change_idx += 1

        for mod_form in diff.modified_forms:
            changes.append(Change(
                id=f"CHG-{change_idx:03d}",
                category=ChangeCategory.MODIFIED,
                title=f"Form Modified: {mod_form.name}",
                description=f"Form fields or submission endpoint updated for '{mod_form.name}'.",
                affected_component=AffectedComponent(id=mod_form.entity_id, name=mod_form.name, type="Form"),
                metadata=mod_form.changes
            ))
            change_idx += 1

        # 8. API Changes
        for api_mod in diff.api_changes:
            status = api_mod.changes.get("status", "MODIFIED")
            cat = ChangeCategory.ADDED if status == "ADDED" else (ChangeCategory.REMOVED if status == "REMOVED" else ChangeCategory.MODIFIED)
            changes.append(Change(
                id=f"CHG-{change_idx:03d}",
                category=cat,
                title=f"API {status.capitalize()}: {api_mod.name}",
                description=f"API Endpoint '{api_mod.name}' was {status.lower()}.",
                affected_component=AffectedComponent(id=api_mod.entity_id, name=api_mod.name, type="APIEndpoint"),
                metadata=api_mod.changes
            ))
            change_idx += 1

        # 9. Relationship Changes
        for rel in diff.relationship_changes:
            changes.append(Change(
                id=f"CHG-{change_idx:03d}",
                category=ChangeCategory.RELATIONSHIP_CHANGED,
                title=f"Relationship {rel['action']}: {rel['source']} -> {rel['target']} ({rel['type']})",
                description=f"Navigation or graph edge between {rel['source']} and {rel['target']} was {rel['action'].lower()}.",
                affected_component=AffectedComponent(id=f"{rel['source']}_{rel['target']}", name=f"{rel['source']}->{rel['target']}", type="Relationship"),
                metadata=rel
            ))
            change_idx += 1

        logger.info(f"Categorized {len(changes)} total changes.")
        return changes
