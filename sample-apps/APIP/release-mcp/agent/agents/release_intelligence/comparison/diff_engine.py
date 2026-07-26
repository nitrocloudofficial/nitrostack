"""Deterministic Graph Diff Engine for comparing Knowledge Graph versions."""

import networkx as nx
from typing import Dict, List, Set, Any

from agents.release_intelligence.interfaces import IGraphDiffEngine
from agents.release_intelligence.models.knowledge_graph import KnowledgeGraphVersion
from agents.release_intelligence.models.graph_diff import GraphDiff, EntityDelta
from agents.release_intelligence.comparison.comparator import EntityComparator
from agents.release_intelligence.exceptions import DiffError
from agents.release_intelligence.utils.logger import logger


class GraphDiffEngine(IGraphDiffEngine):
    """Compares two Knowledge Graph versions deterministically without using LLM."""

    def compare(self, old_graph: KnowledgeGraphVersion, new_graph: KnowledgeGraphVersion) -> GraphDiff:
        """Compare old and new Knowledge Graph versions to compute GraphDiff model.

        Args:
            old_graph: Base version of Knowledge Graph.
            new_graph: Target version of Knowledge Graph.

        Returns:
            GraphDiff model encapsulating added, removed, modified, renamed, and moved items.
        """
        logger.info(f"Comparing Knowledge Graph v{old_graph.version_id} -> v{new_graph.version_id}")

        try:
            # Build NetworkX graphs for structural topology comparison
            old_nx = self._build_nx_graph(old_graph)
            new_nx = self._build_nx_graph(new_graph)

            # 1. Compare Pages
            old_pages = {p.id: p for p in old_graph.pages}
            new_pages = {p.id: p for p in new_graph.pages}

            added_page_ids = sorted(list(set(new_pages.keys()) - set(old_pages.keys())))
            removed_page_ids = sorted(list(set(old_pages.keys()) - set(new_pages.keys())))
            
            added_pages = [f"{new_pages[pid].title} ({new_pages[pid].url_path})" for pid in added_page_ids]
            removed_pages = [f"{old_pages[pid].title} ({old_pages[pid].url_path})" for pid in removed_page_ids]

            modified_pages: List[EntityDelta] = []
            renamed_pages: List[Dict[str, str]] = []
            moved_pages: List[Dict[str, str]] = []

            common_page_ids = set(old_pages.keys()).intersection(set(new_pages.keys()))
            for pid in common_page_ids:
                delta, rename_info, move_info = EntityComparator.compare_pages(old_pages[pid], new_pages[pid])
                if delta:
                    modified_pages.append(delta)
                if rename_info:
                    renamed_pages.append(rename_info)
                if move_info:
                    moved_pages.append(move_info)

            # 2. Compare Workflows
            old_wfs = {w.id: w for w in old_graph.workflows}
            new_wfs = {w.id: w for w in new_graph.workflows}

            added_wf_ids = sorted(list(set(new_wfs.keys()) - set(old_wfs.keys())))
            removed_wf_ids = sorted(list(set(old_wfs.keys()) - set(new_wfs.keys())))

            added_workflows = [new_wfs[wid].name for wid in added_wf_ids]
            removed_workflows = [old_wfs[wid].name for wid in removed_wf_ids]

            modified_workflows: List[EntityDelta] = []
            common_wf_ids = set(old_wfs.keys()).intersection(set(new_wfs.keys()))
            for wid in common_wf_ids:
                delta = EntityComparator.compare_workflows(old_wfs[wid], new_wfs[wid])
                if delta:
                    modified_workflows.append(delta)

            # 3. Compare Forms
            old_forms = {f.id: f for f in old_graph.forms}
            new_forms = {f.id: f for f in new_graph.forms}

            added_form_ids = sorted(list(set(new_forms.keys()) - set(old_forms.keys())))
            removed_form_ids = sorted(list(set(old_forms.keys()) - set(new_forms.keys())))

            added_forms = [new_forms[fid].name for fid in added_form_ids]
            removed_forms = [old_forms[fid].name for fid in removed_form_ids]

            modified_forms: List[EntityDelta] = []
            common_form_ids = set(old_forms.keys()).intersection(set(new_forms.keys()))
            for fid in common_form_ids:
                delta = EntityComparator.compare_forms(old_forms[fid], new_forms[fid])
                if delta:
                    modified_forms.append(delta)

            # 4. Compare API Endpoints
            old_apis = {a.id: a for a in old_graph.api_endpoints}
            new_apis = {a.id: a for a in new_graph.api_endpoints}

            api_changes: List[EntityDelta] = []
            common_api_ids = set(old_apis.keys()).intersection(set(new_apis.keys()))
            for aid in common_api_ids:
                delta = EntityComparator.compare_api_endpoints(old_apis[aid], new_apis[aid])
                if delta:
                    api_changes.append(delta)
            
            for aid in set(new_apis.keys()) - set(old_apis.keys()):
                api_changes.append(EntityDelta(
                    entity_id=aid, entity_type="APIEndpoint", name=f"{new_apis[aid].method} {new_apis[aid].path}",
                    changes={"status": "ADDED"}
                ))
            for aid in set(old_apis.keys()) - set(new_apis.keys()):
                api_changes.append(EntityDelta(
                    entity_id=aid, entity_type="APIEndpoint", name=f"{old_apis[aid].method} {old_apis[aid].path}",
                    changes={"status": "REMOVED"}
                ))

            # 5. Compare Topology Edge Relationships (Navigation & Graph Edges)
            relationship_changes: List[Dict[str, Any]] = []
            old_edges = set(old_nx.edges(data="type"))
            new_edges = set(new_nx.edges(data="type"))

            added_edges = new_edges - old_edges
            removed_edges = old_edges - new_edges

            for u, v, rel_type in added_edges:
                relationship_changes.append({"action": "ADDED", "source": u, "target": v, "type": rel_type})
            for u, v, rel_type in removed_edges:
                relationship_changes.append({"action": "REMOVED", "source": u, "target": v, "type": rel_type})

            diff = GraphDiff(
                old_version_id=old_graph.version_id,
                new_version_id=new_graph.version_id,
                added_pages=added_pages,
                removed_pages=removed_pages,
                modified_pages=modified_pages,
                renamed_pages=renamed_pages,
                moved_pages=moved_pages,
                added_workflows=added_workflows,
                removed_workflows=removed_workflows,
                modified_workflows=modified_workflows,
                added_forms=added_forms,
                removed_forms=removed_forms,
                modified_forms=modified_forms,
                api_changes=api_changes,
                relationship_changes=relationship_changes,
            )

            logger.info(f"Graph comparison complete: {diff.total_changes_count} total deltas identified.")
            return diff

        except Exception as e:
            logger.error(f"Error computing GraphDiff: {e}")
            raise DiffError(f"Failed to compare Knowledge Graph versions: {e}") from e

    def _build_nx_graph(self, graph: KnowledgeGraphVersion) -> nx.DiGraph:
        """Construct NetworkX DiGraph representing entity topology."""
        g = nx.DiGraph()
        for p in graph.pages:
            g.add_node(p.id, type="Page", title=p.title)
        for w in graph.workflows:
            g.add_node(w.id, type="Workflow", name=w.name)
        for f in graph.forms:
            g.add_node(f.id, type="Form", name=f.name)
        for rel in graph.relationships:
            g.add_edge(rel.source_id, rel.target_id, type=rel.relationship_type)
        return g
