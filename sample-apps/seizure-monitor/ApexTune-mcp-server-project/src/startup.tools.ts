import { ToolDecorator as Tool, Widget, z } from '@nitrostack/core';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const RUN_KEY = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run';
const BACKUP_KEY = 'HKCU\\Software\\ApexTune\\DisabledStartup';

export class StartupTools {
  @Tool({
    name: 'list_startup_apps',
    description: 'Lists apps configured to launch automatically when Windows starts, including their command and where they are registered.. CRITICAL: Never output `spec` JSON blocks or UI patches in your text responses. Just use plain text.',
    inputSchema: z.object({})
  })
  @Widget('list-startup-apps')
  async listStartupApps() {
    try {
      const { stdout } = await execAsync(
        `powershell -Command "Get-CimInstance Win32_StartupCommand | Select-Object Name, Command, Location | ConvertTo-Json"`
      );
      const parsed = JSON.parse(stdout || '[]');
      const list = Array.isArray(parsed) ? parsed : [parsed];
      return { startupApps: list.map((a: any) => ({ name: a.Name, command: a.Command, location: a.Location })) };
    } catch (error) {
      return { message: 'Could not read startup apps.' };
    }
  }

  @Tool({
    name: 'disable_startup_app',
    description: 'Disables an app from launching at Windows startup (only affects apps registered in the current user Run key). The original entry is backed up so it can be restored with enable_startup_app. Requires confirm:true — call once first to preview.. CRITICAL: Never output `spec` JSON blocks or UI patches in your text responses. Just use plain text.',
    inputSchema: z.object({
      appName: z.string().describe('The exact "Name" value as shown by list_startup_apps'),
      confirm: z.boolean().default(false)
    })
  })
  @Widget('disable-startup-app')
  async disableStartupApp({ appName, confirm }: { appName: string; confirm: boolean }) {
    if (!confirm) {
      return { preview: true, message: `This will stop "${appName}" from launching at startup. It can be re-enabled later with enable_startup_app. Call again with confirm:true to proceed.` };
    }
    try {
      const { stdout } = await execAsync(`reg query "${RUN_KEY}" /v "${appName}"`);
      const match = stdout.match(/REG_\w+\s+(.+)/);
      const value = match ? match[1].trim() : null;
      if (!value) return { message: `Could not find "${appName}" in the startup Run key. It may be registered elsewhere (e.g. Startup folder or Task Scheduler).` };

      await execAsync(`reg add "${BACKUP_KEY}" /v "${appName}" /t REG_SZ /d "${value}" /f`);
      await execAsync(`reg delete "${RUN_KEY}" /v "${appName}" /f`);
      return { message: `Disabled "${appName}" from startup. Use enable_startup_app to restore it.` };
    } catch (error) {
      return { message: `Could not disable "${appName}". It may not be a current-user Run key entry.` };
    }
  }

  @Tool({
    name: 'enable_startup_app',
    description: 'Re-enables a startup app that was previously disabled with disable_startup_app.. CRITICAL: Never output `spec` JSON blocks or UI patches in your text responses. Just use plain text.',
    inputSchema: z.object({
      appName: z.string().describe('The app name that was disabled')
    })
  })
  @Widget('enable-startup-app')
  async enableStartupApp({ appName }: { appName: string }) {
    try {
      const { stdout } = await execAsync(`reg query "${BACKUP_KEY}" /v "${appName}"`);
      const match = stdout.match(/REG_\w+\s+(.+)/);
      const value = match ? match[1].trim() : null;
      if (!value) return { message: `No backup found for "${appName}". It may not have been disabled via ApexTune.` };

      await execAsync(`reg add "${RUN_KEY}" /v "${appName}" /t REG_SZ /d "${value}" /f`);
      await execAsync(`reg delete "${BACKUP_KEY}" /v "${appName}" /f`);
      return { message: `Re-enabled "${appName}" at startup.` };
    } catch (error) {
      return { message: `Could not re-enable "${appName}".` };
    }
  }
}
