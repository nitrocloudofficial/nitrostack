import { createHash, timingSafeEqual } from 'node:crypto';
import { Injectable } from '@nitrostack/core';
import { loadAnalysisLimits, type AnalysisLimits } from '../../config/environment.js';
import { DatasetsService } from '../datasets/datasets.service.js';
import type { TargetDisplay } from '../datasets/datasets.types.js';
import {
  type AnalysisPlan,
  type ConfirmAnalysisPlanResponse,
  type CreateAnalysisPlanInput,
  type CreateAnalysisPlanResponse,
  type TaskType,
} from './analysis.schemas.js';
import { PlanTokenService } from './plan-token.service.js';

type Cell = string | undefined;
type ColumnKind = 'numeric' | 'categorical' | 'datetime' | 'text' | 'empty';

interface CsvTable {
  headers: string[];
  rows: Array<Record<string, Cell>>;
}

interface ColumnInspection {
  name: string;
  kind: ColumnKind;
  uniqueValues: string[];
  missingCount: number;
  numericRange?: { min: number; max: number };
  isIdentifier: boolean;
  isConstant: boolean;
}

export class AnalysisPlanError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AnalysisPlanError';
  }
}

@Injectable({ deps: [DatasetsService, PlanTokenService] })
export class AnalysisService {
  constructor(
    private readonly datasets: DatasetsService,
    private readonly tokenService: PlanTokenService,
    private readonly limits: AnalysisLimits = loadAnalysisLimits(),
  ) {}

  async create(input: CreateAnalysisPlanInput): Promise<CreateAnalysisPlanResponse> {
    this.assertUnique(input.featureColumns, 'Feature columns must not contain duplicates.');
    const csv = await this.datasets.readCsv(input.datasetId);
    const table = parseCsv(csv.toString('utf8'));
    const plan = this.validatePlan(table, input);
    const { token, expiresAt } = this.tokenService.issueReview(plan, hashDataset(csv));
    return { plan, reviewToken: token, expiresAt };
  }

  async confirm(reviewToken: string): Promise<ConfirmAnalysisPlanResponse> {
    const reviewed = await this.prepareToken(reviewToken, 'review');
    const execution = this.tokenService.issueExecution(reviewed.signedPlan);
    return {
      approved: true,
      plan: reviewed.plan,
      executionToken: execution.token,
      expiresAt: execution.expiresAt,
    };
  }

  async prepareRun(executionToken: string): Promise<{ plan: AnalysisPlan; csv: Buffer; expiresAt: string; targetDisplay?: TargetDisplay }> {
    const prepared = await this.prepareToken(executionToken, 'execution');
    return {
      plan: prepared.plan,
      csv: prepared.csv,
      expiresAt: prepared.expiresAt,
      targetDisplay: await this.targetDisplayFor(prepared.plan),
    };
  }

  /**
   * Only applies when the dataset declares a display for exactly the column
   * being predicted. Units are never guessed from a column name.
   */
  private async targetDisplayFor(plan: AnalysisPlan): Promise<TargetDisplay | undefined> {
    const dataset = await this.datasets.get(plan.datasetId);
    return dataset.targetDisplay?.column === plan.targetColumn ? dataset.targetDisplay : undefined;
  }

  private async prepareToken(
    token: string,
    expectedPurpose: 'review' | 'execution',
  ): Promise<{ signedPlan: ReturnType<PlanTokenService['verify']>; plan: AnalysisPlan; csv: Buffer; expiresAt: string }> {
    const signedPlan = this.tokenService.verify(token);
    if (signedPlan.purpose !== expectedPurpose) {
      if (expectedPurpose === 'execution') {
        throw new AnalysisPlanError('Explicit user approval is required before this analysis can run. Confirm the review token first.');
      }
      throw new AnalysisPlanError('An execution token cannot be confirmed again. Create a new analysis plan.');
    }
    const csv = await this.datasets.readCsv(signedPlan.plan.datasetId);
    if (!constantTimeEqual(hashDataset(csv), signedPlan.datasetHash)) {
      throw new AnalysisPlanError('The selected dataset has changed. Create and approve a new analysis plan.');
    }
    return {
      signedPlan,
      plan: signedPlan.plan,
      csv,
      expiresAt: new Date(signedPlan.expiresAt).toISOString(),
    };
  }

