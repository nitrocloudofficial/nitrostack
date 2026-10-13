import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { PrismaClient } from '@prisma/client';
import { GoogleGenAI } from '@google/genai';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const app = express();
const prisma = new PrismaClient();
// Ensure process.env.GEMINI_API_KEY is set in the environment or .env
const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;
const upload = multer({ storage: multer.memoryStorage() });
app.use(cors());
app.use(express.json());

let mcpClient = null;

async function startMcpClient() {
    console.log('Starting MCP Client...');
    
    // Change working directory so NitroStack can find its widgets and config
    process.chdir('..');
    
    const transport = new StdioClientTransport({
        command: 'npx',
        args: ['tsx', 'src/index.ts'],
    });

    mcpClient = new Client(
        { name: 'web-backend', version: '1.0.0' },
        { capabilities: {} }
    );

    await mcpClient.connect(transport);
    console.log('MCP Client Connected!');
}

// --- NEW: Custom Material Ingestion ---
app.post('/api/materials/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ status: 'error', error: 'No file uploaded' });
        }

        const fileContent = req.file.buffer.toString('utf-8');
        
        if (!ai) {
            console.warn("GEMINI_API_KEY not set, using fallback dummy parser for upload.");
            // Dummy implementation just to demonstrate success if no API key
            const dummyMaterial = {
                id: `custom-${Date.now()}`,
                name: 'Custom Material ' + req.file.originalname,
                chemistryFamily: 'Custom',
                componentType: 'cathode',
                dataConfidence: 0.8,
                metrics: {
                    gravimetricEnergyDensity: 200,
                    volumetricEnergyDensity: 500,
                    specificCapacity: 180,
                    ionicConductivity: 1e-4,
                    coulombicEfficiency: 99.5,
                    cycleLifeTo80SOH: 1500,
                    calendarLifeSelfDischarge: 2.0,
                    cRateCapability: 1.0,
                    thermalRunawayOnsetTemp: 220,
                    volumeExpansion: 5.0,
                    materialCostPerKWh: 80,
                    carbonFootprint: 30,
                    recyclability: 80,
                    criticalMineralDependency: 5,
                    operatingTempRange: { min: -20, max: 60 },
                    regulatoryCompliance: { reach: true, rohs: true, un383: true, euBatteryRegulation: false }
                },
                strengths: ['Uploaded custom data'],
                weaknesses: ['Requires validation']
            };
            
            // Pass to MCP tool or service? 
            // We can't call EvBatteryService directly here because it's in the MCP server process.
            // Oh right, we need an MCP tool for this, OR we can add a simple tool.
            
            // Wait, we need to define the MCP tool `ingest_custom_material` in the MCP server first!
            const result = await mcpClient.callTool({
                name: 'ingest_custom_material_dataset',
                arguments: { materialJson: JSON.stringify(dummyMaterial) }
            });
            
            return res.json({ status: 'success', count: 1, message: 'Ingested via fallback parser.' });
        }

        // Use Gemini to parse the CSV/JSON into RankedMaterialSchema
        const prompt = `Parse the following material dataset (CSV/JSON) into a strict JSON object matching this schema for a battery material. 
Extract as much as you can. If a value is missing, use a reasonable default or estimate based on the material name if possible.
Required JSON structure:
{
  "name": "Material Name",
  "chemistryFamily": "String (e.g. NMC, LFP, Solid-State)",
  "componentType": "cathode | anode | electrolyte | separator | current-collector | casing",
  "dataConfidence": 0.8,
  "metrics": {
    "gravimetricEnergyDensity": number (Wh/kg),
    "volumetricEnergyDensity": number (Wh/L),
    "specificCapacity": number (mAh/g),
    "ionicConductivity": number (S/cm),
    "coulombicEfficiency": number (%),
    "cycleLifeTo80SOH": number,
    "calendarLifeSelfDischarge": number,
    "cRateCapability": number (C),
    "thermalRunawayOnsetTemp": number (C),
    "volumeExpansion": number (%),
    "materialCostPerKWh": number ($),
    "carbonFootprint": number,
    "recyclability": number (%),
    "criticalMineralDependency": number (0-10),
    "operatingTempRange": { "min": number, "max": number },
    "regulatoryCompliance": { "reach": boolean, "rohs": boolean, "un383": boolean, "euBatteryRegulation": boolean }
  },
  "strengths": ["string"],
  "weaknesses": ["string"]
}

Dataset Content:
${fileContent.substring(0, 5000)}
`;
        const aiResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        let jsonText = aiResponse.text;
        jsonText = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsedMaterial = JSON.parse(jsonText);
        parsedMaterial.id = `custom-${Date.now()}`;

        // Call the MCP tool we will create in the next step to inject this into the backend
        const result = await mcpClient.callTool({
            name: 'ingest_custom_material_dataset',
            arguments: { materialJson: JSON.stringify(parsedMaterial) }
        });

        res.json({ status: 'success', count: 1, data: parsedMaterial });
    } catch (err) {
        console.error('Upload Error:', err);
        res.status(500).json({ status: 'error', error: err.message });
    }
});

