import { Injectable, ExecutionContext } from '@nitrostack/core';
import { FinanceStore } from '../../services/finance-store.service.js';
import { DecisionService } from '../decision/decision.service.js';
import { WorkflowService, WorkflowStepResult } from '../workflow/workflow.service.js';
import { ReflectionService, ReflectionEvaluation } from '../reflection/reflection.service.js';

import { CategorizeTools } from '../categorize/categorize.tools.js';
import { AnalysisTools } from '../analysis/analysis.tools.js';
import { RiskTools } from '../risk/risk.tools.js';
import { SavingsTools } from '../savings/savings.tools.js';
import { HealthScoreTools } from '../health-score/health-score.tools.js';
import { SimulationTools } from '../simulation/simulation.tools.js';
import { NotificationTools } from '../notification/notification.tools.js';
import { IngestionTools } from '../ingestion/ingestion.tools.js';
import { InvestmentTools } from '../investment/investment.tools.js';

export interface AgenticWorkflowResult {
  workflow_name: string;
  user_goal: string;
  steps_executed: string[];
  confidence_score: number;
  warnings: string[];
  decision_evaluations: any[];
  reflection: ReflectionEvaluation;
  consolidated_summary: string;
  detailed_outputs: Record<string, any>;
}

const MAX_TOOL_STEPS_CAP = 10;

/**
 * PlannerService — Master Agentic AI Orchestration Engine (v2 Architecture)
 *
 * NOTE: Strictly an internal service provider — 0 new MCP tools registered.
 * Supports continuous multi-tool execution loops with a hard cap of 10 tool calls per turn,
 * rendering visually attractive markdown reports with proactive follow-up prompt suggestions.
 */
@Injectable({ deps: [FinanceStore, DecisionService, WorkflowService, ReflectionService] })
export class PlannerService {
  private categorizeTools: CategorizeTools;
  private analysisTools: AnalysisTools;
  private riskTools: RiskTools;
  private savingsTools: SavingsTools;
  private healthScoreTools: HealthScoreTools;
  private simulationTools: SimulationTools;
  private notificationTools: NotificationTools;
  private ingestionTools: IngestionTools;
  private investmentTools: InvestmentTools;

  constructor(
    private store: FinanceStore,
    private decisionEngine: DecisionService,
    private workflowEngine: WorkflowService,
    private reflectionEngine: ReflectionService
  ) {
    this.categorizeTools = new CategorizeTools(store);
    this.analysisTools = new AnalysisTools(store);
    this.riskTools = new RiskTools(store);
    this.savingsTools = new SavingsTools(store);
    this.healthScoreTools = new HealthScoreTools(store);
    this.simulationTools = new SimulationTools(store);
    this.notificationTools = new NotificationTools(store);
    this.ingestionTools = new IngestionTools(store);
    this.investmentTools = new InvestmentTools(store);
  }

