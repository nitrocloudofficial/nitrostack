import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { SyncRegistryService } from "./sync-registry.service.js";
import { BackgroundSyncService } from "./background-sync.service.js";
describe("Sync Services Tests", () => {
    let mockDataService;
    let mockTbClient;
    let registryService;
    let backgroundSyncService;
    // In-memory data store for testing
    let registryStore;
    let readingsStore;
    beforeEach(() => {
        registryStore = new Map();
        readingsStore = [];
        // Mock DeviceDataService
        mockDataService = {
            hasPool: vi.fn(() => true),
            getRegistryEntry: vi.fn(async (deviceId) => {
                return registryStore.get(deviceId) || null;
            }),
            upsertRegistryEntry: vi.fn(async (deviceId, enabled, syncIntervalSeconds, lastSyncedTimestamp, lastSyncStatus, lastSyncError) => {
                const existing = registryStore.get(deviceId);
                registryStore.set(deviceId, {
                    deviceId,
                    enabled,
                    syncIntervalSeconds,
                    lastSyncedTimestamp,
                    createdAt: existing ? existing.createdAt : new Date(),
                    updatedAt: new Date(),
                    lastSyncStatus,
                    lastSyncError,
                });
            }),
            deleteRegistryEntry: vi.fn(async (deviceId) => {
                return registryStore.delete(deviceId);
            }),
            getAllRegistryEntries: vi.fn(async () => {
                return Array.from(registryStore.values());
            }),
            insertReadingsBatch: vi.fn(async (readings) => {
                readingsStore.push(...readings);
                return readings.length;
            }),
        };
        // Mock ThingsBoardClientService
        mockTbClient = {
            getDeviceById: vi.fn(async (deviceId) => {
                if (deviceId === "invalid-device") {
                    throw new Error("Device not found");
                }
                return { id: { id: deviceId }, name: "Test Device" };
            }),
            getTelemetryKeys: vi.fn(async (deviceId) => {
                return ["temperature", "humidity"];
            }),
            getTelemetryRange: vi.fn(async (deviceId, keys, startTs, endTs) => {
                if (deviceId === "failed-device") {
                    throw new Error("TB Server Error");
                }
                const allData = {
                    temperature: [
                        { ts: startTs + 100, value: "23.5" },
                        { ts: startTs + 200, value: "24.0" }
                    ],
                    humidity: [
                        { ts: startTs + 100, value: "60.0" }
                    ]
                };
                const filtered = {};
                for (const key of keys) {
                    if (allData[key]) {
                        filtered[key] = allData[key];
                    }
                }
                return filtered;
            }),
        };
        registryService = new SyncRegistryService(mockDataService, mockTbClient);
        backgroundSyncService = new BackgroundSyncService(registryService, mockTbClient, mockDataService);
    });
    afterEach(() => {
        vi.clearAllMocks();
    });
    it("should register a device successfully", async () => {
        const deviceId = "device-123";
        const entry = await registryService.registerDevice(deviceId, 45);
        expect(mockTbClient.getDeviceById).toHaveBeenCalledWith(deviceId);
        expect(mockDataService.upsertRegistryEntry).toHaveBeenCalled();
        expect(entry.deviceId).toBe(deviceId);
        expect(entry.enabled).toBe(true);
        expect(entry.syncIntervalSeconds).toBe(45);
        expect(entry.lastSyncedTimestamp).toBeDefined();
    });
    it("should throw an error when registering a non-existent device", async () => {
        await expect(registryService.registerDevice("invalid-device")).rejects.toThrow("Device 'invalid-device' not found in ThingsBoard");
    });
    it("should pause and resume device synchronization", async () => {
        const deviceId = "device-123";
        // Pre-register in memory
        registryStore.set(deviceId, {
            deviceId,
            enabled: true,
            syncIntervalSeconds: 30,
            lastSyncedTimestamp: Date.now(),
            createdAt: new Date(),
            updatedAt: new Date(),
            lastSyncStatus: "initialized",
            lastSyncError: null,
        });
        // Pause
        const paused = await registryService.pauseDevice(deviceId);
        expect(paused.enabled).toBe(false);
        // Resume
        const resumed = await registryService.resumeDevice(deviceId);
        expect(resumed.enabled).toBe(true);
    });
    it("should perform manual synchronization", async () => {
        const deviceId = "device-123";
        registryStore.set(deviceId, {
            deviceId,
            enabled: true,
            syncIntervalSeconds: 30,
            lastSyncedTimestamp: 1000,
            createdAt: new Date(),
            updatedAt: new Date(),
            lastSyncStatus: "initialized",
            lastSyncError: null,
        });
        const count = await backgroundSyncService.syncDeviceNow(deviceId);
        expect(count).toBe(3); // 2 temperature + 1 humidity
        expect(readingsStore.length).toBe(3);
        expect(readingsStore[0].metric).toBe("temperature");
        expect(readingsStore[0].value).toBe(23.5);
    });
    it("should perform historical backfill and not update lastSyncedTimestamp", async () => {
        const deviceId = "device-123";
        registryStore.set(deviceId, {
            deviceId,
            enabled: true,
            syncIntervalSeconds: 30,
            lastSyncedTimestamp: 1000,
            createdAt: new Date(),
            updatedAt: new Date(),
            lastSyncStatus: "initialized",
            lastSyncError: null,
        });
        const count = await backgroundSyncService.syncDeviceHistory(deviceId, ["temperature"], 2000, 3000);
        expect(count).toBe(2);
        // Registry lastSyncedTimestamp should remain unchanged (1000)
        const entry = registryStore.get(deviceId);
        expect(entry?.lastSyncedTimestamp).toBe(1000);
    });
    it("should prevent overlapping background executions", async () => {
        // Mock a delayed sync to test locking
        mockTbClient.getTelemetryKeys = vi.fn(async () => {
            await new Promise(resolve => setTimeout(resolve, 50));
            return ["temp"];
        });
        registryStore.set("device-1", {
            deviceId: "device-1",
            enabled: true,
            syncIntervalSeconds: 10,
            lastSyncedTimestamp: 1000,
            createdAt: new Date(),
            updatedAt: new Date(),
            lastSyncStatus: "initialized",
            lastSyncError: null,
        });
        // Trigger two concurrent runs
        const p1 = backgroundSyncService.syncRegisteredDevices();
        const p2 = backgroundSyncService.syncRegisteredDevices();
        await Promise.all([p1, p2]);
        // ThingsBoard getTelemetryKeys should be called once because the second was locked out
        expect(mockTbClient.getTelemetryKeys).toHaveBeenCalledTimes(1);
    });
    it("should isolate failed device synchronization and not affect other devices", async () => {
        registryStore.set("failed-device", {
            deviceId: "failed-device",
            enabled: true,
            syncIntervalSeconds: 10,
            lastSyncedTimestamp: 1000,
            createdAt: new Date(),
            updatedAt: new Date(),
            lastSyncStatus: "initialized",
            lastSyncError: null,
        });
        registryStore.set("healthy-device", {
            deviceId: "healthy-device",
            enabled: true,
            syncIntervalSeconds: 10,
            lastSyncedTimestamp: 1000,
            createdAt: new Date(),
            updatedAt: new Date(),
            lastSyncStatus: "initialized",
            lastSyncError: null,
        });
        // Run sync
        await backgroundSyncService.syncRegisteredDevices();
        // Failed device gets error status
        const failedEntry = registryStore.get("failed-device");
        expect(failedEntry?.lastSyncStatus).toBe("error");
        expect(failedEntry?.lastSyncError).toBe("TB Server Error");
        // Healthy device successfully syncs
        const healthyEntry = registryStore.get("healthy-device");
        expect(healthyEntry?.lastSyncStatus).toBe("success");
        expect(healthyEntry?.lastSyncError).toBeNull();
    });
});
//# sourceMappingURL=sync.spec.js.map