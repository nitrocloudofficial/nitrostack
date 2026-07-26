/**
 * Knowledge Graph Agent — Component 2: Entity Extractor
 * 
 * Converts raw Explorer payloads into typed KnowledgeNode objects.
 * Each node gets a deterministic key for deduplication and future versioning.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  ExplorerPayload,
  ExplorerUIElement,
  ExplorerForm,
  KnowledgeNode,
  NodeType,
  UIElementSubtype,
  generateNodeKey,
} from './models';

/**
 * Extract all entities from an Explorer payload into KnowledgeNode objects.
 * This is the main entry point for entity extraction.
 */
export function extractEntities(
  payload: ExplorerPayload,
  explorationId: string
): KnowledgeNode[] {
  const nodes: KnowledgeNode[] = [];
  const now = new Date().toISOString();
  const projectId = payload.project_id;

  // 1. Extract the page itself as a node
  const pageNode = extractPage(payload, explorationId, now);
  nodes.push(pageNode);

  // 2. Extract buttons
  if (payload.buttons?.length) {
    nodes.push(...extractButtons(payload.buttons, projectId, explorationId, payload.page.url, now));
  }

  // 3. Extract links
  if (payload.links?.length) {
    nodes.push(...extractLinks(payload.links, projectId, explorationId, payload.page.url, now));
  }

  // 4. Extract forms
  if (payload.forms?.length) {
    nodes.push(...extractForms(payload.forms, projectId, explorationId, payload.page.url, now));
    nodes.push(...extractApiEndpoints(payload.forms, projectId, explorationId, now));
  }

  // 5. Extract dialogs
  if (payload.dialogs?.length) {
    nodes.push(...extractDialogs(payload.dialogs, projectId, explorationId, payload.page.url, now));
  }

  // 6. Extract sections
  if (payload.sections?.length) {
    nodes.push(...extractSections(payload.sections, projectId, explorationId, payload.page.url, now));
  }

  // 7. Extract features
  if (payload.features?.length) {
    nodes.push(...extractFeatures(payload.features, projectId, explorationId, payload.page.url, now));
  }

  console.log(`[Entities] Extracted ${nodes.length} nodes from page "${payload.page.title}"`);
  return nodes;
}

/**
 * Extract the page itself as a PAGE node.
 */
function extractPage(
  payload: ExplorerPayload,
  explorationId: string,
  now: string
): KnowledgeNode {
  const projectId = payload.project_id;
  const pageUrl = payload.page.url;
  const canonicalPath = payload.page.route || pageUrl;

  return {
    id: uuidv4(),
    node_key: generateNodeKey(projectId, NodeType.PAGE, canonicalPath),
    project_id: projectId,
    exploration_id: explorationId,
    node_type: NodeType.PAGE,
    label: payload.page.title,
    description: `Page at ${pageUrl}`,
    page_url: pageUrl,
    selector: undefined,
    metadata: JSON.stringify({
      route: payload.page.route,
      screenshot_path: payload.page.screenshot_path,
    }),
    created_at: now,
    updated_at: now,
  };
}

/**
 * Extract button elements as UI_ELEMENT nodes.
 */
function extractButtons(
  buttons: ExplorerUIElement[],
  projectId: string,
  explorationId: string,
  pageUrl: string,
  now: string
): KnowledgeNode[] {
  return buttons.map((btn) => {
    const canonicalPath = `${pageUrl}::button::${btn.selector || btn.label}`;
    return {
      id: uuidv4(),
      node_key: generateNodeKey(projectId, NodeType.UI_ELEMENT, canonicalPath),
      project_id: projectId,
      exploration_id: explorationId,
      node_type: NodeType.UI_ELEMENT,
      subtype: UIElementSubtype.BUTTON,
      label: btn.label,
      description: `Button "${btn.label}" on ${pageUrl}`,
      page_url: pageUrl,
      selector: btn.selector,
      metadata: JSON.stringify({
        action: btn.action,
        target: btn.target,
        visible: btn.visible,
      }),
      created_at: now,
      updated_at: now,
    };
  });
}

/**
 * Extract link elements as UI_ELEMENT nodes.
 */
function extractLinks(
  links: ExplorerUIElement[],
  projectId: string,
  explorationId: string,
  pageUrl: string,
  now: string
): KnowledgeNode[] {
  return links.map((link) => {
    const canonicalPath = `${pageUrl}::link::${link.selector || link.label}`;
    return {
      id: uuidv4(),
      node_key: generateNodeKey(projectId, NodeType.UI_ELEMENT, canonicalPath),
      project_id: projectId,
      exploration_id: explorationId,
      node_type: NodeType.UI_ELEMENT,
      subtype: UIElementSubtype.LINK,
      label: link.label,
      description: `Link "${link.label}" on ${pageUrl}`,
      page_url: pageUrl,
      selector: link.selector,
      metadata: JSON.stringify({
        action: link.action,
        target: link.target,
        visible: link.visible,
      }),
      created_at: now,
      updated_at: now,
    };
  });
}

/**
 * Extract form elements as FORM nodes (with child INPUT_FIELD nodes).
 */
