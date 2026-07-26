/**
 * Knowledge Graph Agent — Component 1: Data Ingestion
 * 
 * Receives raw JSON payloads from the Explorer Agent.
 * Validates schema, deduplicates, and creates exploration records.
 */

import { v4 as uuidv4 } from 'uuid';
import { getStore } from './database';
import { ExplorerPayload, Exploration, Project } from './models';

/**
 * Validates that the incoming payload has the minimum required fields
 * to be processed by the pipeline.
 */
export function validatePayload(payload: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!isRecord(payload)) {
    return { valid: false, errors: ['Payload must be a non-null object'] };
  }

  const p = payload;

  if (!isNonEmptyString(p.project_id)) {
    errors.push('Missing or invalid "project_id" (string required)');
  }

  if (!isRecord(p.page)) {
    errors.push('Missing or invalid "page" object');
  } else {
    const page = p.page;
    if (!isNonEmptyString(page.title)) {
      errors.push('Missing or invalid "page.title" (string required)');
    }
    if (!isNonEmptyString(page.url)) {
      errors.push('Missing or invalid "page.url" (string required)');
    }
    validateOptionalString(page, 'route', 'page.route', errors);
    validateOptionalString(page, 'screenshot_path', 'page.screenshot_path', errors);
  }

  validateOptionalString(p, 'exploration_id', 'exploration_id', errors);
  validateOptionalString(p, 'timestamp', 'timestamp', errors);

  if (p.metadata !== undefined && !isRecord(p.metadata)) {
    errors.push('Invalid "metadata" (object required when provided)');
  }

  validateUIElements(p.buttons, 'buttons', errors);
  validateUIElements(p.links, 'links', errors);
  validateForms(p.forms, errors);
  validateDialogs(p.dialogs, errors);
  validateSections(p.sections, errors);
  validateFeatures(p.features, errors);
  validateWorkflows(p.workflows, errors);

  return { valid: errors.length === 0, errors };
}

