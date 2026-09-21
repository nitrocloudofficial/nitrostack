import { sha256 } from './hash.js';
import type { ApiChange, HttpMethod, OperationKey } from './types.js';

const HTTP_METHODS: HttpMethod[] = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'];

type JsonObject = Record<string, unknown>;

interface NormalizedSchema {
  type?: string;
  nullable: boolean;
  required: Set<string>;
  properties: Map<string, NormalizedSchema>;
  enumValues?: Set<string | number | boolean>;
  items?: NormalizedSchema;
  sourcePointer: string;
}

interface NormalizedParameter {
  name: string;
  location: 'path' | 'query' | 'header';
  required: boolean;
  schema: NormalizedSchema;
  sourcePointer: string;
}

interface NormalizedOperation {
  method: HttpMethod;
  path: string;
  parameters: Map<string, NormalizedParameter>;
  requestSchema?: NormalizedSchema;
  responseSchemas: Map<string, NormalizedSchema>;
  sourcePointer: string;
}

export interface NormalizedApi {
  operations: Map<OperationKey, NormalizedOperation>;
}

export class OpenApiDiffError extends Error {}

function isObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function decodePointerSegment(segment: string): string {
  return segment.replace(/~1/g, '/').replace(/~0/g, '~');
}

export function resolveLocalRef(document: JsonObject, ref: string, visited = new Set<string>()): unknown {
  if (!ref.startsWith('#/')) throw new OpenApiDiffError(`Remote or unsupported reference: ${ref}`);
  if (visited.has(ref)) throw new OpenApiDiffError(`Recursive reference is outside the MVP subset: ${ref}`);
  visited.add(ref);
  let current: unknown = document;
  for (const raw of ref.slice(2).split('/')) {
    const segment = decodePointerSegment(raw);
    if (!isObject(current) || !(segment in current)) throw new OpenApiDiffError(`Invalid local reference: ${ref}`);
    current = current[segment];
  }
  if (isObject(current) && typeof current.$ref === 'string') return resolveLocalRef(document, current.$ref, visited);
  return current;
}

function dereference(document: JsonObject, value: unknown, visited = new Set<string>()): unknown {
  if (isObject(value) && typeof value.$ref === 'string') return resolveLocalRef(document, value.$ref, visited);
  return value;
}

function normaliseSchema(document: JsonObject, input: unknown, pointer: string, visited = new Set<string>()): NormalizedSchema {
  const dereferenced = dereference(document, input, new Set(visited));
  if (!isObject(dereferenced)) {
    return { nullable: false, required: new Set(), properties: new Map(), sourcePointer: pointer };
  }
  const schema = dereferenced;
  const type = typeof schema.type === 'string' ? schema.type : undefined;
  const required = new Set(Array.isArray(schema.required) ? schema.required.filter((v): v is string => typeof v === 'string') : []);
  const properties = new Map<string, NormalizedSchema>();
  if (isObject(schema.properties)) {
    for (const [name, property] of Object.entries(schema.properties)) {
      properties.set(name, normaliseSchema(document, property, `${pointer}/properties/${name}`, new Set(visited)));
    }
  }
  const enumValues = Array.isArray(schema.enum)
    ? new Set(schema.enum.filter((v): v is string | number | boolean => ['string', 'number', 'boolean'].includes(typeof v)))
    : undefined;
  const items = schema.items ? normaliseSchema(document, schema.items, `${pointer}/items`, new Set(visited)) : undefined;
  return {
    type,
    nullable: schema.nullable === true,
    required,
    properties,
    enumValues,
    items,
    sourcePointer: pointer
  };
}

