import { uuidv7 } from '../vendor/uuidv7'

export class PromiseQueue {
  private promiseByIds: Record<string, { id: number; promise: Promise<any> }> = {}
  private nextId: number = 0

  public add(promise: Promise<any>): Promise<any> {
    const promiseUUID = uuidv7()
    const id = ++this.nextId
    this.promiseByIds[promiseUUID] = { id, promise }
    promise
      .catch(() => {})
      .finally(() => {
        delete this.promiseByIds[promiseUUID]
      })
    return promise
  }

  public async join(): Promise<void> {
    let promises = Object.values(this.promiseByIds).map((item) => item.promise)
    let length = promises.length
    while (length > 0) {
      await Promise.all(promises)
      promises = Object.values(this.promiseByIds).map((item) => item.promise)
      length = promises.length
    }
  }

  public getPromises(ignoredPromises: Promise<any>[] = [], maxId: number = this.nextId): Promise<any>[] {
    const ignoredPromiseSet = new Set(ignoredPromises)
    return Object.values(this.promiseByIds)
      .filter((item) => item.id <= maxId && !ignoredPromiseSet.has(item.promise))
      .map((item) => item.promise)
  }

  public get maxId(): number {
    return this.nextId
  }

  public get length(): number {
    return Object.keys(this.promiseByIds).length
  }
}
