import * as k8s from '@kubernetes/client-node';

const kc = new k8s.KubeConfig();
kc.loadFromDefault(); // reads ~/.kube/config that `kind` wrote

export const core = kc.makeApiClient(k8s.CoreV1Api);
export const apps = kc.makeApiClient(k8s.AppsV1Api);
export const policy = kc.makeApiClient(k8s.PolicyV1Api);
export const kubeConfig = kc;