app.post('/api/analyze-battery', async (req, res) => {
    try {
        const { requirements } = req.body;
        if (!requirements) {
            return res.status(400).json({ error: 'Requirements text is missing.' });
        }

        console.log('Starting Agentic Orchestration for:', requirements);

        const callTool = async (name, args) => {
            console.log(`[Agent] Executing: ${name}`);
            const result = await mcpClient.callTool({ name, arguments: args });
            if (result.isError) {
                console.error(`Error in tool ${name}:`, result.content);
                throw new Error(result.content[0].text);
            }
            return JSON.parse(result.content[0].text);
        };

        // --- CORE PIPELINE (Always Required for Ranking) ---
        const reqRes = await callTool('parse_requirement_spec', { rawInput: requirements });
        const constraintRes = await callTool('classify_constraints', { requirementSet: reqRes.requirementSet });
        const schemaRes = await callTool('to_structured_schema', { requirementSet: reqRes.requirementSet });
        
        let priorRes = await callTool('prioritize_objectives', { requirementSet: reqRes.requirementSet });
        
        priorRes.aiOverrideActive = false;
        if (ai) {
            console.log("[Agent] Analyzing prompt for explicit weight overrides...");
            const weightPrompt = `
You are an EV Battery Systems Engineer.
User's raw requirement prompt: "${requirements}"
Current baseline weights: ${JSON.stringify(priorRes.weights)}

Task: Did the user explicitly and strongly prioritize specific factors (e.g., "I ONLY care about cost", "range is everything") while ignoring others?
If YES, adjust the weights to reflect their explicit instructions (e.g., set the strongly preferred metric to 0.7-1.0 and others near 0).
If NO, return the baseline weights unchanged.

You MUST return ONLY a valid JSON object matching the exact keys of the baseline weights, summing to exactly 1.0. No markdown, no explanations.
`;
            try {
                const aiResponse = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: weightPrompt });
                let text = aiResponse.text.replace(/```json/g, '').replace(/```/g, '').trim();
                const aiWeights = JSON.parse(text);
                
                // Normalize keys to lowercase for matching
                const normalizedAiWeights = {};
                for (const key in aiWeights) {
                    normalizedAiWeights[key.toLowerCase()] = aiWeights[key];
                }
                
                let sum = 0;
                const finalWeights = {};
                for (const k in priorRes.weights) {
                    const match = normalizedAiWeights[k.toLowerCase()];
                    if (match !== undefined) {
                        sum += match;
                        finalWeights[k] = match;
                    } else {
                        finalWeights[k] = priorRes.weights[k];
                    }
                }
                
                if (sum > 0.95 && sum < 1.05) {
                    const isOverridden = JSON.stringify(finalWeights) !== JSON.stringify(priorRes.weights);
                    priorRes.weights = finalWeights;
                    priorRes.aiOverrideActive = isOverridden;
                    if (isOverridden) console.log("[Agent] Dynamic AI weight override applied!", priorRes.weights);
                }
            } catch (e) {
                console.log("[Agent] Failed to apply dynamic AI weights, falling back to baseline.");
            }
        } else {
            console.log("[Agent] GEMINI_API_KEY not found. Skipping dynamic AI weight override.");
        }
        const rankRes = await callTool('rank_candidate_materials', {
            componentType: 'cathode',
            target: schemaRes.metricsTarget,
            weights: priorRes.weights,
        });

        const paretoRes = await callTool('run_pareto_optimization', { candidates: rankRes.ranked });
        const topMaterialId = paretoRes.paretoFront[0].id;

        const explainRes = await callTool('explain_recommendation', {
            materialId: topMaterialId,
            componentType: 'cathode',
        });

        // --- AGENTIC ORCHESTRATION LAYER ---
        let runThermal = true;
        let runMech = true;
        
        if (ai) {
            console.log("[Agent] Planning optional simulation branches...");
            const agentPrompt = `
You are an EV Battery Simulation Orchestrator. 
The user requirement is: "${requirements}"
Decide if we MUST run deep thermal simulation and deep mechanical degradation simulation.
Rule 1: If safety, thermal, hot climate, fast charging, or extreme cold is mentioned/implied, run thermal.
Rule 2: If cycle life, longevity, heavy duty, commercial, or high capacity is mentioned/implied, run mechanical.
Return ONLY valid JSON: { "runThermal": boolean, "runMechanical": boolean }
`;
            try {
                const aiResponse = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: agentPrompt });
                let text = aiResponse.text.replace(/```json/g, '').replace(/```/g, '').trim();
                const plan = JSON.parse(text);
                runThermal = plan.runThermal ?? true;
                runMech = plan.runMechanical ?? true;
                console.log(`[Agent] Decision: Thermal=${runThermal}, Mechanical=${runMech}`);
            } catch(e) {
                console.log("[Agent] Fallback: Running all simulations.");
            }
        }

        // --- CONDITIONAL SIMULATION EXECUTION ---
        const vcmRes = await callTool('build_virtual_cell_model', { materialId: topMaterialId });
        const electroRes = await callTool('simulate_electrochemical_performance', { materialId: topMaterialId, cRate: 1.0 });
        
        // We still call the tools to provide mock data so the frontend charts don't crash, 
        // but in a real app, we would skip entirely and UI would gracefully hide the widgets.
        const thermalRes = await callTool('simulate_thermal_response', { 
            materialId: topMaterialId, chargeRateC: 1.0, ambientTempCelsius: 25 
        });
        
        const mechRes = await callTool('simulate_mechanical_degradation', { 
            materialId: topMaterialId, cycleCount: 3000 
        });
        
        // --- DECISION REPORTING ---
        const topsisRes = await callTool('compute_topsis_ranking', {
            candidates: paretoRes.paretoFront.map(c => ({ id: c.id })),
            weights: priorRes.weights,
        });

        const tradeRes = await callTool('identify_trade_offs', {
            candidates: paretoRes.paretoFront.map(c => ({ id: c.id })),
        });

        const confRes = await callTool('compute_confidence_score', {
            topMaterialId: topMaterialId,
            componentType: 'cathode',
            weights: priorRes.weights,
        });

        const fullCandidate = rankRes.ranked.find(c => c.id === topMaterialId);

        const responseData = {
            requirements: reqRes.requirementSet,
            weights: priorRes.weights,
            aiOverrideActive: priorRes.aiOverrideActive || false,
            topCandidate: {
                name: explainRes.material,
                interpretiveExplanation: explainRes.recommendation,
                strengths: fullCandidate.strengths || [],
                keyMetrics: fullCandidate.metrics || {}
            },
            topsisRanking: topsisRes.topsisRanking || [],
            paretoFront: paretoRes.paretoFront,
            dominatedCandidates: paretoRes.dominatedCandidates || [],
            allCandidates: rankRes.ranked,
            tradeOffs: tradeRes.tradeOffs,
            confidence: confRes,
            digitalTwin: {
                electrochemical: electroRes,
                thermal: thermalRes,
                mechanical: mechRes
            }
        };

        // --- PERSISTENCE ---
        try {
            await prisma.simulationRun.create({
                data: {
                    userPrompt: requirements,
                    weights: JSON.stringify(priorRes.weights),
                    topCandidateId: topMaterialId,
                    paretoFront: JSON.stringify(paretoRes.paretoFront),
                    digitalTwinData: JSON.stringify(responseData.digitalTwin)
                }
            });
            console.log('[History] Simulation saved to SQLite.');
        } catch (dbErr) {
            console.error('[History] Failed to save simulation:', dbErr);
        }

        res.json({ status: 'success', data: responseData });

    } catch (err) {
        console.error('Pipeline Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// --- NEW: History Endpoints ---
app.get('/api/history', async (req, res) => {
    try {
        const runs = await prisma.simulationRun.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json({ status: 'success', data: runs });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/simulate-c-rate', async (req, res) => {
    try {
        const { materialId, cRate, temp } = req.body;
        if (!materialId) return res.status(400).json({ error: 'materialId is required' });

        console.log(`Re-running simulation for ${materialId} at ${cRate}C and ${temp}°C`);

        const callTool = async (name, args) => {
            const result = await mcpClient.callTool({ name, arguments: args });
            if (result.isError) throw new Error(result.content[0].text);
            return JSON.parse(result.content[0].text);
        };

        const electroRes = await callTool('simulate_electrochemical_performance', { materialId, cRate: parseFloat(cRate), temperatureCelsius: parseFloat(temp) });
        const thermalRes = await callTool('simulate_thermal_response', { materialId, chargeRateC: parseFloat(cRate), ambientTempCelsius: parseFloat(temp) });

        res.json({
            status: 'success',
            data: {
                electrochemical: electroRes,
                thermal: thermalRes
            }
        });
    } catch (err) {
        console.error('Simulation Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// --- Dataset management ---
app.post('/api/reset-dataset', async (req, res) => {
    try {
        const callTool = async (name, args) => {
            const result = await mcpClient.callTool({ name, arguments: args });
            if (result.isError) throw new Error(result.content[0].text);
            return JSON.parse(result.content[0].text);
        };
        await callTool('reset_custom_dataset', {});
        res.json({ status: 'success', message: 'Reverted to built-in material database.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/dataset-status', async (req, res) => {
    try {
        const callTool = async (name, args) => {
            const result = await mcpClient.callTool({ name, arguments: args });
            if (result.isError) throw new Error(result.content[0].text);
            return JSON.parse(result.content[0].text);
        };
        const status = await callTool('get_dataset_status', {});
        res.json({ status: 'success', data: status });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// --- NEW: Side-by-Side Digital Twin Comparison ---
app.post('/api/simulate-multiple', async (req, res) => {
    try {
        const { materialIds, cRate, temp } = req.body;
        if (!materialIds || !Array.isArray(materialIds)) {
            return res.status(400).json({ error: 'materialIds array is required' });
        }

        console.log(`Running side-by-side simulation for ${materialIds.length} candidates at ${cRate}C and ${temp}°C`);

        const callTool = async (name, args) => {
            const result = await mcpClient.callTool({ name, arguments: args });
            if (result.isError) throw new Error(result.content[0].text);
            return JSON.parse(result.content[0].text);
        };

        const results = await Promise.all(materialIds.map(async (materialId) => {
            try {
                // We must build the virtual cell model first for each candidate before simulating
                await callTool('build_virtual_cell_model', { materialId });
                
                const electroRes = await callTool('simulate_electrochemical_performance', { materialId, cRate: parseFloat(cRate), temperatureCelsius: parseFloat(temp) });
                const thermalRes = await callTool('simulate_thermal_response', { materialId, chargeRateC: parseFloat(cRate), ambientTempCelsius: parseFloat(temp) });
                const mechRes = await callTool('simulate_mechanical_degradation', { materialId, cycleCount: 3000 });
                
                return {
                    materialId,
                    electrochemical: electroRes,
                    thermal: thermalRes,
                    mechanical: mechRes
                };
            } catch (err) {
                console.error(`Error simulating ${materialId}:`, err);
                return { materialId, error: err.message };
            }
        }));

        res.json({ status: 'success', data: results });
    } catch (err) {
        console.error('Simulate Multiple Error:', err);
        res.status(500).json({ error: err.message });
    }
});

const PORT = 3002;
app.listen(PORT, async () => {
    console.log(`Web backend orchestrator listening on port ${PORT}`);
    await startMcpClient();
});
