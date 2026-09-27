import { Ticket, CreateTicketInput } from '../common/types.js';

const API = 'https://api.linear.app/graphql';

const ISSUE_FIELDS = `
  identifier
  title
  description
  dueDate
  state { name }
  assignee { email }
  subscribers(first: 25) { nodes { email } }
  labels(first: 25) { nodes { name } }
  createdAt
  comments(first: 1) { nodes { body } }
`;

interface RawIssue {
  identifier: string;
  title: string;
  description: string;
  dueDate: string | null;
  state?: { name: string } | null;
  assignee?: { email?: string } | null;
  subscribers?: { nodes?: Array<{ email?: string }> };
  labels?: { nodes?: Array<{ name: string }> };
  createdAt?: string;
  comments?: { nodes?: Array<{ body: string }> };
}

export class LinearProvider {
  private apiKey = process.env.LINEAR_API_KEY ?? '';
  private teamIdHint = process.env.LINEAR_TEAM_ID ?? '';
  private teamId: string | null = null;
  private statesCache = new Map<string, Array<{ id: string; name: string }>>();

  get enabled(): boolean {
    return !!this.apiKey;
  }

  private async gql(query: string, variables?: Record<string, unknown>): Promise<any> {
    const resp = await fetch(API, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: this.apiKey,
      },
      signal: AbortSignal.timeout(20000),
      body: JSON.stringify({ query, variables: variables ?? {} }),
    });
    const body = (await resp.json()) as any;
    if (body.errors?.length) {
      const msg = body.errors.map((e: any) => e.message).join('; ');
      throw new Error(`Linear API: ${msg}`);
    }
    return body.data as any;
  }

  private async getTeamId(): Promise<string> {
    if (this.teamId) {
      return this.teamId;
    }
    if (this.teamIdHint) {
      this.teamId = this.teamIdHint;
      return this.teamId;
    }
    const data = await this.gql(`query { teams(first: 5) { nodes { id name } } }`);
    const team = data.teams?.nodes?.[0];
    if (!team) {
      throw new Error('Linear: no team found — set LINEAR_TEAM_ID');
    }
    const id = team.id as string;
    this.teamId = id;
    return id;
  }

  private async getStates(teamId: string): Promise<Array<{ id: string; name: string }>> {
    const cached = this.statesCache.get(teamId);
    if (cached) {
      return cached;
    }
    const data = await this.gql(
      `query($teamId: String!) { team(id: $teamId) { states(first: 100) { nodes { id name } } } }`,
      { teamId }
    );
    const states = data.team?.states?.nodes ?? [];
    this.statesCache.set(teamId, states);
    return states;
  }

  private async getStateId(teamId: string, status: string): Promise<string | undefined> {
    const states = await this.getStates(teamId);
    const wanted = status === 'Cancelled' ? 'Canceled' : status;
    const exact = states.find((s) => s.name === wanted);
    if (exact) {
      return exact.id;
    }
    if (status === 'Escalated') {
      return states.find((s) => s.name === 'In Progress')?.id;
    }
    return undefined;
  }

  private async getLabelIds(teamId: string, names: string[]): Promise<string[]> {
    if (!names.length) {
      return [];
    }
    const data = await this.gql(
      `query($teamId: String!, $first: Int!) { team(id: $teamId) { labels(first: $first) { nodes { id name } } } }`,
      { teamId, first: 200 }
    );
    const labels = data.team?.labels?.nodes ?? [];
    const ids: string[] = [];
    for (const name of names) {
      const label = labels.find((l: any) => l.name.toLowerCase() === name.toLowerCase());
      if (label) {
        ids.push(label.id);
      }
    }
    return ids;
  }

  private async resolveUserId(email: string): Promise<string | undefined> {
    const data = await this.gql(
      `query($email: String!) { users(filter: { email: { eq: $email } }, first: 1) { nodes { id } } }`,
      { email }
    );
    return data.users?.nodes?.[0]?.id;
  }

  private mapIssue(i: RawIssue): Ticket {
    const status = i.state?.name === 'Canceled' ? 'Cancelled' : (i.state?.name ?? '');
    return {
      ticket_id: i.identifier,
      title: i.title,
      description: i.description ?? '',
      assignee_email: i.assignee?.email ?? '',
      due_date: i.dueDate ?? '',
      labels: (i.labels?.nodes ?? []).map((l) => l.name),
      status,
      watchers: (i.subscribers?.nodes ?? [])
        .map((s) => s.email)
        .filter((e): e is string => !!e),
      escalation_comment: i.comments?.nodes?.[0]?.body ?? null,
      created_at: i.createdAt?.slice(0, 10) ?? '',
    };
  }

  async createTicket(input: CreateTicketInput): Promise<Ticket> {
    const teamId = await this.getTeamId();
    const labelIds = await this.getLabelIds(teamId, input.labels ?? []);
    const assigneeId = input.assignee_email ? await this.resolveUserId(input.assignee_email) : undefined;
    const data = await this.gql(
      `mutation($input: IssueCreateInput!) {
         issueCreate(input: $input) {
           success
           issue {
             ${ISSUE_FIELDS}
           }
         }
       }`,
      {
        input: {
          teamId,
          title: input.title,
          description: input.description ?? '',
          dueDate: input.due_date || undefined,
          labelIds,
          ...(assigneeId ? { assigneeId } : {}),
        },
      }
    );
    return this.mapIssue(data.issueCreate.issue);
  }

  async getTicket(ticketId: string): Promise<Ticket | null> {
    try {
      const data = await this.gql(
        `query($id: String!) { issue(id: $id) { ${ISSUE_FIELDS} } }`,
        { id: ticketId }
      );
      return data.issue ? this.mapIssue(data.issue) : null;
    } catch {
      return null;
    }
  }

  async updateStatus(ticketId: string, status: string): Promise<Ticket | null> {
    const teamId = await this.getTeamId();
    const stateId = await this.getStateId(teamId, status);
    if (!stateId) {
      throw new Error(`Linear: no workflow state matching "${status}"`);
    }
    await this.gql(
      `mutation($id: String!, $input: IssueUpdateInput!) {
         issueUpdate(id: $id, input: $input) { success }
       }`,
      { id: ticketId, input: { stateId } }
    );
    return this.getTicket(ticketId);
  }

  async escalate(ticketId: string, managerEmail: string, contextComment: string): Promise<Ticket | null> {
    const ticket = await this.getTicket(ticketId);
    if (!ticket) {
      return null;
    }
    const subscriberIds: string[] = [];
    for (const email of ticket.watchers) {
      const id = await this.resolveUserId(email);
      if (id) {
        subscriberIds.push(id);
      }
    }
    if (managerEmail && !ticket.watchers.includes(managerEmail)) {
      const managerId = await this.resolveUserId(managerEmail);
      if (managerId && !subscriberIds.includes(managerId)) {
        subscriberIds.push(managerId);
      }
    }
    if (subscriberIds.length > 0) {
      await this.gql(
        `mutation($id: String!, $input: IssueUpdateInput!) {
           issueUpdate(id: $id, input: $input) { success }
         }`,
        { id: ticketId, input: { subscriberIds } }
      );
    }
    await this.gql(
      `mutation($input: CommentCreateInput!) {
         commentCreate(input: $input) { success }
       }`,
      { input: { body: contextComment, issueId: ticketId } }
    );
    return this.getTicket(ticketId);
  }

  async listTickets(): Promise<Ticket[]> {
    const teamId = await this.getTeamId();
    const data = await this.gql(
      `query($teamId: String!, $first: Int!) {
         team(id: $teamId) {
           issues(first: $first) { nodes { ${ISSUE_FIELDS} } }
         }
       }`,
      { teamId, first: 50 }
    );
    return (data.team?.issues?.nodes ?? []).map((i: RawIssue) => this.mapIssue(i));
  }
}
