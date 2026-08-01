import { PrismaClient, Role, TaskStatus, TaskPriority, ProjectStatus, TwinTargetType, PredictionCategory, ConnectorType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('[Seed] Populating TwinAgent OS Enterprise Seed Data...');

  // 1. Organization
  const org = await prisma.organization.upsert({
    where: { domain: 'twinagent.ai' },
    update: {},
    create: {
      name: 'TwinAgent Technologies Inc.',
      domain: 'twinagent.ai',
    },
  });

  // 2. Department & Team
  const dept = await prisma.department.create({
    data: {
      organizationId: org.id,
      name: 'Engineering & Product',
      description: 'Core platform systems & AI digital twin engineering',
    },
  });

  const team = await prisma.team.create({
    data: {
      organizationId: org.id,
      departmentId: dept.id,
      name: 'Alpha Twin Architecture',
      description: 'Responsible for digital twin calculation engines & MCP servers',
    },
  });

  // 3. Users (Owner, Admin, Manager, Employees)
  const passwordHash = await bcrypt.hash('password123', 10);

  const owner = await prisma.user.create({
    data: {
      organizationId: org.id,
      departmentId: dept.id,
      email: 'owner@twinagent.ai',
      passwordHash,
      firstName: 'Sarah',
      lastName: 'Chen',
      role: Role.OWNER,
      jobTitle: 'Chief Executive Officer',
      weeklyCapacity: 40,
      currentWorkload: 32,
      skills: {
        create: [
          { name: 'Strategic Architecture', proficiency: 5 },
          { name: 'Product Leadership', proficiency: 5 },
        ],
      },
    },
  });

  const manager = await prisma.user.create({
    data: {
      organizationId: org.id,
      departmentId: dept.id,
      email: 'manager@twinagent.ai',
      passwordHash,
      firstName: 'Marcus',
      lastName: 'Vance',
      role: Role.MANAGER,
      jobTitle: 'Engineering Manager',
      weeklyCapacity: 40,
      currentWorkload: 45,
      skills: {
        create: [
          { name: 'Distributed Systems', proficiency: 5 },
          { name: 'TypeScript', proficiency: 4 },
        ],
      },
    },
  });

  const dev1 = await prisma.user.create({
    data: {
      organizationId: org.id,
      departmentId: dept.id,
      managerId: manager.id,
      email: 'dev1@twinagent.ai',
      passwordHash,
      firstName: 'Elena',
      lastName: 'Rostova',
      role: Role.EMPLOYEE,
      jobTitle: 'Senior Backend Engineer',
      weeklyCapacity: 40,
      currentWorkload: 54, // Overloaded -> triggers burnout prediction
      skills: {
        create: [
          { name: 'Node.js', proficiency: 5 },
          { name: 'Prisma', proficiency: 5 },
          { name: 'PostgreSQL', proficiency: 4 },
        ],
      },
    },
  });

  // Assign dev1 to team
  await prisma.team.update({
    where: { id: team.id },
    data: { members: { connect: [{ id: dev1.id }, { id: manager.id }] } },
  });

  // 4. Project & Tasks
  const project = await prisma.project.create({
    data: {
      organizationId: org.id,
      managerId: manager.id,
      name: 'TwinAgent Core Brain OS',
      key: 'TAOS',
      description: 'Proactive digital twin & enterprise reasoning engine',
      status: ProjectStatus.ACTIVE,
      riskScore: 35.0,
      healthScore: 65.0,
      completionRate: 45.0,
      targetEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  const task1 = await prisma.task.create({
    data: {
      projectId: project.id,
      assigneeId: dev1.id,
      creatorId: manager.id,
      title: 'Build Digital Twin Snapshot Aggregator Engine',
      description: 'Compute health, burnout, and risk scores across organizational workforce',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      complexity: 4,
      estimatedHours: 16.0,
      actualHours: 10.0,
      riskScore: 25.0,
    },
  });

  const task2 = await prisma.task.create({
    data: {
      projectId: project.id,
      assigneeId: dev1.id,
      creatorId: manager.id,
      title: 'Setup Model Context Protocol (MCP) Server Registry',
      description: 'Expose TwinAgent OS core capabilities as standard MCP Tools and Resources',
      status: TaskStatus.BLOCKED, // Trigger dependency risk
      priority: TaskPriority.URGENT,
      complexity: 5,
      estimatedHours: 24.0,
      actualHours: 8.0,
      riskScore: 85.0,
    },
  });

  // Task Dependency
  await prisma.taskDependency.create({
    data: {
      blockedTaskId: task2.id,
      dependentOnId: task1.id,
    },
  });

  // 5. Organizational Memory
  await prisma.memoryEntry.createMany({
    data: [
      {
        organizationId: org.id,
        category: 'DECISION',
        entityType: 'PROJECT',
        entityId: project.id,
        title: 'Architectural Decision: Modular Monolith vs Microservices',
        content: 'Selected TypeScript Fastify modular monolith for TwinAgent OS to enforce zero-latency inter-module function calls while keeping MCP Server extensibility seamless.',
        tags: ['architecture', 'typescript', 'fastify', 'mcp'],
        confidence: 1.0,
      },
      {
        organizationId: org.id,
        category: 'PATTERN',
        entityType: 'USER',
        entityId: dev1.id,
        title: 'Work Pattern: High Focus Burst Output',
        content: 'Elena Rostova exhibits high velocity on complex backend refactoring tasks during early morning hours.',
        tags: ['productivity', 'work-pattern'],
        confidence: 0.9,
      },
    ],
  });

  // 6. Enterprise Knowledge Graph Nodes & Edges
  const nodeUser = await prisma.graphNode.create({
    data: {
      organizationId: org.id,
      type: 'EMPLOYEE',
      name: `${dev1.firstName} ${dev1.lastName}`,
      externalId: dev1.id,
      properties: { role: dev1.role, email: dev1.email },
    },
  });

  const nodeProj = await prisma.graphNode.create({
    data: {
      organizationId: org.id,
      type: 'PROJECT',
      name: project.name,
      externalId: project.id,
      properties: { key: project.key, status: project.status },
    },
  });

  const nodeTask = await prisma.graphNode.create({
    data: {
      organizationId: org.id,
      type: 'TASK',
      name: task2.title,
      externalId: task2.id,
      properties: { priority: task2.priority, status: task2.status },
    },
  });

  await prisma.graphEdge.createMany({
    data: [
      { sourceNodeId: nodeUser.id, targetNodeId: nodeProj.id, relation: 'works_on', weight: 1.0 },
      { sourceNodeId: nodeUser.id, targetNodeId: nodeTask.id, relation: 'assigned_to', weight: 1.0 },
    ],
  });

  // 7. Initial Digital Twin Snapshot
  await prisma.twinSnapshot.create({
    data: {
      organizationId: org.id,
      targetType: TwinTargetType.USER,
      targetId: dev1.id,
      healthScore: 42.0,
      riskScore: 58.0,
      confidence: 0.94,
      velocity: 82.0,
      burnoutProb: 75.0,
      deliveryProb: 45.0,
      productivity: 88.0,
      knowledgeCover: 90.0,
      commHealth: 80.0,
      focusTime: 65.0,
      metrics: {
        create: [
          { metricName: 'Burnout Probability', metricValue: 75.0, category: 'WELLBEING', reasoning: 'Workload at 135% of capacity' },
          { metricName: 'Delivery Probability', metricValue: 45.0, category: 'PERFORMANCE', reasoning: 'Critical task is blocked' },
        ],
      },
    },
  });

  // 8. Predictions
  await prisma.prediction.create({
    data: {
      organizationId: org.id,
      category: PredictionCategory.BURNOUT,
      title: `Severe Burnout Warning: Elena Rostova`,
      targetType: 'USER',
      targetId: dev1.id,
      confidence: 0.92,
      reasoning: 'Elena Rostova has 54 total estimated task hours against a 40 hour weekly capacity limit (135% workload ratio).',
      evidence: { weeklyCapacity: 40, currentWorkloadHours: 54, blockedTasks: 1 },
      affectedUsers: [dev1.id],
      recommendations: [
        'Reassign Task #TAOS-2 (MCP Server Registry) to secondary backend engineer',
        'Approve 2 days off post milestone release',
      ],
    },
  });

  // 9. Connected Accounts
  await prisma.connectorAccount.createMany({
    data: [
      { organizationId: org.id, type: ConnectorType.GITHUB, name: 'GitHub Enterprise Connector', status: 'CONNECTED' },
      { organizationId: org.id, type: ConnectorType.SLACK, name: 'Slack Workspace Connector', status: 'CONNECTED' },
      { organizationId: org.id, type: ConnectorType.JIRA, name: 'Jira Software Cloud', status: 'CONNECTED' },
    ],
  });

  console.log('[Seed] Seed data successfully populated!');
  console.log('--------------------------------------------------');
  console.log('Login credentials for testing:');
  console.log('  Owner:   owner@twinagent.ai / password123');
  console.log('  Manager: manager@twinagent.ai / password123');
  console.log('  Dev:     dev1@twinagent.ai / password123');
  console.log('--------------------------------------------------');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
