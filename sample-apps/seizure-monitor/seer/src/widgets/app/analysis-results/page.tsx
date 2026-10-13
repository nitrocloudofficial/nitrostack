'use client';

import { useMaxHeight, useWidgetSDK } from '@nitrostack/widgets';
import {
  autoGrid,
  autoGridStyle,
  cx,
  Empty,
  Figure,
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
  type Tone,
} from '@/design/primitives';

type Quality = 'useful_signal' | 'weak_signal' | 'no_demonstrated_signal';
type Coverage = { outsideNumericRanges: string[]; unseenCategoricalValues: string[] };

interface TargetDisplay {
  column: string;
  unit: string;
  decimals: number;
}

interface CommonResult {
  question: string;
  targetColumn: string;
  targetDisplay?: TargetDisplay;
  quality: Quality;
  model: { name: string };
  baseline: { name: string };
  datasetCoverage: { trainingRows: number; testRows: number };
  warnings: string[];
}

interface RegressionResult extends CommonResult {
  taskType: 'regression';
  metrics: { model: { mae: number; rmse: number; r2: number }; baseline: { mae: number; rmse: number; r2: number }; improvement: { maePercent: number; rmsePercent: number; r2Absolute: number } };
  predictions: Array<{ input: Record<string, string | number | boolean>; estimatedValue: number; coverage: Coverage }>;
  charts: { actualVsPredicted: Array<{ actual: number; predicted: number }>; residualVsPredicted: Array<{ predicted: number; residual: number }> };
}

interface ClassificationResult extends CommonResult {
  taskType: 'classification';
  metrics: { model: ClassificationMetric; baseline: ClassificationMetric; improvement: { f1Absolute: number; f1Percent: number } };
  predictions: Array<{ input: Record<string, string | number | boolean>; predictedClass: string; predictedProbability: number; coverage: Coverage }>;
  charts: { confusionMatrix: { labels: string[]; values: number[][] }; classDistribution: Array<{ classLabel: string; count: number; percentage: number }> };
  perClassMetrics: Array<{ classLabel: string; precision: number; recall: number; f1: number; support: number }>;
}

interface ClassificationMetric { accuracy: number; precision: number; recall: number; f1: number }
type ResultData = RegressionResult | ClassificationResult;

export const dynamic = 'force-dynamic';

const number = (value: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);
const pct = (value: number) => `${(value * 100).toFixed(1)}%`;
const signedPct = (value: number) => `${value >= 0 ? '+' : ''}${number(value)}%`;
const pretty = (value: string) => value.replace(/_/g, ' ');
const compact = (value: number) => new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);

/**
 * Values in the target's own scale. Without a declared unit the number is left
 * bare rather than guessed at.
 */
function targetNumber(value: number, display?: TargetDisplay): string {
  if (!display) return number(value);
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: display.decimals,
    maximumFractionDigits: display.decimals,
  }).format(value);
}

export default function AnalysisResultsWidget() {
  const maxHeight = useMaxHeight();
  const { isReady, getToolOutput } = useWidgetSDK();
  const data = getToolOutput<ResultData>();

  if (!isReady || !data) return <Loading>Working out the estimate…</Loading>;

  const quality = qualityLabel(data.quality);

  return (
    <Frame maxHeight={maxHeight}>
      <Masthead
        label={data.taskType === 'regression' ? 'Estimated number' : 'Estimated category'}
        title={pretty(data.targetColumn)}
        subtitle={data.question}
        aside={<Tag tone={quality.tone}>{quality.label}</Tag>}
      />

      <Panel accent={quality.tone}>
        <strong className="font-strong">{quality.description}</strong>
        <p className="text-small text-muted mt-1 mb-0">
          We checked this estimate on {data.datasetCoverage.testRows} rows it had not seen before, and compared it with a
          simple answer based on the usual result. This label is a fixed rule of thumb Seer applies to that one
          comparison. It is not a test of statistical significance, and it does not show the estimate will hold on other
          data.
        </p>
      </Panel>

      {data.taskType === 'regression'
        ? <RegressionView data={data} display={data.targetDisplay} />
        : <ClassificationView data={data} />}

      {data.warnings.length > 0 && (
        <Panel title="Important limits">
          {data.warnings.map((warning) => <Note key={warning}>{warning}</Note>)}
        </Panel>
      )}
    </Frame>
  );
}

