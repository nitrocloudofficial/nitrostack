import * as fs from "fs";
import * as path from "path";
import crypto from "crypto";
import { Injectable } from "@nitrostack/core";
import { DeclarativeModel } from "./types.js";

@Injectable()
export class ModelStoreService {
    private readonly filePath = path.resolve("data", "models.json");

    constructor() {
        this.ensureStoreExists();
    }

    private ensureStoreExists() {
        const dir = path.dirname(this.filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        if (!fs.existsSync(this.filePath)) {
            fs.writeFileSync(this.filePath, JSON.stringify({}), "utf8");
        }
    }

    private readStore(): Record<string, DeclarativeModel> {
        this.ensureStoreExists();
        try {
            const content = fs.readFileSync(this.filePath, "utf8");
            return JSON.parse(content);
        } catch {
            return {};
        }
    }

    private writeStore(data: Record<string, DeclarativeModel>) {
        fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), "utf8");
    }

    save(model: DeclarativeModel): string {
        const store = this.readStore();
        const modelId = crypto.randomUUID();
        model.id = modelId;
        store[modelId] = model;
        this.writeStore(store);
        return modelId;
    }

    get(modelId: string): DeclarativeModel | undefined {
        const store = this.readStore();
        return store[modelId];
    }

    update(modelId: string, patch: Partial<DeclarativeModel>): void {
        const store = this.readStore();
        if (store[modelId]) {
            store[modelId] = {
                ...store[modelId],
                ...patch
            };
            this.writeStore(store);
        }
    }

    list(domain?: string): DeclarativeModel[] {
        const store = this.readStore();
        const models = Object.values(store);
        if (domain) {
            return models.filter(m => m.domain.toLowerCase() === domain.toLowerCase());
        }
        return models;
    }
}
