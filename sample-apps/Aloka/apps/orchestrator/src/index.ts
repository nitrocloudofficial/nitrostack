import 'dotenv/config';
import express from 'express';
import { logger } from '@omnitrace/logger';
import { webhookRouter } from './webhooks';

const app = express();
app.use(express.json());

app.use('/webhooks', webhookRouter);

// Health check endpoint required by Cloud deployment platforms
app.get('/', (req, res) => {
  res.status(200).send('OK');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`OmniTrace orchestrator listening on port ${PORT}`);
});
