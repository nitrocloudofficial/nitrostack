import { Injectable } from '@nitrostack/core';
import type { AnalysisContext, Finding, Signal } from '../signal.js';
import { finding, installScripts } from './finding.js';

/**
 * Install scripts run with the user's permissions the moment `npm install` finishes. Adding
 * one in a patch release is how nx, Shai-Hulud and keyv ran their payloads.
 */
@Injectable()
export class InstallScriptSignal implements Signal {
  readonly id = 'install-script';

  async evaluate(ctx: AnalysisContext): Promise<Finding[]> {
    const now = installScripts(ctx.target);
    const previous = ctx.baseline[0];
    if (!previous) {
      const keys = Object.keys(now);
      return keys.length
        ? [
            finding(
              this.id,
              'warn',
              'First release runs code at install time',
              keys.map((k) => `${k}: ${now[k]}`),
            ),
          ]
        : [];
    }

    const before = installScripts(previous);
    const everHad = ctx.baseline.some((m) => Object.keys(installScripts(m)).length > 0);
    const out: Finding[] = [];
    for (const [hook, command] of Object.entries(now)) {
      if (!(hook in before)) {
        out.push(
          finding(
            this.id,
            'high',
            everHad
              ? `New ${hook} script added since ${previous.version}`
              : `Install script added: this package never ran code at install time before`,
            [`${hook}: ${command}`, `${previous.version} had no ${hook} script`],
          ),
        );
      } else if (before[hook] !== command) {
        out.push(
          finding(this.id, 'high', `${hook} script changed since ${previous.version}`, [
            `before: ${before[hook]}`,
            `now: ${command}`,
          ]),
        );
      }
    }
    return out;
  }
}
