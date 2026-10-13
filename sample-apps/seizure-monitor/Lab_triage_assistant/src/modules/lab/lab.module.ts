/**
 * Lab Module
 *
 * Provides tools for parsing and analyzing lab reports.
 * Includes the parse_labs tool for extracting structured data from raw reports.
 */

import { Module } from '@nitrostack/core';
import { ParseLabsTools } from '../../tools/parse_labs.js';
import { FlagCriticalTools } from '../../tools/flag-critical.js';
import { RouteSpecialistTools } from '../../tools/route-specialist.js';
import { CheckExistingDoctorTools } from '../../tools/check-existing-doctor.js';
import { SuggestDoctorTools } from '../../tools/suggest-doctor.js';
import { AssignAppointmentTools } from '../../tools/assign-appointment.js';
import { GetAvailableSlotsTools } from '../../tools/get-available-slots.js';
import { BookAppointmentTools } from '../../tools/book-appointment.js';
import { ShareSummaryTools } from '../../tools/share-summary.js';
import { RunFullTriageTools } from '../../tools/run-full-triage.js';
import { OcrReportImageTools } from '../../tools/ocr-report-image.js';
import { ParsePdfReportTools } from '../../tools/parse-pdf-report.js';
import { PatientContextTools } from '../../tools/patient-context.js';
import { GetKnowledgeGraphTools } from '../../tools/get-knowledge-graph.js';
import { GetPatientTrendTools } from '../../tools/get-patient-trend.js';
import { DoctorIntakeTools } from './doctor_intake.js';
import { MedicalAssistantTools } from './medical-assistant.tool.js';
import { ReferenceRangeResources } from '../../resources/reference-ranges.resources.js';
import { KnowledgeGraphResources } from '../../resources/knowledge-graph.resources.js';
import { DoctorsResources } from '../../resources/doctors.js';
import { ExplainTriagePrompts } from '../../prompts/explain-triage.prompts.js';
import { RecommendDepartmentPrompts } from '../../prompts/recommend-department.prompts.js';
import { ExplainRecommendationPrompts } from '../../prompts/explain-recommendation.prompts.js';
import { ResolveUnparsedLinesPrompts } from '../../prompts/resolve-unparsed-lines.prompts.js';

@Module({
  name: 'lab',
  description: 'Lab report parsing, triage classification, specialist routing, and patient-facing explanations',
  controllers: [
    ParseLabsTools,
    FlagCriticalTools,
    RouteSpecialistTools,
    CheckExistingDoctorTools,
    SuggestDoctorTools,
    AssignAppointmentTools,
    GetAvailableSlotsTools,
    BookAppointmentTools,
    ShareSummaryTools,
    RunFullTriageTools,
    OcrReportImageTools,
    ParsePdfReportTools,
    PatientContextTools,
    GetKnowledgeGraphTools,
    GetPatientTrendTools,
    DoctorIntakeTools,
    MedicalAssistantTools,
    ReferenceRangeResources,
    KnowledgeGraphResources,
    DoctorsResources,
    ExplainTriagePrompts,
    RecommendDepartmentPrompts,
    ExplainRecommendationPrompts,
    ResolveUnparsedLinesPrompts
  ]
})
export class LabModule {}
