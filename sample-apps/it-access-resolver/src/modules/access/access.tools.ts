import { ToolDecorator as Tool, ControllerDecorator as Controller, ExecutionContext, z, emitEvent } from '@nitrostack/core';
import { createRequire } from 'module';
import { IdentityRecord, LicenseRecord, NetworkStatus, DiagnosisResult } from './access.types.js';

// Load fixtures via createRequire so JSON imports work at runtime with ESM
const require = createRequire(import.meta.url);
const identitiesData: IdentityRecord[] = require('../../../fixtures/identities.json');
const licensesData: LicenseRecord[] = require('../../../fixtures/licenses.json');
const networkData: NetworkStatus[] = require('../../../fixtures/network.json');

// In-memory mutable copies so tools can actually change state during the demo
let identityStore: IdentityRecord[] = JSON.parse(JSON.stringify(identitiesData));
let licenseStore: LicenseRecord[] = JSON.parse(JSON.stringify(licensesData));
let networkStore: NetworkStatus[] = JSON.parse(JSON.stringify(networkData));

@Controller('access')
export class AccessTools {
  @Tool({
    name: 'check_identity_status',
    description: "Check the employee's identity/directory status and group memberships.",
    inputSchema: z.object({
      employeeId: z.string().describe('The employee ID, e.g. E101'),
    }),
  })
  checkIdentityStatus(input: { employeeId: string }, ctx: ExecutionContext) {
    ctx.logger.info(`Checking identity for ${input.employeeId}`);
    const record = identityStore.find(i => i.employeeId === input.employeeId);
    if (!record) return { found: false, error: 'Employee not found' };
    return record;
  }

  @Tool({
    name: 'check_group_membership',
    description: 'Check whether the employee is in the group required for a given tool.',
    inputSchema: z.object({
      employeeId: z.string().describe('The employee ID, e.g. E102'),
      toolName: z.string().describe('The tool/app name, e.g. Figma'),
    }),
  })
  checkGroupMembership(input: { employeeId: string; toolName: string }, ctx: ExecutionContext) {
    ctx.logger.info(`Checking group membership for ${input.employeeId} on ${input.toolName}`);
    const person = identityStore.find(i => i.employeeId === input.employeeId);
    const license = licenseStore.find(l => l.toolName === input.toolName);
    if (!person || !license) return { found: false };
    const inGroup = license.requiresGroup ? person.groups.includes(license.requiresGroup) : true;
    return {
      employeeId: input.employeeId,
      toolName: input.toolName,
      requiredGroup: license.requiresGroup ?? null,
      inGroup,
    };
  }

  @Tool({
    name: 'check_license_availability',
    description: 'Check license/seat availability for a given tool.',
    inputSchema: z.object({
      toolName: z.string().describe('The tool/app name, e.g. SharedDrive'),
    }),
  })
  checkLicenseAvailability(input: { toolName: string }, ctx: ExecutionContext) {
    ctx.logger.info(`Checking license availability for ${input.toolName}`);
    const license = licenseStore.find(l => l.toolName === input.toolName);
    if (!license) return { found: false };
    return { ...license, seatsAvailable: license.totalSeats - license.usedSeats };
  }

  @Tool({
    name: 'check_network_status',
    description: "Check the employee's VPN/network connection status.",
    inputSchema: z.object({
      employeeId: z.string().describe('The employee ID, e.g. E104'),
    }),
  })
  checkNetworkStatus(input: { employeeId: string }, ctx: ExecutionContext) {
    ctx.logger.info(`Checking network status for ${input.employeeId}`);
    const status = networkStore.find(n => n.employeeId === input.employeeId);
    if (!status) return { found: false };
    return status;
  }

  @Tool({
    name: 'diagnose_root_cause',
    description:
      'Diagnose the root cause of an access issue for an employee and a tool, using identity/group/license/network checks.',
    inputSchema: z.object({
      employeeId: z.string().describe('The employee ID, e.g. E102'),
      toolName: z.string().describe('The tool/app the employee cannot access, e.g. Figma'),
    }),
  })
  diagnoseRootCause(input: { employeeId: string; toolName: string }, ctx: ExecutionContext): DiagnosisResult {
    ctx.logger.info(`Diagnosing root cause for ${input.employeeId} on ${input.toolName}`);
    const person = identityStore.find(i => i.employeeId === input.employeeId);
    if (!person) return { rootCause: 'unknown', detail: 'Employee not found', fixable: false };

    if (person.status !== 'active') {
      return {
        rootCause: 'account_suspended',
        detail: `Account status is '${person.status}'`,
        fixable: person.status === 'pending',
      };
    }

    const netStatus = networkStore.find(n => n.employeeId === input.employeeId);
    if (netStatus && !netStatus.vpnConnected) {
      return {
        rootCause: 'network_issue',
        detail: `VPN not connected (${netStatus.errorCode ?? 'unknown error'})`,
        fixable: netStatus.deviceTrusted,
      };
    }

    const license = licenseStore.find(l => l.toolName === input.toolName);
    if (license) {
      const inGroup = license.requiresGroup ? person.groups.includes(license.requiresGroup) : true;
      if (!inGroup) {
        return {
          rootCause: 'not_in_group',
          detail: `Missing group '${license.requiresGroup}' required for ${input.toolName}`,
          fixable: true,
        };
      }
      if (license.usedSeats >= license.totalSeats) {
        return {
          rootCause: 'no_license',
          detail: `No seats available for ${input.toolName} (${license.usedSeats}/${license.totalSeats})`,
          fixable: false,
        };
      }
    }

    return { rootCause: 'none', detail: 'All systems healthy — employee has verified access and ticket is closed.', fixable: false };
  }

