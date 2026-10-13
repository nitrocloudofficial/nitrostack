import { Injectable } from "@nitrostack/core";
import { triageFinding, type TriageDecision, type TriageInput } from "./triage-rules.js";

@Injectable()
export class TriageService {
  classify(input: TriageInput): TriageDecision {
    return triageFinding(input);
  }
}
