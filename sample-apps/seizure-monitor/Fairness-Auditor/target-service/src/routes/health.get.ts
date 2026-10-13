export default defineEventHandler(() => {
  return {
    service: 'target-service',
    status: 'ok',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
  }
})
