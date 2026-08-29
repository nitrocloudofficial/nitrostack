import { Injectable, OnModuleInit } from '@nitrostack/core';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

@Injectable()
export class HealthCheckService implements OnModuleInit {
    
    async onModuleInit() {
        this.verifySystemHealth();
    }

    private verifySystemHealth() {
        console.error('[HealthCheck] Verifying System Health...');
        
        // 1. Check if mock data is accessible
        const mockFilePath = path.resolve(__dirname, '../src/data/mock-infrastructure.json');
        try {
            fs.accessSync(mockFilePath, fs.constants.R_OK);
            console.error('[HealthCheck] ✅ mock-infrastructure.json is accessible.');
        } catch (error) {
            console.error('[HealthCheck] ❌ mock-infrastructure.json is NOT accessible.');
        }

        // 2. Check basic system memory
        const freeMemMB = Math.round(os.freemem() / 1024 / 1024);
        const totalMemMB = Math.round(os.totalmem() / 1024 / 1024);
        
        if (freeMemMB < 100) {
            console.warn(`[HealthCheck] ⚠️ Low memory warning: ${freeMemMB}MB free out of ${totalMemMB}MB.`);
        } else {
            console.error(`[HealthCheck] ✅ Memory looks good: ${freeMemMB}MB free out of ${totalMemMB}MB.`);
        }
    }
}
