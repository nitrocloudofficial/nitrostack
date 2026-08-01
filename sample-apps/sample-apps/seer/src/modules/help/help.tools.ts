import { ExecutionContext, Injectable, ToolDecorator as Tool, z } from '@nitrostack/core';
import { loadAnalysisLimits, type AnalysisLimits } from '../../config/environment.js';
import { DatasetsService } from '../datasets/datasets.service.js';
import { seerHelpResponseSchema } from './help.schemas.js';

const exampleQuestions: Record<string, string> = {
  'employee-compensation': 'What annual salary is estimated for an engineer with ten years of experience in Bengaluru?',
  'employee-attrition': 'Is an employee with two years of tenure and high monthly hours likely to leave?',
  iris: 'Which iris species is estimated from these flower measurements?',
  titanic: 'What survival category is estimated from this passenger information?',
  wine: 'Which wine cultivar is estimated from these chemical measurements?',
  'auto-mpg': 'What fuel economy is estimated for this vehicle?',
};

@Injectable({ deps: [DatasetsService] })
export class HelpTools {
  constructor(
    private readonly datasets: DatasetsService,
    private readonly limits: AnalysisLimits = loadAnalysisLimits(),
  ) {}

  @Tool({
    name: 'seer_help',
    description: 'Explain what Seer can answer, which datasets are approved, the order its tools must be called in, and the limits it enforces. Call this when the user asks what Seer can do, which data is available, or how to begin.',
    inputSchema: z.object({}).strict(),
    outputSchema: seerHelpResponseSchema,
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: false,
    },
  })
  async help(_input: Record<string, never>, context: ExecutionContext) {
    const catalogue = await this.datasets.list();
    context.logger.info('Help requested', { datasets: catalogue.length, requestId: context.requestId });

    return {
      summary: 'Seer answers a predictive question about an approved CSV dataset by fitting a simple, fully disclosed supervised-learning model. It profiles the data, proposes a plan you must explicitly approve, then trains, evaluates, and explains the result.',
      datasets: catalogue.map((dataset) => ({
        id: dataset.id,
        name: dataset.name,
        description: dataset.description,
        taskTypes: dataset.taskHints,
        rows: dataset.rows,
        columns: dataset.columns,
        exampleQuestion: exampleQuestions[dataset.id] ?? `What can Seer estimate from ${dataset.name}?`,
      })),
      workflow: [
        { step: 1, tool: 'profile_dataset', action: 'Profile the chosen dataset to see its schema, quality, and eligible columns.' },
        { step: 2, tool: 'create_analysis_plan', action: 'Propose a target, features, and prediction rows using only columns the profile returned.' },
        { step: 3, tool: null, action: 'Present the plan with its assumptions and warnings, and obtain the user’s explicit approval.' },
        { step: 4, tool: 'confirm_analysis_plan', action: 'Exchange the review token for an execution token once the user has approved.' },
        { step: 5, tool: 'run_analysis', action: 'Train and evaluate the approved plan, then present metrics, predictions, and limitations.' },
      ],
      capabilities: {
        regression: 'Linear regression for a continuous numeric target, compared against a mean baseline.',
        classification: 'Logistic regression for a label target, compared against a most-frequent-class baseline.',
        preprocessing: 'Median imputation and standard scaling for numeric features; most-frequent imputation and one-hot encoding for categorical features.',
        evaluation: 'An 80/20 train and test split with a fixed random seed, reported alongside diagnostic charts and training-range coverage.',
      },
      limits: {
        maxPredictionRows: this.limits.maxPredictionRows,
        minUsableRows: this.limits.minUsableRows,
        maxCategoricalValuesPerFeature: this.limits.maxCategoricalValues,
        maxEncodedFeatures: this.limits.maxEncodedFeatures,
        maxClassificationClasses: this.limits.maxClassificationClasses,
      },
      outOfScope: [
        'User uploads and database sources; only the approved packaged datasets can be analysed.',
        'Time-series, free-text, and image data.',
        'Deep learning, hyperparameter optimisation, and arbitrary Python execution.',
        'Model persistence; nothing is saved or reused after an analysis.',
      ],
      responsibleUse: [
        'Results are estimates drawn from historical synthetic data, never guarantees.',
        'Selected features may omit important explanatory factors; results describe associations, not causes.',
        'Historical data may reflect bias or unequal outcomes; do not use a result as the sole basis for high-impact decisions.',
      ],
    };
  }
}
