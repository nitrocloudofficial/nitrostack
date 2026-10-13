/**
 * The bundled demo projects — GENERATED, do not edit by hand.
 *
 * Written by `scripts/embed_fixtures.mjs` from the JSON in `fixtures/`. This app
 * deploys as a lone folder, so a student's own artifacts arrive as tool arguments
 * and these are the fallback that makes the demo a single call with nothing to
 * upload.
 *
 * Three projects, three provenance levels — `authored`, `observed`, `git` — which
 * is what makes the confidence score demonstrably derived rather than tuned.
 *
 * To change any of these, edit the JSON under `fixtures/` and re-run:
 *
 *   node scripts/embed_fixtures.mjs
 */

/* eslint-disable */
import { parsePlan, type Plan } from '../../shared/plan.js';
import { parseBuild, type Build } from './build.js';

export const DEMO_PLAN_JSON: Record<string, string> = {
  "event-ingest": `{
  "schema": "lumina.plan/v1",
  "name": "Idempotent event ingest",
  "planId": "wf-event-ingest-fixture",
  "nodes": [
    {
      "id": "n-receive",
      "type": "component",
      "label": "receive",
      "position": {
        "x": 0,
        "y": 160
      },
      "data": {
        "label": "receive",
        "component": "receive",
        "intent": "The webhook hands me the event as it arrived. Platform owns this — my boundary."
      }
    },
    {
      "id": "n-dedupe",
      "type": "component",
      "label": "deduplicate",
      "position": {
        "x": 260,
        "y": 160
      },
      "data": {
        "label": "deduplicate",
        "component": "deduplicate",
        "intent": "Have I seen this id before? Must run on the event AS SENT, before anything reshapes it."
      }
    },
    {
      "id": "n-normalise",
      "type": "component",
      "label": "normalise",
      "position": {
        "x": 520,
        "y": 160
      },
      "data": {
        "label": "normalise",
        "component": "normalise",
        "intent": "Map a known-new event onto the table's columns and fill in defaults."
      }
    },
    {
      "id": "n-persist",
      "type": "component",
      "label": "persist",
      "position": {
        "x": 780,
        "y": 160
      },
      "data": {
        "label": "persist",
        "component": "persist",
        "intent": "One row, written idempotently so a crash cannot duplicate it."
      }
    }
  ],
  "edges": [
    {
      "id": "e1",
      "source": "n-receive",
      "target": "n-dedupe",
      "sourceHandle": "output",
      "targetHandle": "input"
    },
    {
      "id": "e2",
      "source": "n-dedupe",
      "target": "n-normalise",
      "sourceHandle": "output",
      "targetHandle": "input"
    },
    {
      "id": "e3",
      "source": "n-normalise",
      "target": "n-persist",
      "sourceHandle": "output",
      "targetHandle": "input"
    }
  ],
  "order": [
    "n-receive",
    "n-dedupe",
    "n-normalise",
    "n-persist"
  ],
  "entry": [
    "n-receive"
  ],
  "terminal": [
    "n-persist"
  ],
  "cyclic": false,
  "warnings": []
}`,
  "pricing": `{
  "schema": "lumina.plan/v1",
  "name": "Pricing service",
  "planId": "wf-pricing-fixture",
  "nodes": [
    {
      "id": "n-validate",
      "type": "component",
      "label": "validate",
      "position": {
        "x": 0,
        "y": 160
      },
      "data": {
        "label": "validate",
        "component": "validate",
        "intent": "Reject malformed carts before any money is computed."
      }
    },
    {
      "id": "n-discount",
      "type": "component",
      "label": "discount",
      "position": {
        "x": 260,
        "y": 160
      },
      "data": {
        "label": "discount",
        "component": "discount",
        "intent": "Apply the discount code to the subtotal."
      }
    },
    {
      "id": "n-tax",
      "type": "component",
      "label": "tax",
      "position": {
        "x": 520,
        "y": 160
      },
      "data": {
        "label": "tax",
        "component": "tax",
        "intent": "Tax the DISCOUNTED amount. Must run after discount."
      }
    },
    {
      "id": "n-total",
      "type": "component",
      "label": "total",
      "position": {
        "x": 780,
        "y": 160
      },
      "data": {
        "label": "total",
        "component": "total",
        "intent": "Sum and round to 2dp."
      }
    }
  ],
  "edges": [
    {
      "id": "e1",
      "source": "n-validate",
      "target": "n-discount",
      "sourceHandle": "output",
      "targetHandle": "input"
    },
    {
      "id": "e2",
      "source": "n-discount",
      "target": "n-tax",
      "sourceHandle": "output",
      "targetHandle": "input"
    },
    {
      "id": "e3",
      "source": "n-tax",
      "target": "n-total",
      "sourceHandle": "output",
      "targetHandle": "input"
    }
  ],
  "order": [
    "n-validate",
    "n-discount",
    "n-tax",
    "n-total"
  ],
  "entry": [
    "n-validate"
  ],
  "terminal": [
    "n-total"
  ],
  "cyclic": false,
  "warnings": []
}`,
  "safety-gear": `{
  "schema": "lumina.plan/v1",
  "name": "Site safety-gear check",
  "planId": "wf-safety-gear-fixture",
  "nodes": [
    {
      "id": "n-camera",
      "type": "component",
      "label": "camera feed",
      "position": {
        "x": 0,
        "y": 160
      },
      "data": {
        "label": "camera feed",
        "component": "camera feed",
        "intent": "Frames arrive here. Platform owns this — I only read it."
      }
    },
    {
      "id": "n-person",
      "type": "component",
      "label": "detect person",
      "position": {
        "x": 260,
        "y": 160
      },
      "data": {
        "label": "detect person",
        "component": "detect person",
        "intent": "Find the people in the frame. No people, no decision to make."
      }
    },
    {
      "id": "n-helmet",
      "type": "component",
      "label": "check helmet",
      "position": {
        "x": 520,
        "y": 160
      },
      "data": {
        "label": "check helmet",
        "component": "check helmet",
        "intent": "Per person: helmet or no helmet. MUST run before anything alerts."
      }
    },
    {
      "id": "n-alert",
      "type": "component",
      "label": "alert",
      "position": {
        "x": 780,
        "y": 160
      },
      "data": {
        "label": "alert",
        "component": "alert",
        "intent": "One alert per person established as not wearing a helmet."
      }
    }
  ],
  "edges": [
    {
      "id": "e1",
      "source": "n-camera",
      "target": "n-person",
      "sourceHandle": "output",
      "targetHandle": "input"
    },
    {
      "id": "e2",
      "source": "n-person",
      "target": "n-helmet",
      "sourceHandle": "output",
      "targetHandle": "input"
    },
    {
      "id": "e3",
      "source": "n-helmet",
      "target": "n-alert",
      "sourceHandle": "output",
      "targetHandle": "input"
    }
  ],
  "order": [
    "n-camera",
    "n-person",
    "n-helmet",
    "n-alert"
  ],
  "entry": [
    "n-camera"
  ],
  "terminal": [
    "n-alert"
  ],
  "cyclic": false,
  "warnings": []
}`,
};