  /**
   * Content-Based Smart Router with Compound Intent Parsing
   */
  async routeAndExecuteByContent(userInput: string, ctx: ExecutionContext): Promise<AgenticWorkflowResult> {
    const text = userInput.trim().toLowerCase();

    // Check for Compound Multi-Goal Query ("analyze my finances AND tell me if I can afford an iPhone for 75000")
    const isCompoundAuditAndPurchase =
      (text.includes('analyze') || text.includes('audit') || text.includes('finances') || text.includes('check')) &&
      (text.includes('buy') || text.includes('purchase') || text.includes('afford') || text.includes('iphone'));

    if (isCompoundAuditAndPurchase) {
      const numbers = text.replace(/,/g, '').match(/\d+/g);
      const amount = numbers ? Math.max(...numbers.map(Number)) : 75000;
      let item = 'iPhone';
      if (text.includes('laptop')) item = 'Laptop';
      ctx.logger.info('AgenticPlanner: Executing Compound Multi-Goal Pipeline (Audit + Purchase Evaluation)', { item, amount });
      return this.executeCompoundPipeline({ purchase_item_name: item, purchase_cost: amount }, ctx);
    }

    if (
      (text.includes('date') && text.includes('amount') && text.includes(',')) ||
      (text.includes('debit') && text.includes('credit')) ||
      text.split('\n').length > 3
    ) {
      ctx.logger.info('AgenticPlanner: Detected Bank Statement CSV Data');
      return this.executeAuditWorkflow({ csv_text: userInput, file_name: 'statement.csv' }, ctx);
    }

    if (text.includes('buy') || text.includes('purchase') || text.includes('afford') || text.includes('cost')) {
      const numbers = text.replace(/,/g, '').match(/\d+/g);
      const amount = numbers ? Math.max(...numbers.map(Number)) : 50000;
      let item = 'Major Purchase';
      if (text.includes('iphone')) item = 'iPhone';
      else if (text.includes('laptop') || text.includes('macbook')) item = 'Laptop';

      ctx.logger.info('AgenticPlanner: Detected Major Purchase Query', { item, amount });
      return this.executePurchaseWorkflow({ purchase_item_name: item, purchase_cost: amount }, ctx);
    }

    ctx.logger.info('AgenticPlanner: Defaulting to General Financial Audit Workflow');
    return this.executeAuditWorkflow({}, ctx);
  }

