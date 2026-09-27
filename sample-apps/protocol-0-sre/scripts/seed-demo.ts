import fs from "fs";
import path from "path";

/**
 * Seed script: Prints out the active incidents from the mock files.
 * Used for populating demo state or verifying mock integrity.
 */

async function main() {
  console.log("Seeding Protocol-0 Demo State...");
  
  const datadogMockPath = path.resolve(process.cwd(), "mocks/datadog_seed.json");
  const ddData = JSON.parse(fs.readFileSync(datadogMockPath, "utf-8"));
  console.log(`Loaded ${ddData.length} Datadog alerts.`);

  const githubMockPath = path.resolve(process.cwd(), "mocks/github_seed.json");
  const ghData = JSON.parse(fs.readFileSync(githubMockPath, "utf-8"));
  console.log(`Loaded ${ghData.length} GitHub workflows.`);

  const jiraMockPath = path.resolve(process.cwd(), "mocks/jira_seed.json");
  const jiraData = JSON.parse(fs.readFileSync(jiraMockPath, "utf-8"));
  console.log(`Loaded ${jiraData.length} Jira tickets.`);

  const pdMockPath = path.resolve(process.cwd(), "mocks/pagerduty_seed.json");
  const pdData = JSON.parse(fs.readFileSync(pdMockPath, "utf-8"));
  console.log(`Loaded ${pdData.length} PagerDuty incidents.`);

  const k8sMockPath = path.resolve(process.cwd(), "mocks/kubernetes_seed.json");
  const k8sData = JSON.parse(fs.readFileSync(k8sMockPath, "utf-8"));
  console.log(`Loaded ${k8sData.length} Kubernetes pods state.`);

  const secMockPath = path.resolve(process.cwd(), "mocks/security_audit_seed.json");
  const secData = JSON.parse(fs.readFileSync(secMockPath, "utf-8"));
  console.log(`Loaded ${secData.length} Security Audit events.`);

  console.log("State successfully seeded.");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});

