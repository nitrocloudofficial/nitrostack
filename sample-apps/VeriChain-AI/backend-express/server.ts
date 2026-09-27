import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import bcrypt from 'bcryptjs';

import { db } from './database/connection.js';

// Route Imports
import authRouter from './routes/auth.js';
import documentsRouter from './routes/documents.js';
import agentsRouter from './routes/agents.js';
import decisionsRouter from './routes/decisions.js';
import reportsRouter from './routes/reports.js';
import conflictsRouter from './routes/conflicts.js';
import settingsRouter from './routes/settings.js';
import auditLogsRouter from './routes/audit-logs.js';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Static serving for downloads
app.use('/reports', express.static(path.resolve(process.cwd(), '../reports')));
app.use('/uploads', express.static(path.resolve(process.cwd(), '../uploads')));

// DB Seeding helper
async function seedDatabase() {
    try {
        const adminUser = await db.get('SELECT * FROM users WHERE username = ?', ['admin']);
        if (!adminUser) {
            console.log('Seeding default Admin account...');
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('admin123', salt);
            await db.run(
                'INSERT INTO users (username, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)',
                ['admin', 'admin@verichain.ai', hashedPassword, 'admin', new Date().toISOString()]
            );
            console.log('✓ Successfully seeded default Admin account (Username: admin, Password: admin123)');
        }
    } catch (err: any) {
        console.error('❌ Database seeding failed:', err.message);
    }
}

// Register Routers
app.use('/api/auth', authRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/agents', agentsRouter);
app.use('/api/decisions', decisionsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/conflicts', conflictsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/audit', auditLogsRouter);

app.post('/api/debug-error', (req, res) => {
    console.log('\n🔴 [FRONTEND ERROR DETECTED]:');
    console.log(JSON.stringify(req.body, null, 2));
    console.log('=============================\n');
    return res.json({ logged: true });
});

// Health check endpoint
app.get('/health', (req, res) => {
    return res.json({ status: 'healthy', service: 'verichain-backend' });
});

// Start Server
app.listen(PORT, async () => {
    console.log(`=========================================`);
    console.log(`🛡️ VeriChain AI Express Backend Booted`);
    console.log(`🚀 Server listening on port ${PORT}`);
    console.log(`=========================================`);
    await seedDatabase();
});
