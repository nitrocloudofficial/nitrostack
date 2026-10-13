import { ToolDecorator as Tool, Widget, z } from '@nitrostack/core';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class CleanupTools {
  @Tool({
    name: 'get_reclaimable_space',
    description: 'Estimates how much disk space could be freed by clearing temp files, without deleting anything. Run this before clean_temp_files.. CRITICAL: Never output `spec` JSON blocks or UI patches in your text responses. Just use plain text.',
    inputSchema: z.object({})
  })
  @Widget('cleanup-overview')
  async getReclaimableSpace() {
    try {
      const cmd = `powershell -Command "(Get-ChildItem -Path $env:TEMP,'C:\\Windows\\Temp' -Recurse -Force -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum"`;
      const { stdout } = await execAsync(cmd);
      const bytes = parseInt(stdout.trim(), 10) || 0;
      return { reclaimableMB: (bytes / 1024 ** 2).toFixed(1) };
    } catch (error) {
      return { message: 'Could not estimate reclaimable space.' };
    }
  }

  @Tool({
    name: 'clean_temp_files',
    description: 'Deletes files in the user and Windows temp folders to free disk space. Files currently in use are skipped automatically. Requires confirm:true — call once first to preview.. CRITICAL: Never output `spec` JSON blocks or UI patches in your text responses. Just use plain text.',
    inputSchema: z.object({
      confirm: z.boolean().default(false)
    })
  })
  @Widget('clean-temp-files')
  async cleanTempFiles({ confirm }: { confirm: boolean }) {
    if (!confirm) {
      return { preview: true, message: 'This will permanently delete files in %TEMP% and C:\\Windows\\Temp. Files currently locked by running apps will be safely skipped. Call again with confirm:true to proceed.' };
    }
    try {
      const cmd = `powershell -Command "Get-ChildItem -Path $env:TEMP,'C:\\Windows\\Temp' -Recurse -Force -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue"`;
      await execAsync(cmd);
      return { message: 'Temp files cleaned (locked/in-use files were skipped).' };
    } catch (error) {
      return { message: 'Cleanup ran but some files may have been skipped due to permissions.' };
    }
  }

  @Tool({
    name: 'empty_recycle_bin',
    description: 'Empties the Windows Recycle Bin. Requires confirm:true — call once first to preview.. CRITICAL: Never output `spec` JSON blocks or UI patches in your text responses. Just use plain text.',
    inputSchema: z.object({
      confirm: z.boolean().default(false)
    })
  })
  @Widget('empty-recycle-bin')
  async emptyRecycleBin({ confirm }: { confirm: boolean }) {
    if (!confirm) {
      return { preview: true, message: 'This will permanently empty the Recycle Bin — files will not be recoverable. Call again with confirm:true to proceed.' };
    }
    try {
      const script = `
        $ErrorActionPreference = 'Stop'
        try {
          $shell = New-Object -ComObject Shell.Application
          $bin = $shell.Namespace(0xA)
          $count = $bin.Items().Count
          if ($count -eq 0) {
            Write-Output 'EMPTY'
          } else {
            Clear-RecycleBin -Force -Confirm:$false
            Write-Output "CLEARED:$count"
          }
        } catch {
          Write-Output "ERROR:$($_.Exception.Message)"
        }
      `.replace(/\r?\n/g, ' ');
      const { stdout } = await execAsync(`powershell -Command "${script.replace(/"/g, '\\"')}"`);
      const result = stdout.trim();

      if (result === 'EMPTY') {
        return { message: 'Recycle Bin was already empty — nothing to do.' };
      }
      if (result.startsWith('CLEARED')) {
        const count = result.split(':')[1] ?? 'some';
        return { message: `Recycle Bin emptied (${count} item(s) removed).` };
      }
      if (result.startsWith('ERROR')) {
        return { message: `Could not empty Recycle Bin: ${result.replace('ERROR:', '').trim()}` };
      }
      return { message: 'Recycle Bin cleanup ran, but the result was unclear.' };
    } catch (error) {
      return { message: 'Could not empty Recycle Bin.' };
    }
  }
}
