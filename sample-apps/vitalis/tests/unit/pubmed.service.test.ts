import { describe, expect, it, vi } from 'vitest';
import { env } from '../../src/config/env.js';
import { PubMedService } from '../../src/integrations/pubmed.service.js';

const XML_WITH_MISSING_ABSTRACT = `
<PubmedArticleSet>
  <PubmedArticle>
    <MedlineCitation><PMID>12345</PMID><Article><ArticleTitle>Known title</Article></Article></MedlineCitation>
  </PubmedArticle>
  <PubmedArticle>
    <MedlineCitation><PMID>67890</PMID><Article>
      <Abstract><AbstractText Label="BACKGROUND">Useful evidence.</AbstractText></Abstract>
    </Article></MedlineCitation>
  </PubmedArticle>
</PubmedArticleSet>`;

describe('PubMedService shared HTTP integration', () => {
  it('uses bounded HttpClientService for EFetch XML and preserves NCBI etiquette parameters', async () => {
    const previousEmail = env.NCBI_EMAIL;
    const previousKey = env.NCBI_API_KEY;
    (env as any).NCBI_EMAIL = 'test@example.com';
    (env as any).NCBI_API_KEY = 'test-api-key';

    const getText = vi.fn().mockResolvedValue({ data: XML_WITH_MISSING_ABSTRACT });
    const service = new PubMedService({ getText } as any);

    try {
      const result = await service.getAbstractsXml(['12345', '67890']);
      const request = getText.mock.calls[0][0];
      const url = new URL(request.url);

      expect(request.api).toBe('pubmed');
      expect(request.headers).toEqual({ Accept: 'application/xml' });
      expect(url.searchParams.get('tool')).toBe('vitalis');
      expect(url.searchParams.get('email')).toBe('test@example.com');
      expect(url.searchParams.get('api_key')).toBe('test-api-key');
      expect(url.searchParams.get('retmode')).toBe('xml');
      expect(result.get('12345')).toEqual({ abstract: null, meshTerms: [] });
      expect(result.get('67890')?.abstract).toContain('BACKGROUND: Useful evidence.');
    } finally {
      (env as any).NCBI_EMAIL = previousEmail;
      (env as any).NCBI_API_KEY = previousKey;
    }
  });

  it('returns an empty map for malformed XML without bypassing the shared client', async () => {
    const getText = vi.fn().mockResolvedValue({ data: '<not-valid-pubmed>' });
    const service = new PubMedService({ getText } as any);

    await expect(service.getAbstracts(['12345'])).resolves.toEqual(new Map());
    expect(getText).toHaveBeenCalledTimes(1);
  });
});
