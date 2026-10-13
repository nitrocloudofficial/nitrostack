import { ToolDecorator as Tool, z, ExecutionContext } from '@nitrostack/core';

function getAuthHeader() {
  const creds = process.env.JIRA_EMAIL + ':' + process.env.JIRA_API_TOKEN;
  const encoded = Buffer.from(creds).toString('base64');
  return 'Basic ' + encoded;
}

async function jiraFetch(path: string, options: any = {}) {
  const url = process.env.JIRA_BASE_URL + path;
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: getAuthHeader(),
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers || {})
    }
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error('Jira API error: ' + response.status + ' - ' + errText.substring(0, 300));
  }
  return response;
}

function clean(value: any) {
  return (value !== undefined && value !== null && value !== 'undefined' && value !== '') ? value : null;
}

export class JiraTools {
  @Tool({
    name: 'get_pending_tasks',
    description: 'Get pending (not done) Jira tasks, optionally filtered by project or assignee',
    inputSchema: z.object({
      projectKey: z.string().optional().describe('Jira project key, e.g. SCRUM'),
      assignee: z.string().optional().describe('Assignee email to filter by'),
      maxResults: z.number().int().min(1).max(50).default(10)
    })
  })
  async getPendingTasks(input: any, ctx: ExecutionContext) {
    const maxResults = clean(input.maxResults) ? Number(input.maxResults) : 10;
    const projectKey = clean(input.projectKey);
    const assignee = clean(input.assignee);

    let jql = 'statusCategory != Done';
    if (projectKey) jql += ' AND project = ' + projectKey;
    if (assignee) jql += ' AND assignee = "' + assignee + '"';

    const res = await jiraFetch('/rest/api/3/search/jql?jql=' + encodeURIComponent(jql) + '&maxResults=' + maxResults + '&fields=summary,status,assignee,priority,duedate');
    const data = await res.json() as any;

    return {
      total: data.total,
      issues: data.issues.map((i: any) => ({
        key: i.key,
        summary: i.fields.summary,
        status: i.fields.status.name,
        assignee: i.fields.assignee ? i.fields.assignee.displayName : 'Unassigned',
        priority: i.fields.priority ? i.fields.priority.name : 'None',
        dueDate: i.fields.duedate
      }))
    };
  }

  @Tool({
    name: 'create_task',
    description: 'Create a new Jira task/issue',
    inputSchema: z.object({
      projectKey: z.string().describe('Jira project key, e.g. SCRUM'),
      summary: z.string().describe('Task title'),
      description: z.string().optional(),
      issueType: z.string().default('Task'),
      dueDate: z.string().optional().describe('Due date, YYYY-MM-DD')
    })
  })
  async createTask(input: any, ctx: ExecutionContext) {
    const projectRes = await jiraFetch('/rest/api/3/project/' + input.projectKey);
    const projectData = await projectRes.json() as any;

    const fields: any = {
      project: { id: projectData.id },
      summary: input.summary,
      issuetype: { name: clean(input.issueType) || 'Task' }
    };
    const description = clean(input.description);
    if (description) {
      fields.description = {
        type: 'doc', version: 1,
        content: [{ type: 'paragraph', content: [{ type: 'text', text: description }] }]
      };
    }
    const dueDate = clean(input.dueDate);
    if (dueDate) fields.duedate = dueDate;

    const res = await jiraFetch('/rest/api/3/issue', {
      method: 'POST',
      body: JSON.stringify({ fields })
    });
    const data = await res.json() as any;

    return {
      key: data.key,
      link: process.env.JIRA_BASE_URL + '/browse/' + data.key,
      summary: input.summary
    };
  }