export const DEMO_BUILD_JSON: Record<string, string> = {
  "event-ingest": `{
  "schema": "mentor.build/v1",
  "project": "event-ingest",
  "planRef": "plan.lumina.json",
  "entry": "build/ingest.js",
  "tests": "build/ingest.test.js",
  "provenance": "git",
  "derivedFrom": "git log --follow build/ingest.js, first touch per component",
  "steps": [
    {
      "seq": 1,
      "at": "T+00m",
      "component": "normalise",
      "kind": "implement",
      "file": "build/ingest.js",
      "line": 12,
      "summary": "Mapped the incoming event onto the table's columns and applied defaults.",
      "note": "Plan puts normalise second, after deduplicate. Built first. This is the drift — from here on, every comparison downstream sees the reshaped event rather than the one the sender actually sent."
    },
    {
      "seq": 2,
      "at": "T+16m",
      "component": "deduplicate",
      "kind": "implement",
      "file": "build/ingest.js",
      "line": 31,
      "summary": "Checked for a previously seen event — but against the normalised form, because that was what existed by then."
    },
    {
      "seq": 3,
      "at": "T+27m",
      "component": "persist",
      "kind": "implement",
      "file": "build/ingest.js",
      "line": 48,
      "summary": "Wrote one row per event that survived the dedupe check."
    },
    {
      "seq": 4,
      "at": "T+35m",
      "component": "a2",
      "kind": "verify",
      "file": "build/ingest.test.js",
      "line": 27,
      "summary": "Ran the acceptance tests: the duplicate case and the defaults case pass, the distinct-ids case does not."
    }
  ],
  "failure": {
    "test": "a2 — two different events, identical payloads, different ids",
    "file": "build/ingest.test.js",
    "line": 27,
    "expected": 2,
    "actual": 1,
    "message": "dropped a distinct event as a duplicate: expected 2 rows, got 1",
    "whyItHidUntilNow": "a1 sends the same event twice, which collapses to one row whichever order you deduplicate in. a3 sends a single event, so there is nothing to compare it against. a2 is the only criterion where 'the same event' computed before normalisation and after it give different answers — and normalisation is what drops the sender's id."
  },
  "expectedDrift": {
    "originComponent": "normalise",
    "originFile": "build/ingest.js",
    "originLine": 12,
    "surfacedAtFile": "build/ingest.test.js",
    "surfacedAtLine": 27,
    "plannedPosition": 2,
    "actualPosition": 1,
    "explanation": "You designed normalise as the step after deduplicate. You implemented it before deduplicate.",
    "refusesToFix": true
  }
}`,
  "pricing": `{
  "schema": "mentor.build/v1",
  "project": "pricing",
  "planRef": "plan.lumina.json",
  "entry": "build/pricing.js",
  "tests": "build/pricing.test.js",
  "provenance": "authored",
  "steps": [
    {
      "seq": 1,
      "at": "T+03m",
      "component": "validate",
      "kind": "implement",
      "file": "build/pricing.js",
      "line": 8,
      "summary": "Summed the cart into \`subtotal\`."
    },
    {
      "seq": 2,
      "at": "T+11m",
      "component": "tax",
      "kind": "implement",
      "file": "build/pricing.js",
      "line": 12,
      "summary": "Computed tax from \`subtotal\`, before any discount existed.",
      "note": "Plan puts tax third, after discount. Implemented second. This is the drift."
    },
    {
      "seq": 3,
      "at": "T+19m",
      "component": "discount",
      "kind": "implement",
      "file": "build/pricing.js",
      "line": 14,
      "summary": "Added the discount — but tax had already been fixed against the undiscounted subtotal."
    },
    {
      "seq": 4,
      "at": "T+24m",
      "component": "total",
      "kind": "implement",
      "file": "build/pricing.js",
      "line": 17,
      "summary": "Summed \`taxable + tax\` and rounded to 2dp."
    },
    {
      "seq": 5,
      "at": "T+38m",
      "component": "tests",
      "kind": "verify",
      "file": "build/pricing.test.js",
      "line": 40,
      "summary": "Ran the golden tests: tests 1 and 2 green, test 3 red."
    }
  ],
  "failure": {
    "test": "test 3 — 40% discount, 20% tax",
    "file": "build/pricing.test.js",
    "line": 40,
    "expected": 72,
    "actual": 80,
    "message": "80 !== 72",
    "whyItHidUntilNow": "Tests 1 and 2 both use discountRate = 0, where taxing the subtotal and taxing the discounted amount produce the same number. Test 3 is the first case that distinguishes them."
  },
  "expectedDrift": {
    "originComponent": "tax",
    "originFile": "build/pricing.js",
    "originLine": 12,
    "surfacedAtFile": "build/pricing.test.js",
    "surfacedAtLine": 40,
    "plannedPosition": 3,
    "actualPosition": 2,
    "explanation": "You designed tax as the step after discount. You implemented it before discount.",
    "confidence": 0.91,
    "refusesToFix": true
  }
}`,
  "safety-gear": `{
  "schema": "mentor.build/v1",
  "project": "safety-gear",
  "planRef": "plan.lumina.json",
  "entry": "detect.py",
  "tests": "test_safety.py",
  "provenance": "observed",
  "steps": [
    {
      "seq": 1,
      "at": "T+00m",
      "component": "detect person",
      "kind": "implement",
      "file": "detect.py",
      "line": 14,
      "summary": "Ran the detector and kept the boxes classified as person."
    },
    {
      "seq": 2,
      "at": "T+07m",
      "component": "alert",
      "kind": "implement",
      "file": "alert.py",
      "line": 9,
      "summary": "Raised an alert for each detected person.",
      "note": "Plan puts alert last, after check helmet. Built second. This is the drift — at this point 'not wearing a helmet' was not yet a thing the code could know, so the alert is really firing on 'a person is present'."
    },
    {
      "seq": 3,
      "at": "T+21m",
      "component": "check helmet",
      "kind": "implement",
      "file": "detect.py",
      "line": 31,
      "summary": "Added the helmet check — but alert.py was already deciding without it."
    },
    {
      "seq": 4,
      "at": "T+29m",
      "component": "tests",
      "kind": "verify",
      "file": "test_safety.py",
      "line": 22,
      "summary": "Ran the acceptance tests: empty frame and bare head pass, helmeted worker fails."
    }
  ],
  "failure": {
    "test": "a1 — a worker wearing a helmet walks through frame",
    "file": "test_safety.py",
    "line": 22,
    "expected": 0,
    "actual": 1,
    "message": "alerted on a compliant worker: expected 0 alerts, got 1",
    "whyItHidUntilNow": "The other two criteria are an empty frame (no people, so no alerts either way) and a bare head (an alert is correct). Both pass whether or not the helmet check is wired in. a1 is the only case where alerting on presence and alerting on non-compliance differ."
  },
  "expectedDrift": {
    "originComponent": "alert",
    "originFile": "alert.py",
    "originLine": 9,
    "surfacedAtFile": "test_safety.py",
    "surfacedAtLine": 22,
    "plannedPosition": 3,
    "actualPosition": 2,
    "explanation": "You designed alert as the step after check helmet. You implemented it before check helmet.",
    "refusesToFix": true
  }
}`,
};

