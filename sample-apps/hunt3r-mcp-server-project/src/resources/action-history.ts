export class ActionHistoryResource {
  private history: any[] = [];
  
  async logAction(record: any): Promise<void> {
    this.history.push(record);
  }

  async getActionsForHypothesis(hypothesis_id: string): Promise<any[]> {
    return this.history.filter(h => h.hypothesis_id === hypothesis_id);
  }

  async getAllActions(): Promise<any[]> {
    return this.history;
  }
}