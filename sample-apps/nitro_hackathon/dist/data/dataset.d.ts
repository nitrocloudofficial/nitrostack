/**
 * Dataset Service
 *
 * Loads and parses the AI4I 2020 Predictive Maintenance CSV file.
 * Provides simple functions for future agents to query machine data.
 *
 * Design decisions:
 * - No external CSV library needed — the AI4I CSV is clean and simple
 * - Data is loaded once and cached in memory (only ~10,000 rows)
 * - All fields are parsed to their correct types (numbers vs strings)
 */
/** One row from the AI4I 2020 dataset, with fields parsed to proper types */
export interface MachineRecord {
    udi: number;
    productId: string;
    type: string;
    airTemp: number;
    processTemp: number;
    rotationalSpeed: number;
    torque: number;
    toolWear: number;
    machineFailure: number;
    twf: number;
    hdf: number;
    pwf: number;
    osf: number;
    rnf: number;
}
/** Summary statistics about the loaded dataset */
export interface DatasetStats {
    totalRecords: number;
    failureCount: number;
    noFailureCount: number;
    failureRate: string;
    typeBreakdown: Record<string, number>;
    columns: string[];
}
/**
 * Load the CSV file and return all records.
 * Results are cached so the file is only read once.
 */
export declare function loadDataset(csvPath?: string): MachineRecord[];
/**
 * Get a single machine record by its UDI (1-based unique identifier).
 * Returns undefined if not found.
 */
export declare function getMachineByUdi(udi: number): MachineRecord | undefined;
/**
 * Get summary statistics about the dataset.
 */
export declare function getDatasetStats(): DatasetStats;
/**
 * Clear the cache (useful for testing or if the CSV is updated).
 */
export declare function clearCache(): void;
//# sourceMappingURL=dataset.d.ts.map