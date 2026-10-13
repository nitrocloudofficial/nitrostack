import { db } from '../db/client.js';

export interface IdentityResult {
  canonicalOwnerId: string | null;
  isGroupConsensus: boolean;
  displayOwner: string | null;
}

export const INITIAL_PEOPLE = [
  {
    canonicalName: 'Alice Chen',
    role: 'Staff Infrastructure Engineer',
    team: 'Infrastructure',
    aliases: ['alice', 'alice chen', 'alice from infra', 'alice (infra tech lead)', 'alice c.']
  },
  {
    canonicalName: 'Bob Smith',
    role: 'Lead Backend Engineer',
    team: 'Backend',
    aliases: ['bob', 'bob smith', 'bob (backend)', 'bob s.']
  },
  {
    canonicalName: 'Charlie Davis',
    role: 'Principal Product Manager',
    team: 'Product',
    aliases: ['charlie', 'charlie davis', 'charlie (product)', 'charlie d.']
  },
  {
    canonicalName: 'Dave Miller',
    role: 'Staff Security Engineer',
    team: 'Security',
    aliases: ['dave', 'dave miller', 'dave (security)', 'dave m.']
  },
  {
    canonicalName: 'Eve Johnson',
    role: 'Senior Data Engineer',
    team: 'Data Platform',
    aliases: ['eve', 'eve johnson', 'eve (data)', 'eve j.']
  },
  {
    canonicalName: 'Frank Wright',
    role: 'DevOps Tech Lead',
    team: 'DevOps & SRE',
    aliases: ['frank', 'frank wright', 'frank (devops)', 'frank w.']
  },
  {
    canonicalName: 'Grace Lee',
    role: 'Engineering Director',
    team: 'Engineering Leadership',
    aliases: ['grace', 'grace lee', 'grace (engineering director)', 'grace l.']
  }
];

/**
 * Seeds initial people records into the database
 */
export async function seedPeople(): Promise<void> {
  for (const person of INITIAL_PEOPLE) {
    await db.query(
      `INSERT INTO people (canonical_name, role, team, aliases)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (canonical_name) DO UPDATE 
       SET role = EXCLUDED.role, team = EXCLUDED.team, aliases = EXCLUDED.aliases;`,
      [person.canonicalName, person.role, person.team, person.aliases]
    );
  }
}

/**
 * Resolves a raw owner string to a canonical identity, consensus flag, or null
 */
export async function resolveIdentity(rawOwner?: string | null): Promise<IdentityResult> {
  if (!rawOwner || typeof rawOwner !== 'string') {
    return { canonicalOwnerId: null, isGroupConsensus: false, displayOwner: null };
  }

  const clean = rawOwner.trim().toLowerCase();

  // 1. Group / Team Consensus Detection
  const consensusKeywords = [
    'team consensus', 'consensus', 'engineering team', 'group decision', 
    'team decision', 'unanimous', 'all of us', 'entire team', 'no single owner',
    'joint decision', 'committee', 'architecture committee'
  ];

  if (consensusKeywords.some(kw => clean.includes(kw))) {
    return {
      canonicalOwnerId: null,
      isGroupConsensus: true,
      displayOwner: 'Team Consensus (No Single Owner)'
    };
  }

  // 2. Unclear / Unknown Detection
  const unknownKeywords = ['unknown', 'unclear', 'n/a', 'none', 'undecided', 'someone', 'tbd', 'unclear speaker'];
  if (unknownKeywords.includes(clean) || clean.startsWith('unclear') || clean.startsWith('unknown')) {
    return {
      canonicalOwnerId: null,
      isGroupConsensus: false,
      displayOwner: null
    };
  }

  // 3. Match against People table (exact name or alias)
  const peopleRes = await db.query('SELECT id, canonical_name, aliases FROM people;');

  for (const person of peopleRes.rows) {
    const canonicalNameLower = person.canonical_name.toLowerCase();
    if (clean === canonicalNameLower || clean.includes(canonicalNameLower)) {
      return {
        canonicalOwnerId: person.id,
        isGroupConsensus: false,
        displayOwner: person.canonical_name
      };
    }

    if (Array.isArray(person.aliases)) {
      for (const alias of person.aliases) {
        if (clean === alias.toLowerCase() || clean.includes(alias.toLowerCase())) {
          return {
            canonicalOwnerId: person.id,
            isGroupConsensus: false,
            displayOwner: person.canonical_name
          };
        }
      }
    }
  }

  // 4. Default: If not matched in database, capitalize nicely as a single owner
  const capitalized = rawOwner.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  return {
    canonicalOwnerId: null,
    isGroupConsensus: false,
    displayOwner: capitalized
  };
}
