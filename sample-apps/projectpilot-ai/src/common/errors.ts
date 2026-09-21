export class DomainError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'DomainError';
  }
}

export class SessionNotFoundError extends DomainError {
  constructor(projectContextId: string) {
    super(
      `Project context '${projectContextId}' was not found. Please call parse_srd first to initialize a planning session.`,
      'SESSION_NOT_FOUND'
    );
    this.name = 'SessionNotFoundError';
  }
}

export class StatePrerequisiteError extends DomainError {
  constructor(message: string) {
    super(message, 'PREREQUISITE_MISSING');
    this.name = 'StatePrerequisiteError';
  }
}
