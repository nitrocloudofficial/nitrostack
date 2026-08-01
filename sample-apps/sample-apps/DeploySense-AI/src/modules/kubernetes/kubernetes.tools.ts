import { z } from 'zod';
import { ControllerDecorator as Controller, Injectable, ToolDecorator as Tool, Widget } from '@nitrostack/core';
import { KubernetesService } from './kubernetes.service.js';

@Injectable({ deps: [KubernetesService] })
@Controller()
export class KubernetesTools {
  constructor(private readonly kubernetesService: KubernetesService) {}

  @Tool({
    name: 'kubernetes',
    description: 'Perform Kubernetes operations',
    inputSchema: z.object({
      action: z.enum(['getPodStatus', 'getDeploymentStatus', 'getRestartCount']),
      podName: z.string().optional(),
      deploymentName: z.string().optional()
    })
  })
  async execute(args: { action: string, podName?: string, deploymentName?: string }) {
    switch(args.action) {
      case 'getPodStatus': return { success: true, data: this.kubernetesService.getPodStatus(args.podName!) };
      case 'getDeploymentStatus': return { success: true, data: this.kubernetesService.getDeploymentStatus(args.deploymentName!) };
      case 'getRestartCount': return { success: true, data: this.kubernetesService.getRestartCount(args.podName!) };
      default: throw new Error('Unknown action');
    }
  }
}
