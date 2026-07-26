from .graph_reader import GraphReader
from .workflow_analyzer import WorkflowAnalyzer
from .planner import TestPlanner
from .executor import TestExecutor
from .result_analyzer import ResultAnalyzer
from .coverage import CoverageAnalyzer
from .report import Reporter
from .models import TestSuiteResult

class QAAgent:
    """
    Main orchestration class tying all parts of the QA Agent pipeline together.
    """
    def __init__(self, graph_path: str):
        self.graph_reader = GraphReader(graph_path)
        self.planner = None
        self.executor = TestExecutor()
        self.coverage_analyzer = CoverageAnalyzer()
        self.reporter = Reporter()
        
    def run(self):
        print("Reading graph...")
        pages, apis, forms, workflows = self.graph_reader.read_graph()
        
        print("Analyzing workflows...")
        analyzer = WorkflowAnalyzer(workflows, pages, apis, forms)
        analyzer.analyze()
        
        print("Planning tests...")
        self.planner = TestPlanner(pages, apis, forms, workflows)
        test_cases = self.planner.generate_plan()
        
        print(f"Executing {len(test_cases)} tests...")
        results = self.executor.execute(test_cases)
        
        print("Calculating coverage...")
        coverage = self.coverage_analyzer.calculate_coverage(test_cases, pages, forms, workflows, apis)
        
        print("Generating report...")
        self.reporter.generate_report(results, coverage, "report.json")
        
        return results, coverage