function RegressionView({ data, display }: { data: RegressionResult; display?: TargetDisplay }) {
  return (
    <>
      <Panel title="The estimate">
        <div className={autoGrid} style={autoGridStyle(210)}>
          {data.predictions.map((prediction, index) => (
            <PredictionCard
              key={index}
              label={data.predictions.length > 1 ? `Row ${index + 1}` : undefined}
              value={targetNumber(prediction.estimatedValue, display)}
              detail={display?.unit}
              input={prediction.input}
              coverage={prediction.coverage}
            />
          ))}
        </div>
      </Panel>

      <Panel
        title="How close the estimates were"
        note={display ? `Differences are in ${display.unit}.` : undefined}
      >
        <MetricTable
          rows={[
            ['Typical difference from what happened', targetNumber(data.metrics.model.mae, display), targetNumber(data.metrics.baseline.mae, display), signedPct(data.metrics.improvement.maePercent)],
            ['Difference when larger misses matter more', targetNumber(data.metrics.model.rmse, display), targetNumber(data.metrics.baseline.rmse, display), signedPct(data.metrics.improvement.rmsePercent)],
            ['How much of the pattern was captured', number(data.metrics.model.r2), number(data.metrics.baseline.r2), `${data.metrics.improvement.r2Absolute >= 0 ? '+' : ''}${number(data.metrics.improvement.r2Absolute)}`],
          ]}
        />
      </Panel>

      <div className={cx(autoGrid, 'mt-3')} style={autoGridStyle(260)}>
        <Scatter
          title="What happened vs what Seer estimated"
          points={data.charts.actualVsPredicted.map((point) => ({ x: point.actual, y: point.predicted }))}
          xLabel={display ? `What happened (${display.unit})` : 'What happened'}
          yLabel="Seer estimate"
          format={(value) => targetNumber(value, display)}
          diagonal
        />
        <Scatter
          title="Difference by estimated value"
          points={data.charts.residualVsPredicted.map((point) => ({ x: point.predicted, y: point.residual }))}
          xLabel={display ? `Seer estimate (${display.unit})` : 'Seer estimate'}
          yLabel="Difference"
          format={(value) => targetNumber(value, display)}
          horizontalZero
        />
      </div>
    </>
  );
}

