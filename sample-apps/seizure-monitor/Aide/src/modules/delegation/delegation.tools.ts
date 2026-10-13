import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class DelegationTools {

    @Tool({
        name: 'assign_task',
        description: 'Assign a task to the most suitable team member.',
        inputSchema: z.object({
            taskDescription: z.string().describe('Description of the task'),
            urgency: z.enum(['low', 'medium', 'high'])
        })
    })
    async assignTask(input: any, ctx: ExecutionContext) {
        ctx.logger.info('Assigning task (Skill-Aware)', {
            task: input.taskDescription,
            urgency: input.urgency
        });

        const members = await prisma.member.findMany({ include: { skills: true } });
        const taskDesc = input.taskDescription.toLowerCase();

        // Check for skill matches
        const matchedMembers = members.filter((member: any) => {
            return member.skills.some((skill: any) => taskDesc.includes(skill.skill.toLowerCase()));
        });

        // Decide candidate pool (matched or everyone)
        const candidates = matchedMembers.length > 0 ? matchedMembers : members;

        // Find the member with the least workload in the candidate pool
        const bestMember = candidates.reduce((best: any, current: any) => {
            return current.currentWorkload < best.currentWorkload ? current : best;
        });

        // Generate reason
        let reason = '';
        if (matchedMembers.length > 0) {
            reason = `Selected ${bestMember.name} because the task matches their skills and they have the lowest workload among qualified specialists.`;
        } else {
            reason = `Selected ${bestMember.name} based on lowest overall workload as no specific skill match was found.`;
        }

        // Decide deadline
        let deadline = new Date();
        if (input.urgency === "high") {
            deadline.setDate(deadline.getDate() + 1);
        } else if (input.urgency === "medium") {
            deadline.setDate(deadline.getDate() + 3);
        } else {
            deadline.setDate(deadline.getDate() + 7);
        }

        const assignment = {
            assignedOwner: bestMember.name,
            deadline: deadline.toISOString().split("T")[0],
            priority: input.urgency,
            reason: reason
        };

        const taskId = `TASK-${Date.now()}`;
        
        await prisma.task.create({
            data: {
                taskId: taskId,
                description: input.taskDescription,
                status: 'In Progress',
                deadline: assignment.deadline,
                ownerId: bestMember.id
            }
        });

        await prisma.member.update({
            where: { id: bestMember.id },
            data: { currentWorkload: { increment: 1 } }
        });

        ctx.logger.info('Assignment decision made', assignment);

        return { ...assignment, taskId };
    }


    @Tool({
        name: 'get_task_board',
        description: 'Retrieve all current tasks.',
        inputSchema: z.object({})
    })
    async getTaskBoard(input: any, ctx: ExecutionContext) {
        ctx.logger.info('Fetching task board');
        const tasks = await prisma.task.findMany({ include: { owner: true } });

        return {
            tasks: tasks.map((t: any) => ({
                id: t.taskId,
                status: t.status,
                owner: t.owner?.name,
                deadline: t.deadline
            }))
        };
    }

}