import { Injectable } from '@nitrostack/core';

/**
 * The "Brain" — vector store of meeting history, plus external search
 * (plan.md Section 3.A.1). Provider chosen via VECTOR_DB_PROVIDER
 * ("chroma" for local dev, "pinecone" for hosted). Both branches are
 * stubbed: wire in the client SDK of your choice here.
 */
@Injectable()
export class BrainService {
  private provider = process.env.VECTOR_DB_PROVIDER ?? 'chroma';

  async embedAndStore(meetingId: string, transcript: string): Promise<string> {
    // TODO(Phase 2): chunk `transcript`, embed it, upsert into
    // Chroma/Pinecone keyed by meetingId, return the vector record id.
    throw new Error(`embedAndStore not implemented for provider "${this.provider}"`);
  }

  async queryContext(query: string, topK = 5): Promise<Array<{ meetingId: string; snippet: string; score: number }>> {
    // TODO(Phase 2): similarity search against the vector store,
    // return the top-k most relevant past-meeting snippets.
    throw new Error(`queryContext not implemented for provider "${this.provider}"`);
  }

  async searchWeb(query: string): Promise<Array<{ title: string; url: string; snippet: string }>> {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
      throw new Error('TAVILY_API_KEY not set — external search is disabled until configured.');
    }
    // TODO(Phase 4): call Tavily's search API with `apiKey` and map results.
    throw new Error('Tavily integration not yet wired up.');
  }
}
