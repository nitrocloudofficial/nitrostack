import { prisma } from '../../config/database.js';

export class OrganizationRepository {
  async findById(id: string) {
    return prisma.organization.findUnique({
      where: { id },
      include: {
        departments: {
          include: { teams: true },
        },
        teams: {
          include: {
            members: {
              select: { id: true, firstName: true, lastName: true, role: true, email: true },
            },
          },
        },
        officeLocations: true,
      },
    });
  }

  async createDepartment(organizationId: string, name: string, description?: string) {
    return prisma.department.create({
      data: { organizationId, name, description },
    });
  }

  async createTeam(organizationId: string, name: string, departmentId?: string, leadId?: string) {
    return prisma.team.create({
      data: { organizationId, name, departmentId, leadId },
    });
  }

  async addMemberToTeam(teamId: string, userId: string) {
    return prisma.team.update({
      where: { id: teamId },
      data: {
        members: {
          connect: { id: userId },
        },
      },
      include: { members: true },
    });
  }

  async createOfficeLocation(organizationId: string, name: string, city: string, country: string, address?: string) {
    return prisma.officeLocation.create({
      data: { organizationId, name, city, country, address },
    });
  }

  async findAllUsersForHierarchy(organizationId: string) {
    return prisma.user.findMany({
      where: { organizationId, deletedAt: null },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        email: true,
        jobTitle: true,
        managerId: true,
      },
    });
  }
}

export const organizationRepository = new OrganizationRepository();