/**
 * The source the student wrote, so the origin line can be shown in context.
 *
 * Read-only by construction: no tool in this app writes it, and the drift run
 * asserts it is byte-identical at the end.
 */
export const PRICING_BUILD_SOURCE = `/**
 * Pricing — computes the total for an order.
 *
 * Your role: you own pricing. Finance depends on these numbers being right.
 */

function computeTotal(items, discountRate, taxRate) {
  const subtotal = items.reduce((sum, it) => sum + it.price * it.qty, 0);

  // Work out the tax first, then take the discount off.
  //                     ↑ this is the decision, and this is line 12.
  const tax = subtotal * taxRate;

  const discount = subtotal * discountRate;
  const taxable = subtotal - discount;

  return Math.round((taxable + tax) * 100) / 100;
}

module.exports = { computeTotal };
`;

/** The opening symptom — what the student arrives with. */
export const PRICING_SYMPTOM =
  'test 3 fails: computeTotal($100 cart, 40% discount, 20% tax) returned 80.00, expected 72.00 ' +
  '(build/pricing.test.js:40). Tests 1 and 2 pass.';

/** The project used when a caller supplies nothing at all. */
export const DEFAULT_DEMO = 'pricing';

const planCache = new Map<string, Plan>();
const buildCache = new Map<string, Build>();

