import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * The manifest is hand-authored: `nitrostack-cli build` does not derive it from
 * the widget's `defineWidgetMetadata`, so an empty `widgets: []` is a valid
 * build and the only symptom is a quiet "Loaded 0 widget(s) from manifest" and
 * a Studio preview with no examples.
 */

// `src/widgets` is excluded from the TypeScript build, so this test lives in
// the compiled tree and reads the manifest from the project root instead.
const manifestPath = resolve(process.cwd(), 'src/widgets/widget-manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

test('the widget manifest actually describes the compute-offer widget', () => {
  assert.ok(Array.isArray(manifest.widgets));
  assert.ok(manifest.widgets.length > 0, 'manifest lists no widgets');

  const widget = manifest.widgets.find((w: { uri: string }) => w.uri === '/compute-offer');
  assert.ok(widget, 'no /compute-offer widget in the manifest');
  assert.ok(widget.name && widget.description);
  assert.ok(widget.examples.length >= 3, 'expected an example per decision kind');
});

test('every manifest example is a renderable negotiation result', () => {
  const widget = manifest.widgets.find((w: { uri: string }) => w.uri === '/compute-offer');

  for (const example of widget.examples) {
    assert.ok(example.name, 'example has no name');
    assert.ok(example.data, `${example.name}: no data`);

    const { decision, denials, offer } = example.data;
    assert.ok(['exact', 'counter_offer', 'denied'].includes(decision));
    assert.ok(Array.isArray(denials), `${example.name}: denials must be an array`);

    // The widget reads offer.attestation unconditionally when an offer exists,
    // so an example without one renders as a crash rather than a preview.
    if (decision === 'denied') {
      assert.equal(offer, undefined, `${example.name}: a denial must carry no offer`);
      assert.ok(denials.length > 0, `${example.name}: a denial needs reasons`);
    } else {
      assert.ok(offer, `${example.name}: a grant needs an offer`);
      assert.ok(offer.attestation, `${example.name}: offer needs an attestation`);
      assert.ok(offer.granted, `${example.name}: offer needs a granted envelope`);
      assert.ok(Array.isArray(offer.deltas));
    }
  }

  const kinds = widget.examples.map((e: { data: { decision: string } }) => e.data.decision);
  assert.deepEqual([...kinds].sort(), ['counter_offer', 'denied', 'exact']);
});