  @Tool({
    name: 'assign_issue',
    description: 'Assign a Jira issue to a person by email',
    inputSchema: z.object({
      issueKey: z.string().describe('Issue key, e.g. SCRUM-1'),
      assigneeEmail: z.string().describe('Email of the person to assign')
    })
  })
  async assignIssue(input: any, ctx: ExecutionContext) {
    const userRes = await jiraFetch('/rest/api/3/user/search?query=' + encodeURIComponent(input.assigneeEmail));
    const users = await userRes.json() as any[];

    if (!users.length) {
      throw new Error('No Jira user found for email: ' + input.assigneeEmail);
    }

    const accountId = users[0].accountId;

    await jiraFetch('/rest/api/3/issue/' + input.issueKey + '/assignee', {
      method: 'PUT',
      body: JSON.stringify({ accountId })
    });

    return {
      issueKey: input.issueKey,
      assignedTo: users[0].displayName,
      status: 'assigned'
    };
  }

  @Tool({
    name: 'update_status',
    description: 'Update the status of a Jira issue (e.g. move to In Progress, Done)',
    inputSchema: z.object({
      issueKey: z.string().describe('Issue key, e.g. SCRUM-1'),
      targetStatus: z.string().describe('Target status name, e.g. "In Progress", "Done"')
    })
  })
  async updateStatus(input: any, ctx: ExecutionContext) {
    const transRes = await jiraFetch('/rest/api/3/issue/' + input.issueKey + '/transitions');
    const transData = await transRes.json() as any;

    const match = transData.transitions.find((t: any) =>
      t.name.toLowerCase() === input.targetStatus.toLowerCase()
    );

    if (!match) {
      const available = transData.transitions.map((t: any) => t.name).join(', ');
      throw new Error('Status "' + input.targetStatus + '" not available. Options: ' + available);
    }

    await jiraFetch('/rest/api/3/issue/' + input.issueKey + '/transitions', {
      method: 'POST',
      body: JSON.stringify({ transition: { id: match.id } })
    });

    return { issueKey: input.issueKey, newStatus: input.targetStatus, status: 'updated' };
  }

  @Tool({
    name: 'prioritize_task',
    description: 'Set the priority of a Jira issue',
    inputSchema: z.object({
      issueKey: z.string().describe('Issue key, e.g. SCRUM-1'),
      priority: z.enum(['Highest', 'High', 'Medium', 'Low', 'Lowest'])
    })
  })
  async prioritizeTask(input: any, ctx: ExecutionContext) {
    await jiraFetch('/rest/api/3/issue/' + input.issueKey, {
      method: 'PUT',
      body: JSON.stringify({ fields: { priority: { name: input.priority } } })
    });

    return { issueKey: input.issueKey, priority: input.priority, status: 'updated' };
  }

  @Tool({
    name: 'get_deadline_monitor',
    description: 'Get issues that are overdue or due within a number of days',
    inputSchema: z.object({
      projectKey: z.string().optional(),
      withinDays: z.number().int().default(3).describe('Flag issues due within this many days')
    })
  })
  async getDeadlineMonitor(input: any, ctx: ExecutionContext) {
    const withinDays = clean(input.withinDays) ? Number(input.withinDays) : 3;
    const projectKey = clean(input.projectKey);

    let jql = 'duedate <= ' + withinDays + 'd AND statusCategory != Done';
    if (projectKey) jql += ' AND project = ' + projectKey;
    jql += ' ORDER BY duedate ASC';

    const res = await jiraFetch('/rest/api/3/search/jql?jql=' + encodeURIComponent(jql) + '&maxResults=25&fields=summary,status,assignee,duedate');
    const data = await res.json() as any;

    return {
      count: data.total,
      issues: data.issues.map((i: any) => ({
        key: i.key,
        summary: i.fields.summary,
        dueDate: i.fields.duedate,
        assignee: i.fields.assignee ? i.fields.assignee.displayName : 'Unassigned',
        status: i.fields.status.name
      }))
    };
  }

  @Tool({
    name: 'detect_blockers',
    description: 'Find issues that are flagged as blocked or have a "Blocked" status/label',
    inputSchema: z.object({
      projectKey: z.string().optional()
    })
  })
  async detectBlockers(input: any, ctx: ExecutionContext) {
    const projectKey = clean(input.projectKey);

    let jql = '(status = "Blocked" OR labels = blocker OR flagged is not EMPTY)';
    if (projectKey) jql += ' AND project = ' + projectKey;

    const res = await jiraFetch('/rest/api/3/search/jql?jql=' + encodeURIComponent(jql) + '&maxResults=25&fields=summary,status,assignee');
    const data = await res.json() as any;

    return {
      count: data.total,
      blockedIssues: data.issues.map((i: any) => ({
        key: i.key,
        summary: i.fields.summary,
        assignee: i.fields.assignee ? i.fields.assignee.displayName : 'Unassigned',
        status: i.fields.status.name
      }))
    };
  }

