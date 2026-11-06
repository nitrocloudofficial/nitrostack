import { describe, it, expect } from 'vitest';
import { redact } from '../../src/common/redact.js';

// All values below are synthetic and not real credentials.
describe('redact', () => {
  it('hides an AWS access key id', () => {
    const r = redact(`key ${'AKIA' + 'ABCDEFGHIJKLMNOP'} end`); // built at runtime so secret scanners do not flag the repo
    expect(r.text).toBe('key [REDACTED:aws-access-key] end');
    expect(r.count).toBe(1);
  });

  it('hides GitHub, nitro and sk_ tokens', () => {
    const r = redact(`a ${'ghp_' + '1234567890abcdefghij1234'} b ${'nsk_live_' + 'abcdefghijklmnop1234'} c ${'sk_test_' + 'abcdefghijklmnop'}`);
    expect(r.text).not.toMatch(/ghp_|nsk_live_|sk_test_/);
    expect(r.count).toBe(3);
  });

  it('hides bearer tokens and JWTs', () => {
    const r = redact('Authorization: Bearer abcdefghijklmnop1234 and eyJhbGciOiJI.eyJzdWIiOiIx.c2lnbmF0dXJl');
    expect(r.text).not.toMatch(/abcdefghijklmnop1234|eyJhbGciOiJI/);
    expect(r.count).toBeGreaterThanOrEqual(2);
  });

  it('keeps the key name but hides the value in assignments', () => {
    const r = redact('DB_PASSWORD=hunter2hunter2 and api_key: "abcd1234efgh"');
    expect(r.text).toContain('DB_PASSWORD=[REDACTED]');
    expect(r.text).toContain('api_key: "[REDACTED]"');
    expect(r.text).not.toMatch(/hunter2|abcd1234/);
  });

  it('hides private key blocks', () => {
    const dashes = '-----';
    const r = redact(`x ${dashes}BEGIN RSA PRIVATE ${'KEY'}${dashes}\nMIIabc\n${dashes}END RSA PRIVATE ${'KEY'}${dashes} y`); // assembled at runtime for scanners
    expect(r.text).toBe('x [REDACTED:private-key] y');
  });

  it('leaves ordinary text alone', () => {
    const r = redact('Upgrade lodash from 4.17.15 to 4.17.21. See GHSA-35jh-r3h4-6jhm.');
    expect(r.text).toBe('Upgrade lodash from 4.17.15 to 4.17.21. See GHSA-35jh-r3h4-6jhm.');
    expect(r.count).toBe(0);
  });
});