export function bundledPlan(project: string = DEFAULT_DEMO): Plan | null {
  if (planCache.has(project)) return planCache.get(project) ?? null;
  const raw = DEMO_PLAN_JSON[project];
  if (!raw) return null;
  const plan = parsePlan(raw);
  planCache.set(project, plan);
  return plan;
}

export function bundledBuild(project: string = DEFAULT_DEMO): Build | null {
  if (buildCache.has(project)) return buildCache.get(project) ?? null;
  const raw = DEMO_BUILD_JSON[project];
  if (!raw) return null;
  const build = parseBuild(raw);
  buildCache.set(project, build);
  return build;
}

/**
 * Same, but throws when the project has no worked example.
 *
 * For the paths where a missing demo is a build error rather than a runtime
 * condition — the tests, and the argument-free demo call, which is documented as
 * always working. Keeping the nullable pair separate means the tools that legitimately
 * handle "this project needs your own plan" cannot silently get an exception instead.
 */
export function requirePlan(project: string = DEFAULT_DEMO): Plan {
  const plan = bundledPlan(project);
  if (!plan) throw new Error(`no bundled plan for ${project} — bundled: ${demoProjects().join(', ')}`);
  return plan;
}

export function requireBuild(project: string = DEFAULT_DEMO): Build {
  const build = bundledBuild(project);
  if (!build) throw new Error(`no bundled build history for ${project} — bundled: ${demoProjects().join(', ')}`);
  return build;
}

/** Projects that run end to end with no arguments. */
export function demoProjects(): string[] {
  return Object.keys(DEMO_PLAN_JSON).filter((k) => k in DEMO_BUILD_JSON);
}
