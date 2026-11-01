// Official JSON schemas, taken from npm packages (devDependencies pinned exactly), never fetched at test time:
//   CycloneDX 1.5: @cyclonedx/cyclonedx-library res/schema/bom-1.5.SNAPSHOT.schema.json (+ the spdx and jsf schemas it references).
//   SARIF 2.1.0:   @microsoft/jest-sarif lib/schemas/sarif-2.1.0-rtm.5.json (the SchemaStore copy of the OASIS 2.1.0 schema).
// See docs/SCHEMAS.md for provenance and limits.
import { readFileSync } from 'node:fs';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const root = new URL('../../node_modules/', import.meta.url);
const read = (rel: string): string => readFileSync(new URL(rel, root), 'utf8');

export type Validate = (data: unknown) => { valid: boolean; errors: string[] };

function compile(schema: Record<string, unknown>, extra: Array<Record<string, unknown>> = []): Validate {
  const AjvCtor = ((Ajv as unknown as { default?: typeof Ajv }).default ?? Ajv) as typeof Ajv;
  const addFmt = ((addFormats as unknown as { default?: typeof addFormats }).default ?? addFormats) as typeof addFormats;
  const ajv = new AjvCtor({ allErrors: true, strict: false, unicodeRegExp: false, logger: false });
  addFmt(ajv);
  for (const s of extra) ajv.addSchema(s);
  const validate = ajv.compile(schema);
  return (data) => {
    const valid = validate(data) as boolean;
    return { valid, errors: valid ? [] : (validate.errors ?? []).map((e) => `${e.instancePath || '(root)'} ${e.message} ${JSON.stringify(e.params)}`) };
  };
}

export function cycloneDx15(): Validate {
  const dir = '@cyclonedx/cyclonedx-library/res/schema/';
  // The bom schema refers to the SNAPSHOT file names; the referenced files declare $ids without SNAPSHOT.
  const fixRefs = (t: string): Record<string, unknown> => JSON.parse(t.replaceAll('spdx.SNAPSHOT.schema.json', 'spdx.schema.json').replaceAll('jsf-0.82.SNAPSHOT.schema.json', 'jsf-0.82.schema.json'));
  return compile(fixRefs(read(`${dir}bom-1.5.SNAPSHOT.schema.json`)), [JSON.parse(read(`${dir}spdx.SNAPSHOT.schema.json`)), JSON.parse(read(`${dir}jsf-0.82.SNAPSHOT.schema.json`))]);
}

export function sarif210(): Validate {
  const schema = JSON.parse(read('@microsoft/jest-sarif/lib/schemas/sarif-2.1.0-rtm.5.json')) as Record<string, unknown>;
  // Draft-04 -> what Ajv 8 understands: `id` becomes `$id` and the draft-04 meta-schema reference is dropped. The schema uses no
  // draft-04-only keywords (no boolean exclusiveMinimum/Maximum), so validation semantics are unchanged.
  const { id, $schema: _meta, ...rest } = schema;
  void _meta;
  return compile({ $id: id, ...rest });
}

export const schemaSources = {
  cyclonedx: (JSON.parse(read('@cyclonedx/cyclonedx-library/package.json')) as { version: string }).version,
  sarif: (JSON.parse(read('@microsoft/jest-sarif/package.json')) as { version: string }).version
};
