export class ActionHistoryResource {
    history = [];
    async logAction(record) {
        this.history.push(record);
    }
    async getActionsForHypothesis(hypothesis_id) {
        return this.history.filter(h => h.hypothesis_id === hypothesis_id);
    }
    async getAllActions() {
        return this.history;
    }
}