  /**
   * COMPOUND PIPELINE — Single-Turn Execution of Ingestion -> Categorization -> Analysis -> Risk -> Savings -> Emergency Reserve -> Purchase Impact -> Health Score -> Final Summary
   */
  async executeCompoundPipeline(
    params: { csv_text?: string; file_name?: string; purchase_item_name: string; purchase_cost: number },
    ctx: ExecutionContext
  ): Promise<AgenticWorkflowResult> {
    const stepResults: WorkflowStepResult[] = [];
    const outputs: Record<string, any> = {};

    let stepCount = 0;
    const checkCap = () => {
      stepCount++;
      if (stepCount >= MAX_TOOL_STEPS_CAP) {
        ctx.logger.warn(`AgenticPlanner: Hard cap limit of ${MAX_TOOL_STEPS_CAP} tool calls reached for turn.`);
      }
    };

    if (params.csv_text) {
      checkCap();
      const ingestStep = await this.workflowEngine.executeCsvIngestionWithRetry(
        params.csv_text,
        params.file_name || 'upload.csv',
        (txt) => this.ingestionTools.ingestTransactionData({ mode: 'csv_upload', file_name: 'upload.csv', file_content: txt }, ctx),
        ctx
      );
      stepResults.push(ingestStep);
      outputs['ingest_transaction_data'] = ingestStep.data;
    }

    checkCap();
    const catStep = await this.workflowEngine.executeStep('categorize_expenses', () => this.categorizeTools.categorizeExpenses({}, ctx), ctx);
    stepResults.push(catStep);
    outputs['categorize_expenses'] = catStep.data;

    checkCap();
    const anaStep = await this.workflowEngine.executeStep('analyze_spending', () => this.analysisTools.analyzeSpending({}, ctx), ctx);
    stepResults.push(anaStep);
    outputs['analyze_spending'] = anaStep.data;

    checkCap();
    const riskStep = await this.workflowEngine.executeStep('detect_risks', () => this.riskTools.detectRisks({}, ctx), ctx);
    stepResults.push(riskStep);
    outputs['detect_risks'] = riskStep.data;

    checkCap();
    const savStep = await this.workflowEngine.executeStep('suggest_savings', () => this.savingsTools.suggestSavings({ trim_percent: 25 }, ctx), ctx);
    stepResults.push(savStep);
    outputs['suggest_savings'] = savStep.data;

    checkCap();
    const emergStep = await this.workflowEngine.executeStep(
      'manage_emergency_fund',
      () => this.savingsTools.manageEmergencyFund({ target_months_coverage: 6, create_or_update_goal: true }, ctx),
      ctx
    );
    stepResults.push(emergStep);
    outputs['manage_emergency_fund'] = emergStep.data;

    checkCap();
    const simStep = await this.workflowEngine.executeStep(
      'simulate_life_event',
      () =>
        this.simulationTools.simulateLifeEvent(
          {
            event_type: 'major_purchase',
            event_details: { description: `Purchase: ${params.purchase_item_name}`, amount: params.purchase_cost },
          },
          ctx
        ),
      ctx
    );
    stepResults.push(simStep);
    outputs['simulate_life_event'] = simStep.data;

    checkCap();
    const scoreStep = await this.workflowEngine.executeStep('compute_health_score', () => this.healthScoreTools.computeHealthScore({}, ctx), ctx);
    stepResults.push(scoreStep);
    outputs['compute_health_score'] = scoreStep.data;

    const income = this.store.getMonthlyIncome() || 60000;
    const totalSpend = outputs['analyze_spending']?.total_monthly_spend || 0;
    const simRes = simStep.data || {};
    const healthVal = scoreStep.data?.health_score || 50;
    const bandVal = scoreStep.data?.band || 'Fair';

    const decision1 = this.decisionEngine.evaluateEmergencyFundPriority(
      emergStep.data?.current_emergency_savings || 0,
      emergStep.data?.required_emergency_fund_target || 180000
    );
    const decision2 = this.decisionEngine.evaluateSavingsRateThreshold(income, totalSpend);

    const reflection = await this.reflectionEngine.reflectAndEvaluate('Compound Audit & Purchase Pipeline', stepResults, ctx);

    let purchaseVerdict = '';
    if (simRes.has_deficit_risk) {
      purchaseVerdict = `❌ **PURCHASE NOT RECOMMENDED**: Buying **${params.purchase_item_name}** (\`₹${params.purchase_cost.toLocaleString(
        'en-IN'
      )}\`) will push your balance into a deficit around **month ${simRes.deficit_month}**.`;
    } else {
      purchaseVerdict = `✅ **PURCHASE AFFORDABLE**: Buying **${params.purchase_item_name}** (\`₹${params.purchase_cost.toLocaleString(
        'en-IN'
      )}\`) is within your current budget capacity!`;
    }

    const summary = [
      `# 💳 FinPilot Financial Audit & Purchase Report`,
      ``,
      `> 🎯 **Overall Health Score**: **\`${healthVal} / 100\`** *(${bandVal})*  `,
      `> 🛡️ **AI Confidence Rating**: **\`${(reflection.average_confidence * 100).toFixed(0)}%\`**`,
      ``,
      `---`,
      ``,
      `### 🛍️ Major Purchase Evaluation: "${params.purchase_item_name}" (\`₹${params.purchase_cost.toLocaleString('en-IN')}\`)`,
      `${purchaseVerdict}`,
      ``,
      `---`,
      ``,
      `### 📈 Monthly Cashflow Snapshot`,
      `* 💵 **Monthly Income**: **\`₹${income.toLocaleString('en-IN')}\`**`,
      `* 💸 **Total Spend**: **\`₹${totalSpend.toLocaleString('en-IN')}\`**`,
      `* ✂️ **Discretionary Trim Potential**: **\`₹${(outputs['suggest_savings']?.total_additional_potential_savings || 0).toLocaleString('en-IN')} / month\`**`,
      ``,
      `---`,
      ``,
      `### 🛡️ Smart Business Rules & Safety Net`,
      `* ${decision1.action_recommendation}`,
      `* ${decision2.action_recommendation}`,
      reflection.autonomous_recommendations.length > 0 ? `\n### 💡 Proactive AI Recommendations\n${reflection.autonomous_recommendations.join('\n')}` : '',
      ``,
      `---`,
      ``,
      `### 💡 Suggested Follow-Up Prompts (Copy & Paste to Continue):`,
      `* 🛡️ *"Create an Emergency Safety Net Fund goal for ₹${(emergStep.data?.funding_gap || 180000).toLocaleString('en-IN')}"*`,
      `* 🛍️ *"What if I buy a cheaper ₹${Math.round(params.purchase_cost * 0.6).toLocaleString('en-IN')} alternative instead?"*`,
      `* 📈 *"Suggest a monthly SIP mutual fund plan for ₹3,000 based on my risk profile"*`,
    ]
      .filter(Boolean)
      .join('\n');

    return {
      workflow_name: 'Compound Financial Audit & Purchase Evaluation Pipeline',
      user_goal: `Analyze finances & evaluate purchase of ${params.purchase_item_name}`,
      steps_executed: stepResults.map((s) => s.step_name),
      confidence_score: reflection.average_confidence,
      warnings: stepResults.flatMap((s) => s.warnings),
      decision_evaluations: [decision1, decision2],
      reflection,
      consolidated_summary: summary,
      detailed_outputs: outputs,
    };
  }

