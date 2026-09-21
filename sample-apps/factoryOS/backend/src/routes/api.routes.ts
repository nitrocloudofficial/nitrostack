import { Router } from 'express';
import { dbService } from '../services/db.service.js';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const router = Router();

// --- MACHINES ---
router.get('/machines', async (_req, res) => {
  try {
    const machines = await dbService.query('SELECT * FROM machines');
    res.json({ success: true, data: machines });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/machines/:id', async (req, res) => {
  try {
    const machine = await dbService.get('SELECT * FROM machines WHERE id = ?', [req.params.id]);
    if (!machine) {
      return res.status(404).json({ success: false, message: 'Machine not found' });
    }
    res.json({ success: true, data: machine });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/machines/:id/predict-failure', async (req, res) => {
  try {
    const machineId = req.params.id;
    const scriptPath = path.join(process.cwd(), 'factoryos-data', 'maintenance-model', 'predict_failure.py');
    if (fs.existsSync(scriptPath)) {
      const pyResult = execSync(`python "${scriptPath}" ${machineId}`, { encoding: 'utf8', timeout: 5000, stdio: ['pipe', 'pipe', 'ignore'] });
      const jsonMatch = pyResult.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const mlData = JSON.parse(jsonMatch[0]);
        return res.json({ success: true, data: mlData });
      }
    }
    res.json({ success: true, data: { machineId, riskLevel: 'normal', modelSource: 'Fallback' } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/machines/:id/shutdown', async (req, res) => {
  try {
    const machineId = req.params.id;
    await dbService.run(
      `UPDATE machines 
       SET status = 'Offline (Maintenance)', health = 'green', temperature_c = 25.0, vibration_mm_s = 0.0 
       WHERE id = ?`,
      [machineId]
    );
    res.json({ success: true, message: `${machineId} shut down safely.` });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/machines/:id/assign-technician', async (req, res) => {
  try {
    const { technicianId, taskDetails } = req.body;
    res.json({
      success: true,
      data: {
        assignmentId: `JOB-${Date.now()}`,
        machineId: req.params.id,
        technicianId,
        status: 'assigned',
        scheduledStart: new Date().toISOString(),
        taskDetails
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- INVENTORY ---
router.get('/inventory', async (req, res) => {
  try {
    const { partNumber } = req.query;
    if (partNumber) {
      const item = await dbService.get('SELECT * FROM inventory WHERE part_number = ?', [partNumber]);
      if (!item) {
        return res.status(404).json({ success: false, message: 'Part not found' });
      }
      return res.json({ success: true, data: item });
    }
    const items = await dbService.query('SELECT * FROM inventory');
    res.json({ success: true, data: items });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/inventory/shortages', async (_req, res) => {
  try {
    const shortages = await dbService.query('SELECT * FROM inventory WHERE on_hand <= reorder_point');
    res.json({ success: true, data: shortages });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/inventory/warehouses', async (req, res) => {
  try {
    const { partNumber } = req.query;
    if (!partNumber) {
      return res.status(400).json({ success: false, message: 'partNumber query param required' });
    }
    const local = await dbService.get('SELECT on_hand FROM inventory WHERE part_number = ?', [partNumber]);
    const localStock = local ? (local as any).on_hand : 0;
    const stockAvailable = localStock > 0 ? 5 : 0;

    const warehouses = [
      { id: 'WH-NORTH', name: 'Sister Warehouse A (North)', distanceKm: 12, stockOnHand: stockAvailable, leadTimeHrs: 2 },
      { id: 'WH-EAST', name: 'Sister Warehouse B (East)', distanceKm: 45, stockOnHand: stockAvailable > 0 ? 2 : 0, leadTimeHrs: 6 }
    ];
    res.json({ success: true, data: warehouses });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- PROCUREMENT ---
router.get('/suppliers', async (req, res) => {
  try {
    const { partNumber } = req.query;
    let query = 'SELECT * FROM suppliers';
    const params = [];
    if (partNumber) {
      query += ' WHERE part_number = ?';
      params.push(partNumber);
    }
    const suppliers = await dbService.query(query, params);
    res.json({ success: true, data: suppliers });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/purchase-orders', async (_req, res) => {
  try {
    const pos = await dbService.query('SELECT * FROM purchase_orders ORDER BY created_at DESC');
    res.json({ success: true, data: pos });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/purchase-orders', async (req, res) => {
  try {
    const { supplierId, partNumber, quantity, agreedPrice } = req.body;
    if (!supplierId || !partNumber || !quantity || !agreedPrice) {
      return res.status(400).json({ success: false, message: 'Missing required PO fields' });
    }

    const supplier = await dbService.get('SELECT name, delivery_time_hrs FROM suppliers WHERE id = ?', [supplierId]);
    const etaHours = supplier ? (supplier as any).delivery_time_hrs : 24;

    const poNumber = `PO-${5000 + Math.floor(Math.random() * 1000)}`;
    const totalAmount = Number((quantity * agreedPrice).toFixed(2));
    const status = 'ISSUED';
    const createdAt = new Date().toISOString();

    await dbService.run(
      `INSERT INTO purchase_orders 
       (po_number, supplier_id, part_number, quantity, agreed_price, total_amount, status, eta_hours, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [poNumber, supplierId, partNumber, quantity, agreedPrice, totalAmount, status, etaHours, createdAt]
    );

    res.json({
      success: true,
      data: {
        poNumber,
        supplierId,
        supplierName: supplier ? (supplier as any).name : 'Unknown Supplier',
        partNumber,
        quantity,
        agreedPrice,
        totalAmount,
        currency: 'USD',
        status,
        etaHours,
        createdAt
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- PRODUCTION ---
router.get('/production-lines', async (_req, res) => {
  try {
    const lines = await dbService.query('SELECT * FROM production_lines');
    res.json({ success: true, data: lines });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/production-lines/reroute', async (req, res) => {
  try {
    const { affectedLineId, alternativeLineId, shiftId } = req.body;
    if (!affectedLineId || !alternativeLineId) {
      return res.status(400).json({ success: false, message: 'Missing affectedLineId or alternativeLineId' });
    }

    const affectedLine = await dbService.get('SELECT * FROM production_lines WHERE id = ?', [affectedLineId]);
    if (!affectedLine) {
      return res.status(404).json({ success: false, message: 'Affected production line not found' });
    }
    const jobToTransfer = (affectedLine as any).active_job || 'JOB-UNKNOWN';

    await dbService.run(
      `UPDATE production_lines 
       SET status = 'Safety Hold', active_job = 'None', output_rate = '0 units/hr' 
       WHERE id = ?`,
      [affectedLineId]
    );

    await dbService.run(
      `UPDATE production_lines 
       SET status = 'Running (Rerouted)', active_job = ?, output_rate = '140 units/hr' 
       WHERE id = ?`,
      [jobToTransfer + ' (Transferred)', alternativeLineId]
    );

    res.json({
      success: true,
      data: {
        rerouteId: `RRT-${Date.now()}`,
        affectedLineId,
        alternativeLineId,
        shiftId,
        transferredJob: jobToTransfer,
        status: 'EXECUTED',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- SAFETY ---
router.get('/safety/incidents', async (_req, res) => {
  try {
    const incidents = await dbService.query('SELECT * FROM safety_incidents ORDER BY reported_at DESC');
    res.json({ success: true, data: incidents });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/safety/incidents', async (req, res) => {
  try {
    const { location, severity, description } = req.body;
    if (!location || !severity || !description) {
      return res.status(400).json({ success: false, message: 'Missing incident details' });
    }
    const incidentId = `INC-${2000 + Math.floor(Math.random() * 1000)}`;
    const reportedAt = new Date().toISOString();
    const oshaComplianceFlagged = severity === 'HIGH' || severity === 'CRITICAL' ? 1 : 0;

    await dbService.run(
      `INSERT INTO safety_incidents 
       (incident_id, location, severity, description, status, reported_at, osha_compliance_flagged, timeline) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [incidentId, location, severity, description, 'REPORTED', reportedAt, oshaComplianceFlagged, '[]']
    );

    res.json({
      success: true,
      data: {
        incidentId,
        location,
        severity,
        description,
        status: 'REPORTED',
        reportedAt,
        oshaComplianceFlagged
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/safety/incidents/:id/report', async (req, res) => {
  try {
    const incident = await dbService.get('SELECT * FROM safety_incidents WHERE incident_id = ?', [req.params.id]);
    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found' });
    }
    res.json({ success: true, report: (incident as any).safety_report || 'No report generated yet.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/safety/incidents/:id/timeline', async (req, res) => {
  try {
    const { events } = req.body;
    if (!events || !Array.isArray(events)) {
      return res.status(400).json({ success: false, message: 'events array required' });
    }
    const timelineJson = JSON.stringify(events);
    await dbService.run(
      `UPDATE safety_incidents SET timeline = ? WHERE incident_id = ?`,
      [timelineJson, req.params.id]
    );
    res.json({ success: true, message: 'Timeline updated successfully.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