  private validatePlan(table: CsvTable, input: CreateAnalysisPlanInput): AnalysisPlan {
    if (input.predictionRows.length > this.limits.maxPredictionRows) {
      throw new AnalysisPlanError(`A maximum of ${this.limits.maxPredictionRows} prediction row(s) can be analysed at once.`);
    }
    if (!table.headers.includes(input.targetColumn)) {
      throw new AnalysisPlanError(`Target column '${input.targetColumn}' does not exist in this dataset.`);
    }
    for (const feature of input.featureColumns) {
      if (!table.headers.includes(feature)) {
        throw new AnalysisPlanError(`Feature column '${feature}' does not exist in this dataset.`);
      }
      if (feature === input.targetColumn) {
        throw new AnalysisPlanError('The target column cannot also be a feature.');
      }
    }

    const rowsWithTarget = table.rows.filter((row) => !isMissing(row[input.targetColumn]));
    const missingTarget = table.rows.length - rowsWithTarget.length;
    if (rowsWithTarget.length < this.limits.minUsableRows) {
      throw new AnalysisPlanError(`At least ${this.limits.minUsableRows} rows with a target value are required.`);
    }

    const target = inspectColumn(input.targetColumn, rowsWithTarget.map((row) => row[input.targetColumn]), rowsWithTarget.length, this.limits.maxCategoricalValues);
    this.validateTarget(target, input.taskType, rowsWithTarget);

    const inspections = new Map<string, ColumnInspection>();
    for (const header of table.headers) {
      inspections.set(header, inspectColumn(header, rowsWithTarget.map((row) => row[header]), rowsWithTarget.length, this.limits.maxCategoricalValues));
    }

    const numericFeatures: string[] = [];
    const categoricalFeatures: string[] = [];
    const assumptions: string[] = [];
    let encodedFeatures = 0;
    for (const feature of input.featureColumns) {
      const inspection = inspections.get(feature)!;
      if (inspection.isIdentifier) {
        throw new AnalysisPlanError(`Feature column '${feature}' appears to be an identifier and cannot be used.`);
      }
      if (inspection.kind === 'empty' || inspection.isConstant) {
        throw new AnalysisPlanError(`Feature column '${feature}' has no usable variation.`);
      }
      if (inspection.kind === 'datetime' || inspection.kind === 'text') {
        throw new AnalysisPlanError(`Feature column '${feature}' is unsupported for the MVP.`);
      }
      if (inspection.kind === 'numeric') {
        numericFeatures.push(feature);
        encodedFeatures += 1;
        if (inspection.uniqueValues.length <= 10) {
          assumptions.push(`Numeric feature '${feature}' has a small number of distinct values and will be treated as continuous.`);
        }
      } else {
        if (inspection.uniqueValues.length > this.limits.maxCategoricalValues) {
          throw new AnalysisPlanError(`Feature column '${feature}' exceeds the ${this.limits.maxCategoricalValues}-category limit.`);
        }
        categoricalFeatures.push(feature);
        encodedFeatures += inspection.uniqueValues.length;
      }
    }
    if (encodedFeatures > this.limits.maxEncodedFeatures) {
      throw new AnalysisPlanError(`Selected features would create ${encodedFeatures} encoded features, above the ${this.limits.maxEncodedFeatures} limit.`);
    }

    const predictionWarnings = this.validatePredictionRows(input.predictionRows, input.featureColumns, inspections);
    const warnings: string[] = [...predictionWarnings];
    if (rowsWithTarget.length < this.limits.smallDatasetWarningRows) {
      warnings.push(`Only ${rowsWithTarget.length} usable row(s) are available; estimates may be unstable for this small dataset.`);
    }
    warnings.push(
      'Selected features may omit important explanatory factors; results describe associations, not causes.',
      'Historical data may reflect bias or unequal outcomes; do not use this result as the sole basis for high-impact decisions.',
    );
    if (missingTarget) {
      warnings.push(`${missingTarget} row(s) with a missing target will be excluded before training.`);
    }
    const missingFeatures = input.featureColumns.filter((feature) => (inspections.get(feature)?.missingCount ?? 0) > 0);
    if (missingFeatures.length) {
      warnings.push(`Missing values in ${missingFeatures.join(', ')} will be imputed using the approved preprocessing.`);
    }
    const duplicateRows = countDuplicateRows(table.rows, table.headers);
    if (duplicateRows) {
      warnings.push(`${duplicateRows} exact duplicate row(s) will remain in the dataset unless a later plan changes that choice.`);
    }

    return {
      datasetId: input.datasetId,
      question: input.question,
      targetColumn: input.targetColumn,
      featureColumns: [...input.featureColumns],
      taskType: input.taskType,
      predictionRows: input.predictionRows.map((row) => ({ ...row })),
      preprocessing: {
        numeric: numericFeatures,
        categorical: categoricalFeatures,
        numericImputer: 'median',
        numericScaler: 'standard',
        categoricalImputer: 'most_frequent',
        categoricalEncoder: 'one_hot',
      },
      rows: { dataset: table.rows.length, missingTarget, usable: rowsWithTarget.length },
      excludedColumns: this.excludedColumns(table.headers, input, inspections),
      assumptions,
      warnings,
      split: { trainingPercent: 80, testPercent: 20, randomState: 42 },
    };
  }

