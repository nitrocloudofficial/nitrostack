import { z } from 'zod';
import { ToolDecorator as Tool, ExecutionContext, Injectable } from '@nitrostack/core';
import { DatabaseService } from '../database/database.service.js';

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const searchTestInput = z.object({
  query: z.string().min(1).max(100).describe('Name of the lab test (e.g. CBC, MRI Brain, HbA1c, Dengue NS1).'),
});

const reportStatusInput = z.object({
  testId: z.string().min(1).max(50).describe('The ID of the booked lab test.'),
});

@Injectable({ deps: [DatabaseService] })
export class LaboratoryTools {
  constructor(private readonly db: DatabaseService) {}

  @Tool({
    name: 'search-test',
    title: 'Search Lab Test',
    description: 'Find available lab tests and prices from the hospital laboratory catalog. Supports partial name matching. Returns test name, category, price, turnaround time, and preparation instructions.',
    inputSchema: searchTestInput,
    invocation: { invoking: 'Searching lab catalog…', invoked: 'Lab tests found' },
    metadata: { category: 'laboratory', tags: ['lab', 'test', 'pathology', 'diagnostics'] },
  })
  async searchTest(input: z.infer<typeof searchTestInput>, ctx: ExecutionContext) {
    ctx.logger.info('search-test', { query: input.query });
    const labModel = await this.db.labTests();

    // H6: Sanitized regex
    const safeQuery = escapeRegex(input.query.trim());
    const tests = await labModel
      .find({ name: { $regex: new RegExp(safeQuery, 'i') } })
      .select('-_id -__v')
      .limit(20)
      .lean()
      .exec();

    if (tests.length === 0) {
      return {
        found: false,
        query: input.query,
        tests: [],
        summary: `No lab tests found matching "${input.query}". Try: CBC, HbA1c, MRI, Dengue, Malaria, Thyroid, Lipid Profile.`,
      };
    }

    return {
      found: true,
      query: input.query,
      count: tests.length,
      tests,
      disclaimer: 'Lab data is synthetic for demo purposes. In production, this integrates with the Hospital Information System (HIS) for real-time test availability.',
      summary: `Found ${tests.length} lab test(s) matching "${input.query}".`,
    };
  }

  @Tool({
    name: 'lab-report-status',
    title: 'Check Lab Report Status',
    description: 'Check the status of a patient\'s lab report by test ID. Returns current status (Pending / Processing / Ready), expected delivery time, and notes.',
    inputSchema: reportStatusInput,
    invocation: { invoking: 'Checking report status…', invoked: 'Report status found' },
    metadata: { category: 'laboratory', tags: ['report', 'status', 'results'] },
  })
  async reportStatus(input: z.infer<typeof reportStatusInput>, ctx: ExecutionContext) {
    ctx.logger.info('lab-report-status', { testId: input.testId });
    const labModel = await this.db.labTests();

    const test = await labModel
      .findOne({ testId: input.testId.trim() })
      .select('-_id -__v')
      .lean()
      .exec();

    if (!test) {
      return {
        found: false,
        testId: input.testId,
        error: true,
        message: `No lab test found with ID "${input.testId}". Verify the test ID or use search-test to look up available tests.`,
      };
    }

    return {
      found: true,
      testId: test.testId,
      name: test.name,
      reportStatus: test.reportStatus,
      expectedDelivery: test.expectedDelivery || 'Not available',
      notes: test.reportStatus === 'Ready' ? '✅ Your report is ready. Please collect it from the laboratory or your patient portal.' : '⏳ Your report is being processed. You will be notified when it is ready.',
      disclaimer: 'This is a demo simulation. In production, results integrate with the patient EHR via HL7 FHIR.',
      summary: `Lab report for "${test.name}" (${input.testId}) is currently: ${test.reportStatus}. Expected: ${test.expectedDelivery || 'TBD'}.`,
    };
  }
}
