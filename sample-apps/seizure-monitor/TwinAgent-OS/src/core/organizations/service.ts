import { organizationRepository } from './repository.js';
import { NotFoundError } from '../../shared/errors/AppError.js';

export class OrganizationService {
  async getOrganization(id: string) {
    const org = await organizationRepository.findById(id);
    if (!org) throw new NotFoundError('Organization not found');
    return org;
  }

  async createDepartment(organizationId: string, name: string, description?: string) {
    return organizationRepository.createDepartment(organizationId, name, description);
  }

  async createTeam(organizationId: string, name: string, departmentId?: string, leadId?: string) {
    return organizationRepository.createTeam(organizationId, name, departmentId, leadId);
  }

  async addMemberToTeam(teamId: string, userId: string) {
    return organizationRepository.addMemberToTeam(teamId, userId);
  }

  async createOfficeLocation(organizationId: string, name: string, city: string, country: string, address?: string) {
    return organizationRepository.createOfficeLocation(organizationId, name, city, country, address);
  }

  async getHierarchy(organizationId: string) {
    const users = await organizationRepository.findAllUsersForHierarchy(organizationId);

    const userMap = new Map(users.map((u) => [u.id, { ...u, subordinates: [] as any[] }]));
    const rootNodes: any[] = [];

    for (const u of userMap.values()) {
      if (u.managerId && userMap.has(u.managerId)) {
        userMap.get(u.managerId)!.subordinates.push(u);
      } else {
        rootNodes.push(u);
      }
    }

    return rootNodes;
  }
}

export const organizationService = new OrganizationService();
