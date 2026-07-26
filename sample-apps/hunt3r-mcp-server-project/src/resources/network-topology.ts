import { readFile } from 'fs/promises';

export interface Host {
  host_id: string;
  hostname: string;
  ip: string;
  subnet: string;
  criticality: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  services: any[];
  trust_relationships: string[];
  exposed_ports: number[];
  os: string;
  domain_role?: string;
}

export class NetworkTopologyResource {
  private topology: Map<string, Host> = new Map();
  
  async loadFromMock(path: string | URL = new URL('../../mock-data/network-topology.json', import.meta.url)) {
    const data = JSON.parse(await readFile(path, 'utf-8')) as { hosts: Host[] };
    data.hosts.forEach((h: Host) => this.topology.set(h.host_id, h));
  }

  async getHost(host_id: string): Promise<Host | null> {
    return this.topology.get(host_id) || null;
  }

  async getNeighbors(host_id: string, depth: number = 1): Promise<Host[]> {
    const visited = new Set<string>();
    const queue: [string, number][] = [[host_id, 0]];
    const result: Host[] = [];
    
    while (queue.length > 0) {
      const [current, dist] = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      
      const host = this.topology.get(current);
      if (!host) continue;
      
      if (dist > 0) result.push(host);
      if (dist < depth) {
        host.trust_relationships.forEach(neighbor => {
          if (!visited.has(neighbor)) queue.push([neighbor, dist + 1]);
        });
      }
    }
    return result;
  }

  async getLateralPaths(source: string, target: string, maxDepth: number = 5): Promise<string[][]> {
    const paths: string[][] = [];
    const queue: { node: string; path: string[] }[] = [{ node: source, path: [source] }];
    
    while (queue.length > 0) {
      const { node, path } = queue.shift()!;
      if (node === target) { paths.push(path); continue; }
      if (path.length >= maxDepth) continue;
      
      const host = this.topology.get(node);
      if (!host) continue;
      
      host.trust_relationships.forEach(neighbor => {
        if (!path.includes(neighbor)) {
          queue.push({ node: neighbor, path: [...path, neighbor] });
        }
      });
    }
    return paths;
  }

  async getCriticalAssets(): Promise<Host[]> {
    return Array.from(this.topology.values())
      .filter(h => h.criticality === 'CRITICAL' || h.domain_role === 'dc');
  }
}