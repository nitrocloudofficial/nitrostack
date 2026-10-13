import test from 'node:test';
import assert from 'node:assert/strict';
import { diffOpenApi } from '../../src/domain/openapi-diff.js';

const baseline = {
  openapi: '3.0.3',
  paths: {
    '/u': {
      get: {
        responses: {
          '200': {
            description: 'ok',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } }
          }
        }
      }
    }
  },
  components: {
    schemas: {
      User: {
        type: 'object',
        required: ['id', 'name', 'status'],
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          status: { type: 'string', enum: ['active', 'inactive'] }
        }
      }
    }
  }
};

const candidate = {
  openapi: '3.0.3',
  paths: {
    '/u': {
      get: {
        responses: {
          '200': {
            description: 'ok',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } }
          }
        }
      }
    }
  },
  components: {
    schemas: {
      User: {
        type: 'object',
        required: ['id', 'status'],
        properties: {
          id: { type: 'string' },
          fullName: { type: 'string' },
          status: { type: 'string', enum: ['active', 'inactive', 'suspended'] }
        }
      }
    }
  }
};

test('semantic OpenAPI subset detects removal, type change, response enum widening and safe addition', () => {
  const changes = diffOpenApi(baseline as any, candidate as any);
  assert.ok(changes.some((change) => change.code === 'REQUIRED_PROPERTY_REMOVED' && change.jsonPath === '$response.name' && change.breaking));
  assert.ok(changes.some((change) => change.code === 'PROPERTY_TYPE_CHANGED' && change.jsonPath === '$response.id' && change.breaking));
  assert.ok(changes.some((change) => change.code === 'ENUM_WIDENED' && change.jsonPath === '$response.status' && change.breaking));
  assert.ok(changes.some((change) => change.code === 'OPTIONAL_PROPERTY_ADDED' && change.jsonPath === '$response.fullName' && !change.breaking));
});

test('request enum narrowing is breaking while response enum narrowing is not', () => {
  const oldDoc = {
    openapi: '3.0.3',
    paths: {
      '/u': {
        post: {
          requestBody: { content: { 'application/json': { schema: { type: 'string', enum: ['a', 'b'] } } } },
          responses: { '200': { description: 'ok', content: { 'application/json': { schema: { type: 'string', enum: ['a', 'b'] } } } } }
        }
      }
    }
  };
  const newDoc = {
    openapi: '3.0.3',
    paths: {
      '/u': {
        post: {
          requestBody: { content: { 'application/json': { schema: { type: 'string', enum: ['a'] } } } },
          responses: { '200': { description: 'ok', content: { 'application/json': { schema: { type: 'string', enum: ['a'] } } } } }
        }
      }
    }
  };
  const changes = diffOpenApi(oldDoc as any, newDoc as any);
  assert.ok(changes.some((change) => change.code === 'ENUM_NARROWED' && change.location === 'request' && change.breaking));
  assert.ok(changes.some((change) => change.code === 'ENUM_NARROWED' && change.location === 'response' && !change.breaking));
});
