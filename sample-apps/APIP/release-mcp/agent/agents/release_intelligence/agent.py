"""Master Orchestrator Agent for Release Intelligence."""

import uuid
from typing import Any, Dict, Optional, Union
from pathlib import Path

from agents.release_intelligence.config import ReleaseIntelligenceConfig
from agents.release_intelligence.loaders import VersionLoader
from agents.release_intelligence.comparison import GraphDiffEngine, ChangeAnalyzer
from agents.release_intelligence.intelligence import (
    ImpactAnalyzer, ReleaseNotesGenerator, ChangelogGenerator
)
from agents.release_intelligence.publishing import ValidationChecker, Publisher
from agents.release_intelligence.models import (
    KnowledgeGraphVersion, GraphDiff, Change, ImpactAnalysis,
    MultiAudienceReleaseNotes, Changelog, RiskAssessment,
    ReleaseSummary, ValidationStatus, ReleaseResult, FeatureSummary
)
from agents.release_intelligence.exceptions import ReleaseIntelligenceError
from agents.release_intelligence.utils.logger import logger


class ReleaseIntelligenceAgent:
    """Standalone Release Intelligence Agent orchestrating end-to-end release intelligence pipelines."""

    def __init__(self, config: Optional[ReleaseIntelligenceConfig] = None):
        """Initialize Release Intelligence Agent with modular pipeline components.

        Args:
            config: Optional ReleaseIntelligenceConfig settings instance.
        """
        self.config = config or ReleaseIntelligenceConfig()
        
        # Pipeline components
        self.loader = VersionLoader()
        self.diff_engine = GraphDiffEngine()
        self.change_analyzer = ChangeAnalyzer()
        self.impact_analyzer = ImpactAnalyzer(
            llm_provider=self.config.llm_provider,
            api_key=self.config.api_key,
            model_name=self.config.model_name
        )
        self.release_notes_generator = ReleaseNotesGenerator()
        self.changelog_generator = ChangelogGenerator()
        self.validator = ValidationChecker()
        self.publisher = Publisher(default_output_dir=self.config.get_output_dir())

        logger.info(f"Initialized '{self.config.agent_name}' with output directory: {self.config.output_dir}")

    async def run(
        self,
        old_version_input: Union[Dict[str, Any], str, Path, KnowledgeGraphVersion],
        new_version_input: Union[Dict[str, Any], str, Path, KnowledgeGraphVersion],
        output_dir: Optional[Path] = None
    ) -> ReleaseResult:
        """Orchestrate the complete release intelligence pipeline.

        Execution Flow:
            1. Version Loader: Load & deserialize Version A and Version B.
            2. Graph Diff Engine: Compare graph versions deterministically.
            3. Change Analyzer: Categorize raw deltas into Change records.
            4. Impact Analyzer: Evaluate AI-reasoned impact & assess risk.
            5. Release Notes Generator: Format multi-audience release notes.
            6. Changelog Generator: Generate multi-format changelogs.
            7. Validation Checker: Verify outputs and data integrity.
            8. Publisher: Package and write artifacts to disk.

        Args:
            old_version_input: Knowledge Graph Version A (base version).
            new_version_input: Knowledge Graph Version B (target version).
            output_dir: Optional custom publishing directory.

        Returns:
            Strongly typed master ReleaseResult object.

        Raises:
            ReleaseIntelligenceError: If pipeline execution or validation fails.
        """
        release_id = f"REL-{uuid.uuid4().hex[:8].upper()}"
        logger.info(f"Starting Release Intelligence Pipeline [{release_id}]...")

        try:
            # Step 1: Version Loader
            old_graph = self.loader.load_graph(old_version_input)
            new_graph = self.loader.load_graph(new_version_input)

            # Step 2: Graph Diff Engine (Deterministic)
            diff: GraphDiff = self.diff_engine.compare(old_graph, new_graph)

            # Step 3: Change Analyzer
            changes: list[Change] = self.change_analyzer.analyze_changes(diff)

            # Step 4: Impact Analyzer & Risk Assessor (AI Reasoning)
            impact: ImpactAnalysis = await self.impact_analyzer.analyze_impact(changes)
            risk: RiskAssessment = self.impact_analyzer.assess_risk(changes, impact)

            # Step 5: Release Notes Generator
            release_notes: MultiAudienceReleaseNotes = self.release_notes_generator.generate(
                changes=changes,
                impact=impact,
                version=new_graph.version_id
            )

            # Step 6: Changelog Generator
            changelog: Changelog = self.changelog_generator.generate(
                changes=changes,
                version=new_graph.version_id,
                format_type="Markdown"
            )

            # Build Feature Summaries
            feature_summaries = [
                FeatureSummary(
                    feature_name=c.affected_component.name,
                    category=c.category.value,
                    summary=c.description,
                    key_highlights=[c.title]
                )
                for c in changes if c.category.value in ["Added", "Modified"]
            ]

            summary = ReleaseSummary(
                version_a=old_graph.version_id,
                version_b=new_graph.version_id,
                total_changes=len(changes),
                feature_summaries=feature_summaries,
                executive_overview=impact.user_impact.summary
            )

            # Draft master ReleaseResult payload
            result = ReleaseResult(
                release_id=release_id,
                old_version_id=old_graph.version_id,
                new_version_id=new_graph.version_id,
                diff=diff,
                changes=changes,
                impact_analysis=impact,
                release_notes=release_notes,
                changelog=changelog,
                risk_assessment=risk,
                release_summary=summary,
                validation_status=ValidationStatus(is_valid=True, warnings=[], errors=[])
            )

            # Step 7: Validation Checker
            validation_status = self.validator.validate_release(result)
            result.validation_status = validation_status

            if self.config.strict_validation and not validation_status.is_valid:
                logger.error(f"Release validation failed in strict mode: {validation_status.errors}")
                raise ReleaseIntelligenceError(f"Release validation failed: {validation_status.errors}")

            # Step 8: Publisher
            if self.config.auto_publish:
                target_path = output_dir or self.config.get_output_dir()
                published_files = self.publisher.publish(result, output_dir=target_path)
                result.published_files = published_files

            logger.info(f"Release Intelligence Pipeline [{release_id}] completed successfully.")
            return result

        except Exception as e:
            logger.error(f"Pipeline failure during Release Intelligence execution: {e}")
            raise ReleaseIntelligenceError(f"Release Intelligence pipeline failed: {e}") from e
