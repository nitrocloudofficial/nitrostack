import { db } from './db/client.js';

async function buildGraphRelationships() {
  console.log('=== BUILDING GRAPH RELATIONSHIP EDGES IN DECISION_GRAPH_LINKS ===\n');

  const decsRes = await db.query(`SELECT id, decision, rationale, topic, source_name FROM decision_events ORDER BY created_at ASC;`);
  const decs = decsRes.rows;

  const relationshipRules = [
    { fromKeyword: 'pinecone', toKeyword: 'postgres', type: 'supersedes' },
    { fromKeyword: 'envoy', toKeyword: 'kong', type: 'supersedes' },
    { fromKeyword: 'cloudflare', toKeyword: 'envoy', type: 'supersedes' },
    { fromKeyword: 'eks', toKeyword: 'ecs', type: 'supersedes' },
    { fromKeyword: 'typesense', toKeyword: 'elasticsearch', type: 'supersedes' },
    { fromKeyword: 'clerk', toKeyword: 'auth0', type: 'supersedes' },
    { fromKeyword: 'growthbook', toKeyword: 'launchdarkly', type: 'supersedes' },
    { fromKeyword: 'grafana', toKeyword: 'datadog', type: 'supersedes' },
    { fromKeyword: 'kafka', toKeyword: 'rabbitmq', type: 'supersedes' },
    { fromKeyword: 'pair programming', toKeyword: 'take-home', type: 'revises' },
    { fromKeyword: '12-hour', toKeyword: '24/7', type: 'revises' },
    { fromKeyword: 'rds', toKeyword: 'postgres', type: 'depends_on' },
    { fromKeyword: 'snyk', toKeyword: 'pair programming', type: 'depends_on' },
    { fromKeyword: 'sse', toKeyword: 'redis', type: 'depends_on' }
  ];

  let addedCount = 0;

  for (const decA of decs) {
    for (const decB of decs) {
      if (decA.id === decB.id) continue;

      const textA = `${decA.decision} ${decA.rationale}`.toLowerCase();
      const textB = `${decB.decision} ${decB.rationale}`.toLowerCase();

      for (const rule of relationshipRules) {
        if (textA.includes(rule.fromKeyword) && textB.includes(rule.toKeyword)) {
          await db.query(
            `INSERT INTO decision_graph_links (from_decision_id, to_decision_id, relationship_type)
             VALUES ($1, $2, $3)
             ON CONFLICT (from_decision_id, to_decision_id) DO UPDATE SET relationship_type = EXCLUDED.relationship_type;`,
            [decA.id, decB.id, rule.type]
          );
          console.log(`  🔗 Edge: [${decA.decision.slice(0, 30)}] --(${rule.type.toUpperCase()})--> [${decB.decision.slice(0, 30)}]`);
          addedCount++;
        }
      }
    }
  }

  console.log(`\n✅ Populated ${addedCount} directed graph edges in decision_graph_links.`);

  const statsRes = await db.query(`
    SELECT relationship_type, count(*) 
    FROM decision_graph_links 
    GROUP BY relationship_type;
  `);

  console.log('\n--- DECISION GRAPH EDGES STATS ---');
  statsRes.rows.forEach(r => console.log(`  - ${r.relationship_type.toUpperCase()}: ${r.count}`));

  await db.end();
}

buildGraphRelationships().catch(console.error);
