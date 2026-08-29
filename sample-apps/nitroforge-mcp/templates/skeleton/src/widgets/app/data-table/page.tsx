'use client';

import { useWidgetSDK } from '@nitrostack/widgets';

/**
 * data-table archetype -- generic, not per-tool.
 *
 * SCOPE SIMPLIFICATION, documented not hidden: ToolIR.widget.mapping
 * (rowsPath / columns) is fixed at emission time in the IR, but there's no
 * plumbing in this framework version to pass that mapping down into a
 * shared widget route at runtime (useWidgetSDK() exposes toolOutput/
 * toolInput, nothing IR-shaped). Rather than generate a separate widget
 * route per tool (real future work), this component auto-detects: find the
 * first array-valued property on toolOutput, render every key of its first
 * item as a column. Good enough for a demo table, not a general JSONPath
 * mapper.
 */
export default function DataTableWidget() {
  const { isReady, toolOutput } = useWidgetSDK();

  if (!isReady) {
    return <div style={{ padding: 16, fontFamily: 'system-ui, sans-serif' }}>Loading...</div>;
  }

  const output = (toolOutput ?? {}) as Record<string, unknown>;
  const arrayEntry = Object.entries(output).find(([, v]) => Array.isArray(v)) as
    | [string, Record<string, unknown>[]]
    | undefined;

  if (!arrayEntry || arrayEntry[1].length === 0) {
    return (
      <div style={{ padding: 16, fontFamily: 'system-ui, sans-serif', color: '#666' }}>
        No rows to display.
      </div>
    );
  }

  const [, rows] = arrayEntry;
  const columns = Object.keys(rows[0]);

  return (
    <div style={{ padding: 16, fontFamily: 'system-ui, sans-serif', overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 14 }}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col}
                style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '2px solid #ddd', color: '#333' }}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {columns.map((col) => (
                <td key={col} style={{ padding: '8px 12px', borderBottom: '1px solid #eee' }}>
                  {String(row[col] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
