'use client';

/**
 * Design System panel — what the UI/UX Integrator recovered from the target,
 * including the ad-hoc colours that violate the token set.
 */

import { Badge, Button, Card, Empty, Note, Shell, Stats, useBridgeTool } from '../../lib/ui';

interface Payload {
  target: string;
  framework: string[];
  palette: { name: string; value: string }[];
  typography: { name: string; value: string }[];
  tokens: { name: string; value: string; category: string; source: string }[];
  components: { name: string; path: string; props: string[]; usageCount: number; doc?: string }[];
  adHocColors: { file: string; value: string }[];
  conventions: string[];
}

export default function DesignSystem() {
  const { data, busy, error, run, clearError } = useBridgeTool<Payload>();

  if (!data) {
    return (
      <Shell icon="◐" title="Design System" subtitle="UI/UX Integrator" error={error}>
        <Empty
          icon="◐"
          title="No design system scanned"
          hint={
            <>
              Call <code>parse_design_system</code> to extract tokens and components.
            </>
          }
        />
      </Shell>
    );
  }

  const scale = (data.tokens ?? []).filter((t) =>
    ['spacing', 'radius', 'elevation', 'duration'].includes(t.category)
  );

  return (
    <Shell
      icon="◐"
      title="Design System"
      subtitle={(data.framework ?? []).join(' · ') || 'corporate design language'}
      error={error}
      onDismissError={clearError}
      actions={
        <Button size="sm" variant="ghost" loading={busy === 'parse_design_system'} onClick={() => run('parse_design_system')}>
          Re-scan
        </Button>
      }
    >
      <Stats
        items={[
          { label: 'Tokens', value: data.tokens?.length ?? 0, tone: 'accent' },
          { label: 'Colours', value: data.palette?.length ?? 0 },
          { label: 'Components', value: data.components?.length ?? 0, tone: 'ok' },
          {
            label: 'Violations',
            value: data.adHocColors?.length ?? 0,
            tone: data.adHocColors?.length ? 'danger' : 'ok',
          },
        ]}
      />

      {data.conventions?.map((convention, i) => (
        <Note key={i} tone="warn">
          {convention}
        </Note>
      ))}

      {data.palette?.length ? (
        <Card title="Approved palette" aside={<Badge tone="accent">use only these</Badge>}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(112px, 1fr))',
              gap: 9,
            }}
          >
            {data.palette.map((swatch) => (
              <div key={`${swatch.name}-${swatch.value}`}>
                <div className="bx-swatch" style={{ background: swatch.value }} />
                <div style={{ fontSize: 10.5, marginTop: 4, fontFamily: 'var(--bx-mono)', wordBreak: 'break-all' }}>
                  {swatch.name}
                </div>
                <div style={{ fontSize: 10, color: 'var(--bx-fg-faint)', fontFamily: 'var(--bx-mono)' }}>
                  {swatch.value}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {data.typography?.length ? (
        <Card title="Typography">
          <dl className="bx-kv">
            {data.typography.map((type) => (
              <div key={type.name} style={{ display: 'contents' }}>
                <dt>{type.name}</dt>
                <dd style={{ fontFamily: type.value }}>{type.value}</dd>
              </div>
            ))}
          </dl>
        </Card>
      ) : null}

      {scale.length ? (
        <Card title="Spacing, radius & motion">
          <dl className="bx-kv">
            {scale.map((token) => (
              <div key={`${token.category}-${token.name}`} style={{ display: 'contents' }}>
                <dt>{token.name}</dt>
                <dd>{token.value}</dd>
              </div>
            ))}
          </dl>
        </Card>
      ) : null}

      {data.components?.length ? (
        <Card title="Component inventory" aside={<span style={{ fontSize: 11, color: 'var(--bx-fg-faint)' }}>ranked by usage</span>}>
          <div className="bx-list">
            {data.components.map((component) => (
              <div className="bx-item" key={component.path}>
                <span className="bx-dot" data-tone={component.usageCount > 0 ? 'ok' : 'neutral'} />
                <div className="bx-item-main">
                  <div className="bx-item-t" style={{ fontFamily: 'var(--bx-mono)' }}>
                    {'<'}
                    {component.name}
                    {component.props?.length ? ` ${component.props.join(' ')}` : ''} {'/>'}
                  </div>
                  <div className="bx-item-d">
                    {component.doc ? `${component.doc} — ` : ''}
                    <code>{component.path}</code>
                  </div>
                </div>
                <Badge tone={component.usageCount > 0 ? 'accent' : 'neutral'}>
                  {component.usageCount} use{component.usageCount === 1 ? '' : 's'}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {data.adHocColors?.length ? (
        <Card title="Style guide violations" aside={<Badge tone="danger">{data.adHocColors.length}</Badge>}>
          <div style={{ fontSize: 11.5, color: 'var(--bx-fg-mute)', marginBottom: 8 }}>
            Hex values used inline that are not in the token set. An agent generating UI here must use
            tokens instead.
          </div>
          <div className="bx-btn-row">
            {data.adHocColors.map((violation, i) => (
              <span key={`${violation.file}-${i}`} className="bx-badge" data-tone="danger">
                <span
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: 2,
                    background: violation.value,
                    display: 'inline-block',
                    border: '1px solid rgba(128,128,128,.4)',
                  }}
                />
                {violation.value} · {violation.file.split('/').pop()}
              </span>
            ))}
          </div>
        </Card>
      ) : (
        <Note tone="ok">No ad-hoc colours found — every hex in the UI comes from the token set.</Note>
      )}
    </Shell>
  );
}
