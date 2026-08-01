import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Exposes the team roster data as an MCP resource at `roster://team`.
 */
export class DelegationResources {
  @Resource({
    uri: 'roster://team',
    name: 'Team Roster',
    description: 'The complete employee roster, including names, emails, roles, skills, and current workloads.',
    mimeType: 'application/json'
  })
  async getRoster(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Fetching team roster');
    const members = await prisma.member.findMany({
      include: { skills: true }
    });

    const roster = {
      members: members.map((m: any) => ({
        name: m.name,
        email: m.email,
        role: m.role,
        currentWorkload: m.currentWorkload,
        skills: m.skills.map((s: any) => s.skill)
      }))
    };

    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(roster, null, 2),
        },
      ],
    };
  }
}
