import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const transport = new StdioClientTransport({
  command: process.execPath,
  args: ['dist/index.js'],
  cwd: process.cwd(),
});

const client = new Client({ name: 'extract-sample', version: '1.0.0' });

async function call(name: string, args: Record<string, unknown>) {
  const res = await client.callTool({ name, arguments: args });
  const text = res.content?.[0]?.text;
  try {
    return JSON.parse(text as string);
  } catch {
    return text;
  }
}

await client.connect(transport);

const { sample } = (await call('get_sample_transcript', {})) as any;
console.log(`Sample: ${sample.transcript_id} (${sample.meeting_date})\n`);

const result = (await call('extract_commitments', {
  transcript_text: sample.text,
  participants: sample.participants,
  meeting_date: sample.meeting_date,
})) as any;

console.log('extracted_count:', result.extracted_count);
for (const c of result.commitments) {
  console.log(
    `  ${c.owner.name.padEnd(12)} ${c.confidence_level.padEnd(12)} ${c.what} [${c.due_date || 'no due'}] -> ${c.linked_ticket_id}`
  );
}

await client.close();
console.log('\nCheck the NITRO_LOG:: line above: llm_provider "openrouter" = API used, "offline" = fallback.');
