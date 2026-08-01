import { Injectable } from '@nitrostack/core';
import { ConfigService } from '../config/config.service.js';

@Injectable({ deps: [ConfigService] })
export class KubernetesService {
  constructor(private readonly configService: ConfigService) {}

  private getData() {
    return this.configService.getMockData('kubernetes');
  }

  getPodStatus(podName: string) {
    const pods = this.getData().pods;
    return pods.find((p: any) => p.name === podName) || null;
  }

  getDeploymentStatus(deploymentName: string) {
    const deployments = this.getData().deployments;
    return deployments.find((d: any) => d.name === deploymentName) || null;
  }

  getRestartCount(podName: string) {
    const pod = this.getPodStatus(podName);
    return pod ? pod.restarts : null;
  }
}