function normaliseParameters(document: JsonObject, input: unknown[], pointer: string): Map<string, NormalizedParameter> {
  const result = new Map<string, NormalizedParameter>();
  input.forEach((raw, index) => {
    const value = dereference(document, raw);
    if (!isObject(value) || typeof value.name !== 'string' || !['path', 'query', 'header'].includes(String(value.in))) return;
    const location = value.in as 'path' | 'query' | 'header';
    result.set(`${location}:${value.name}`, {
      name: value.name,
      location,
      required: value.required === true,
      schema: normaliseSchema(document, value.schema, `${pointer}/${index}/schema`),
      sourcePointer: `${pointer}/${index}`
    });
  });
  return result;
}

function mergeParameters(a: Map<string, NormalizedParameter>, b: Map<string, NormalizedParameter>): Map<string, NormalizedParameter> {
  return new Map([...a, ...b]);
}

function pickJsonSchema(document: JsonObject, content: unknown, pointer: string): NormalizedSchema | undefined {
  if (!isObject(content)) return undefined;
  const preferred = isObject(content['application/json']) ? content['application/json'] : Object.values(content).find(isObject);
  if (!isObject(preferred) || !preferred.schema) return undefined;
  return normaliseSchema(document, preferred.schema, `${pointer}/schema`);
}

function normaliseOperation(document: JsonObject, path: string, method: HttpMethod, pathItem: JsonObject, operation: JsonObject): NormalizedOperation {
  const pathParameters = Array.isArray(pathItem.parameters) ? pathItem.parameters : [];
  const operationParameters = Array.isArray(operation.parameters) ? operation.parameters : [];
  const pointer = `/paths/${path.replaceAll('/', '~1')}/${method}`;
  const parameters = mergeParameters(
    normaliseParameters(document, pathParameters, `/paths/${path.replaceAll('/', '~1')}/parameters`),
    normaliseParameters(document, operationParameters, `${pointer}/parameters`)
  );
  const requestBody = dereference(document, operation.requestBody);
  const requestSchema = isObject(requestBody) ? pickJsonSchema(document, requestBody.content, `${pointer}/requestBody/content/application~1json`) : undefined;
  const responseSchemas = new Map<string, NormalizedSchema>();
  if (isObject(operation.responses)) {
    for (const [status, raw] of Object.entries(operation.responses)) {
      const response = dereference(document, raw);
      if (!isObject(response)) continue;
      const schema = pickJsonSchema(document, response.content, `${pointer}/responses/${status}/content/application~1json`);
      if (schema) responseSchemas.set(status, schema);
    }
  }
  return { method, path, parameters, requestSchema, responseSchemas, sourcePointer: pointer };
}

export function normaliseOpenApi(document: JsonObject): NormalizedApi {
  if (typeof document.openapi !== 'string' || !document.openapi.startsWith('3.0.')) {
    throw new OpenApiDiffError('Only OpenAPI 3.0 JSON documents are supported.');
  }
  if (!isObject(document.paths)) throw new OpenApiDiffError('OpenAPI document must contain a paths object.');
  const operations = new Map<OperationKey, NormalizedOperation>();
  for (const [path, rawPathItem] of Object.entries(document.paths)) {
    const pathItem = dereference(document, rawPathItem);
    if (!isObject(pathItem)) continue;
    for (const method of HTTP_METHODS) {
      const rawOperation = pathItem[method];
      if (!isObject(rawOperation)) continue;
      const key = `${method.toUpperCase()} ${path}` as OperationKey;
      operations.set(key, normaliseOperation(document, path, method, pathItem, rawOperation));
    }
  }
  return { operations };
}

function changeId(parts: unknown[]): string {
  return `chg_${sha256(parts).slice(0, 12)}`;
}

