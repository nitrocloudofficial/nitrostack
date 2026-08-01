'use client';

import { useMaxHeight, useWidgetSDK } from '@nitrostack/widgets';
import {
  autoGrid,
  autoGridStyle,
  cx,
  Empty,
  Field,
  Frame,
  Loading,
  Masthead,
  Meter,
  Note,
  Panel,
  Tag,
  td,
  tdNum,
  th,
} from '@/design/primitives';

type ColumnType = 'boolean' | 'numeric' | 'categorical' | 'datetime' | 'text' | 'empty';

interface Frequency {
  value: string;
  count: number;
  percentage: number;
}

interface ProfileData {
  datasetId: string;
  dimensions: { rows: number; columns: number };
  columns: Array<{
    name: string;
    type: ColumnType;
    missingCount: number;
    missingPercent: number;
    uniqueCount: number;
    numericSummary: { min: number; max: number; mean: number; median: number } | null;
    categories: Frequency[];
  }>;
  duplicateRowCount: number;
  targetCandidates: string[];
  identifierCandidates: string[];
  constantColumns: string[];
  unsupportedColumns: Array<{ name: string; reason: string }>;
  warnings: string[];
  charts: {
    numericDistributions: Array<{ column: string; bins: Array<{ start: number; end: number; count: number }> }>;
    categoryFrequencies: Array<{ column: string; values: Frequency[] }>;
  };
}

function number(value: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);
}

export const dynamic = 'force-dynamic';

export default function DatasetProfileWidget() {
  const maxHeight = useMaxHeight();
  const { isReady, getToolOutput } = useWidgetSDK();
  const data = getToolOutput<ProfileData>();

  if (!isReady || !data) {
    return <Loading>Reading the dataset…</Loading>;
  }

  const maxMissing = Math.max(1, ...data.columns.map((column) => column.missingCount));
  const excluded = [...data.constantColumns, ...data.unsupportedColumns.map((column) => column.name)];

  return (
    <Frame maxHeight={maxHeight}>
      <Masthead
        label="Dataset profile"
        title={data.datasetId.replace(/-/g, ' ')}
        subtitle="Every row was read before any plan was written. Nothing here is a sample."
        aside={
          <div className="flex gap-2">
            <Field label="Rows" value={number(data.dimensions.rows)} />
            <Field label="Columns" value={number(data.dimensions.columns)} />
            <Field label="Duplicates" value={number(data.duplicateRowCount)} />
          </div>
        }
      />

      {data.warnings.map((warning) => <Note key={warning}>{warning}</Note>)}

      <Panel title="Columns" note="Missing values are shown against the column with the most gaps.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-small">
            <thead>
              <tr>
                <th className={th}>Column</th>
                <th className={th}>Type</th>
                <th className={th}>Missing</th>
                <th className={th}>Distinct</th>
                <th className={cx(th, 'w-[140px]')}>Gaps</th>
              </tr>
            </thead>
            <tbody>
              {data.columns.map((column) => (
                <tr key={column.name} className="border-t border-rule">
                  <td className={cx(td, 'font-medium')}>{column.name}</td>
                  <td className={td}><Tag tone={column.type === 'empty' ? 'muted' : undefined}>{column.type}</Tag></td>
                  <td className={tdNum}>{number(column.missingCount)} · {column.missingPercent}%</td>
                  <td className={tdNum}>{number(column.uniqueCount)}</td>
                  <td className={td}>
                    <Meter fraction={column.missingCount / maxMissing} tone={column.missingCount ? 'caution' : 'muted'} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className={cx(autoGrid, 'mt-3')} style={autoGridStyle(220)}>
        <Panel title="Can be estimated" flush>
          {data.targetCandidates.length
            ? <div className="flex flex-wrap gap-1">{data.targetCandidates.map((value) => <Tag key={value} tone="signal">{value}</Tag>)}</div>
            : <Empty>Nothing in this dataset can be estimated.</Empty>}
        </Panel>
        <Panel title="Looks like an ID" flush>
          {data.identifierCandidates.length
            ? <div className="flex flex-wrap gap-1">{data.identifierCandidates.map((value) => <Tag key={value}>{value}</Tag>)}</div>
            : <Empty>No ID-like columns.</Empty>}
        </Panel>
        <Panel title="Set aside" flush>
          {excluded.length
            ? <div className="flex flex-wrap gap-1">{excluded.map((value) => <Tag key={value} tone="muted">{value}</Tag>)}</div>
            : <Empty>Nothing was set aside.</Empty>}
        </Panel>
      </div>

      {data.charts.numericDistributions.length > 0 && (
        <Panel title="Spread of the numbers">
          <div className={autoGrid} style={autoGridStyle(210)}>
            {data.charts.numericDistributions.map((distribution) => {
              const maximum = Math.max(1, ...distribution.bins.map((bin) => bin.count));
              const summary = data.columns.find((column) => column.name === distribution.column)?.numericSummary;
              return (
                <div key={distribution.column}>
                  <div className="text-small font-medium">{distribution.column}</div>
                  {summary && (
                    <div className="font-mono tabular text-micro text-muted mt-0.5 mb-2">
                      midpoint {number(summary.median)} · {number(summary.min)}–{number(summary.max)}
                    </div>
                  )}
                  <div className="flex h-16 items-end gap-0.5">
                    {distribution.bins.map((bin, index) => (
                      <div
                        key={`${bin.start}-${index}`}
                        title={`${number(bin.start)}–${number(bin.end)}: ${bin.count}`}
                        className={cx('bg-signal flex-1 rounded-t-sm', !bin.count && 'opacity-25')}
                        style={{ minHeight: bin.count ? 3 : 1, height: `${(bin.count / maximum) * 100}%` }}
                      />
                    ))}
                  </div>
                  <div className="border-t border-rule" />
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      {data.charts.categoryFrequencies.length > 0 && (
        <Panel title="Most common choices">
          <div className={autoGrid} style={autoGridStyle(230)}>
            {data.charts.categoryFrequencies.map((distribution) => (
              <div key={distribution.column}>
                <div className="text-small font-medium mb-2">{distribution.column}</div>
                {distribution.values.slice(0, 5).map((value) => (
                  <div key={value.value} className="mt-1 grid grid-cols-[1fr_44px] items-center gap-2">
                    <div className="min-w-0">
                      <div className="text-micro truncate mb-[3px]">{value.value}</div>
                      <Meter fraction={value.percentage / 100} />
                    </div>
                    <span className="font-mono tabular text-micro text-muted text-right">{value.percentage}%</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Panel>
      )}
    </Frame>
  );
}
