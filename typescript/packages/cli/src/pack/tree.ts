type TreeStatus = 'included' | 'excluded' | 'container';

interface TreeNode {
  name: string;
  status: TreeStatus;
  children: Map<string, TreeNode>;
}

function ensureChild(parent: TreeNode, name: string, status: TreeStatus): TreeNode {
  const existing = parent.children.get(name);
  if (existing) {
    // Prefer leaf status over container when the same name appears
    if (existing.status === 'container' && status !== 'container') {
      existing.status = status;
    }
    return existing;
  }

  const node: TreeNode = {
    name,
    status,
    children: new Map(),
  };
  parent.children.set(name, node);
  return node;
}

function insertPath(root: TreeNode, relativePath: string, status: 'included' | 'excluded'): void {
  const normalized = relativePath.replace(/\/+$/, '');
  if (!normalized) return;

  const parts = normalized.split('/').filter(Boolean);
  let current = root;

  for (let i = 0; i < parts.length; i++) {
    const isLeaf = i === parts.length - 1;
    const partName = isLeaf && relativePath.endsWith('/') ? `${parts[i]}/` : parts[i];
    const nodeStatus: TreeStatus = isLeaf ? status : 'container';
    current = ensureChild(current, partName, nodeStatus);
  }
}

function statusSymbol(status: TreeStatus): string {
  if (status === 'included') return '✅';
  if (status === 'excluded') return '❌';
  return '';
}

function renderNode(node: TreeNode, prefix: string, isLast: boolean, lines: string[]): void {
  const branch = isLast ? '└── ' : '├── ';
  const symbol = statusSymbol(node.status);
  const label = symbol ? `${node.name.padEnd(32)} ${symbol}` : node.name;
  lines.push(`${prefix}${branch}${label}`);

  const children = Array.from(node.children.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const childPrefix = prefix + (isLast ? '    ' : '│   ');

  children.forEach((child, index) => {
    renderNode(child, childPrefix, index === children.length - 1, lines);
  });
}

/**
 * Build an ASCII tree with ✅ (included) and ❌ (excluded) markers.
 */
export function formatPackTree(
  projectName: string,
  includedPaths: string[],
  excludedPaths: string[],
): string {
  const root: TreeNode = {
    name: `${projectName}/`,
    status: 'container',
    children: new Map(),
  };

  for (const included of includedPaths) {
    insertPath(root, included, 'included');
  }
  for (const excluded of excludedPaths) {
    insertPath(root, excluded, 'excluded');
  }

  const lines: string[] = [root.name];
  const children = Array.from(root.children.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  children.forEach((child, index) => {
    renderNode(child, '', index === children.length - 1, lines);
  });

  return lines.join('\n');
}
