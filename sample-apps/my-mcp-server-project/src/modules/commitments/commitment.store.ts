export class CommitmentStore {
  private static commitments: any[] = [];

  static add(commitments: any[]) {
    this.commitments.push(...commitments);
  }

  static getAll() {
    return this.commitments;
  }

  static clear() {
    this.commitments = [];
  }
}