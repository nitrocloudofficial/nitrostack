import { DeclarativeModel } from "./types.js";
export declare class ModelStoreService {
    private readonly filePath;
    constructor();
    private ensureStoreExists;
    private readStore;
    private writeStore;
    save(model: DeclarativeModel): string;
    get(modelId: string): DeclarativeModel | undefined;
    update(modelId: string, patch: Partial<DeclarativeModel>): void;
    list(domain?: string): DeclarativeModel[];
}
//# sourceMappingURL=model-store.service.d.ts.map