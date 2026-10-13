from datetime import datetime
from nitro.agents.research.models import ResearchPackage
from nitro.agents.correlation.models import CorrelationPackage
from nitro.agents.evidence.models import EvidencePackage
from nitro.agents.hypothesis.models import HypothesisPackage
from .models import ReportPackage

class ReportEngine:
    def process(self, query: str, r_pkg: ResearchPackage, c_pkg: CorrelationPackage, e_pkg: EvidencePackage, h_pkg: HypothesisPackage) -> ReportPackage:
        md = f"# Autonomous Research Report: {query}\n\n"
        md += f"*Generated automatically by Invenio Multi-Agent System on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*\n\n"
        
        md += "## 1. Research Overview\n"
        md += f"The **Research Agent** retrieved **{len(r_pkg.papers)} papers**.\n\n"
        
        md += "## 2. Correlation & Knowledge Graph\n"
        md += f"The **Correlation Agent** constructed a graph with **{len(c_pkg.knowledge_graph.nodes)} nodes** and **{len(c_pkg.knowledge_graph.edges)} edges**.\n"
        md += f"Automatically detected **{len(c_pkg.clusters)} Research Subfields** via TF-IDF KMeans clustering.\n\n"
        
        md += "## 3. Evidence Intelligence\n"
        md += f"The **Evidence Agent** extracted **{len(e_pkg.claims)} semantic claims**.\n"
        if e_pkg.contradictions:
            md += "### Contradictory Findings\n"
            for c in e_pkg.contradictions:
                md += f"- **{c.description}**\n  *Evidence*: {c.evidence}\n"
        if e_pkg.consensus_findings:
            md += "### Consensus Findings\n"
            for c in e_pkg.consensus_findings:
                md += f"- {c.finding} *(Supported by {len(c.supporting_papers)} independent studies)*\n"
        
        md += "\n## 4. Generated Hypotheses\n"
        if h_pkg.hypotheses:
            for h in h_pkg.hypotheses:
                md += f"- **{h.title}**: {h.premise} {h.proposed_methodology} {h.expected_outcome}\n"
        else:
            md += "- No novel hypotheses were generated for this research corpus.\n"
            
        md += "\n---\n*End of Report*"
        
        return ReportPackage(
            title=f"Research Report: {query}",
            generated_at=datetime.now().isoformat(),
            markdown_content=md
        )
