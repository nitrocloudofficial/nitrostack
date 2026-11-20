/**
 * Copyright 2025 Nitrostack Inc
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/** All destinations are fictional classes, not network addresses. */
export type Destination = 'internal' | 'approved_external' | 'unapproved_external';
export type Environment = 'development' | 'staging' | 'production';
export type WorkspaceType = 'research' | 'development' | 'response';

export interface SecurityWorkspace {
  id: string;
  name: string;
  environment: Environment;
  workspaceType: WorkspaceType;
  protected: boolean;
  access: 'restricted' | 'team';
}

export interface SecurityJob {
  id: string;
  workspaceId: string;
  destination: Destination;
  outboundMb: number;
  durationMinutes: number;
}

export interface SecurityArtifact {
  id: string;
  workspaceId: string;
  destination: Destination;
  name: string;
}

export interface SecurityState {
  workspaces: SecurityWorkspace[];
  jobs: SecurityJob[];
  artifacts: SecurityArtifact[];
}

export type { Command as SecurityCommand } from './types.js';
import type { Command as SecurityCommand } from './types.js';

export interface SecurityProjection {
  state: SecurityState;
  affected: string[];
  facts: {
    owned: boolean;
    destination: Destination;
    workspaceType: WorkspaceType;
    environment: Environment;
    outboundMb: number;
    durationMinutes: number;
    concurrentJobs: number;
    publicationCount: number;
    externalPublication: boolean;
    deletion: boolean;
    protectedWorkspace: boolean;
  };
}

/**
 * Project a single operation without mutating its input. Callers must evaluate the
 * returned facts before installing the projected state. Missing workspace IDs are
 * deliberately indistinguishable from another team's IDs.
 */
export function projectSecurityOperation(
  state: SecurityState,
  command: SecurityCommand,
  nextId: () => string
): SecurityProjection {
  const next = structuredClone(state);
  const args = command.args;
  const workspace =
    'workspaceId' in args
      ? next.workspaces.find((item) => item.id === args.workspaceId)
      : undefined;
  const owned = !('workspaceId' in args) || !!workspace;
  const destination = 'destination' in args ? args.destination : 'internal';
  const affected: string[] = [];
  if (owned) {
    switch (command.tool) {
      case 'create_workspace': {
        const id = nextId();
        next.workspaces.push({ ...command.args, id, protected: false, access: 'restricted' });
        affected.push(id);
        break;
      }
      case 'run_outbound_job': {
        const id = nextId();
        next.jobs.push({ ...command.args, id });
        affected.push(id);
        break;
      }
      case 'publish_artifact': {
        const id = nextId();
        next.artifacts.push({ ...command.args, id });
        affected.push(id);
        break;
      }
      case 'export_data':
        affected.push(command.args.workspaceId);
        break;
      case 'change_workspace_access':
        workspace!.access = command.args.access;
        affected.push(workspace!.id);
        break;
      case 'delete_workspace':
        next.workspaces = next.workspaces.filter((item) => item.id !== command.args.workspaceId);
        next.jobs = next.jobs.filter((item) => item.workspaceId !== command.args.workspaceId);
        next.artifacts = next.artifacts.filter(
          (item) => item.workspaceId !== command.args.workspaceId
        );
        affected.push(command.args.workspaceId);
        break;
    }
  }
  return {
    state: next,
    affected,
    facts: {
      owned,
      destination,
      workspaceType:
        workspace?.workspaceType ?? ('workspaceType' in args ? args.workspaceType : 'research'),
      environment:
        workspace?.environment ?? ('environment' in args ? args.environment : 'development'),
      outboundMb: 'outboundMb' in args ? args.outboundMb : 0,
      durationMinutes: 'durationMinutes' in args ? args.durationMinutes : 0,
      concurrentJobs: command.tool === 'run_outbound_job' ? next.jobs.length : 0,
      publicationCount: command.tool === 'publish_artifact' ? next.artifacts.length : 0,
      externalPublication: command.tool === 'publish_artifact' && destination !== 'internal',
      deletion: command.tool === 'delete_workspace',
      protectedWorkspace: workspace?.protected ?? false,
    },
  };
}