const UI_ELEMENT_TYPES = new Set([
  'button',
  'link',
  'input',
  'select',
  'checkbox',
  'toggle',
  'tab',
  'menu_item',
  'icon',
  'dropdown',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function validateOptionalString(
  object: Record<string, unknown>,
  key: string,
  path: string,
  errors: string[]
): void {
  if (object[key] !== undefined && typeof object[key] !== 'string') {
    errors.push(`Invalid "${path}" (string required when provided)`);
  }
}

function validateArray(
  value: unknown,
  path: string,
  errors: string[]
): value is unknown[] {
  if (value === undefined) return false;
  if (!Array.isArray(value)) {
    errors.push(`Invalid "${path}" (array required when provided)`);
    return false;
  }
  return true;
}

function validateUIElements(value: unknown, path: string, errors: string[]): void {
  if (!validateArray(value, path, errors)) return;

  value.forEach((element, index) => {
    const itemPath = `${path}[${index}]`;
    if (!isRecord(element)) {
      errors.push(`Invalid "${itemPath}" (object required)`);
      return;
    }

    if (typeof element.type !== 'string' || !UI_ELEMENT_TYPES.has(element.type)) {
      errors.push(`Invalid "${itemPath}.type" (unsupported UI element type)`);
    }
    if (!isNonEmptyString(element.label)) {
      errors.push(`Missing or invalid "${itemPath}.label" (string required)`);
    }
    validateOptionalString(element, 'selector', `${itemPath}.selector`, errors);
    validateOptionalString(element, 'action', `${itemPath}.action`, errors);
    validateOptionalString(element, 'target', `${itemPath}.target`, errors);
    if (element.visible !== undefined && typeof element.visible !== 'boolean') {
      errors.push(`Invalid "${itemPath}.visible" (boolean required when provided)`);
    }
  });
}

function validateForms(value: unknown, errors: string[]): void {
  if (!validateArray(value, 'forms', errors)) return;

  value.forEach((form, formIndex) => {
    const formPath = `forms[${formIndex}]`;
    if (!isRecord(form)) {
      errors.push(`Invalid "${formPath}" (object required)`);
      return;
    }

    if (!isNonEmptyString(form.name)) {
      errors.push(`Missing or invalid "${formPath}.name" (string required)`);
    }
    validateOptionalString(form, 'selector', `${formPath}.selector`, errors);
    validateOptionalString(form, 'submit_button', `${formPath}.submit_button`, errors);
    validateOptionalString(form, 'action_url', `${formPath}.action_url`, errors);

    if (!validateArray(form.fields, `${formPath}.fields`, errors)) return;

    form.fields.forEach((field, fieldIndex) => {
      const fieldPath = `${formPath}.fields[${fieldIndex}]`;
      if (!isRecord(field)) {
        errors.push(`Invalid "${fieldPath}" (object required)`);
        return;
      }
      if (!isNonEmptyString(field.name)) {
        errors.push(`Missing or invalid "${fieldPath}.name" (string required)`);
      }
      if (!isNonEmptyString(field.type)) {
        errors.push(`Missing or invalid "${fieldPath}.type" (string required)`);
      }
      validateOptionalString(field, 'selector', `${fieldPath}.selector`, errors);
      validateOptionalString(field, 'placeholder', `${fieldPath}.placeholder`, errors);
      if (field.required !== undefined && typeof field.required !== 'boolean') {
        errors.push(`Invalid "${fieldPath}.required" (boolean required when provided)`);
      }
    });
  });
}

function validateDialogs(value: unknown, errors: string[]): void {
  if (!validateArray(value, 'dialogs', errors)) return;

  value.forEach((dialog, index) => {
    const path = `dialogs[${index}]`;
    if (!isRecord(dialog)) {
      errors.push(`Invalid "${path}" (object required)`);
      return;
    }
    if (!isNonEmptyString(dialog.name)) {
      errors.push(`Missing or invalid "${path}.name" (string required)`);
    }
    validateOptionalString(dialog, 'selector', `${path}.selector`, errors);
    validateOptionalString(dialog, 'trigger', `${path}.trigger`, errors);
  });
}

function validateSections(value: unknown, errors: string[]): void {
  if (!validateArray(value, 'sections', errors)) return;

  value.forEach((section, index) => {
    const path = `sections[${index}]`;
    if (!isRecord(section)) {
      errors.push(`Invalid "${path}" (object required)`);
      return;
    }
    if (!isNonEmptyString(section.name)) {
      errors.push(`Missing or invalid "${path}.name" (string required)`);
    }
    validateOptionalString(section, 'selector', `${path}.selector`, errors);
  });
}

function validateFeatures(value: unknown, errors: string[]): void {
  if (!validateArray(value, 'features', errors)) return;

  value.forEach((feature, index) => {
    const path = `features[${index}]`;
    if (!isRecord(feature)) {
      errors.push(`Invalid "${path}" (object required)`);
      return;
    }
    if (!isNonEmptyString(feature.name)) {
      errors.push(`Missing or invalid "${path}.name" (string required)`);
    }
    validateOptionalString(feature, 'description', `${path}.description`, errors);
    validateOptionalString(feature, 'category', `${path}.category`, errors);
  });
}

function validateWorkflows(value: unknown, errors: string[]): void {
  if (!validateArray(value, 'workflows', errors)) return;

  value.forEach((workflow, workflowIndex) => {
    const workflowPath = `workflows[${workflowIndex}]`;
    if (!isRecord(workflow)) {
      errors.push(`Invalid "${workflowPath}" (object required)`);
      return;
    }
    if (!isNonEmptyString(workflow.name)) {
      errors.push(`Missing or invalid "${workflowPath}.name" (string required)`);
    }
    if (!Array.isArray(workflow.steps)) {
      errors.push(`Invalid "${workflowPath}.steps" (array required)`);
      return;
    }

    const stepNumbers = new Set<number>();
    workflow.steps.forEach((step, stepIndex) => {
      const stepPath = `${workflowPath}.steps[${stepIndex}]`;
      if (!isRecord(step)) {
        errors.push(`Invalid "${stepPath}" (object required)`);
        return;
      }
      const stepNumber = step.step_number;
      if (
        typeof stepNumber !== 'number' ||
        !Number.isInteger(stepNumber) ||
        stepNumber < 1
      ) {
        errors.push(`Invalid "${stepPath}.step_number" (positive integer required)`);
      } else if (stepNumbers.has(stepNumber)) {
        errors.push(`Duplicate "${stepPath}.step_number" in workflow`);
      } else {
        stepNumbers.add(stepNumber);
      }
      if (!isNonEmptyString(step.action)) {
        errors.push(`Missing or invalid "${stepPath}.action" (string required)`);
      }
      validateOptionalString(step, 'target_selector', `${stepPath}.target_selector`, errors);
      validateOptionalString(step, 'target_label', `${stepPath}.target_label`, errors);
      validateOptionalString(step, 'value', `${stepPath}.value`, errors);
      validateOptionalString(step, 'page_url', `${stepPath}.page_url`, errors);
      validateOptionalString(step, 'screenshot_path', `${stepPath}.screenshot_path`, errors);
    });
  });
}

/**
 * Ensures the project exists in the database. Creates it if not found.
 */
export function ensureProject(projectId: string, baseUrl?: string): void {
  const store = getStore();
  const existing = store.findById('projects', projectId);

  if (!existing) {
    const now = new Date().toISOString();
    const project: Project = {
      id: projectId,
      name: projectId,
      description: `Auto-created project: ${projectId}`,
      base_url: baseUrl,
      created_at: now,
      updated_at: now,
    };
    store.insert('projects', projectId, project);
    console.log(`[Ingest] Created project: ${projectId}`);
  }
}

/**
 * Ingests a single Explorer payload.
 * 
 * 1. Validates the payload schema
 * 2. Ensures the project exists
 * 3. Creates an exploration record with the raw payload
 * 4. Returns the exploration_id for pipeline chaining
 */
export function ingestPayload(payload: unknown): {
  exploration_id: string;
  project_id: string;
  success: boolean;
  errors: string[];
} {
  // Step 1: Validate
  const validation = validatePayload(payload);
  if (!validation.valid) {
    console.error('[Ingest] Validation failed:', validation.errors);
    return {
      exploration_id: '',
      project_id: isRecord(payload) && typeof payload.project_id === 'string'
        ? payload.project_id
        : '',
      success: false,
      errors: validation.errors,
    };
  }

  const validPayload = payload as ExplorerPayload;
  const store = getStore();
  const explorationId = validPayload.exploration_id || uuidv4();
  const projectId = validPayload.project_id;

  // Step 2: Ensure project exists
  ensureProject(projectId, validPayload.page.url);

  // Step 3: Store raw exploration
  try {
    const exploration: Exploration = {
      id: explorationId,
      project_id: projectId,
      raw_payload: JSON.stringify(validPayload),
      status: 'processing',
      pages_discovered: 1,
      nodes_created: 0,
      edges_created: 0,
      created_at: new Date().toISOString(),
    };

    store.insert('explorations', explorationId, exploration);
    console.log(`[Ingest] Exploration ${explorationId} ingested for project ${projectId}`);

    return {
      exploration_id: explorationId,
      project_id: projectId,
      success: true,
      errors: [],
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Ingest] Failed to store exploration:', message);
    return {
      exploration_id: explorationId,
      project_id: projectId,
      success: false,
      errors: [message],
    };
  }
}

/**
 * Updates the exploration record after pipeline processing completes.
 */
export function completeExploration(
  explorationId: string,
  stats: { nodes_created: number; edges_created: number },
  status: 'completed' | 'failed' = 'completed'
): void {
  const store = getStore();
  store.update('explorations', explorationId, {
    status,
    nodes_created: stats.nodes_created,
    edges_created: stats.edges_created,
    completed_at: new Date().toISOString(),
  } as Partial<Exploration>);
  console.log(`[Ingest] Exploration ${explorationId} marked as ${status}`);
}

/**
 * Retrieves an exploration record by ID.
 */
export function getExploration(explorationId: string): Exploration | undefined {
  return getStore().findById('explorations', explorationId);
}

/**
 * Lists all explorations for a project, ordered by most recent first.
 */
export function listExplorations(projectId: string): Exploration[] {
  return getStore()
    .findBy('explorations', (e) => e.project_id === projectId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}
