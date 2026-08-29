import 'dotenv/config';
import express, { Request, Response } from 'express';
import { TranscriptService } from './services/transcript.service';
import { WorkflowService } from './services/workflow.service';

const app = express();
const PORT = process.env.PORT || 3000;

const transcriptService = new TranscriptService();
const workflowService = new WorkflowService(transcriptService);

app.use(express.json());
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

app.post('/api/start-debate', (req: Request, res: Response) => {
    const caseData = req.body.caseData;
    if (!caseData) return res.status(400).json({ error: 'Missing caseData payload' });
    workflowService.executeDebate(caseData);
    res.json({ status: 'success', message: `Debate initiated for ${caseData.id}.` });
});

app.get('/api/stream-debate', (req: Request, res: Response) => {
    console.log(`\n[SSE Bridge] 🟢 Frontend client connected.`);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const sendEvent = (eventName: string, data: any) => {
        res.write(`event: ${eventName}\n`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    const onStarted = (data: any) => sendEvent('DEBATE_STARTED', data);
    const onAdvocate = () => sendEvent('STATUS_UPDATE', { actor: 'Advocate', action: 'speaking...' });
    const onFactChecking = () => sendEvent('STATUS_UPDATE', { actor: 'System', action: 'running verify_claim tool...' });
    const onSkeptic = () => sendEvent('STATUS_UPDATE', { actor: 'Skeptic', action: 'preparing rebuttal...' });
    const onVerdict = () => sendEvent('STATUS_UPDATE', { actor: 'Verdict', action: 'synthesizing decision...' });
    const onTranscriptUpdated = (data: any) => sendEvent('TRANSCRIPT_UPDATED', data);
    const onDataVis = (data: any) => sendEvent('DATA_VISUALIZATION', data);
    const onCompleted = () => sendEvent('DEBATE_COMPLETED', { status: 'done' });
    
    workflowService.on('DEBATE_STARTED', onStarted);
    workflowService.on('ON_ADVOCATE_SPEAKING', onAdvocate);
    workflowService.on('ON_FACT_CHECKING', onFactChecking);
    workflowService.on('ON_SKEPTIC_SPEAKING', onSkeptic);
    workflowService.on('ON_VERDICT_SPEAKING', onVerdict);
    workflowService.on('TRANSCRIPT_UPDATED', onTranscriptUpdated);
    workflowService.on('DATA_VISUALIZATION', onDataVis);
    workflowService.on('DEBATE_COMPLETED', onCompleted);

    req.on('close', () => {
        console.log(`[SSE Bridge] 🔴 Frontend client disconnected.\n`);
        workflowService.off('DEBATE_STARTED', onStarted);
        workflowService.off('ON_ADVOCATE_SPEAKING', onAdvocate);
        workflowService.off('ON_FACT_CHECKING', onFactChecking);
        workflowService.off('ON_SKEPTIC_SPEAKING', onSkeptic);
        workflowService.off('ON_VERDICT_SPEAKING', onVerdict);
        workflowService.off('TRANSCRIPT_UPDATED', onTranscriptUpdated);
        workflowService.off('DEBATE_COMPLETED', onCompleted);
    });
});

app.listen(PORT, () => {
    console.log(`\n=========================================`);
    console.log(`⚖️  CreditCourt Groq Engine active on port ${PORT}`);
    console.log(`=========================================\n`);
});
