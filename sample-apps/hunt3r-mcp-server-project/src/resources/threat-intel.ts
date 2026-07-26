import { readFile } from 'fs/promises';

export class ThreatIntelResource {
  private profiles: Map<string, any> = new Map();
  private iocs: any[] = [];
  
  async loadFromMock(path: string | URL = new URL('../../mock-data/threat-intel-profiles.json', import.meta.url)) {
    const data = JSON.parse(await readFile(path, 'utf-8')) as { profiles: any[]; iocs: any[] };
    data.profiles.forEach((p: any) => this.profiles.set(p.name, p));
    this.iocs = data.iocs;
  }

  async getAPTProfile(name: string): Promise<any | null> {
    return this.profiles.get(name) || null;
  }

  async matchTechniquesToAPT(techniques: string[]): Promise<any[]> {
    const matches: any[] = [];
    for (const [name, profile] of this.profiles) {
      const matching = techniques.filter(t => profile.ttps.includes(t));
      if (matching.length > 0) {
        matches.push({ apt: name, confidence: matching.length / profile.ttps.length, matching });
      }
    }
    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  async predictNextPhase(apt_name: string, current_phase: string): Promise<any | null> {
    const profile = this.profiles.get(apt_name);
    if (!profile) return null;
    const phases = profile.kill_chain;
    const currentIdx = phases.findIndex((p: any) => p.phase === current_phase);
    if (currentIdx === -1 || currentIdx >= phases.length - 1) return null;
    return {
      phase: phases[currentIdx + 1].phase,
      technique: phases[currentIdx + 1].technique,
      eta_minutes: phases[currentIdx + 1].typical_duration_minutes
    };
  }
}