function compareEnums(baseline: NormalizedSchema, candidate: NormalizedSchema, context: CompareContext): ApiChange[] {
  if (!baseline.enumValues || !candidate.enumValues) return [];
  const removed = [...baseline.enumValues].filter((value) => !candidate.enumValues!.has(value));
  const added = [...candidate.enumValues].filter((value) => !baseline.enumValues!.has(value));
  const changes: ApiChange[] = [];

  if (removed.length) {
    const breaking = context.location === 'request';
    changes.push({
      id: changeId([context.operation, context.jsonPath, 'ENUM_NARROWED', removed]),
      code: 'ENUM_NARROWED', breaking, operation: context.operation, location: context.location,
      jsonPath: context.jsonPath, before: [...baseline.enumValues], after: [...candidate.enumValues],
      rationale: context.location === 'request'
        ? `Previously valid request enum values were removed: ${removed.join(', ')}.`
        : `Response enum values were removed. This narrows server output and is normally backward compatible for consumers.`,
      sourcePointers: { baseline: baseline.sourcePointer, candidate: candidate.sourcePointer }
    });
  }

  if (added.length) {
    const breaking = context.location === 'response';
    changes.push({
      id: changeId([context.operation, context.jsonPath, 'ENUM_WIDENED', added]),
      code: 'ENUM_WIDENED', breaking, operation: context.operation, location: context.location,
      jsonPath: context.jsonPath, before: [...baseline.enumValues], after: [...candidate.enumValues],
      rationale: context.location === 'response'
        ? `New response enum values may break exhaustive consumer handling: ${added.join(', ')}.`
        : `The request enum accepts additional values and remains backward compatible for existing consumers.`,
      sourcePointers: { baseline: baseline.sourcePointer, candidate: candidate.sourcePointer }
    });
  }

  return changes;
}

interface CompareContext {
  operation: string;
  location: 'request' | 'response';
  jsonPath: string;
}

function compareSchemas(baseline: NormalizedSchema, candidate: NormalizedSchema, context: CompareContext): ApiChange[] {
  const changes: ApiChange[] = [];
  if (baseline.type && candidate.type && baseline.type !== candidate.type) {
    changes.push({
      id: changeId([context.operation, context.jsonPath, 'PROPERTY_TYPE_CHANGED', baseline.type, candidate.type]),
      code: 'PROPERTY_TYPE_CHANGED', breaking: true, operation: context.operation, location: context.location,
      jsonPath: context.jsonPath, before: baseline.type, after: candidate.type,
      rationale: `The consumer-visible schema type changed from ${baseline.type} to ${candidate.type}.`,
      sourcePointers: { baseline: baseline.sourcePointer, candidate: candidate.sourcePointer }
    });
    return changes;
  }
  for (const name of baseline.required) {
    if (!candidate.properties.has(name)) {
      const oldProp = baseline.properties.get(name);
      changes.push({
        id: changeId([context.operation, context.jsonPath, 'REQUIRED_PROPERTY_REMOVED', name]),
        code: 'REQUIRED_PROPERTY_REMOVED', breaking: true, operation: context.operation, location: context.location,
        jsonPath: `${context.jsonPath}.${name}`, before: oldProp?.type, rationale: `Required property ${name} was removed.`,
        sourcePointers: { baseline: oldProp?.sourcePointer ?? baseline.sourcePointer, candidate: candidate.sourcePointer }
      });
    }
  }
  for (const [name, candidateProp] of candidate.properties) {
    const baselineProp = baseline.properties.get(name);
    if (!baselineProp) {
      const newlyRequired = candidate.required.has(name);
      changes.push({
        id: changeId([context.operation, context.jsonPath, newlyRequired ? 'PROPERTY_BECAME_REQUIRED' : 'OPTIONAL_PROPERTY_ADDED', name]),
        code: newlyRequired ? 'PROPERTY_BECAME_REQUIRED' : 'OPTIONAL_PROPERTY_ADDED',
        breaking: newlyRequired && context.location === 'request', operation: context.operation, location: context.location,
        jsonPath: `${context.jsonPath}.${name}`, after: candidateProp.type,
        rationale: newlyRequired
          ? (context.location === 'request'
            ? `New required request property ${name} may break existing callers.`
            : `New required response property ${name} adds output and is normally backward compatible for consumers.`)
          : `Optional property ${name} was added and is backward compatible.`,
        sourcePointers: { candidate: candidateProp.sourcePointer }
      });
      continue;
    }
    if (!baseline.required.has(name) && candidate.required.has(name)) {
      changes.push({
        id: changeId([context.operation, context.jsonPath, 'PROPERTY_BECAME_REQUIRED', name]),
        code: 'PROPERTY_BECAME_REQUIRED', breaking: context.location === 'request', operation: context.operation, location: context.location,
        jsonPath: `${context.jsonPath}.${name}`, rationale: context.location === 'request'
          ? `Request property ${name} changed from optional to required.`
          : `Response property ${name} changed from optional to required; this does not remove information from consumers.`,
        sourcePointers: { baseline: baselineProp.sourcePointer, candidate: candidateProp.sourcePointer }
      });
    }
    changes.push(...compareSchemas(baselineProp, candidateProp, { ...context, jsonPath: `${context.jsonPath}.${name}` }));
  }
  changes.push(...compareEnums(baseline, candidate, context));
  if (baseline.items && candidate.items) changes.push(...compareSchemas(baseline.items, candidate.items, { ...context, jsonPath: `${context.jsonPath}[]` }));
  return changes;
}