  private validateTarget(target: ColumnInspection, taskType: TaskType, rows: Array<Record<string, Cell>>): void {
    if (target.isIdentifier || target.kind === 'empty' || target.isConstant || target.kind === 'datetime' || target.kind === 'text') {
      throw new AnalysisPlanError(`Target column '${target.name}' is not eligible for supervised learning.`);
    }
    if (taskType === 'regression') {
      if (target.kind !== 'numeric' || target.uniqueValues.length < 5) {
        throw new AnalysisPlanError('Regression requires a numeric target with at least five distinct values.');
      }
      return;
    }

    const classCounts = new Map<string, number>();
    for (const row of rows) {
      const value = row[target.name]!;
      classCounts.set(value, (classCounts.get(value) ?? 0) + 1);
    }
    if (classCounts.size < 2 || classCounts.size > this.limits.maxClassificationClasses) {
      throw new AnalysisPlanError(`Classification requires a target with between 2 and ${this.limits.maxClassificationClasses} classes.`);
    }
    if ([...classCounts.values()].some((count) => count < 2)) {
      throw new AnalysisPlanError('Each classification target class needs at least two usable rows.');
    }
    const testRows = Math.ceil(rows.length * 0.2);
    if (testRows < classCounts.size || rows.length - testRows < classCounts.size) {
      throw new AnalysisPlanError('This dataset is too small to create a stratified classification split.');
    }
  }

  private validatePredictionRows(
    predictionRows: CreateAnalysisPlanInput['predictionRows'],
    featureColumns: string[],
    inspections: Map<string, ColumnInspection>,
  ): string[] {
    const warnings: string[] = [];
    for (const [index, row] of predictionRows.entries()) {
      const suppliedColumns = Object.keys(row);
      if (suppliedColumns.length !== featureColumns.length || suppliedColumns.some((column) => !featureColumns.includes(column))) {
        throw new AnalysisPlanError(`Prediction row ${index + 1} must contain exactly the selected feature columns.`);
      }
      for (const feature of featureColumns) {
        const value = row[feature];
        if (value === undefined || (typeof value === 'string' && !value.trim())) {
          throw new AnalysisPlanError(`Prediction row ${index + 1} is missing '${feature}'.`);
        }
        const inspection = inspections.get(feature)!;
        if (inspection.kind === 'numeric' && (typeof value === 'boolean' || !Number.isFinite(Number(value)))) {
          throw new AnalysisPlanError(`Prediction row ${index + 1} must provide a numeric value for '${feature}'.`);
        }
        if (inspection.kind === 'numeric' && inspection.numericRange && (Number(value) < inspection.numericRange.min || Number(value) > inspection.numericRange.max)) {
          warnings.push(`Prediction row ${index + 1} is outside the observed dataset range for '${feature}'; the final result will disclose its training-range coverage.`);
        }
        if (inspection.kind === 'categorical' && !inspection.uniqueValues.includes(String(value))) {
          warnings.push(`Prediction row ${index + 1} contains an unseen category for '${feature}'; the model will ignore that category during one-hot encoding.`);
        }
      }
    }
    return [...new Set(warnings)];
  }

