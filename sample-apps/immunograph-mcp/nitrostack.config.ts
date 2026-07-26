const serverPort = Number(process.env.MCP_SERVER_PORT ?? process.env.PORT ?? 3000);
const widgetPort = Number(process.env.WIDGET_PORT ?? 3001);

export default {
  server: {
    name: 'immunograph-mcp',
    version: '1.0.0',
    port: serverPort,
  },
  widgets: {
    port: widgetPort,
    devServer: process.env.NODE_ENV !== 'production',
  },
  logging: {
    level: process.env.NITRO_LOG_LEVEL ?? 'info',
  },
};
