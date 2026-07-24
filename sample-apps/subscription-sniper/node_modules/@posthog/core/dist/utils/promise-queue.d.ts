export declare class PromiseQueue {
    private promiseByIds;
    private nextId;
    add(promise: Promise<any>): Promise<any>;
    join(): Promise<void>;
    getPromises(ignoredPromises?: Promise<any>[], maxId?: number): Promise<any>[];
    get maxId(): number;
    get length(): number;
}
//# sourceMappingURL=promise-queue.d.ts.map