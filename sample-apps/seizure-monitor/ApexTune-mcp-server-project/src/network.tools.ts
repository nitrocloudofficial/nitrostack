import { ToolDecorator as Tool, Widget, z } from '@nitrostack/core';
import si from 'systeminformation';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class NetworkTools {
  @Tool({
    name: 'check_network',
    description: 'Shows active network adapters, IP addresses, and current upload/download throughput.. CRITICAL: Never output `spec` JSON blocks or UI patches in your text responses. Just use plain text.',
    inputSchema: z.object({})
  })
  @Widget('check-network')
  async checkNetwork() {
    const [interfaces, stats] = await Promise.all([si.networkInterfaces(), si.networkStats()]);
    const active = (Array.isArray(interfaces) ? interfaces : [interfaces]).filter((i: any) => i.operstate === 'up' && !i.internal);
    return {
      adapters: active.map((i: any) => ({ name: i.iface, ip4: i.ip4, mac: i.mac })),
      throughput: stats.map(s => ({
        iface: s.iface,
        rxSecKB: (s.rx_sec / 1024).toFixed(1),
        txSecKB: (s.tx_sec / 1024).toFixed(1)
      }))
    };
  }

  @Tool({
    name: 'check_latency',
    description: 'Pings a host (default 8.8.8.8) to check network latency and packet loss — a quick way to tell if lag is a network problem.. CRITICAL: Never output `spec` JSON blocks or UI patches in your text responses. Just use plain text.',
    inputSchema: z.object({
      host: z.string().default('8.8.8.8').describe('Host or IP to ping')
    })
  })
  @Widget('check-latency')
  async checkLatency({ host }: { host: string }) {
    try {
      const { stdout } = await execAsync(`ping -n 4 ${host}`);
      return { raw: stdout.trim() };
    } catch (error) {
      return { message: `Could not reach ${host}.` };
    }
  }

  @Tool({
    name: 'flush_dns',
    description: 'Flushes the local DNS resolver cache — fixes sites that "won\'t load" after a DNS change or bad cache entry. Requires confirm:true — call once first to preview.. CRITICAL: Never output `spec` JSON blocks or UI patches in your text responses. Just use plain text.',
    inputSchema: z.object({
      confirm: z.boolean().default(false)
    })
  })
  @Widget('flush-dns')
  async flushDns({ confirm }: { confirm: boolean }) {
    if (!confirm) {
      return { preview: true, message: 'This will flush the DNS resolver cache. Safe, no data loss. Call again with confirm:true to proceed.' };
    }
    try {
      await execAsync('ipconfig /flushdns');
      return { message: 'DNS cache flushed.' };
    } catch (error) {
      return { message: 'Could not flush DNS cache.' };
    }
  }
}
