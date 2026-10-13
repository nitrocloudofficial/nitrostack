import { Module } from '@nitrostack/core';
import { K8sTools } from './k8s.tools.js';
import { K8sResources } from './k8s.resources.js';
import { K8sPrompts } from './k8s.prompts.js';

@Module({ name: 'k8s', controllers: [K8sTools, K8sResources, K8sPrompts], providers: [] })
export class K8sModule {}
