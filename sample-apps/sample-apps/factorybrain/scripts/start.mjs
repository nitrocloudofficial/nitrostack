process.env.NODE_ENV ||= 'production';

const port = Number(process.env.PORT) || 3000;
process.env.PORT = String(port);

await import('../dist/index.js');
