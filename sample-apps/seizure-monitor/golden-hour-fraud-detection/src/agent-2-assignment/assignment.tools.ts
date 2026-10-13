import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { pool } from '../db/pool.js';
import {
  DepartmentSchema,
  PersonnelSchema,
  type Department,
  type Personnel,
} from '../schemas/department.schema.js';

// ---------------------------------------------------------------------------
// Input / Output schemas (unchanged — Agent 2 prompt depends on this shape)
// ---------------------------------------------------------------------------

const GetDepartmentDirectoryInputSchema = z.object({
  jurisdiction: z
    .string()
    .min(1)
    .describe('Jurisdiction code or region text from the validated triage output'),
  specialization: z
    .string()
    .min(1)
    .describe('Fraud type or routing specialization needed for the ticket'),
});

const GetDepartmentDirectoryOutputSchema = z.object({
  query: GetDepartmentDirectoryInputSchema,
  departments: z.array(DepartmentSchema),
});

const GetPersonnelAvailabilityInputSchema = z.object({
  department_id: z
    .string()
    .uuid()
    .describe('Department UUID returned by get_department_directory'),
});

const GetPersonnelAvailabilityOutputSchema = z.object({
  department_id: z.string().uuid(),
  personnel: z.array(PersonnelSchema),
});

// ---------------------------------------------------------------------------
// Hardcoded fallback data
//   Returned when the database is unreachable so the pipeline never fully
//   breaks. Matches the original mock data.
// ---------------------------------------------------------------------------