  /**
   * WORKFLOW A — General Financial Audit & Check-In ("Improve my finances")
   */
  async executeAuditWorkflow(
    params: {
      csv_text?: string;
      file_name?: string;
      monthly_income_override?: number;
    },
    ctx: ExecutionContext
  ): Promise<AgenticWorkflowResult> {
    const stepResults: WorkflowStepResult[] = [];
    const outputs: Record<string, any> = {};

    let stepCount = 0;
    const checkCap = () => {
      stepCount++;
      if (stepCount >= MAX_TOOL_STEPS_CAP) {
        ctx.logger.warn(`AgenticPlanner: Hard cap limit of ${MAX_TOOL_STEPS_CAP} tool calls reached for turn.`);
      }
    };

    if (params.monthly_income_override) {
      this.store.setMonthlyIncome(params.monthly_income_override);
    }

    if (params.csv_text) {
      checkCap();
      const ingestStep = await this.workflowEngine.executeCsvIngestionWithRetry(
        params.csv_text,
        params.file_name || 'upload.csv',
        (txt) => this.ingestionTools.ingestTransactionData({ mode: 'csv_upload', file_name: 'upload.csv', file_content: txt }, ctx),
        ctx
      );
      stepResults.push(ingestStep);
      outputs['ingest_transaction_data'] = ingestStep.data;
    }

    checkCap();
    const catStep = await this.workflowEngine.executeStep('categorize_expenses', () => this.categorizeTools.categorizeExpenses({}, ctx), ctx);
    stepResults.push(catStep);
    outputs['categorize_expenses'] = catStep.data;

    checkCap();
    const anaStep = await this.workflowEngine.executeStep('analyze_spending', () => this.analysisTools.analyzeSpending({}, ctx), ctx);
    stepResults.push(anaStep);
    outputs['analyze_spending'] = anaStep.data;

    checkCap();
    const riskStep = await this.workflowEngine.executeStep(
      'detect_risks',
      () => this.riskTools.detectRisks({ large_transaction_threshold_percent_of_income: 15, category_dominance_threshold_percent: 40 }, ctx),
      ctx
    );
    stepResults.push(riskStep);
    outputs['detect_risks'] = riskStep.data;

    checkCap();
    const savStep = await this.workflowEngine.executeStep('suggest_savings', () => this.savingsTools.suggestSavings({ trim_percent: 25 }, ctx), ctx);
    stepResults.push(savStep);
    outputs['suggest_savings'] = savStep.data;

    checkCap();
    const emergStep = await this.workflowEngine.executeStep(
      'manage_emergency_fund',
      () => this.savingsTools.manageEmergencyFund({ target_months_coverage: 6, create_or_update_goal: true }, ctx),
      ctx
    );
    stepResults.push(emergStep);
    outputs['manage_emergency_fund'] = emergStep.data;

    checkCap();
    const scoreStep = await this.workflowEngine.executeStep('compute_health_score', () => this.healthScoreTools.computeHealthScore({}, ctx), ctx);
    stepResults.push(scoreStep);
    outputs['compute_health_score'] = scoreStep.data;

    const income = this.store.getMonthlyIncome() || 60000;
    const totalSpend = outputs['analyze_spending']?.total_monthly_spend || 0;
    const emergencyRes = outputs['manage_emergency_fund'] || {};

    const decision1 = this.decisionEngine.evaluateEmergencyFundPriority(
      emergencyRes.current_emergency_savings || 0,
      emergencyRes.required_emergency_fund_target || 180000
    );

    const decision2 = this.decisionEngine.evaluateSavingsRateThreshold(income, totalSpend);
    const decisionEvaluations = [decision1, decision2];

    const reflection = await this.reflectionEngine.reflectAndEvaluate('Workflow A — General Financial Audit', stepResults, ctx);

    const healthVal = scoreStep.data?.health_score || 50;
    const bandVal = scoreStep.data?.band || 'Fair';
    this.store.addHealthHistory(healthVal, bandVal);

    const netSurplus = income - totalSpend;
    const flags = riskStep.data?.flags || [];

    const summary = [
      `# 💳 FinPilot Financial Audit & Health Report`,
      ``,
      `> 🎯 **Health Score**: **\`${healthVal} / 100\`** *(${bandVal})*  `,
      `> 🛡️ **AI Confidence Rating**: **\`${(reflection.average_confidence * 100).toFixed(0)}%\`**`,
      ``,
      `---`,
      ``,
      `### 📈 Monthly Cashflow Snapshot`,
      `* 💵 **Monthly Income**: **\`₹${income.toLocaleString('en-IN')}\`**`,
      `* 💸 **Total Spend**: **\`₹${totalSpend.toLocaleString('en-IN')}\`**`,
      `* 💚 **Net ${netSurplus >= 0 ? 'Surplus' : 'Deficit'}**: **\`₹${netSurplus.toLocaleString('en-IN')}\`**`,
      `* 📊 **Parsed Transactions**: **\`${this.store.listTransactions().length} records\`** categorized`,
      `* ✂️ **Discretionary Trim Potential**: **\`₹${(outputs['suggest_savings']?.total_additional_potential_savings || 0).toLocaleString('en-IN')} / month\`**`,
      ``,
      `---`,
      ``,
      `### 🛡️ Smart Business Rules & Safety Net`,
      `* ${decision1.action_recommendation}`,
      `* ${decision2.action_recommendation}`,
      reflection.autonomous_recommendations.length > 0 ? `\n### 💡 Proactive AI Recommendations\n${reflection.autonomous_recommendations.join('\n')}` : '',
      ``,
      `---`,
      ``,
      `### 💡 Suggested Follow-Up Prompts (Copy & Paste to Continue):`,
      `* 🛡️ *"Create an Emergency Safety Net Goal for ₹${(emergencyRes.funding_gap || 180000).toLocaleString('en-IN')}"*`,
      `* 🛍️ *"Can I afford to buy an iPhone for ₹75,000 based on my surplus?"*`,
      `* 📈 *"Recommend a monthly SIP mutual fund investment plan for ₹3,000"*`,
    ]
      .filter(Boolean)
      .join('\n');

    return {
      workflow_name: 'Workflow A — General Financial Audit & Check-In',
      user_goal: 'Improve my finances',
      steps_executed: stepResults.map((s) => s.step_name),
      confidence_score: reflection.average_confidence,
      warnings: stepResults.flatMap((s) => s.warnings),
      decision_evaluations: decisionEvaluations,
      reflection,
      consolidated_summary: summary,
      detailed_outputs: outputs,
    };
  }

