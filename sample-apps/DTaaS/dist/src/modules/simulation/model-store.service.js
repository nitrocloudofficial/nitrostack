var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import * as fs from "fs";
import * as path from "path";
import crypto from "crypto";
import { Injectable } from "@nitrostack/core";
let ModelStoreService = class ModelStoreService {
    filePath = path.resolve("data", "models.json");
    constructor() {
        this.ensureStoreExists();
    }
    ensureStoreExists() {
        const dir = path.dirname(this.filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        if (!fs.existsSync(this.filePath)) {
            fs.writeFileSync(this.filePath, JSON.stringify({}), "utf8");
        }
    }
    readStore() {
        this.ensureStoreExists();
        try {
            const content = fs.readFileSync(this.filePath, "utf8");
            return JSON.parse(content);
        }
        catch {
            return {};
        }
    }
    writeStore(data) {
        fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), "utf8");
    }
    save(model) {
        const store = this.readStore();
        const modelId = crypto.randomUUID();
        model.id = modelId;
        store[modelId] = model;
        this.writeStore(store);
        return modelId;
    }
    get(modelId) {
        const store = this.readStore();
        return store[modelId];
    }
    update(modelId, patch) {
        const store = this.readStore();
        if (store[modelId]) {
            store[modelId] = {
                ...store[modelId],
                ...patch
            };
            this.writeStore(store);
        }
    }
    list(domain) {
        const store = this.readStore();
        const models = Object.values(store);
        if (domain) {
            return models.filter(m => m.domain.toLowerCase() === domain.toLowerCase());
        }
        return models;
    }
};
ModelStoreService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [])
], ModelStoreService);
export { ModelStoreService };
//# sourceMappingURL=model-store.service.js.map