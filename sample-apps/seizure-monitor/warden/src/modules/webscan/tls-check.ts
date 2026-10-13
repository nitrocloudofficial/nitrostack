/**
 * Minimal TLS certificate check via Node's built-in `tls` module — no
 * external dependency, no API key. Connects, reads the peer certificate and
 * negotiated protocol, then closes. `rejectUnauthorized: false` is
 * deliberate: we want to *report* an invalid/self-signed/expired cert as a
 * finding, not throw before we can inspect it.
 */

import tls from "node:tls";

export interface TlsResult {
  host: string;
  connected: boolean;
  protocol?: string | null;
  valid_from?: string;
  valid_to?: string;
  days_until_expiry?: number;
  issuer?: string;
  subject?: string;
  self_signed?: boolean;
  warnings: string[];
  error?: string;
}

export function checkTls(host: string, port = 443, timeoutMs = 5000): Promise<TlsResult> {
  return new Promise((resolve) => {
    const warnings: string[] = [];
    let settled = false;

    const socket = tls.connect(
      { host, port, servername: host, timeout: timeoutMs, rejectUnauthorized: false },
      () => {
        if (settled) return;
        settled = true;

        const cert = socket.getPeerCertificate();
        const protocol = socket.getProtocol();

        let daysUntilExpiry: number | undefined;
        if (cert?.valid_to) {
          daysUntilExpiry = Math.round((new Date(cert.valid_to).getTime() - Date.now()) / 86_400_000);
          if (daysUntilExpiry < 0) warnings.push("Certificate has expired.");
          else if (daysUntilExpiry < 30) warnings.push(`Certificate expires in ${daysUntilExpiry} day(s).`);
        }

        const selfSigned =
          !!cert?.issuer && !!cert?.subject && JSON.stringify(cert.issuer) === JSON.stringify(cert.subject);
        if (selfSigned) warnings.push("Certificate appears to be self-signed.");

        if (protocol && /^TLSv1(\.1)?$/.test(protocol)) warnings.push(`Outdated TLS protocol negotiated (${protocol}).`);
        if (!socket.authorized) warnings.push(`Certificate is not trusted by Node's default CA store (${socket.authorizationError}).`);

        const asString = (v: string | string[] | undefined): string | undefined =>
          Array.isArray(v) ? v[0] : v;

        resolve({
          host,
          connected: true,
          protocol,
          valid_from: cert?.valid_from,
          valid_to: cert?.valid_to,
          days_until_expiry: daysUntilExpiry,
          issuer: asString(cert?.issuer?.O) ?? asString(cert?.issuer?.CN),
          subject: asString(cert?.subject?.CN),
          self_signed: selfSigned,
          warnings,
        });
        socket.end();
      }
    );

    socket.on("error", (err) => {
      if (settled) return;
      settled = true;
      resolve({ host, connected: false, warnings, error: err instanceof Error ? err.message : String(err) });
    });

    socket.on("timeout", () => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve({ host, connected: false, warnings, error: "TLS connection timed out." });
    });
  });
}
