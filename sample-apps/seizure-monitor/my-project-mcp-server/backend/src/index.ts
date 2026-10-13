import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { PORT, CORS_ORIGINS, UPLOADS_DIR } from './config';
import { runSeed } from './db/seed';
import { healthRouter } from './routes/health';
import { casesRouter } from './routes/cases';
import { documentsRouter } from './routes/documents';
import { issuesRouter } from './routes/issues';
import { notFoundHandler, errorHandler } from './middleware/errorHandler';

runSeed();

const app = express();

app.use(
  cors({
    origin: CORS_ORIGINS,
  })
);
app.use(express.json());
app.use(morgan('dev'));

// Uploaded documents are served back statically for convenience (e.g. an
// insurer view could link straight to an uploaded file).
app.use('/uploads', express.static(UPLOADS_DIR));

app.use('/api/health', healthRouter);
app.use('/api/cases', casesRouter);
app.use('/api/cases/:caseId/documents', documentsRouter);
app.use('/api/cases/:caseId/issues', issuesRouter);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Care Mediator backend listening on http://localhost:${PORT}`);
  console.log(`Allowed CORS origins: ${CORS_ORIGINS.join(', ')}`);
});
