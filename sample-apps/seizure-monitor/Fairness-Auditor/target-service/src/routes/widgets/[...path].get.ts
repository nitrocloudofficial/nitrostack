import { defineEventHandler, getRouterParam } from 'h3';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export default defineEventHandler((event) => {
  const pathParam = getRouterParam(event, 'path') || '';
  const basePath = join(process.cwd(), 'src', 'widgets', 'app');
  let filePath = join(basePath, pathParam);

  if (existsSync(filePath) && readFileSync(filePath).toString().length > 0) {
    event.node.res.setHeader('Content-Type', filePath.endsWith('.html') ? 'text/html' : 'text/plain');
    return readFileSync(filePath, 'utf-8');
  }

  // Fallback if path is directory or without index.html
  const indexPath = join(filePath, 'index.html');
  if (existsSync(indexPath)) {
    event.node.res.setHeader('Content-Type', 'text/html');
    return readFileSync(indexPath, 'utf-8');
  }

  event.node.res.statusCode = 404;
  return 'Widget Not Found';
});