function preferredResponse(operation: NormalizedOperation): NormalizedSchema | undefined {
  return operation.responseSchemas.get('200') ?? operation.responseSchemas.get('201') ?? operation.responseSchemas.get('default') ?? [...operation.responseSchemas.values()][0];
}

export function diffOpenApi(baselineDocument: JsonObject, candidateDocument: JsonObject): ApiChange[] {
  const baseline = normaliseOpenApi(baselineDocument);
  const candidate = normaliseOpenApi(candidateDocument);
  const changes: ApiChange[] = [];
  for (const [key, oldOperation] of baseline.operations) {
    const nextOperation = candidate.operations.get(key);
    if (!nextOperation) {
      changes.push({
        id: changeId([key, 'OPERATION_REMOVED']), code: 'OPERATION_REMOVED', breaking: true,
        operation: key, location: 'operation', rationale: `Operation ${key} was removed.`,
        sourcePointers: { baseline: oldOperation.sourcePointer }
      });
      continue;
    }
    for (const [parameterKey, oldParameter] of oldOperation.parameters) {
      const nextParameter = nextOperation.parameters.get(parameterKey);
      if (!nextParameter) {
        changes.push({
          id: changeId([key, parameterKey, 'PARAMETER_REMOVED']), code: 'PARAMETER_REMOVED', breaking: true,
          operation: key, location: oldParameter.location, jsonPath: `${oldParameter.location}.${oldParameter.name}`,
          rationale: `Parameter ${oldParameter.name} was removed.`, sourcePointers: { baseline: oldParameter.sourcePointer }
        });
      } else if (!oldParameter.required && nextParameter.required) {
        changes.push({
          id: changeId([key, parameterKey, 'PARAMETER_BECAME_REQUIRED']), code: 'PARAMETER_BECAME_REQUIRED', breaking: true,
          operation: key, location: oldParameter.location, jsonPath: `${oldParameter.location}.${oldParameter.name}`,
          rationale: `Parameter ${oldParameter.name} became required.`,
          sourcePointers: { baseline: oldParameter.sourcePointer, candidate: nextParameter.sourcePointer }
        });
      }
    }
    if (oldOperation.requestSchema && nextOperation.requestSchema) {
      changes.push(...compareSchemas(oldOperation.requestSchema, nextOperation.requestSchema, { operation: key, location: 'request', jsonPath: '$request' }));
    }
    const oldResponse = preferredResponse(oldOperation);
    const nextResponse = preferredResponse(nextOperation);
    if (oldResponse && nextResponse) changes.push(...compareSchemas(oldResponse, nextResponse, { operation: key, location: 'response', jsonPath: '$response' }));
  }
  return changes.sort((a, b) => `${a.operation}:${a.jsonPath}:${a.code}`.localeCompare(`${b.operation}:${b.jsonPath}:${b.code}`));
}