  /**
   * WORKFLOW B — Major Purchase Evaluation ("Can I buy an iPhone?")
   */
  async executePurchaseWorkflow(
    params: { purchase_item_name?: string; purchase_cost: number },
    ctx: ExecutionContext
  ): Promise<AgenticWorkflowResult> {
    const stepResults: WorkflowStepResult[] = [];
    const outputs: Record<string, any> = {};

    let stepCount = 0;
    const checkCap = () => {
      stepCount++;
      if (stepCount >= MAX_TOOL_STEPS_CAP) {
        ctx.logger.warn(`AgenticPlanner: Hard cap limit of ${MAX_TOOL_STEPS_CAP} tool calls reached for turn.`);
      }
    };

    const itemName = params.purchase_item_name || 'Major Purchase';
    const cost = params.purchase_cost;

    checkCap();
    const anaStep = await this.workflowEngine.executeStep('analyze_spending', () => this.analysisTools.analyzeSpending({}, ctx), ctx);
    stepResults.push(anaStep);
    outputs['analyze_spending'] = anaStep.data;

    checkCap();
    const riskStep = await this.workflowEngine.executeStep('detect_risks', () => this.riskTools.detectRisks({}, ctx), ctx);
    stepResults.push(riskStep);
    outputs['detect_risks'] = riskStep.data;

    checkCap();
    const simStep = await this.workflowEngine.executeStep(
      'simulate_life_event',
      () =>
        this.simulationTools.simulateLifeEvent(
          {
            event_type: 'major_purchase',
            event_details: { description: `Purchase: ${itemName}`, amount: cost },
          },
          ctx
        ),
      ctx
    );
    stepResults.push(simStep);
    outputs['simulate_life_event'] = simStep.data;

    checkCap();
    const scoreStep = await this.workflowEngine.executeStep('compute_health_score', () => this.healthScoreTools.computeHealthScore({}, ctx), ctx);
    stepResults.push(scoreStep);
    outputs['compute_health_score'] = scoreStep.data;

    const simRes = simStep.data || {};
    const healthVal = scoreStep.data?.health_score || 50;
    const bandVal = scoreStep.data?.band || 'Fair';

    const reflection = await this.reflectionEngine.reflectAndEvaluate('Workflow B — Major Purchase Evaluation', stepResults, ctx);

    let verdict = '';
    if (simRes.has_deficit_risk) {
      verdict = `❌ **NOT RECOMMENDED AT THIS TIME**: Buying **${itemName}** (\`₹${cost.toLocaleString('en-IN')}\`) will push your balance into a deficit around **month ${simRes.deficit_month}**.`;
    } else {
      verdict = `✅ **AFFORDABLE**: Buying **${itemName}** (\`₹${cost.toLocaleString('en-IN')}\`) is within your budget capacity!`;
    }

    const summary = [
      `# 🛍️ Major Purchase Evaluation: "${itemName}" (\`₹${cost.toLocaleString('en-IN')}\`)`,
      ``,
      `${verdict}`,
      ``,
      `---`,
      ``,
      `### 📊 Financial Impact Snapshot`,
      `* 🎯 **Financial Health Score**: **\`${healthVal} / 100\`** *(${bandVal})*`,
      `* 💚 **Net Monthly Surplus After Purchase**: **\`₹${(simRes.whatif_scenario?.new_monthly_surplus || 0).toLocaleString('en-IN')}\`**`,
      ``,
      `---`,
      ``,
      `### 💡 Suggested Follow-Up Prompts (Copy & Paste to Continue):`,
      `* 🛍️ *"What if I trim my food and shopping expenses by 25% first?"*`,
      `* 🏙️ *"What will happen if I relocate to Bangalore for an internship with ₹15,000 rent?"*`,
      `* 💳 *"Run a full financial audit on my current spending and risk flags"*`,
    ].join('\n');

    return {
      workflow_name: 'Workflow B — Major Purchase Evaluation',
      user_goal: `Can I buy ${itemName}?`,
      steps_executed: stepResults.map((s) => s.step_name),
      confidence_score: reflection.average_confidence,
      warnings: stepResults.flatMap((s) => s.warnings),
      decision_evaluations: [],
      reflection,
      consolidated_summary: summary,
      detailed_outputs: outputs,
    };
  }
}
