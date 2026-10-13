import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRouter from './routes/api.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({
    message: 'Welcome to FactoryOS Express REST API',
    health: '/health',
    endpoints: {
      machines: '/api/machines',
      inventory: '/api/inventory',
      suppliers: '/api/suppliers',
      purchaseOrders: '/api/purchase-orders',
      productionLines: '/api/production-lines',
      safetyIncidents: '/api/safety/incidents'
    }
  });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'FactoryOS Express API' });
});

app.use('/api', apiRouter);

app.listen(PORT, () => {
  console.log(`Backend Express server listening on port ${PORT}`);
});
