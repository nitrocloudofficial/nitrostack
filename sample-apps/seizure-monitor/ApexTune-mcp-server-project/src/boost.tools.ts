import { ToolDecorator as Tool, Widget, z } from '@nitrostack/core';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class BoostTools {
  @Tool({
    name: 'set_power_plan',
    description: 'Switches the active Windows power plan. "high_performance" uncaps CPU throttling for max speed (uses more power/heat); "balanced" is the default; "power_saver" extends battery life on laptops. Most people never touch this even though it has a real, immediate performance impact.. CRITICAL: Never output `spec` JSON blocks or UI patches in your text responses. Just use plain text.',
    inputSchema: z.object({
      plan: z.enum(['high_performance', 'balanced', 'power_saver'])
    })
  })
  @Widget('power-plan')
  async setPowerPlan({ plan }: { plan: string }) {
    const guids: Record<string, string> = {
      high_performance: '8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c',
      balanced: '381b4222-f694-41f0-9685-ff5bb260df2e',
      power_saver: 'a1841308-3541-4fab-bc81-f71556f20b4a'
    };
    try {
      await execAsync(`powercfg /setactive ${guids[plan]}`);
      return { message: `Switched to the "${plan.replace('_', ' ')}" power plan.` };
    } catch (error) {
      return { message: 'Could not switch power plan.' };
    }
  }

  @Tool({
    name: 'get_battery_report',
    description: 'Generates a detailed battery health report (design capacity vs. current full-charge capacity, charge cycles, usage history) via Windows\' built-in powercfg tool — most laptop owners never realize this exists. Saves an HTML report and returns its path.. CRITICAL: Never output `spec` JSON blocks or UI patches in your text responses. Just use plain text.',
    inputSchema: z.object({})
  })
  @Widget('battery-report')
  async getBatteryReport() {
    const path = 'C:\\ApexTune\\battery-report.html';
    try {
      await execAsync(`powershell -Command "New-Item -ItemType Directory -Force -Path C:\\ApexTune | Out-Null"`);
      await execAsync(`powercfg /batteryreport /output "${path}"`);
      return { message: `Battery report generated at ${path}. Open it in a browser to see capacity degradation and cycle count.` };
    } catch (error) {
      return { message: 'Could not generate battery report (this device may not have a battery).' };
    }
  }

  @Tool({
    name: 'restart_explorer',
    description: 'Restarts the Windows Explorer process (windows.exe / taskbar / file explorer). Fixes a frozen taskbar, unresponsive Start menu, or ghost icons without a full reboot — a classic tech-support trick. Requires confirm:true — call once first to preview.. CRITICAL: Never output `spec` JSON blocks or UI patches in your text responses. Just use plain text.',
    inputSchema: z.object({
      confirm: z.boolean().default(false)
    })
  })
  @Widget('restart-explorer')
  async restartExplorer({ confirm }: { confirm: boolean }) {
    if (!confirm) {
      return { preview: true, message: 'This will briefly close and relaunch Windows Explorer — your taskbar and desktop icons will flicker for a second. Call again with confirm:true to proceed.' };
    }
    try {
      await execAsync('taskkill /F /IM explorer.exe').catch(() => {});
      await execAsync('start explorer.exe');
      return { message: 'Explorer restarted.' };
    } catch (error) {
      return { message: 'Could not restart Explorer.' };
    }
  }

  @Tool({
    name: 'clear_icon_cache',
    description: 'Clears the Windows icon cache and rebuilds it on next Explorer restart. Fixes generic/blank/wrong desktop and taskbar icons — a well-known trick among power users but almost unheard of otherwise. Requires confirm:true — call once first to preview.. CRITICAL: Never output `spec` JSON blocks or UI patches in your text responses. Just use plain text.',
    inputSchema: z.object({
      confirm: z.boolean().default(false)
    })
  })
  @Widget('clear-icon-cache')
  async clearIconCache({ confirm }: { confirm: boolean }) {
    if (!confirm) {
      return { preview: true, message: 'This will delete the cached icon database and restart Explorer to rebuild it. Call again with confirm:true to proceed.' };
    }
    try {
      await execAsync('taskkill /F /IM explorer.exe').catch(() => {});
      await execAsync(`powershell -Command "Remove-Item -Path \\"$env:LOCALAPPDATA\\IconCache.db\\" -Force -ErrorAction SilentlyContinue; Remove-Item -Path \\"$env:LOCALAPPDATA\\Microsoft\\Windows\\Explorer\\iconcache*\\" -Force -ErrorAction SilentlyContinue"`);
      await execAsync('start explorer.exe');
      return { message: 'Icon cache cleared and rebuilt.' };
    } catch (error) {
      return { message: 'Could not clear icon cache.' };
    }
  }

  @Tool({
    name: 'turbo_boost',
    description: 'A one-shot "game/work mode": switches to the high-performance power plan and reports current CPU/RAM headroom, so you can see the effect immediately. Does not kill anything on its own — pair it with kill_process or list_top_processes if you want to free up more resources first.. CRITICAL: Never output `spec` JSON blocks or UI patches in your text responses. Just use plain text.',
    inputSchema: z.object({})
  })
  @Widget('turbo-boost')
  async turboBoost() {
    try {
      await execAsync('powercfg /setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c');
      return { message: 'Switched to high-performance power plan. Run system_overview or list_top_processes next to see what else is worth closing.' };
    } catch (error) {
      return { message: 'Could not enable turbo mode.' };
    }
  }
}