function extractForms(
  forms: ExplorerForm[],
  projectId: string,
  explorationId: string,
  pageUrl: string,
  now: string
): KnowledgeNode[] {
  const nodes: KnowledgeNode[] = [];

  for (const form of forms) {
    const canonicalPath = `${pageUrl}::form::${form.selector || form.name}`;
    
    // The form node itself
    nodes.push({
      id: uuidv4(),
      node_key: generateNodeKey(projectId, NodeType.FORM, canonicalPath),
      project_id: projectId,
      exploration_id: explorationId,
      node_type: NodeType.FORM,
      label: form.name,
      description: `Form "${form.name}" on ${pageUrl}`,
      page_url: pageUrl,
      selector: form.selector,
      metadata: JSON.stringify({
        submit_button: form.submit_button,
        action_url: form.action_url,
        field_count: form.fields?.length || 0,
      }),
      created_at: now,
      updated_at: now,
    });

    // Individual form fields as INPUT_FIELD nodes
    if (form.fields?.length) {
      for (const field of form.fields) {
        const fieldPath = `${pageUrl}::form::${form.name}::field::${field.selector || field.name}`;
        nodes.push({
          id: uuidv4(),
          node_key: generateNodeKey(projectId, NodeType.INPUT_FIELD, fieldPath),
          project_id: projectId,
          exploration_id: explorationId,
          node_type: NodeType.INPUT_FIELD,
          label: field.name,
          description: `Field "${field.name}" in form "${form.name}"`,
          page_url: pageUrl,
          selector: field.selector,
          metadata: JSON.stringify({
            field_type: field.type,
            required: field.required,
            placeholder: field.placeholder,
            parent_form: form.name,
          }),
          created_at: now,
          updated_at: now,
        });
      }
    }
  }

  return nodes;
}

/**
 * Extract unique API endpoint nodes from form action URLs.
 *
 * An endpoint is a project-level resource, rather than a UI element.  Its
 * deterministic key is based on the action URL so forms on different pages
 * that submit to the same API resolve to one shared endpoint node.
 */
function extractApiEndpoints(
  forms: ExplorerForm[],
  projectId: string,
  explorationId: string,
  now: string
): KnowledgeNode[] {
  const endpointsByUrl = new Map<string, KnowledgeNode>();

  for (const form of forms) {
    const actionUrl = normalizeActionUrl(form.action_url);
    if (!actionUrl || endpointsByUrl.has(actionUrl)) {
      continue;
    }

    endpointsByUrl.set(actionUrl, {
      id: uuidv4(),
      node_key: generateNodeKey(projectId, NodeType.API_ENDPOINT, actionUrl),
      project_id: projectId,
      exploration_id: explorationId,
      node_type: NodeType.API_ENDPOINT,
      label: actionUrl,
      description: `API endpoint ${actionUrl}`,
      metadata: JSON.stringify({ action_url: actionUrl }),
      created_at: now,
      updated_at: now,
    });
  }

  return [...endpointsByUrl.values()];
}

/**
 * Extract dialog/modal elements as DIALOG nodes.
 */
function extractDialogs(
  dialogs: Array<{ name: string; selector?: string; trigger?: string }>,
  projectId: string,
  explorationId: string,
  pageUrl: string,
  now: string
): KnowledgeNode[] {
  return dialogs.map((dialog) => {
    const canonicalPath = `${pageUrl}::dialog::${dialog.selector || dialog.name}`;
    return {
      id: uuidv4(),
      node_key: generateNodeKey(projectId, NodeType.DIALOG, canonicalPath),
      project_id: projectId,
      exploration_id: explorationId,
      node_type: NodeType.DIALOG,
      label: dialog.name,
      description: `Dialog "${dialog.name}" on ${pageUrl}`,
      page_url: pageUrl,
      selector: dialog.selector,
      metadata: JSON.stringify({ trigger: dialog.trigger }),
      created_at: now,
      updated_at: now,
    };
  });
}

/**
 * Extract page sections as SECTION nodes.
 */
function extractSections(
  sections: Array<{ name: string; selector?: string }>,
  projectId: string,
  explorationId: string,
  pageUrl: string,
  now: string
): KnowledgeNode[] {
  return sections.map((section) => {
    const canonicalPath = `${pageUrl}::section::${section.selector || section.name}`;
    return {
      id: uuidv4(),
      node_key: generateNodeKey(projectId, NodeType.SECTION, canonicalPath),
      project_id: projectId,
      exploration_id: explorationId,
      node_type: NodeType.SECTION,
      label: section.name,
      description: `Section "${section.name}" on ${pageUrl}`,
      page_url: pageUrl,
      selector: section.selector,
      metadata: undefined,
      created_at: now,
      updated_at: now,
    };
  });
}

/**
 * Extract application features as FEATURE nodes.
 */
function extractFeatures(
  features: Array<{ name: string; description?: string; category?: string }>,
  projectId: string,
  explorationId: string,
  pageUrl: string,
  now: string
): KnowledgeNode[] {
  return features.map((feature) => {
    const canonicalPath = `${pageUrl}::feature::${feature.name}`;
    return {
      id: uuidv4(),
      node_key: generateNodeKey(projectId, NodeType.FEATURE, canonicalPath),
      project_id: projectId,
      exploration_id: explorationId,
      node_type: NodeType.FEATURE,
      label: feature.name,
      description: feature.description || `Feature: ${feature.name}`,
      page_url: pageUrl,
      selector: undefined,
      metadata: JSON.stringify({ category: feature.category }),
      created_at: now,
      updated_at: now,
    };
  });
}

/**
 * Ignore empty action URLs and use one stable representation everywhere that
 * identifies an endpoint.
 */
function normalizeActionUrl(actionUrl?: string): string | undefined {
  const normalized = actionUrl?.trim();
  return normalized || undefined;
}
