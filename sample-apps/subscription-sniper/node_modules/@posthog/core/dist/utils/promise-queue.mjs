import { uuidv7 } from "../vendor/uuidv7.mjs";
class PromiseQueue {
    add(promise) {
        const promiseUUID = uuidv7();
        const id = ++this.nextId;
        this.promiseByIds[promiseUUID] = {
            id,
            promise
        };
        promise.catch(()=>{}).finally(()=>{
            delete this.promiseByIds[promiseUUID];
        });
        return promise;
    }
    async join() {
        let promises = Object.values(this.promiseByIds).map((item)=>item.promise);
        let length = promises.length;
        while(length > 0){
            await Promise.all(promises);
            promises = Object.values(this.promiseByIds).map((item)=>item.promise);
            length = promises.length;
        }
    }
    getPromises(ignoredPromises = [], maxId = this.nextId) {
        const ignoredPromiseSet = new Set(ignoredPromises);
        return Object.values(this.promiseByIds).filter((item)=>item.id <= maxId && !ignoredPromiseSet.has(item.promise)).map((item)=>item.promise);
    }
    get maxId() {
        return this.nextId;
    }
    get length() {
        return Object.keys(this.promiseByIds).length;
    }
    constructor(){
        this.promiseByIds = {};
        this.nextId = 0;
    }
}
export { PromiseQueue };
