export default {
  dev: {
    port: Number(process.env.NITROSTACK_STUDIO_PORT ?? 3000),
    widgetPort: Number(process.env.NITROSTACK_WIDGET_PORT ?? 3001),
    openBrowser: false
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
};