  private excludedColumns(
    headers: string[],
    input: CreateAnalysisPlanInput,
    inspections: Map<string, ColumnInspection>,
  ): Array<{ name: string; reason: string }> {
    return headers
      .filter((header) => header !== input.targetColumn && !input.featureColumns.includes(header))
      .flatMap((header) => {
        const inspection = inspections.get(header)!;
        if (inspection.isIdentifier) return [{ name: header, reason: 'Identifier-like columns are excluded from model features.' }];
        if (inspection.kind === 'datetime') return [{ name: header, reason: 'Datetime columns are not supported in the MVP.' }];
        if (inspection.kind === 'text') return [{ name: header, reason: 'Free-text columns are not supported in the MVP.' }];
        if (inspection.kind === 'empty' || inspection.isConstant) return [{ name: header, reason: 'Columns without usable variation are excluded.' }];
        return [];
      });
  }

  private assertUnique(values: string[], message: string): void {
    if (new Set(values).size !== values.length) throw new AnalysisPlanError(message);
  }
}

function parseCsv(content: string): CsvTable {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let atFieldStart = true;

  const finishField = () => {
    row.push(field.trim());
    field = '';
    atFieldStart = true;
  };
  const finishRow = () => {
    finishField();
    if (row.some((value) => value.length)) rows.push(row);
    row = [];
  };

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index]!;
    if (inQuotes) {
      if (character === '"' && content[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        inQuotes = false;
      } else {
        field += character;
      }
      continue;
    }
    if (character === '"' && atFieldStart) {
      inQuotes = true;
      atFieldStart = false;
    } else if (character === ',') {
      finishField();
    } else if (character === '\n') {
      finishRow();
    } else if (character !== '\r') {
      field += character;
      atFieldStart = false;
    }
  }
  if (inQuotes) throw new AnalysisPlanError('CSV contains an unterminated quoted value.');
  if (field.length || row.length) finishRow();
  const [header, ...dataRows] = rows;
  if (!header?.length || header.some((column) => !column) || new Set(header).size !== header.length) {
    throw new AnalysisPlanError('CSV must have unique, non-empty column names.');
  }
  if (!dataRows.length) throw new AnalysisPlanError('CSV must contain at least one data row.');
  return {
    headers: header,
    rows: dataRows.map((values, rowIndex) => {
      if (values.length !== header.length) throw new AnalysisPlanError(`CSV row ${rowIndex + 2} does not match the header width.`);
      return Object.fromEntries(header.map((column, index) => [column, values[index] || undefined]));
    }),
  };
}

function inspectColumn(name: string, values: Cell[], rowCount: number, maxCategoricalValues: number): ColumnInspection {
  const present = values.filter((value): value is string => !isMissing(value));
  const uniqueValues = [...new Set(present)];
  const kind = inferColumnKind(present, uniqueValues.length, maxCategoricalValues);
  return {
    name,
    kind,
    uniqueValues,
    missingCount: values.length - present.length,
    numericRange: kind === 'numeric' ? { min: Math.min(...present.map(Number)), max: Math.max(...present.map(Number)) } : undefined,
    isIdentifier: isIdentifier(name, kind, present.length, uniqueValues.length, rowCount),
    isConstant: uniqueValues.length <= 1,
  };
}

function inferColumnKind(values: string[], uniqueCount: number, maxCategoricalValues: number): ColumnKind {
  if (!values.length) return 'empty';
  if (values.every((value) => Number.isFinite(Number(value)))) return 'numeric';
  if (values.every((value) => isDateLike(value))) return 'datetime';
  return uniqueCount <= maxCategoricalValues ? 'categorical' : 'text';
}

function isIdentifier(name: string, kind: ColumnKind, nonMissing: number, unique: number, rows: number): boolean {
  const normalized = name.toLowerCase();
  if (/(^id$|_id$|^id_|identifier|uuid|guid)/.test(normalized)) return true;
  return kind !== 'numeric' && rows > 0 && nonMissing / rows >= 0.9 && unique / nonMissing >= 0.9;
}

function isDateLike(value: string): boolean {
  return /^\d{1,4}[-/]\d{1,2}[-/]\d{1,4}$/.test(value) && !Number.isNaN(Date.parse(value));
}

function isMissing(value: Cell): value is undefined {
  return value === undefined || !value.trim();
}

function countDuplicateRows(rows: Array<Record<string, Cell>>, headers: string[]): number {
  const seen = new Set<string>();
  let duplicates = 0;
  for (const row of rows) {
    const serialized = JSON.stringify(headers.map((header) => row[header] ?? null));
    if (seen.has(serialized)) duplicates += 1;
    seen.add(serialized);
  }
  return duplicates;
}

function hashDataset(csv: Buffer): string {
  return createHash('sha256').update(csv).digest('hex');
}

function constantTimeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}
