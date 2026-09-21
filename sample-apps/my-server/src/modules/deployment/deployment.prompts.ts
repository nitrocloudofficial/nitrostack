import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';

export class DeploymentPrompts {
  @Prompt({
    name: 'safe_deployment_pipeline',
    description: 'Get instructions and step-by-step guidance for a safe, modern frontend deployment workflow.',
    arguments: [
      {
        name: 'owner',
        description: 'The GitHub repository owner',
        required: true,
      },
      {
        name: 'repo',
        description: 'The GitHub repository name',
        required: true,
      },
    ],
  })
  async getDeploymentPipeline(
    args: { owner: string; repo: string },
    ctx: ExecutionContext
  ) {
    ctx.logger.info(`Generating deployment pipeline prompt for ${args.owner}/${args.repo}`);

    return [
      {
        role: 'user' as const,
        content: `What is the correct step-by-step order to deploy the frontend repository ${args.owner}/${args.repo}?`,
      },
      {
        role: 'assistant' as const,
        content: `To deploy the frontend repository **${args.owner}/${args.repo}** while ensuring all modern deployment best practices are followed, follow this workflow:

### **CRITICAL: Handle "Local Code Not Yet On GitHub" Edge Case First**
If the local project code has not been pushed to GitHub yet, or if the repository does not exist, the agent **must not** ask the user to manually push the code. Instead, execute this automatic setup flow:
1. **Create Repository**: Call \`create_repository\` with the project name to create a new GitHub repo.
2. **Push Local Files**: Gather all key files in the local workspace directory (e.g. package.json, source files, config files) and push them directly using \`apply_code_patch\` to the main branch of the newly created repository.
3. **Verify**: Ensure the files are successfully committed on GitHub before proceeding.

---

### **Standard 4-Step Deployment Pipeline**

Once the code is on GitHub, follow this strict sequence:

#### **Step 1: Analyze & Onboard the Repository**
Run the onboarding tool to detect the framework, package manager, and entry files:
* **Tool**: \`repo_onboarding_summary\`
* **Goal**: Confirm the tech stack and locate the build directory.

#### **Step 2: Prepare Deploy Plan (Dockerfile Validation)**
Every modern production project should have containerization/Docker support. Check for a Dockerfile and generate a deploy plan:
* **Tool**: \`prepare_deploy_plan\`
* **Goal**: Validate if a Dockerfile exists. If not, generate one and commit it to the branch using \`apply_code_patch\` or \`create_feature_branch_and_pr\`.

#### **Step 3: Setup CI Deployment Gate (Test Pass Enforcement)**
Never deploy code that hasn't passed tests. Create a GitHub Actions workflow to run checks and gate the release:
* **Tool**: \`setup_ci_deployment_gate\`
* **Goal**: Create the CI workflow file at \`.github/workflows/ci-deploy-gate.yml\`. This ensures that unit tests, linting, and Docker builds must pass successfully before any release happens.

#### **Step 4: Trigger Frontend Deployment & Self-Healing Build Loop**
Trigger the frontend deployment:
* **Tools**:
  - Vercel: \`deploy_to_vercel\`
  - Netlify: \`deploy_to_netlify\`
  - Cloudflare Pages: \`deploy_to_cloudflare_pages\`

##### **PROACTIVE SELF-HEALING (Auto-Redeploy on Error)**:
If the deployment status returns a \`failed\` or \`error\` state, the agent **must not** stop or ask the user to fix it manually. Instead, the agent (the LLM itself) must execute this self-healing loop:
1. **Analyze Build Logs**: Read the build logs or console outputs to pinpoint the exact code error (e.g., compile issues, missing dependencies, or path mismatches).
2. **Fix the Bug Locally**: The LLM must temporarily step away from the deployment tools and use its own file editing/modification capabilities to fix the bug directly in the local project codebase.
3. **Compile Check**: Verify the code fix locally (e.g. by running \`npx tsc --noEmit\` or \`npm run build\` locally) to ensure it compiles without errors.
4. **Push & Redeploy**: Commit the fix, push it to GitHub using \`apply_code_patch\`, and monitor/re-trigger the deployment until the status successfully resolves to \`ready\`.

*Follow this sequence strictly for all frontend deployments.*`,
      },
    ];
  }

  @Prompt({
    name: 'explain_this_repository',
    description: 'Explain This Repo Mode: Scans the repository and gives an overview of the architecture, tech stack, entry points, and folder structure.',
    arguments: [
      {
        name: 'owner',
        description: 'The GitHub repository owner',
        required: true,
      },
      {
        name: 'repo',
        description: 'The GitHub repository name',
        required: true,
      },
    ],
  })
  async explainThisRepository(
    args: { owner: string; repo: string },
    ctx: ExecutionContext
  ) {
    ctx.logger.info(`Generating repo explainer prompt for ${args.owner}/${args.repo}`);
    return [
      {
        role: 'user' as const,
        content: `Give me an overview of the architecture, tech stack, entry points, and folder structure of repository ${args.owner}/${args.repo}.`,
      },
      {
        role: 'assistant' as const,
        content: `To explain the repository **${args.owner}/${args.repo}** clearly:
1. **Onboarding Summary**: Call the \`repo_onboarding_summary\` tool to get a full analysis of the technologies, package manager, and folder structure.
2. **Read Code Structure**: Read the primary entry points (e.g. server.js, index.js, package.json, src/index.tsx) using the read file tools.
3. **Structured Overview**: Output a markdown overview including:
   - **Tech Stack**: Main programming languages and frameworks (React, Express, NestJS, Python FastAPI, etc.).
   - **Entry Points**: Key source files where execution starts.
   - **Architecture & Structure**: Main folders (e.g. src/components, backend/models) and how data flows.
   - **Configuration Files**: Deployment configs (Dockerfile, vercel.json, package.json).`,
      },
    ];
  }
}