const FALLBACK_DEPARTMENTS: Department[] = [
  {
    department_id: '11111111-1111-4111-8111-111111111111',
    name: 'Cyber Crimes Unit',
    jurisdiction_scope: 'IN-MH statewide and cyber-enabled financial fraud',
    specializations: ['upi_fraud', 'phishing', 'card_fraud'],
    current_caseload: 42,
    capacity: 60,
    contact_channel: 'mcp://departments/cyber-crimes',
  },
  {
    department_id: '22222222-2222-4222-8222-222222222222',
    name: 'General Fraud Desk',
    jurisdiction_scope: 'IN-MH Mumbai local jurisdiction',
    specializations: ['general_fraud', 'cheque_fraud', 'impersonation_scam'],
    current_caseload: 18,
    capacity: 35,
    contact_channel: 'mcp://departments/general-fraud',
  },
  {
    department_id: '33333333-3333-4333-8333-333333333333',
    name: 'Banking Fraud Cell',
    jurisdiction_scope: 'IN-KA statewide banking and payment rail fraud',
    specializations: ['bank_transfer', 'upi_fraud', 'cheque_fraud', 'card_fraud'],
    current_caseload: 51,
    capacity: 55,
    contact_channel: 'mcp://departments/banking-fraud',
  },
  {
    department_id: '44444444-4444-4444-8444-444444444444',
    name: 'Economic Offences Wing',
    jurisdiction_scope: 'IN national high-value and organized financial crime',
    specializations: ['investment_scam', 'organized_fraud', 'cross_jurisdiction_fraud'],
    current_caseload: 67,
    capacity: 80,
    contact_channel: 'mcp://departments/economic-offences',
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

/** Map a raw pg row to the Department shape. */
function rowToDepartment(row: Record<string, unknown>): Department {
  return {
    department_id: row.department_id as string,
    name: row.name as string,
    jurisdiction_scope: row.jurisdiction_scope as string,
    specializations: row.specializations as string[],
    current_caseload: Number(row.current_caseload),
    capacity: Number(row.capacity),
    contact_channel: row.contact_channel as string,
  };
}

/** Map a raw pg row to the Personnel shape. */
function rowToPersonnel(row: Record<string, unknown>): Personnel {
  return {
    personnel_id: row.personnel_id as string,
    name: row.name as string,
    role: row.role as string,
    department_id: row.department_id as string,
    specializations: row.specializations as string[],
    current_case_count: Number(row.current_case_count),
    availability_status: row.availability_status as string,
  };
}

/**
 * Search departments table.
 *
 * Uses ILIKE on `jurisdiction_scope` and array overlap (`&&`) on
 * `specializations` — matching the original in-memory filter semantics.
 *
 * NOTE: This query assumes a `departments` table exists with the schema
 * matching DepartmentSchema. If you haven't created that table yet, the
 * tool gracefully falls back to FALLBACK_DEPARTMENTS (see catch block).
 *
 * For an MVP where departments are still few and static, the fallback
 * array serves the same purpose as the old mock data.
 */
async function queryDepartments(
  jurisdiction: string,
  specialization: string,
): Promise<Department[]> {
  const normalizedJurisdiction = normalize(jurisdiction);
  const normalizedSpecialization = normalize(specialization);

  const sql = `
    SELECT * FROM departments
    WHERE (
      jurisdiction_scope ILIKE $1
      OR jurisdiction_scope ILIKE '%national%'
      OR jurisdiction_scope ILIKE '%statewide%'
    )
    AND (
      specializations && $2::text[]
      OR specializations && ARRAY['general_fraud']::text[]
      OR specializations && ARRAY['organized_fraud']::text[]
    )
    ORDER BY current_caseload ASC
  `;

  const result = await pool.query(sql, [
    `%${normalizedJurisdiction}%`,
    [normalizedSpecialization],
  ]);

  return result.rows.map(rowToDepartment);
}

/**
 * Get all departments (unfiltered) — used as a last-resort fallback
 * when the filtered query returns nothing.
 */
async function queryAllDepartments(): Promise<Department[]> {
  const result = await pool.query(
    'SELECT * FROM departments ORDER BY current_caseload ASC',
  );
  return result.rows.map(rowToDepartment);
}

/**
 * Get personnel for a given department, ordered by case count ascending
 * (lowest-load first — mirrors the original sort).
 */
async function queryPersonnel(departmentId: string): Promise<Personnel[]> {
  const result = await pool.query(
    'SELECT * FROM personnel WHERE department_id = $1 ORDER BY current_case_count ASC',
    [departmentId],
  );
  return result.rows.map(rowToPersonnel);
}

// ---------------------------------------------------------------------------
// Tool class
// ---------------------------------------------------------------------------

export class AssignmentTools {
  @Tool({
    name: 'get_department_directory',
    description:
      'Return capacity-aware department routing options for Agent 2 based on jurisdiction and fraud specialization.',
    inputSchema: GetDepartmentDirectoryInputSchema,
    outputSchema: GetDepartmentDirectoryOutputSchema,
    examples: {
      request: {
        jurisdiction: 'IN-MH',
        specialization: 'upi_fraud',
      },
      response: {
        query: {
          jurisdiction: 'IN-MH',
          specialization: 'upi_fraud',
        },
        departments: [],
      },
    },
  })
  async getDepartmentDirectory(
    input: z.infer<typeof GetDepartmentDirectoryInputSchema>,
    ctx: ExecutionContext,
  ): Promise<z.infer<typeof GetDepartmentDirectoryOutputSchema>> {
    ctx.logger.info('Searching department directory (PostgreSQL)', input);

    try {
      let departments = await queryDepartments(input.jurisdiction, input.specialization);

      // If filtered query returned nothing, get all departments
      if (departments.length === 0) {
        departments = await queryAllDepartments();
      }

      // If the departments table itself is empty (hasn't been seeded),
      // fall back to the static array so the pipeline keeps working.
      if (departments.length === 0) {
        ctx.logger.warn(
          'No departments found in database; using national fallback list',
        );
        departments = FALLBACK_DEPARTMENTS;
      }

      return {
        query: input,
        departments,
      };
    } catch (error) {
      ctx.logger.error('PostgreSQL query failed in get_department_directory', {
        error: error instanceof Error ? error.message : String(error),
      });

      // Graceful degradation: return the full static fallback list
      return {
        query: input,
        departments: FALLBACK_DEPARTMENTS,
      };
    }
  }

  @Tool({
    name: 'get_personnel_availability',
    description:
      'Return personnel capacity for a department so Agent 2 can assign the lowest-load suitable officer or team.',
    inputSchema: GetPersonnelAvailabilityInputSchema,
    outputSchema: GetPersonnelAvailabilityOutputSchema,
    examples: {
      request: {
        department_id: '11111111-1111-4111-8111-111111111111',
      },
      response: {
        department_id: '11111111-1111-4111-8111-111111111111',
        personnel: [],
      },
    },
  })
  async getPersonnelAvailability(
    input: z.infer<typeof GetPersonnelAvailabilityInputSchema>,
    ctx: ExecutionContext,
  ): Promise<z.infer<typeof GetPersonnelAvailabilityOutputSchema>> {
    ctx.logger.info('Fetching personnel availability (PostgreSQL)', input);

    try {
      const personnel = await queryPersonnel(input.department_id);

      return {
        department_id: input.department_id,
        personnel,
      };
    } catch (error) {
      ctx.logger.error('PostgreSQL query failed in get_personnel_availability', {
        error: error instanceof Error ? error.message : String(error),
      });

      // Graceful degradation: return empty personnel list
      return {
        department_id: input.department_id,
        personnel: [],
      };
    }
  }
}
