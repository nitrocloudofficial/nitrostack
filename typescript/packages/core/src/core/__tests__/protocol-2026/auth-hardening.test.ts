/**
 * 2026-07-28 authorization hardening.
 *
 * Covers RFC 9207 `iss` validation (SEP-2468), `application_type` inference
 * (SEP-837), issuer-bound credentials (SEP-2352), and Client ID Metadata
 * Documents (CIMD, the final-spec DCR replacement). All additive; the legacy
 * DCR path is unchanged.
 */

describe('SEP-2468 / RFC 9207 iss validation', () => {
  it('accepts a matching issuer (ignoring trailing slash)', async () => {
    const { OAuth2Client } = await import('../../../auth/client.js');
    expect(() =>
      OAuth2Client.validateAuthorizationIssuer('https://as.example.com', 'https://as.example.com/'),
    ).not.toThrow();
  });

  it('throws on an issuer mismatch (mix-up defense)', async () => {
    const { OAuth2Client } = await import('../../../auth/client.js');
    expect(() =>
      OAuth2Client.validateAuthorizationIssuer('https://evil.example.com', 'https://as.example.com'),
    ).toThrow(/issuer mismatch/i);
  });

  it('throws when iss is missing entirely', async () => {
    const { OAuth2Client } = await import('../../../auth/client.js');
    expect(() => OAuth2Client.validateAuthorizationIssuer(undefined, 'https://as.example.com')).toThrow(
      /missing the required `iss`/i,
    );
  });
});

describe('SEP-837 application_type inference', () => {
  it('recognizes loopback redirect URIs', async () => {
    const { OAuth2Client } = await import('../../../auth/client.js');
    expect(OAuth2Client.isLoopbackRedirect('http://localhost:8080/cb')).toBe(true);
    expect(OAuth2Client.isLoopbackRedirect('http://127.0.0.1/cb')).toBe(true);
    expect(OAuth2Client.isLoopbackRedirect('https://app.example.com/cb')).toBe(false);
    expect(OAuth2Client.isLoopbackRedirect('not a url')).toBe(false);
  });
});

describe('SEP-2352 issuer-bound credentials', () => {
  it('returns a token whose issuer matches the expected issuer', async () => {
    const { MemoryTokenStore, getIssuerBoundToken } = await import('../../../auth/token-store.js');
    const store = new MemoryTokenStore();
    await store.saveToken('svc', {
      access_token: 'a',
      token_type: 'Bearer',
      expires_at: Date.now() + 3_600_000,
      issuer: 'https://as.example.com',
    });
    const token = await getIssuerBoundToken(store, 'svc', 'https://as.example.com/');
    expect(token?.access_token).toBe('a');
  });

  it('drops a token bound to a different issuer and returns null', async () => {
    const { MemoryTokenStore, getIssuerBoundToken } = await import('../../../auth/token-store.js');
    const store = new MemoryTokenStore();
    await store.saveToken('svc', {
      access_token: 'a',
      token_type: 'Bearer',
      expires_at: Date.now() + 3_600_000,
      issuer: 'https://old-as.example.com',
    });
    const token = await getIssuerBoundToken(store, 'svc', 'https://new-as.example.com');
    expect(token).toBeNull();
    // The stale credential must be removed.
    expect(await store.getToken('svc')).toBeNull();
  });

  it('is backward compatible with tokens that have no recorded issuer', async () => {
    const { MemoryTokenStore, getIssuerBoundToken, tokenResponseToStored } = await import(
      '../../../auth/token-store.js'
    );
    const store = new MemoryTokenStore();
    await store.saveToken('svc', tokenResponseToStored({ access_token: 'a', token_type: 'Bearer', expires_in: 3600 }));
    const token = await getIssuerBoundToken(store, 'svc', 'https://as.example.com');
    expect(token?.access_token).toBe('a');
  });

  it('records the issuer when converting a token response', async () => {
    const { tokenResponseToStored } = await import('../../../auth/token-store.js');
    const stored = tokenResponseToStored(
      { access_token: 'a', token_type: 'Bearer', expires_in: 3600 },
      'https://api.example.com',
      'https://as.example.com',
    );
    expect(stored.issuer).toBe('https://as.example.com');
    expect(stored.resource).toBe('https://api.example.com');
  });
});