  @Tool({
    name: 'get_sprint_summary',
    description: 'Get a summary of the current sprint: total issues, done, in progress, todo counts',
    inputSchema: z.object({
      boardId: z.number().describe('Jira board ID (find this in your board URL)')
    })
  })
  async getSprintSummary(input: any, ctx: ExecutionContext) {
    const sprintRes = await jiraFetch('/rest/agile/1.0/board/' + input.boardId + '/sprint?state=active');
    const sprintData = await sprintRes.json() as any;

    if (!sprintData.values || !sprintData.values.length) {
      return { message: 'No active sprint found for this board' };
    }

    const sprint = sprintData.values[0];
    const issuesRes = await jiraFetch('/rest/agile/1.0/sprint/' + sprint.id + '/issue');
    const issuesData = await issuesRes.json() as any;

    const statusCounts: Record<string, number> = {};
    issuesData.issues.forEach((i: any) => {
      const status = i.fields.status.name;
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    return {
      sprintName: sprint.name,
      startDate: sprint.startDate,
      endDate: sprint.endDate,
      totalIssues: issuesData.issues.length,
      statusBreakdown: statusCounts
    };
  }

  @Tool({
    name: 'generate_report',
    description: 'Generate a text report combining pending tasks, blockers, and deadline info for a project',
    inputSchema: z.object({
      projectKey: z.string().describe('Jira project key')
    })
  })
  async generateReport(input: any, ctx: ExecutionContext) {
    const pending = await this.getPendingTasks({ projectKey: input.projectKey, maxResults: 50 }, ctx);
    const blockers = await this.detectBlockers({ projectKey: input.projectKey }, ctx);
    const deadlines = await this.getDeadlineMonitor({ projectKey: input.projectKey, withinDays: 7 }, ctx);

    return {
      project: input.projectKey,
      pendingTasksCount: pending.total,
      blockersCount: blockers.count,
      upcomingDeadlinesCount: deadlines.count,
      pendingTasks: pending.issues,
      blockers: blockers.blockedIssues,
      upcomingDeadlines: deadlines.issues
    };
  }

  @Tool({
    name: 'create_project',
    description: 'Create a new Jira project. Use this only when the user explicitly confirms they want to create a new project (e.g. after being told a project key does not exist).',
    inputSchema: z.object({
      projectKey: z.string().describe('Project key, e.g. INFRA (uppercase letters only, 2-10 chars)'),
      projectName: z.string().describe('Human-readable project name')
    })
  })
  async createProject(input: any, ctx: ExecutionContext) {
    const meRes = await jiraFetch('/rest/api/3/myself');
    const me = await meRes.json() as any;

    const res = await jiraFetch('/rest/api/3/project', {
      method: 'POST',
      body: JSON.stringify({
        key: input.projectKey.toUpperCase(),
        name: input.projectName,
        projectTypeKey: 'software',
        projectTemplateKey: 'com.pyxis.greenhopper.jira:gh-simplified-agility-kanban',
        leadAccountId: me.accountId
      })
    });
    const data = await res.json() as any;

    return {
      key: data.key,
      id: data.id,
      link: process.env.JIRA_BASE_URL + '/jira/software/projects/' + data.key,
      status: 'created'
    };
  }

  @Tool({
    name: 'debug_list_project_types',
    description: 'Debug tool: list available project types/templates',
    inputSchema: z.object({})
  })
  async debugListProjectTypes(input: any, ctx: ExecutionContext) {
    const res = await jiraFetch('/rest/api/3/project/type');
    const data = await res.json() as any;
    return { types: data.map((t: any) => ({ key: t.key, formattedKey: t.formattedKey })) };
  }
}