  @Tool({
    name: 'add_to_group',
    description: 'Add the employee to a directory group, granting them access to the associated tool.',
    inputSchema: z.object({
      employeeId: z.string().describe('The employee ID to add to the group'),
      groupName: z.string().describe('The directory group name, e.g. design-all'),
    }),
  })
  addToGroup(input: { employeeId: string; groupName: string }, ctx: ExecutionContext) {
    ctx.logger.info(`Adding ${input.employeeId} to group ${input.groupName}`);
    const person = identityStore.find(i => i.employeeId === input.employeeId);
    if (!person) return { success: false, error: 'Employee not found' };
    if (!person.groups.includes(input.groupName)) {
      person.groups.push(input.groupName);
    }
    emitEvent('access.action', {
      action: 'add_to_group',
      employeeId: input.employeeId,
      detail: `Added employee ${input.employeeId} to directory group '${input.groupName}'`,
    });
    return { success: true, employeeId: input.employeeId, groups: person.groups };
  }

  @Tool({
    name: 'remove_from_group',
    description: 'Remove an employee from a directory group, revoking their access to the associated tool and reclaiming license seats.',
    inputSchema: z.object({
      employeeId: z.string().describe('The employee ID to remove from the group'),
      groupName: z.string().describe('The directory group name, e.g. design-all'),
    }),
  })
  removeFromGroup(input: { employeeId: string; groupName: string }, ctx: ExecutionContext) {
    ctx.logger.info(`Removing ${input.employeeId} from group ${input.groupName}`);
    const person = identityStore.find(i => i.employeeId === input.employeeId);
    if (!person) return { success: false, error: 'Employee not found' };
    
    person.groups = person.groups.filter(g => g !== input.groupName);
    
    // Reclaim seat in license pool if applicable
    const license = licenseStore.find(l => l.requiresGroup === input.groupName);
    if (license && license.usedSeats > 0) {
      license.usedSeats -= 1;
    }

    emitEvent('access.action', {
      action: 'remove_from_group',
      employeeId: input.employeeId,
      toolName: license?.toolName,
      detail: `Removed employee ${input.employeeId} from directory group '${input.groupName}'` + (license ? ` and reclaimed 1 license seat for ${license.toolName}` : ''),
    });

    return { 
      success: true, 
      employeeId: input.employeeId, 
      groups: person.groups,
      reclaimedSeat: license ? { toolName: license.toolName, newSeatsAvailable: license.totalSeats - license.usedSeats } : null
    };
  }

  @Tool({
    name: 'request_license',
    description: 'Request an additional license seat for a tool (simulated approval).',
    inputSchema: z.object({
      toolName: z.string().describe('The tool/app to request a seat for, e.g. SharedDrive'),
    }),
  })
  requestLicense(input: { toolName: string }, ctx: ExecutionContext) {
    ctx.logger.info(`Requesting license for ${input.toolName}`);
    const license = licenseStore.find(l => l.toolName === input.toolName);
    if (!license) return { success: false, error: 'Tool not found' };
    if (license.usedSeats >= license.totalSeats) {
      license.totalSeats += 5; // Auto-expand enterprise license pool!
    }
    emitEvent('access.action', {
      action: 'request_license',
      toolName: input.toolName,
      detail: `Requested and approved additional license seats for '${input.toolName}' (available: ${license.totalSeats - license.usedSeats})`,
    });
    return { success: true, toolName: input.toolName, seatsAvailable: license.totalSeats - license.usedSeats };
  }

  @Tool({
    name: 'reset_network_access',
    description: "Reset the employee's network/VPN access (simulated fix).",
    inputSchema: z.object({
      employeeId: z.string().describe('The employee ID whose VPN access should be reset'),
    }),
  })
  resetNetworkAccess(input: { employeeId: string }, ctx: ExecutionContext) {
    ctx.logger.info(`Resetting network access for ${input.employeeId}`);
    const status = networkStore.find(n => n.employeeId === input.employeeId);
    if (!status) return { success: false, error: 'No network record found' };
    status.vpnConnected = true;
    status.errorCode = undefined;
    status.lastHandshake = new Date().toISOString();
    emitEvent('access.action', {
      action: 'reset_network_access',
      employeeId: input.employeeId,
      detail: `Reset VPN/network connection and re-authenticated trust for employee ${input.employeeId}`,
    });
    return { success: true, employeeId: input.employeeId, vpnConnected: true };
  }
}

// Export store accessors for resources
export function getIdentityStore() { return identityStore; }
export function getLicenseStore() { return licenseStore; }
export function getNetworkStore() { return networkStore; }
