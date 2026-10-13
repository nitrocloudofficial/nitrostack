const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || 'localhost';

export const serverConfig = {
  port,
  host,
  origin: process.env.FACTORYBRAIN_GATEWAY_URL || `http://${host}:${port}`,
};