describe('CIMD (Client ID Metadata Documents)', () => {
  it('builds a document whose client_id is the HTTPS URL', async () => {
    const { createClientIdMetadataDocument } = await import('../../../auth/cimd.js');
    const doc = createClientIdMetadataDocument('https://client.example.com/id.json', {
      redirect_uris: ['https://client.example.com/cb'],
      client_name: 'Example',
    });
    expect(doc.client_id).toBe('https://client.example.com/id.json');
    expect(doc.redirect_uris).toEqual(['https://client.example.com/cb']);
  });

  it('rejects a non-HTTPS, non-loopback client_id URL', async () => {
    const { createClientIdMetadataDocument } = await import('../../../auth/cimd.js');
    expect(() =>
      createClientIdMetadataDocument('http://client.example.com/id.json', {
        redirect_uris: ['https://client.example.com/cb'],
      }),
    ).toThrow(/HTTPS/i);
  });

  it('allows loopback http during development', async () => {
    const { createClientIdMetadataDocument } = await import('../../../auth/cimd.js');
    const doc = createClientIdMetadataDocument('http://localhost:3000/id.json', {
      redirect_uris: ['http://localhost:3000/cb'],
    });
    expect(doc.client_id).toBe('http://localhost:3000/id.json');
  });

  it('validates that client_id matches the source URL (anti-impersonation)', async () => {
    const { validateClientIdMetadataDocument } = await import('../../../auth/cimd.js');
    const good = validateClientIdMetadataDocument(
      { client_id: 'https://client.example.com/id.json', redirect_uris: ['https://client.example.com/cb'] },
      'https://client.example.com/id.json/',
    );
    expect(good.client_id).toBe('https://client.example.com/id.json');

    expect(() =>
      validateClientIdMetadataDocument(
        { client_id: 'https://evil.example.com/id.json', redirect_uris: [] },
        'https://client.example.com/id.json',
      ),
    ).toThrow(/does not match/i);
  });

  it('resolves a document over a supplied fetch impl', async () => {
    const { resolveClientIdMetadataDocument } = await import('../../../auth/cimd.js');
    const url = 'https://client.example.com/id.json';
    const fetchImpl = (async () =>
      ({
        ok: true,
        status: 200,
        json: async () => ({ client_id: url, redirect_uris: ['https://client.example.com/cb'] }),
      }) as unknown as Response) as unknown as typeof fetch;
    const dnsLookupImpl = (async () => [{ address: '93.184.216.34', family: 4 }]) as any;
    const doc = await resolveClientIdMetadataDocument(url, { fetchImpl, dnsLookupImpl });
    expect(doc.client_id).toBe(url);
  });

  it('distinguishes CIMD URLs from opaque DCR ids', async () => {
    const { isClientIdMetadataUrl } = await import('../../../auth/cimd.js');
    expect(isClientIdMetadataUrl('https://client.example.com/id.json')).toBe(true);
    expect(isClientIdMetadataUrl('abc123-opaque-dcr-id')).toBe(false);
  });

  it('blocks CIMD resolution targeting RFC 6890 cloud metadata and private IP addresses (SSRF defense)', async () => {
    const { resolveClientIdMetadataDocument } = await import('../../../auth/cimd.js');

    // Cloud metadata literal IP
    await expect(
      resolveClientIdMetadataDocument('http://169.254.169.254/latest/meta-data', { allowLoopback: false })
    ).rejects.toThrow(/special-use IP/i);

    // RFC 1918 private literal IP
    await expect(
      resolveClientIdMetadataDocument('http://10.0.0.1/id.json', { allowLoopback: false })
    ).rejects.toThrow(/special-use IP/i);

    // Hostname resolving to private IP via DNS lookup
    const dnsResolvingPrivate = (async () => [{ address: '192.168.1.50', family: 4 }]) as any;
    await expect(
      resolveClientIdMetadataDocument('https://internal.example.com/id.json', {
        allowLoopback: false,
        dnsLookupImpl: dnsResolvingPrivate,
      })
    ).rejects.toThrow(/special-use IP/i);
  });

  it('rejects HTTP 301, 302, 307, 308 redirects without following (F-05-03)', async () => {
    const { resolveClientIdMetadataDocument } = await import('../../../auth/cimd.js');
    const redirectFetch = (async (_url: string, init?: RequestInit) => {
      expect(init?.redirect).toBe('error');
      return {
        ok: false,
        status: 302,
        headers: new Headers({ Location: 'https://evil.example.com/id.json' }),
        json: async () => ({}),
      } as unknown as Response;
    }) as unknown as typeof fetch;

    const dnsLookupImpl = (async () => [{ address: '93.184.216.34', family: 4 }]) as any;

    await expect(
      resolveClientIdMetadataDocument('https://client.example.com/id.json', {
        fetchImpl: redirectFetch,
        dnsLookupImpl,
      })
    ).rejects.toThrow(/HTTP 302/i);
  });

  it('rejects document payloads larger than 5 KiB / 5120 bytes (F-05-04)', async () => {
    const { resolveClientIdMetadataDocument, MAX_CIMD_DOCUMENT_BYTES } = await import('../../../auth/cimd.js');
    expect(MAX_CIMD_DOCUMENT_BYTES).toBe(5120);

    const largeDoc = {
      client_id: 'https://client.example.com/id.json',
      redirect_uris: ['https://client.example.com/cb'],
      padding: 'A'.repeat(6000), // > 5120 bytes
    };

    // Test 1: Rejected via Content-Length header
    const mockFetchWithHeader = (async () => ({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-length': '7000' }),
      text: async () => JSON.stringify(largeDoc),
      json: async () => largeDoc,
    })) as unknown as typeof fetch;

    const dnsLookupImpl = (async () => [{ address: '93.184.216.34', family: 4 }]) as any;

    await expect(
      resolveClientIdMetadataDocument('https://client.example.com/id.json', {
        fetchImpl: mockFetchWithHeader,
        dnsLookupImpl,
      })
    ).rejects.toThrow(/maximum allowed size/i);

    // Test 2: Rejected via body size check when Content-Length is missing
    const mockFetchWithoutHeader = (async () => ({
      ok: true,
      status: 200,
      headers: new Headers(),
      text: async () => JSON.stringify(largeDoc),
    })) as unknown as typeof fetch;

    await expect(
      resolveClientIdMetadataDocument('https://client.example.com/id.json', {
        fetchImpl: mockFetchWithoutHeader,
        dnsLookupImpl,
      })
    ).rejects.toThrow(/maximum allowed size/i);
  });

  describe('CIMD URL Component Validation (F-04-01)', () => {
    it('rejects URLs containing userinfo (username / password)', async () => {
      const { createClientIdMetadataDocument, validateClientIdentifierUrl } = await import('../../../auth/cimd.js');
      expect(() =>
        createClientIdMetadataDocument('https://user:pass@client.example.com/id.json', { redirect_uris: [] })
      ).toThrow(/userinfo/i);
      expect(() =>
        validateClientIdentifierUrl('https://admin@client.example.com/id.json')
      ).toThrow(/userinfo/i);
    });

    it('rejects URLs containing a fragment component', async () => {
      const { createClientIdMetadataDocument, validateClientIdentifierUrl } = await import('../../../auth/cimd.js');
      expect(() =>
        createClientIdMetadataDocument('https://client.example.com/id.json#section', { redirect_uris: [] })
      ).toThrow(/fragment/i);
      expect(() =>
        validateClientIdentifierUrl('https://client.example.com/id.json#token')
      ).toThrow(/fragment/i);
    });

    it('rejects URLs without a path component (bare origin)', async () => {
      const { createClientIdMetadataDocument, validateClientIdentifierUrl } = await import('../../../auth/cimd.js');
      expect(() =>
        createClientIdMetadataDocument('https://client.example.com', { redirect_uris: [] })
      ).toThrow(/path component/i);
      expect(() =>
        validateClientIdentifierUrl('https://client.example.com/')
      ).toThrow(/path component/i);
    });

    it('rejects URLs containing single-dot or double-dot path segments', async () => {
      const { createClientIdMetadataDocument, validateClientIdentifierUrl } = await import('../../../auth/cimd.js');
      expect(() =>
        createClientIdMetadataDocument('https://client.example.com/a/../b/id.json', { redirect_uris: [] })
      ).toThrow(/dot/i);
      expect(() =>
        validateClientIdentifierUrl('https://client.example.com/./id.json')
      ).toThrow(/dot/i);
    });
  });

  describe('CIMD Request Timeout & AbortSignal (F-06-02)', () => {
    it('aborts when document fetch exceeds configured timeout', async () => {
      const { resolveClientIdMetadataDocument, DEFAULT_CIMD_FETCH_TIMEOUT_MS } = await import('../../../auth/cimd.js');
      expect(DEFAULT_CIMD_FETCH_TIMEOUT_MS).toBe(5000);

      const slowFetch = (async (_url: string, init?: RequestInit) => {
        return new Promise<Response>((_, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new Error('The operation was aborted')));
        });
      }) as unknown as typeof fetch;

      const dnsLookupImpl = (async () => [{ address: '93.184.216.34', family: 4 }]) as any;

      await expect(
        resolveClientIdMetadataDocument('https://client.example.com/id.json', {
          fetchImpl: slowFetch,
          dnsLookupImpl,
          timeoutMs: 50,
        })
      ).rejects.toThrow(/aborted/i);
    });

    it('propagates caller-supplied AbortSignal', async () => {
      const { resolveClientIdMetadataDocument } = await import('../../../auth/cimd.js');
      const controller = new AbortController();
      controller.abort();

      const mockFetch = (async (_url: string, init?: RequestInit) => {
        if (init?.signal?.aborted) {
          throw new Error('This operation was aborted');
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({ client_id: 'https://client.example.com/id.json', redirect_uris: [] }),
        } as unknown as Response;
      }) as unknown as typeof fetch;

      const dnsLookupImpl = (async () => [{ address: '93.184.216.34', family: 4 }]) as any;

      await expect(
        resolveClientIdMetadataDocument('https://client.example.com/id.json', {
          fetchImpl: mockFetch,
          dnsLookupImpl,
          signal: controller.signal,
        })
      ).rejects.toThrow(/aborted/i);
    });
  });

  describe('CIMD Client ID Classification (F-03-01)', () => {
    it('correctly identifies valid URLs and rejects opaque IDs or malformed URLs', async () => {
      const { isClientIdMetadataUrl } = await import('../../../auth/cimd.js');
      expect(isClientIdMetadataUrl('https://client.example.com/id.json')).toBe(true);
      expect(isClientIdMetadataUrl('http://localhost:3000/id.json')).toBe(true);
      expect(isClientIdMetadataUrl('opaque-dcr-client-123')).toBe(false);
      expect(isClientIdMetadataUrl('http://')).toBe(false);
      expect(isClientIdMetadataUrl('')).toBe(false);
      expect(isClientIdMetadataUrl('   ')).toBe(false);
      expect(isClientIdMetadataUrl(null as any)).toBe(false);
      expect(isClientIdMetadataUrl(undefined as any)).toBe(false);
    });
  });
});

