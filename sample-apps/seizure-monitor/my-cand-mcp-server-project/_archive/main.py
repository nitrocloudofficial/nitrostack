import argparse
import sys
import os
import json
from typing import List, Dict, Any

from models.candidate import Candidate
from models.config import ProjectionConfig, ProjectionFieldConfig
from engine.pipeline import CandidateTransformerEngine
from engine.projection import ProjectionLayer
from engine.validation import ProjectionValidator
from engine.explainability import DecisionLogCompiler
from engine.dashboard import QualityDashboardCompiler
from engine.report_generator import HTMLReportGenerator

def parse_args(args):
    parser = argparse.ArgumentParser(
        description="Multi-Source Candidate Data Transformer CLI"
    )
    parser.add_argument(
        "-i", "--inputs",
        nargs="+",
        required=True,
        help="Path(s) to input source file(s) (e.g. JSON, CSV, TXT)"
    )
    parser.add_argument(
        "-c", "--config",
        help="Path to the runtime projection config JSON file"
    )
    parser.add_argument(
        "-o", "--output-dir",
        default="outputs",
        help="Directory to write the output JSON files (default: outputs)"
    )
    return parser.parse_args(args)

def load_projection_config(config_path: str) -> ProjectionConfig:
    if not config_path or not os.path.exists(config_path):
        # Return default config if path not found or empty
        return ProjectionConfig(
            include_confidence=True,
            on_missing="null",
            fields=[
                ProjectionFieldConfig(path="candidate_id", type="string"),
                ProjectionFieldConfig(path="full_name", from_path="full_name", type="string", required=True),
                ProjectionFieldConfig(path="emails", type="array"),
                ProjectionFieldConfig(path="phones", type="array"),
                ProjectionFieldConfig(path="location", type="object"),
                ProjectionFieldConfig(path="links", type="array"),
                ProjectionFieldConfig(path="headline", type="string"),
                ProjectionFieldConfig(path="years_experience", type="number"),
                ProjectionFieldConfig(path="skills", type="array")
            ]
        )

    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        fields_list = []
        for field_data in data.get("fields", []):
            fields_list.append(ProjectionFieldConfig(
                path=field_data.get("path"),
                from_path=field_data.get("from_path"),
                type=field_data.get("type"),
                required=field_data.get("required", False),
                normalize=field_data.get("normalize")
            ))

        # support include_provenance custom config extension
        config = ProjectionConfig(
            include_confidence=data.get("include_confidence", True),
            on_missing=data.get("on_missing", "null"),
            fields=fields_list
        )
        setattr(config, 'include_provenance', data.get("include_provenance", False))
        return config
    except Exception as e:
        print(f"Error loading projection configuration {config_path}: {e}. Falling back to default.")
        return load_projection_config("")