function ClassificationView({ data }: { data: ClassificationResult }) {
  return (
    <>
      <Panel title="The estimate">
        <div className={autoGrid} style={autoGridStyle(210)}>
          {data.predictions.map((prediction, index) => (
            <PredictionCard
              key={index}
              label={data.predictions.length > 1 ? `Row ${index + 1}` : undefined}
              value={prediction.predictedClass}
              detail={`Model-assigned probability: ${pct(prediction.predictedProbability)}`}
              input={prediction.input}
              coverage={prediction.coverage}
            />
          ))}
        </div>
        <p className="text-small text-muted mt-3 mb-0">
          These probabilities come straight from the model. Seer has not checked whether they are calibrated, so treat
          them as the model&rsquo;s own scoring rather than a measured likelihood.
        </p>
      </Panel>

      <Panel title="How often the category estimates were right">
        <MetricTable
          rows={[
            ['Correct overall', pct(data.metrics.model.accuracy), pct(data.metrics.baseline.accuracy), '—'],
            ['Right when it chose a category', pct(data.metrics.model.precision), pct(data.metrics.baseline.precision), '—'],
            ['Found the cases it was looking for', pct(data.metrics.model.recall), pct(data.metrics.baseline.recall), '—'],
            ['Balance of those two checks', pct(data.metrics.model.f1), pct(data.metrics.baseline.f1), signedPct(data.metrics.improvement.f1Percent)],
          ]}
        />
      </Panel>

      <div className={cx(autoGrid, 'mt-3')} style={autoGridStyle(260)}>
        <ConfusionMatrix chart={data.charts.confusionMatrix} />
        <Panel title="How common each category is" flush>
          <div className="grid gap-3">
            {data.charts.classDistribution.map((value) => (
              <div key={value.classLabel}>
                <div className="flex justify-between text-small mb-1">
                  <span className="font-medium">{value.classLabel}</span>
                  <span className="font-mono tabular text-muted">{value.count} · {number(value.percentage)}%</span>
                </div>
                <Meter fraction={value.percentage / 100} />
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel>
        <details>
          <summary className="cursor-pointer text-lead font-strong">Details for each category</summary>
          <div className="overflow-x-auto mt-3">
            <table className="w-full min-w-[420px] border-collapse text-small">
              <thead>
                <tr>
                  <th className={th}>Category</th>
                  <th className={th}>Right when chosen</th>
                  <th className={th}>Cases found</th>
                  <th className={th}>Balance</th>
                  <th className={th}>Rows checked</th>
                </tr>
              </thead>
              <tbody>
                {data.perClassMetrics.map((metric) => (
                  <tr key={metric.classLabel} className="border-t border-rule">
                    <td className={cx(td, 'font-medium')}>{metric.classLabel}</td>
                    <td className={tdNum}>{pct(metric.precision)}</td>
                    <td className={tdNum}>{pct(metric.recall)}</td>
                    <td className={tdNum}>{pct(metric.f1)}</td>
                    <td className={tdNum}>{metric.support}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </Panel>
    </>
  );
}

function PredictionCard({ label, value, detail, input, coverage }: {
  label?: string;
  value: string;
  detail?: string;
  input: Record<string, string | number | boolean>;
  coverage: Coverage;
}) {
  return (
    <article className="bg-sunken border border-rule rounded-md p-3">
      <Figure label={label} value={value} detail={detail} />
      <div className="grid gap-[3px] mt-2 text-small">
        {Object.entries(input).map(([name, item]) => (
          <div key={name} className="flex justify-between gap-2">
            <span className="text-muted truncate">{pretty(name)}</span>
            <span className="font-mono tabular whitespace-nowrap">{String(item)}</span>
          </div>
        ))}
      </div>
      {coverage.outsideNumericRanges.length > 0 && <Note>Outside the range Seer learned from: {coverage.outsideNumericRanges.join(', ')}.</Note>}
      {coverage.unseenCategoricalValues.length > 0 && <Note>A choice Seer has not seen before: {coverage.unseenCategoricalValues.join(', ')}.</Note>}
    </article>
  );
}

function MetricTable({ rows }: { rows: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] border-collapse text-small">
        <thead>
          <tr>
            <th className={th}>Check</th>
            <th className={th}>Seer</th>
            <th className={th}>Simple comparison</th>
            <th className={th}>Change</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, current, reference, change]) => (
            <tr key={label} className="border-t border-rule">
              <td className={td}>{label}</td>
              <td className={cx(tdNum, 'font-medium')}>{current}</td>
              <td className={cx(tdNum, 'text-muted')}>{reference}</td>
              <td className={cx(tdNum, change.startsWith('+') ? 'text-signal' : change.startsWith('-') ? 'text-alert' : 'text-muted')}>{change}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ConfusionMatrix({ chart }: { chart: ClassificationResult['charts']['confusionMatrix'] }) {
  const maximum = Math.max(...chart.values.flat(), 1);
  return (
    <Panel title="Where Seer agreed or disagreed" note="Rows show what happened. Columns show what Seer estimated." flush>
      <div
        className="grid gap-0.5 text-small text-center"
        style={{ gridTemplateColumns: `minmax(56px, auto) repeat(${chart.labels.length}, minmax(40px, 1fr))` }}
      >
        <span />
        {chart.labels.map((label) => (
          <span key={`head-${label}`} className="text-micro text-muted p-1 truncate">{label}</span>
        ))}
        {chart.values.map((row, rowIndex) => (
          <div key={chart.labels[rowIndex]} className="contents">
            <span className="text-micro text-muted self-center text-right pr-1">{chart.labels[rowIndex]}</span>
            {row.map((count, columnIndex) => (
              <span key={`${rowIndex}-${columnIndex}`} className="relative rounded-sm p-2 overflow-hidden">
                <span aria-hidden className="absolute inset-0 bg-signal" style={{ opacity: 0.1 + 0.75 * (count / maximum) }} />
                <span className="relative font-mono tabular font-medium">{count}</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </Panel>
  );
}

function Scatter({ title, points, xLabel, yLabel, format = number, diagonal = false, horizontalZero = false }: {
  title: string;
  points: Array<{ x: number; y: number }>;
  xLabel: string;
  yLabel: string;
  format?: (value: number) => string;
  diagonal?: boolean;
  horizontalZero?: boolean;
}) {
  const width = 320;
  const height = 210;
  const padLeft = 52;
  const padRight = 12;
  const padTop = 12;
  const padBottom = 40;

  if (points.length === 0) {
    return <Panel title={title} flush><Empty>Nothing to plot.</Empty></Panel>;
  }

  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys, horizontalZero ? 0 : Infinity);
  const maxY = Math.max(...ys, horizontalZero ? 0 : -Infinity);
  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;
  const scale = (value: number, low: number, high: number, extent: number) => (low === high ? extent / 2 : ((value - low) / (high - low)) * extent);
  const pointX = (value: number) => padLeft + scale(value, minX, maxX, plotWidth);
  const pointY = (value: number) => height - padBottom - scale(value, minY, maxY, plotHeight);

  // Overlapping points hide how many observations sit in one place, so collapse
  // them onto a 4px grid and size each mark by how many landed there.
  const bins = new Map<string, { x: number; y: number; count: number; sumX: number; sumY: number }>();
  for (const point of points) {
    const cx = Math.round(pointX(point.x) / 4) * 4;
    const cy = Math.round(pointY(point.y) / 4) * 4;
    const key = `${cx}:${cy}`;
    const bin = bins.get(key) ?? { x: cx, y: cy, count: 0, sumX: 0, sumY: 0 };
    bin.count += 1;
    bin.sumX += point.x;
    bin.sumY += point.y;
    bins.set(key, bin);
  }
  const marks = [...bins.values()];
  const busiest = Math.max(...marks.map((mark) => mark.count));

  const ticks = (low: number, high: number) => (low === high ? [low] : [low, (low + high) / 2, high]);

  return (
    <Panel title={title} flush>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" role="img" aria-label={title}>
        {ticks(minY, maxY).map((value) => (
          <g key={`y-${value}`}>
            <line x1={padLeft - 3} y1={pointY(value)} x2={padLeft} y2={pointY(value)} className="stroke-rule-strong" />
            <text x={padLeft - 6} y={pointY(value) + 3} className="fill-muted" fontSize="9" textAnchor="end">{compact(value)}</text>
          </g>
        ))}
        {ticks(minX, maxX).map((value) => (
          <g key={`x-${value}`}>
            <line x1={pointX(value)} y1={height - padBottom} x2={pointX(value)} y2={height - padBottom + 3} className="stroke-rule-strong" />
            <text x={pointX(value)} y={height - padBottom + 14} className="fill-muted" fontSize="9" textAnchor="middle">{compact(value)}</text>
          </g>
        ))}

        <line x1={padLeft} y1={height - padBottom} x2={width - padRight} y2={height - padBottom} className="stroke-rule-strong" />
        <line x1={padLeft} y1={padTop} x2={padLeft} y2={height - padBottom} className="stroke-rule-strong" />

        {diagonal && (
          <line
            x1={pointX(Math.max(minX, minY))}
            y1={pointY(Math.max(minX, minY))}
            x2={pointX(Math.min(maxX, maxY))}
            y2={pointY(Math.min(maxX, maxY))}
            className="stroke-muted"
            strokeDasharray="3 3"
          >
            <title>A perfect estimate would sit on this line.</title>
          </line>
        )}

        {horizontalZero && minY <= 0 && maxY >= 0 && (
          <g>
            <line x1={padLeft} y1={pointY(0)} x2={width - padRight} y2={pointY(0)} className="stroke-ink" strokeWidth="1" opacity="0.55" />
            <text x={width - padRight} y={pointY(0) - 4} className="fill-muted" fontSize="9" textAnchor="end">no difference</text>
          </g>
        )}

        {marks.map((mark) => (
          <circle
            key={`${mark.x}:${mark.y}`}
            cx={mark.x}
            cy={mark.y}
            r={mark.count === 1 ? 2.5 : Math.min(6, 2.5 + Math.sqrt(mark.count))}
            className="fill-signal"
            opacity={mark.count === 1 ? 0.65 : 0.85}
          >
            <title>
              {mark.count === 1
                ? `${xLabel}: ${format(mark.sumX)}\n${yLabel}: ${format(mark.sumY)}`
                : `${mark.count} points here\naverage ${xLabel}: ${format(mark.sumX / mark.count)}\naverage ${yLabel}: ${format(mark.sumY / mark.count)}`}
            </title>
          </circle>
        ))}

        <text x={padLeft + plotWidth / 2} y={height - 4} className="fill-muted" fontSize="9" textAnchor="middle">{xLabel}</text>
        <text x="10" y={padTop + plotHeight / 2} className="fill-muted" fontSize="9" textAnchor="middle" transform={`rotate(-90 10 ${padTop + plotHeight / 2})`}>{yLabel}</text>
      </svg>
      <p className="text-small text-muted mt-2 mb-0">
        {busiest > 1
          ? `Hover a point for its values. Larger marks are several points at the same spot (up to ${busiest}).`
          : 'Hover a point for its values.'}
      </p>
    </Panel>
  );
}

/**
 * The label comes from a fixed threshold the ML service applies to one test
 * split, so the wording states what was measured and claims nothing beyond it.
 */
function qualityLabel(quality: Quality): { label: string; tone: Tone; description: string } {
  return {
    useful_signal: {
      label: 'Better than the comparison',
      tone: 'signal' as Tone,
      description: 'Performed better than the simple comparison on this test split.',
    },
    weak_signal: {
      label: 'Slightly better',
      tone: 'caution' as Tone,
      description: 'Performed slightly better than the simple comparison on this test split.',
    },
    no_demonstrated_signal: {
      label: 'Not better',
      tone: 'alert' as Tone,
      description: 'Did not perform better than the simple comparison on this test split.',
    },
  }[quality];
}
