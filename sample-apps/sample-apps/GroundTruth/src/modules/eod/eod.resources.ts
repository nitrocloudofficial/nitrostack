import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';
import { store } from '../../store/store.js';
import { requireParams } from '../../lib/uri.js';

const REPORT_URI = 'eod://reports/{employeeId}/{date}';
const TEAM_URI = 'team://employees';

/**
 * Resource handlers return the payload tagged as JSON; NitroStack builds the
 * MCP `contents` envelope itself. Returning an envelope here would nest it
 * inside a second one and leave the agent parsing JSON out of JSON.
 */
function json(payload: unknown) {
  return { type: 'json' as const, data: payload };
}

export class EodResources {
  @Resource({
    uri: TEAM_URI,
    name: 'Team roster',
    description:
      'Every employee GroundTruth tracks, with their id, role, team, and GitHub username. ' +
      'Read this first to resolve a person to a valid employeeId.',
    mimeType: 'application/json',
  })
  async getTeam(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Reading team roster');
    const employees = store.listEmployees();
    return json({ count: employees.length, employees });
  }

  @Resource({
    uri: REPORT_URI,
    name: 'EOD report',
    description:
      "One employee's end-of-day report for a specific date, including the raw text and the " +
      'structured claims, blockers, and sentiment extracted from it. ' +
      'employeeId accepts an id, full name, or GitHub username; date is YYYY-MM-DD.',
    mimeType: 'application/json',
  })
  async getReport(uri: string, ctx: ExecutionContext) {
    const { employeeId, date } = requireParams(REPORT_URI, uri);
    const employee = store.resolveEmployee(employeeId);

    if (!employee) {
      return json({
        error: `No employee matches "${employeeId}". Read team://employees for valid ids.`,
      });
    }

    ctx.logger.info('Reading EOD report resource', {
      employee: employee.name,
      date,
    });

    const report = store.getReport(employee.id, date);
    if (!report) {
      return json({
        employee: employee.name,
        date,
        submitted: false,
        message: `${employee.name} has not submitted a report for ${date}.`,
      });
    }

    const check = store.getActivityCheck(report.id);

    return json({
      employee: {
        id: employee.id,
        name: employee.name,
        role: employee.role,
        githubUsername: employee.githubUsername,
      },
      date,
      submitted: true,
      report,
      // Included so the agent can tell whether this report was already verified.
      activityCheck: check ?? null,
    });
  }
}
