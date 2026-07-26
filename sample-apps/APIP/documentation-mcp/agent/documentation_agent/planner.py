"""Build a documentation plan from Product Knowledge Graph data."""

from models import DocumentPlan, PlanSection, ProductKnowledgeGraph


class ContentPlanner:
    """Determines documentation sections and workflow ordering."""

    def create_plan(self, graph: ProductKnowledgeGraph) -> DocumentPlan:
        """Create a deterministic plan for all documents."""
        workflows = sorted(
            graph.workflows,
            key=lambda workflow: (workflow.order, workflow.name.lower()),
        )

        sections = [
            PlanSection(
                title=workflow.name,
                workflow_ids=[workflow.id],
            )
            for workflow in workflows
        ]

        faq_topics = [feature.name for feature in graph.features]
        if not faq_topics:
            faq_topics = [workflow.name for workflow in workflows]

        return DocumentPlan(
            user_guide_sections=sections,
            faq_topics=faq_topics,
            release_note_workflow_ids=[workflow.id for workflow in workflows],
        )