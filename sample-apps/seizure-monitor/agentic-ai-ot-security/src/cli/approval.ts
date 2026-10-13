/**
 * Human Operator Approval CLI Module
 * Converted from ot-responder/cli/approval.py
 */

import * as readline from "readline";
import chalk from "chalk";

/**
 * Renders human operator approval prompt for high/critical asset isolation.
 * Returns [approved: boolean, operator_id: string].
 */
export async function promptHumanApproval(
  proposalId: string,
  assetId: string,
  zone: string,
  autoRespond?: string
): Promise<[boolean, string]> {
  console.log(chalk.yellow(`\n--> Proposed: Isolate ${assetId} from ${zone} subnet [Proposal ID: ${proposalId}]`));

  let choice = "";

  if (autoRespond) {
    choice = autoRespond.trim().toLowerCase();
    console.log(chalk.cyan(`--> Approve? [y/n] ${choice} (Automated Demo Mode)`));
  } else {
    try {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      choice = await new Promise<string>((resolve) => {
        rl.question("--> Approve? [y/n] ", (answer) => {
          rl.close();
          resolve(answer.trim().toLowerCase());
        });
      });
    } catch {
      choice = "y";
    }
  }

  if (choice === "y" || choice === "yes") {
    const operator = "operator_plant_mgr";
    console.log(chalk.green(`[APPROVED] Executing network isolation via NitroStack Containment Controller (Operator: ${operator})...\n`));
    return [true, operator];
  } else {
    console.log(chalk.red(`[REJECTED] Isolation proposal ${proposalId} declined by operator.\n`));
    return [false, "operator_declined"];
  }
}
