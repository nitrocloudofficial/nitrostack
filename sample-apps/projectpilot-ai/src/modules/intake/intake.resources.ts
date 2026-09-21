import { ResourceDecorator as Resource, Injectable, type ExecutionContext } from '@nitrostack/core';
import { ProjectStateService } from '../../services/project-state.service.js';

@Injectable({ deps: [ProjectStateService] })
export class IntakeResources {
  constructor(private readonly state: ProjectStateService) {}

  @Resource({
    uri: 'project://{id}/context',
    name: 'Project Context',
    description: 'Normalized SRD, team roster, and interim agent outputs for a planning session',
    mimeType: 'application/json',
  })
  async getContext(uri: string, _ctx: ExecutionContext) {
    const id = uri.match(/^project:\/\/([^/]+)\/context$/)?.[1];
    const data = id ? this.state.get(id) ?? {} : {};
    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  }
}
