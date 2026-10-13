'use client';

import {
  withToolData,
  defineWidgetMetadata,
  useTheme,
} from '@nitrostack/widgets';

// Mirrors NegotiationResult in src/modules/compute/compute.types.ts.
interface OfferDelta {
  kind: 'reduced' | 'narrowed';
  path: string;
  requested: string | number | string[];
  granted: string | number | string[];
  reason: string;
}

interface Denial {
  path: string;
  requested: string | boolean;
  reason: string;
}

interface RuntimeAttestation {
  backend: 'docker' | 'process';
  reference: string;
  digest: string | null;
  source: 'registry' | 'cache' | 'host' | 'unavailable';
  note?: string;
}

interface NegotiationResult {
  decision: 'exact' | 'counter_offer' | 'denied';
  offer?: {
    offerId: string;
    decision: 'exact' | 'counter_offer';
    granted: {
      runtime: string;
      memoryMb: number;
      cpuCores: number;
      durationMinutes: number;
      network: { mode: string; allowedHosts: string[] };
    };
    attestation: RuntimeAttestation;
    deltas: OfferDelta[];
    expiresAt: string;
  };
  denials: Denial[];
}

export const metadata = defineWidgetMetadata({
  uri: '/compute-offer',
  name: 'Compute Offer',
  description:
    'Renders an BouldersGate negotiation outcome: the granted envelope, every reduction with its reason, or the denials that blocked an offer.',
  tags: ['bouldersgate', 'compute', 'policy'],
  examples: [
    {
      name: 'Counter-offer',
      description: 'An oversized request clamped on three axes and cut off the network',
      data: {
        decision: 'counter_offer',
        denials: [],
        offer: {
          offerId: 'offer_3f2a91c4-0c1e-4a77-9b2d-5e8a1c7d4f60',
          decision: 'counter_offer',
          expiresAt: '2026-07-26T03:05:00.000Z',
          granted: {
            runtime: 'node20',
            memoryMb: 4096,
            cpuCores: 4,
            durationMinutes: 20,
            network: { mode: 'none', allowedHosts: [] },
          },
          attestation: {
            backend: 'docker',
            reference: 'node:20-alpine',
            digest:
              'sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293',
            source: 'registry',
          },
          deltas: [
            {
              kind: 'reduced',
              path: 'limits.memoryMb.max',
              requested: 16384,
              granted: 4096,
              reason: 'Requested memory exceeds the agent policy cap.',
            },
            {
              kind: 'reduced',
              path: 'limits.durationMinutes.max',
              requested: 1440,
              granted: 20,
              reason: 'Requested lifetime exceeds the agent policy cap.',
            },
            {
              kind: 'narrowed',
              path: 'network.allowedHosts',
              requested: 'unrestricted',
              granted: 'none',
              reason: 'Outbound network access was intersected with the policy allowlist.',
            },
          ],
        },
      },
    },
    {
      name: 'Denied',
      description: 'Hard capabilities that have no safe reduced form',
      data: {
        decision: 'denied',
        denials: [
          {
            path: 'privileged',
            requested: true,
            reason: 'Privileged execution has no safe reduced form.',
          },
          {
            path: 'dockerSocket',
            requested: true,
            reason: 'Docker socket access would delegate infrastructure authority.',
          },
        ],
      },
    },
    {
      name: 'Exact grant',
      description: 'A request that already sat inside policy',
      data: {
        decision: 'exact',
        denials: [],
        offer: {
          offerId: 'offer_88b1d0e2-7c45-4a19-8f3b-1d9e6a2c5b74',
          decision: 'exact',
          expiresAt: '2026-07-26T03:05:00.000Z',
          granted: {
            runtime: 'node20',
            memoryMb: 512,
            cpuCores: 1,
            durationMinutes: 5,
            network: { mode: 'none', allowedHosts: [] },
          },
          attestation: {
            backend: 'process',
            reference: 'node:20.20.2',
            digest: null,
            source: 'host',
            note: 'Bounded host process satisfying "node20". Filesystem access is confined to the environment workspace and no environment variables are inherited. Egress is removed with a private network namespace.',
          },
          deltas: [],
        },
      },
    },
  ],
});

const DECISION = {
  exact: {
    label: 'Exact grant',
    blurb: 'The request already sat inside policy. Nothing was reduced.',
    accent: '#16a34a',
  },
  counter_offer: {
    label: 'Counter-offer',
    blurb: 'Policy reduced the request. Every change is itemized below.',
    accent: '#d97706',
  },
  denied: {
    label: 'Denied',
    blurb: 'No offer was created. These capabilities have no safe reduced form.',
    accent: '#dc2626',
  },
} as const;

const MONO =
  'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace';

function fmt(value: string | number | boolean | string[]): string {
  if (Array.isArray(value)) {
    return value.length === 0 ? 'none' : value.join(', ');
  }
  if (typeof value === 'number') {
    return value.toLocaleString('en-US');
  }
  return String(value);
}

// "limits.memoryMb.max" -> "memoryMb"
function shortPath(path: string): string {
  const parts = path.split('.');
  if (parts[0] === 'limits' && parts.length >= 2) {
    return parts[1];
  }
  return parts[parts.length - 1] === 'allowedHosts' ? 'network' : path;
}

