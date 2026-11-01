import React from 'react';
import type { CloudVM, WatchVM } from '../lib/view-model';
import { EvidenceChip } from './Evidence';
import { SeverityStrip } from './Parts';
import { SEVERITY_LABEL, SeverityIcon } from './Severity';

// Watch (check_watch) and Cloud (cloud_inventory) are monitoring views, not steps of the assess to report flow.
// Both are data from outside sources, so they carry the REPORTED pattern (dotted outline), never the measured one.

// "2026-11-01 09:12 UTC" from an ISO time; the text as given when it does not parse.
export function stamp(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 16)} UTC`;
}

const host = (url: string | undefined): string => {
  if (!url) return '';
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
};

function Src({ source, at }: { source?: string; at?: string }) {
  if (!source && !at) return null;
  return (
    <span className="w-src mono">
      {host(source)}
      {at ? ` · fetched ${stamp(at)}` : ''}
    </span>
  );
}

function EolMark({ isEol }: { isEol: boolean }) {
  return (
    <span className={`mark ${isEol ? 'mark-fail' : 'mark-pass'}`}>
      <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" focusable="false">
        {isEol ? <path d="M2 2l8 8M10 2l-8 8" fill="none" stroke="currentColor" strokeWidth="2" /> : <path d="M2 2h8v8h-8z" fill="currentColor" />}
      </svg>
      {isEol ? 'End of life' : 'Supported'}
    </span>
  );
}

function Head({ title, n }: { title: string; n: number }) {
  return (
    <div className="sec-head">
      <h2 className="h-small w-h">{title}</h2>
      <p className="muted small">{n}</p>
    </div>
  );
}

export function WatchView({ vm }: { vm: WatchVM }) {
  const empty = vm.kev.length + vm.epss.length + vm.eol.length + vm.feedItems.length === 0;
  return (
    <div className="grid wv" data-view="watch">
      <div className="col-side">
        <section className="pl-intro">
          <p className="eyebrow">Watch</p>
          <h2 className="pl-h">Exploitation and end-of-life check</h2>
          <p className="muted small">Read-only. Nothing in a repository or account was changed.</p>
          <p>
            <EvidenceChip kind="reported" />
          </p>
          {vm.fetchedAt && <p className="muted small mono">Fetched {stamp(vm.fetchedAt)}</p>}
        </section>
        {vm.unavailable.length > 0 && (
          <section aria-labelledby="w-un">
            <h2 id="w-un" className="h-small">
              Unavailable
            </h2>
            <ul className="notes">
              {vm.unavailable.map((u) => (
                <li key={u}>{u} could not be reached, so it is missing from this result.</li>
              ))}
            </ul>
          </section>
        )}
        {empty && <p className="quiet">The feeds returned nothing for this request.</p>}
      </div>
      <div className="col-main">
        {vm.kev.length > 0 && (
          <section aria-label="Known exploited">
            <Head title="Known exploited (CISA)" n={vm.kev.length} />
            <ul className="findings w-kev">
              {vm.kev.map((k, i) => (
                <li key={k.cveId} className={`w-row ${i === 0 ? 'is-top' : ''}`}>
                  <div>
                    <p className="w-id mono">{k.cveId}</p>
                    <p className="small muted">
                      {k.vendor} {k.product}
                    </p>
                    <Src source={k.source} at={k.fetchedAt} />
                  </div>
                  <div className="w-tags">
                    <span className="tag tag-kev">Known exploited</span>
                    {k.ransomware && <span className="tag">Ransomware use</span>}
                    <span className="small muted">
                      Added {k.dateAdded ?? 'n/a'} · due {k.dueDate ?? 'n/a'}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
        {vm.epss.length > 0 && (
          <section aria-label="Exploit probability">
            <Head title="Exploit probability (EPSS)" n={vm.epss.length} />
            <ul className="w-epss">
              {vm.epss.map((e) => (
                <li key={e.cve}>
                  <span className="mono">{e.cve}</span>
                  <span className="bar bar-reported bar-thin" role="img" aria-label={`EPSS ${e.epss.toFixed(2)}`}>
                    <span style={{ ['--v' as string]: `${Math.max(1, Math.round(e.epss * 100))}%` }} />
                  </span>
                  <span className="w-num">{e.epss.toFixed(2)}</span>
                  <Src source={e.source} at={e.fetchedAt} />
                </li>
              ))}
            </ul>
          </section>
        )}
        {vm.eol.length > 0 && (
          <section aria-label="End of life">
            <Head title="Runtime support" n={vm.eol.length} />
            <table className="tbl">
              <thead>
                <tr>
                  <th scope="col">Release</th>
                  <th scope="col">Status</th>
                  <th scope="col">Support ends</th>
                  <th scope="col">Latest</th>
                  <th scope="col">Source</th>
                </tr>
              </thead>
              <tbody>
                {vm.eol.map((r) => (
                  <tr key={`${r.product}-${r.cycle}`}>
                    <th scope="row" className="mono">
                      {r.product} {r.cycle}
                    </th>
                    <td>
                      <EolMark isEol={r.isEol} />
                    </td>
                    <td className="mono">{r.eolDate ?? 'not set'}</td>
                    <td className="mono">{r.latest ?? ''}</td>
                    <td>
                      <Src source={r.source} at={r.fetchedAt} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
        {vm.feedItems.length > 0 && (
          <section aria-label="Release and security posts">
            <Head title="Release and security posts" n={vm.feedItems.length} />
            <ul className="w-feed">
              {vm.feedItems.map((f, i) => (
                <li key={i}>
                  <p className="w-feed-title">{f.title}</p>
                  <p className="small muted">
                    {f.feed}
                    {f.published ? ` · ${f.published.slice(0, 10)}` : ''}
                  </p>
                  <Src source={f.link ?? f.source} at={f.fetchedAt} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

export function CloudView({ vm }: { vm: CloudVM }) {
  return (
    <div className="grid wv" data-view="cloud">
      <div className="col-side">
        <section className="pl-intro">
          <p className="eyebrow">Cloud inventory</p>
          <h2 className="pl-h">AWS account {vm.account}</h2>
          <p>Read-only scan through an assumed role.</p>
          <p>
            <EvidenceChip kind="reported" label="Reported, emulator-tested" />
          </p>
          <p className="muted small">Regions: {vm.regions.join(', ') || 'none'}. {vm.note}</p>
          {vm.generatedAt && <p className="muted small mono">Scanned {stamp(vm.generatedAt)}</p>}
        </section>
        <section aria-label="Findings by severity">
          <SeverityStrip counts={vm.severityCounts} small />
        </section>
        {vm.limits.length > 0 && (
          <section aria-labelledby="c-lim">
            <h2 id="c-lim" className="h-small">
              Limits
            </h2>
            <ul className="notes">
              {vm.limits.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </section>
        )}
      </div>
      <div className="col-main">
        <section aria-label="Resources found">
          <Head title="Resources found" n={vm.counts.reduce((a, c) => a + c.count, 0)} />
          <ul className="tiles">
            {vm.counts.map((c) => (
              <li key={c.service} className="tile">
                <span className="tile-n">{c.count}</span>
                <span className="tile-l">{c.service}</span>
              </li>
            ))}
          </ul>
        </section>
        <section aria-label="Findings">
          <Head title="Findings, ranked" n={vm.findingsTotal} />
          {vm.findings.length === 0 ? (
            <p className="quiet">No end-of-life findings in what was checked.</p>
          ) : (
            <ol className="findings">
              {vm.findings.map((f, i) => (
                <li key={`${f.id}-${i}`} className={`finding-row sev-${f.severity}`}>
                  <span className="rank">{i + 1}</span>
                  <div className="fr-body">
                    <p className="fr-sev">
                      <SeverityIcon severity={f.severity} />
                      {SEVERITY_LABEL[f.severity]}
                    </p>
                    <h3 className="fr-title c-title">{f.title}</h3>
                    {f.rankReason && <p className="fr-why">Ranked here: {f.rankReason}</p>}
                    {f.source && <p className="fr-why mono">Source: {f.source}</p>}
                  </div>
                  <span />
                </li>
              ))}
            </ol>
          )}
          {vm.moreFindings > 0 && <p className="muted small">{vm.moreFindings} more findings are not listed.</p>}
        </section>
        {vm.notChecked.length > 0 && (
          <section aria-label="Not checked">
            <Head title="Not checked" n={vm.notChecked.length} />
            <table className="tbl">
              <thead>
                <tr>
                  <th scope="col">Service</th>
                  <th scope="col">Region</th>
                  <th scope="col">Code</th>
                  <th scope="col">Why</th>
                </tr>
              </thead>
              <tbody>
                {vm.notChecked.map((n, i) => (
                  <tr key={i}>
                    <th scope="row" className="mono">
                      {n.service}
                    </th>
                    <td className="mono">{n.region ?? 'all'}</td>
                    <td className="mono">{n.code}</td>
                    <td>{n.note ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </div>
    </div>
  );
}
