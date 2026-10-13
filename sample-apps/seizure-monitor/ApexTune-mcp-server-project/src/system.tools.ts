import { ToolDecorator as Tool,Widget, z } from '@nitrostack/core';
import si from 'systeminformation';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class SystemTools {
  // ---------- Monitoring ----------

  @Tool({
    name: 'check_memory',
    description: 'Checks current system RAM usage.. CRITICAL: Never output `spec` JSON blocks or UI patches in your text responses. Just use plain text.. CRITICAL: Never output `spec` JSON blocks or UI patches in your text responses. Just use plain text.',
    inputSchema: z.object({})
  })
  @Widget('check-memory')
  async checkMemory() {
    const mem = await si.mem();
    const totalGB = (mem.total / 1024 ** 3).toFixed(2);
    const usedGB = (mem.active / 1024 ** 3).toFixed(2);
    return { system_memory: `Total: ${totalGB}GB, Used: ${usedGB}GB (${((mem.active / mem.total) * 100).toFixed(1)}%)` };
  }

  @Tool({
    name: 'check_cpu',
    description: 'Checks current CPU load, core count, speed, and temperature (if sensors are available).. CRITICAL: Never output `spec` JSON blocks or UI patches in your text responses. Just use plain text.. CRITICAL: Never output `spec` JSON blocks or UI patches in your text responses. Just use plain text.',
    inputSchema: z.object({})
  })
  @Widget('check-cpu')
  async checkCpu() {
    const [load, info, temp] = await Promise.all([
      si.currentLoad(),
      si.cpu(),
      si.cpuTemperature()
    ]);
    return {
      cpu: `${info.manufacturer} ${info.brand}`,
      cores: info.cores,
      speedGHz: info.speed,
      loadPercent: load.currentLoad.toFixed(1),
      temperatureC: temp.main ?? 'unavailable (install LibreHardwareMonitor for live temps)'
    };
  }

  @Tool({
    name: 'check_gpu',
    description: 'Checks GPU model, VRAM, load, and temperature for each graphics card detected.. CRITICAL: Never output `spec` JSON blocks or UI patches in your text responses. Just use plain text.. CRITICAL: Never output `spec` JSON blocks or UI patches in your text responses. Just use plain text.',
    inputSchema: z.object({})
  })
  @Widget('check-gpu')
  async checkGpu() {
    const graphics = await si.graphics();
    return {
      gpus: graphics.controllers.map(g => ({
        model: g.model,
        vramMB: g.vram,
        loadPercent: g.utilizationGpu ?? 'unavailable',
        temperatureC: g.temperatureGpu ?? 'unavailable (install LibreHardwareMonitor for live temps)'
      }))
    };
  }

  @Tool({
    name: 'check_disk',
    description: 'Checks disk usage (used/free/total space) for every mounted drive.. CRITICAL: Never output `spec` JSON blocks or UI patches in your text responses. Just use plain text.. CRITICAL: Never output `spec` JSON blocks or UI patches in your text responses. Just use plain text.',
    inputSchema: z.object({})
  })
  @Widget('check-disk')
  async checkDisk() {
    const layout = await si.fsSize();
    return {
      drives: layout.map(d => ({
        mount: d.mount,
        totalGB: (d.size / 1024 ** 3).toFixed(1),
        usedGB: (d.used / 1024 ** 3).toFixed(1),
        usedPercent: d.use.toFixed(1)
      }))
    };
  }

  @Tool({
    name: 'system_overview',
    description: 'One-shot dashboard: CPU load, RAM usage, disk usage, and GPU load in a single call. Good for a quick health snapshot.. CRITICAL: Never output `spec` JSON blocks or UI patches in your text responses. Just use plain text.. CRITICAL: Never output `spec` JSON blocks or UI patches in your text responses. Just use plain text.',
    inputSchema: z.object({})
  })
  @Widget('system-overview')
  async systemOverview() {
    const [load, mem, fsSize, graphics] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.fsSize(),
      si.graphics()
    ]);
    return {
      cpuLoadPercent: load.currentLoad.toFixed(1),
      ramUsedPercent: ((mem.active / mem.total) * 100).toFixed(1),
      disks: fsSize.map(d => ({ mount: d.mount, usedPercent: d.use.toFixed(1) })),
      gpuLoadPercent: graphics.controllers[0]?.utilizationGpu ?? 'unavailable'
    };
  }

  // ---------- Process management ----------

  @Tool({
    name: 'list_top_processes',
    description: 'Lists the top N running processes sorted by CPU or memory usage.. CRITICAL: Never output `spec` JSON blocks or UI patches in your text responses. Just use plain text.. CRITICAL: Never output `spec` JSON blocks or UI patches in your text responses. Just use plain text.',
    inputSchema: z.object({
      sortBy: z.enum(['cpu', 'memory']).default('cpu').describe('Metric to sort by'),
      limit: z.number().int().min(1).max(50).default(10).describe('How many processes to return')
    })
  })
  @Widget('top-processes')
  async listTopProcesses({ sortBy, limit }: { sortBy: 'cpu' | 'memory'; limit: number }) {
    const data = await si.processes();
    const sorted = [...data.list].sort((a, b) =>
      sortBy === 'cpu' ? b.cpu - a.cpu : b.memRss - a.memRss
    );
    return {
      processes: sorted.slice(0, limit).map(p => ({
        pid: p.pid,
        name: p.name,
        cpuPercent: p.cpu.toFixed(1),
        memoryMB: (p.memRss / 1024).toFixed(1)
      }))
    };
  }
  private static readonly CRITICAL_PROCESSES: Record<string, string> = {
    'explorer.exe': 'This is the Windows shell — killing it will make your taskbar and desktop icons disappear temporarily. If your goal is to fix a frozen taskbar, use restart_explorer instead, which does this safely and reopens Explorer automatically.',
    'winlogon.exe': 'This handles Windows sign-in — killing it can force a broken session or unexpected logout.',
    'csrss.exe': 'This is a core Windows subsystem process — killing it will likely crash or freeze the entire system immediately.',
    'wininit.exe': 'This is a core Windows initialization process — killing it can cause a crash or forced restart.',
    'services.exe': 'This manages all Windows services — killing it will crash the system.',
    'lsass.exe': 'This handles Windows security/login — killing it will force an immediate system restart.',
    'smss.exe': 'This is the Windows session manager — killing it will crash the system.',
    'svchost.exe': 'This process hosts multiple critical Windows services — killing the wrong instance can crash the system.'
  };

  
  @Tool({
    name: 'kill_process',
    description: 'Kills a Windows process by name to free up memory/CPU. Requires confirm:true. Known critical system processes (e.g. explorer.exe, lsass.exe) additionally require the user to type the exact process name in confirmationPhrase — this cannot be inferred or guessed by the assistant, it must come from the human.. CRITICAL: Never output `spec` JSON blocks or UI patches in your text responses. Just use plain text.. CRITICAL: Never output `spec` JSON blocks or UI patches in your text responses. Just use plain text.',
    inputSchema: z.object({
      processName: z.string().describe('Name of the process (e.g., chrome.exe, spotify.exe)'),
      confirm: z.boolean().default(false).describe('Set true to actually kill the process'),
      confirmationPhrase: z.string().optional().describe('For critical system processes only: the user must type the exact process name (e.g. "explorer.exe") to prove they read the warning')
    })
  })
  @Widget('kill-process')
  async killProcess({ processName, confirm, confirmationPhrase }: { processName: string; confirm: boolean; confirmationPhrase?: string }) {
    const normalized = processName.toLowerCase();
    const risk = SystemTools.CRITICAL_PROCESSES[normalized];

    if (risk) {
      const typedCorrectly = confirmationPhrase?.trim().toLowerCase() === normalized;
      if (!typedCorrectly) {
        return {
          preview: true,
          warning: true,
          message: `⚠️ STOP: "${processName}" is a critical system process. ${risk}\n\nTo proceed anyway, the user must explicitly type the process name "${processName}" themselves — please ask them directly and do not fill this in on their behalf. Once they've typed it, call this tool again with confirmationPhrase set to exactly what they typed.`
        };
      }
    }

    if (!confirm) {
      return { preview: true, message: `This will forcibly kill ALL processes named "${processName}". Any unsaved work in that app will be lost. Call again with confirm:true to proceed.` };
    }

    try {
      await execAsync(`taskkill /F /IM ${processName}`);
      return { message: `Successfully killed ${processName}.` };
    } catch (error) {
      return { message: `Could not kill ${processName}. It might not be running or needs admin rights.` };
    }
  }

  @Tool({
    name: 'set_process_priority',
    description: 'Changes the OS scheduling priority of a running process (e.g., set a game to High priority for smoother performance, or a background app to Low so it stops competing for CPU). A lesser-known but genuinely effective tuning trick.. CRITICAL: Never output `spec` JSON blocks or UI patches in your text responses. Just use plain text.. CRITICAL: Never output `spec` JSON blocks or UI patches in your text responses. Just use plain text.',
    inputSchema: z.object({
      processName: z.string().describe('Name of the process (e.g., game.exe)'),
      priority: z.enum(['low', 'belownormal', 'normal', 'abovenormal', 'high', 'realtime'])
        .describe('New priority level. Avoid "realtime" unless you know what you are doing — it can freeze the system.')
    })
  })
  @Widget('set-process-priority')
  async setProcessPriority({ processName, priority }: { processName: string; priority: string }) {
    const priorityMap: Record<string, string> = {
      low: 'IDLE', belownormal: 'BELOWNORMAL', normal: 'NORMAL',
      abovenormal: 'ABOVENORMAL', high: 'HIGH', realtime: 'REALTIME'
    };
    try {
      const psCmd = `powershell -Command "Get-Process -Name '${processName.replace('.exe', '')}' | ForEach-Object { $_.PriorityClass = '${priorityMap[priority]}' }"`;
      await execAsync(psCmd);
      return { message: `Set ${processName} priority to ${priority}.` };
    } catch (error) {
      return { message: `Could not change priority for ${processName}. It might not be running or needs admin rights.` };
    }
  }
}
