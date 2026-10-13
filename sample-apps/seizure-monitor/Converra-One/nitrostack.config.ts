/**
 * NitroStack Cloud & Platform Deployment Configuration
 * 
 * Configures build parameters, transport options, and cloud runtime target
 * for deployment to NitroStack Cloud.
 */
export default {
  name: 'Converra_One',
  version: '1.0.0',
  description: 'Where Conversations Converge. Intelligent Unified Communication Workspace.',
  entry: './src/index.ts',
  build: {
    target: 'node20',
    outDir: './dist',
    sourcemap: true
  },
  server: {
    port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
    transports: ['stdio', 'sse'],
    cors: {
      origin: '*'
    }
  },
  cloud: {
    region: 'us-central1',
    autoScale: true,
    minInstances: 1,
    maxInstances: 10
  }
};