def main():
    parsed_args = parse_args(sys.argv[1:])
    
    # 1. Load configuration
    config = load_projection_config(parsed_args.config)

    # 2. Run core engine pipeline
    engine = CandidateTransformerEngine()
    
    print("\n[1/4] Running Candidate Transformer Engine...")
    try:
        merged_candidates = engine.run_pipeline(parsed_args.inputs)
    except Exception as e:
        print(f"Engine Execution Failure: {e}")
        sys.exit(1)

    print(f"   Processed {engine.raw_candidates_processed} raw candidate records.")
    print(f"   Skipped {engine.malformed_sources_skipped} malformed/missing sources.")
    print(f"   Resolved into {len(merged_candidates)} unique candidate identities.")

    # 3. Projection, Validation, and Decision Logging
    print("\n[2/4] Executing Projection and Validation layers...")
    projector = ProjectionLayer()
    validator = ProjectionValidator()
    explain_compiler = DecisionLogCompiler()

    projected_outputs: List[Dict[str, Any]] = []
    validation_results = []
    decision_logs = []

    for cand in merged_candidates:
        # Run projection
        try:
            projected = projector.project(cand, config)
            projected_outputs.append(projected)
            
            # Validate output
            v_res = validator.validate(cand, projected, config)
            validation_results.append(v_res)
        except Exception as e:
            print(f"Error projecting/validating candidate {cand.candidate_id}: {e}")
            # Still validate as failure
            v_res = validator.validate(cand, {}, config)
            v_res.errors.append(f"Projection failed: {e}")
            validation_results.append(v_res)

        # Compile decision log
        try:
            dec_log = explain_compiler.compile_log(cand)
            decision_logs.append(dec_log)
        except Exception as e:
            print(f"Error compiling decision log for {cand.candidate_id}: {e}")

    # 4. Compile Batch Quality Dashboard
    print("\n[3/4] Compiling Quality Dashboard Summary...")
    dashboard_compiler = QualityDashboardCompiler()
    dashboard = dashboard_compiler.compile_dashboard(
        raw_candidates_count=engine.raw_candidates_processed,
        merged_candidates=merged_candidates,
        validation_results=validation_results,
        malformed_sources_skipped=engine.malformed_sources_skipped
    )

    # 5. Write outputs
    print("\n[4/4] Writing output artifacts...")
    output_dir = parsed_args.output_dir
    os.makedirs(output_dir, exist_ok=True)

    projected_file = os.path.join(output_dir, "projected_candidates.json")
    decision_file = os.path.join(output_dir, "decision_log.json")
    dashboard_file = os.path.join(output_dir, "quality_dashboard.json")

    try:
        with open(projected_file, 'w', encoding='utf-8') as f:
            json.dump(projected_outputs, f, indent=2, ensure_ascii=False)
        with open(decision_file, 'w', encoding='utf-8') as f:
            json.dump(decision_logs, f, indent=2, ensure_ascii=False)
        with open(dashboard_file, 'w', encoding='utf-8') as f:
            json.dump(dashboard, f, indent=2, ensure_ascii=False)
            
        # Write HTML Report
        report_file = os.path.join(output_dir, "report.html")
        report_gen = HTMLReportGenerator()
        report_gen.generate_report(
            projected_candidates=projected_outputs,
            decision_logs=decision_logs,
            quality_dashboard=dashboard,
            validation_results=validation_results,
            malformed_sources=engine.malformed_sources,
            output_path=report_file
        )
    except Exception as e:
        print(f"Error writing output files: {e}")
        sys.exit(1)

    # 6. Print CLI summaries
    print("\n" + "="*50)
    print("BATCH PROCESSING SUMMARY")
    print("="*50)
    print(f"Total Inputs Supplied       : {len(parsed_args.inputs)}")
    print(f"Raw Candidates Processed    : {engine.raw_candidates_processed}")
    print(f"Merged Candidate Profiles   : {len(merged_candidates)}")
    print(f"Malformed Sources Skipped   : {engine.malformed_sources_skipped}")
    
    print("\n" + "="*50)
    print("OUTPUT LOCATIONS")
    print("="*50)
    print(f"Projected Output JSON       : {projected_file}")
    print(f"Explainable Decision Log    : {decision_file}")
    print(f"Quality Dashboard Summary   : {dashboard_file}")

    print("\n" + "="*50)
    print("VALIDATION SUMMARY")
    print("="*50)
    total_errors = sum(len(vr.errors) for vr in validation_results)
    if total_errors == 0:
        print("[OK] ALL PROJECTED CANDIDATES VALIDATED SUCCESSFULLY!")
    else:
        print(f"[FAIL] FOUND {total_errors} VALIDATION ERRORS ACROSS BATCH:")
        for idx, vr in enumerate(validation_results):
            if not vr.is_valid:
                cand_id = merged_candidates[idx].candidate_id
                print(f"  Candidate: {cand_id}")
                for err in vr.errors:
                    print(f"    - {err}")
    print("="*50 + "\n")

if __name__ == "__main__":
    main()
