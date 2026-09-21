import { Commitment } from "../../schemas/commitment.schema.js";

export class LedgerService {

  private commitments: Commitment[] = [];

  add(commitments: Commitment[]) {
    this.commitments.push(...commitments);
  }

  getAll() {
    return this.commitments;
  }

  clear() {
    this.commitments = [];
  }

}