function ComputeOffer({ data }: { data: NegotiationResult }) {
  const theme = useTheme();
  const dark = theme === 'dark';

  const fg = dark ? '#e8e8ea' : '#18181b';
  const muted = dark ? '#9a9aa3' : '#71717a';
  const line = dark ? '#2c2c31' : '#e4e4e7';
  const surface = dark ? '#1a1a1e' : '#fafafa';

  const decision = DECISION[data.decision];
  const offer = data.offer;
  const deltas = offer?.deltas ?? [];

  return (
    <div
      style={{
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: fg,
        fontSize: 14,
        lineHeight: 1.5,
        padding: 16,
        maxWidth: 640,
      }}
    >
      {/* Decision header */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: decision.accent,
              flexShrink: 0,
            }}
          />
          <span style={{ fontWeight: 650, fontSize: 15 }}>
            {decision.label}
          </span>
        </div>
        <div style={{ color: muted, fontSize: 13, marginTop: 3 }}>
          {decision.blurb}
        </div>
      </div>

      {/* Denials */}
      {data.denials.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          {data.denials.map((d) => (
            <div
              key={d.path}
              style={{
                display: 'flex',
                gap: 10,
                padding: '8px 0',
                borderTop: `1px solid ${line}`,
              }}
            >
              <code
                style={{
                  fontFamily: MONO,
                  fontSize: 12.5,
                  color: DECISION.denied.accent,
                  minWidth: 118,
                  paddingTop: 1,
                }}
              >
                {d.path}
              </code>
              <span style={{ color: muted, fontSize: 13 }}>{d.reason}</span>
            </div>
          ))}
        </div>
      )}

      {/* Deltas — the point of the whole widget */}
      {deltas.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: 0.7,
              textTransform: 'uppercase',
              color: muted,
              marginBottom: 6,
            }}
          >
            {deltas.length} {deltas.length === 1 ? 'reduction' : 'reductions'}
          </div>
          {deltas.map((delta) => (
            <div
              key={delta.path}
              style={{ padding: '9px 0', borderTop: `1px solid ${line}` }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 8,
                  flexWrap: 'wrap',
                }}
              >
                <code
                  style={{
                    fontFamily: MONO,
                    fontSize: 12.5,
                    color: muted,
                    minWidth: 118,
                  }}
                >
                  {shortPath(delta.path)}
                </code>
                <span
                  style={{
                    fontFamily: MONO,
                    fontSize: 13,
                    textDecoration: 'line-through',
                    color: muted,
                  }}
                >
                  {fmt(delta.requested)}
                </span>
                <span style={{ color: muted, fontSize: 12 }}>→</span>
                <span
                  style={{
                    fontFamily: MONO,
                    fontSize: 13,
                    fontWeight: 650,
                    color: DECISION.counter_offer.accent,
                  }}
                >
                  {fmt(delta.granted)}
                </span>
                <span
                  style={{
                    fontSize: 10.5,
                    letterSpacing: 0.4,
                    textTransform: 'uppercase',
                    color: muted,
                    border: `1px solid ${line}`,
                    borderRadius: 4,
                    padding: '1px 5px',
                  }}
                >
                  {delta.kind}
                </span>
              </div>
              <div
                style={{
                  color: muted,
                  fontSize: 12.5,
                  marginTop: 3,
                  marginLeft: 126,
                }}
              >
                {delta.reason}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Granted envelope */}
      {offer && (
        <div
          style={{
            background: surface,
            border: `1px solid ${line}`,
            borderRadius: 8,
            padding: 12,
          }}
        >
          <div
            style={{
              fontSize: 11,
              letterSpacing: 0.7,
              textTransform: 'uppercase',
              color: muted,
              marginBottom: 8,
            }}
          >
            Granted envelope
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(88px, 1fr))',
              gap: 12,
              fontFamily: MONO,
              fontSize: 13,
            }}
          >
            {[
              ['runtime', offer.granted.runtime],
              ['memory', `${offer.granted.memoryMb.toLocaleString('en-US')} MB`],
              ['cpu', `${offer.granted.cpuCores} cores`],
              ['ttl', `${offer.granted.durationMinutes} min`],
              [
                'network',
                offer.granted.network.mode === 'none'
                  ? 'none'
                  : offer.granted.network.allowedHosts.join(', '),
              ],
            ].map(([label, value]) => (
              <div key={label}>
                <div
                  style={{
                    fontFamily: 'system-ui, sans-serif',
                    fontSize: 11,
                    color: muted,
                  }}
                >
                  {label}
                </div>
                <div style={{ fontWeight: 600 }}>{value}</div>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: 12,
              paddingTop: 10,
              borderTop: `1px solid ${line}`,
              display: 'flex',
              justifyContent: 'space-between',
              gap: 10,
              flexWrap: 'wrap',
              fontFamily: MONO,
              fontSize: 11.5,
              color: muted,
            }}
          >
            <span>{offer.offerId}</span>
            <span>
              expires {new Date(offer.expiresAt).toLocaleTimeString('en-US')}
            </span>
          </div>
          <div
            style={{
              marginTop: 10,
              paddingTop: 10,
              borderTop: `1px solid ${line}`,
            }}
          >
            <div
              style={{
                fontSize: 11,
                letterSpacing: 0.7,
                textTransform: 'uppercase',
                color: muted,
                marginBottom: 4,
              }}
            >
              Pinned runtime · {offer.attestation.backend}
            </div>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 12,
                wordBreak: 'break-all',
              }}
            >
              {offer.attestation.reference}
              {offer.attestation.digest ? (
                <span style={{ color: muted }}>@{offer.attestation.digest}</span>
              ) : null}
            </div>
            <div style={{ color: muted, fontSize: 12, marginTop: 3 }}>
              {offer.attestation.note ??
                'Resolved from the registry. accept_offer materializes this exact digest, not the tag.'}
            </div>
          </div>

          <div style={{ marginTop: 10, fontSize: 12.5, color: muted }}>
            Nothing has been provisioned. Call{' '}
            <code style={{ fontFamily: MONO }}>accept_offer</code> to
            materialize this envelope — once.
          </div>
        </div>
      )}
    </div>
  );
}

export default withToolData<NegotiationResult>(ComputeOffer);
