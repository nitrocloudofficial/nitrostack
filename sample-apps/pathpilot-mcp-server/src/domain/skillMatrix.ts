import { PathwayId } from './models.js';

export interface SkillDefinition {
  name: string;
  pathway: PathwayId;
  order: number;
  description: string;
  nextEvidencePrompt: string;
  prerequisites: string[];
  verifiedThreshold: number;
  partialThreshold: number;
}

export const FULL_STACK_SKILLS: SkillDefinition[] = [
  {
    name: 'HTML',
    pathway: 'full-stack-developer',
    order: 1,
    description: 'Semantic markup, templates, JSX/TSX rendering, document structure',
    nextEvidencePrompt: 'Add a multi-page HTML structure with semantic elements (header, nav, main, footer, article, section) or several React components with meaningful JSX.',
    prerequisites: [],
    verifiedThreshold: 75,
    partialThreshold: 25,
  },
  {
    name: 'CSS',
    pathway: 'full-stack-developer',
    order: 2,
    description: 'Styling: selectors, layout (flex/grid), responsive design, component styling',
    nextEvidencePrompt: 'Add responsive layout with Flexbox or Grid plus a styled component file (CSS modules, styled-components, or SCSS) with multiple rules.',
    prerequisites: [],
    verifiedThreshold: 75,
    partialThreshold: 25,
  },
  {
    name: 'JavaScript',
    pathway: 'full-stack-developer',
    order: 3,
    description: 'Core language features: functions, arrays, objects, async, DOM, modules',
    nextEvidencePrompt: 'Add multiple JS files with logic (array methods, async/await, functions, classes, event handlers, or modules).',
    prerequisites: ['HTML', 'CSS'],
    verifiedThreshold: 75,
    partialThreshold: 25,
  },
  {
    name: 'TypeScript',
    pathway: 'full-stack-developer',
    order: 4,
    description: 'Types, interfaces, generics, tsconfig, typed source files',
    nextEvidencePrompt: 'Add a tsconfig.json and multiple .ts/.tsx files with interfaces, type annotations, or generics.',
    prerequisites: ['JavaScript'],
    verifiedThreshold: 75,
    partialThreshold: 25,
  },
  {
    name: 'React',
    pathway: 'full-stack-developer',
    order: 5,
    description: 'Components, JSX, hooks (useState, useEffect, useCallback), props, state management',
    nextEvidencePrompt: 'Add multiple React components with useState/useEffect hooks, props passing, and a react dependency in package.json.',
    prerequisites: ['HTML', 'JavaScript'],
    verifiedThreshold: 75,
    partialThreshold: 25,
  },
  {
    name: 'Node.js',
    pathway: 'full-stack-developer',
    order: 6,
    description: 'Node runtime: package.json scripts, modules, fs/path usage, process/env',
    nextEvidencePrompt: 'Add a Node.js entry point with package.json scripts (start, dev, build) and CommonJS or ESM modules.',
    prerequisites: ['JavaScript'],
    verifiedThreshold: 75,
    partialThreshold: 25,
  },
  {
    name: 'Express',
    pathway: 'full-stack-developer',
    order: 7,
    description: 'Express server: routes, middleware, request/response handling, REST routes',
    nextEvidencePrompt: 'Add an Express server file with app.use middleware and at least two route handlers (GET, POST).',
    prerequisites: ['Node.js'],
    verifiedThreshold: 75,
    partialThreshold: 25,
  },
  {
    name: 'REST API Integration',
    pathway: 'full-stack-developer',
    order: 8,
    description: 'Client-side fetch/axios calls or server-side REST route handlers with request/response handling',
    nextEvidencePrompt: 'Add fetch/axios calls to a public API with loading/error states, or Express REST endpoints that accept params/body and return JSON.',
    prerequisites: ['JavaScript'],
    verifiedThreshold: 75,
    partialThreshold: 25,
  },
  {
    name: 'Database',
    pathway: 'full-stack-developer',
    order: 9,
    description: 'Persistence layer: ORM (Mongoose, Prisma, Sequelize), SQL driver (pg, mysql), schema definitions, queries',
    nextEvidencePrompt: 'Add a database dependency (mongoose/pg/prisma/mongodb) plus a model/schema file or actual queries (CRUD).',
    prerequisites: ['Node.js'],
    verifiedThreshold: 75,
    partialThreshold: 25,
  },
  {
    name: 'Git',
    pathway: 'full-stack-developer',
    order: 10,
    description: 'Version control: multiple commits, meaningful messages, branches, PR hints in commit history',
    nextEvidencePrompt: 'Add more commits to the repository with descriptive messages showing iterative development.',
    prerequisites: [],
    verifiedThreshold: 60,
    partialThreshold: 20,
  },
  {
    name: 'Deployment',
    pathway: 'full-stack-developer',
    order: 11,
    description: 'Deployment configuration: Vercel/Netlify config, Dockerfile, CI workflow, deployed URL',
    nextEvidencePrompt: 'Add a vercel.json / netlify.toml / Dockerfile or GitHub Actions workflow file in .github/workflows.',
    prerequisites: [],
    verifiedThreshold: 60,
    partialThreshold: 20,
  },
];

export function getSkillsForPathway(pathway: PathwayId): SkillDefinition[] {
  switch (pathway) {
    case 'full-stack-developer':
      return [...FULL_STACK_SKILLS].sort((a, b) => a.order - b.order);
    default:
      return [...FULL_STACK_SKILLS].sort((a, b) => a.order - b.order);
  }
}

export function getSkillNames(pathway: PathwayId): string[] {
  return getSkillsForPathway(pathway).map((s) => s.name);
}

export function findSkillDefinition(skillName: string, pathway: PathwayId): SkillDefinition | undefined {
  return getSkillsForPathway(pathway).find((s) => s.name === skillName);
}
