// backend/routes/reports.js
const express = require('express');
const router = express.Router();
const nitroClient = require('../config/nitrostack');
const {
  getUser,
  getHealthHistory,
  addMedicalReport,
  getMedicalReports
} = require('../config/db');

// POST /api/reports/upload - Upload and analyze medical report
router.post('/upload', async (req, res) => {
  try {
    const {
      userId,
      pdfBase64,
      reportType,
      reportDate
    } = req.body;

    // Validation
    if (!userId || !pdfBase64) {
      return res.status(400).json({
        success: false,
        error: 'userId and pdfBase64 are required'
      });
    }

    // Verify user exists
    const user = await getUser(userId);
    const healthHistory = await getHealthHistory(userId);

    console.log(`📄 Processing medical report for user: ${userId}`);

    // Step 1: Extract text from PDF using OCR Agent
    console.log('🔍 Extracting data from PDF...');
    const extractedData = await nitroClient.callAgent('ocr-extractor-agent', {
      pdfBase64,
      reportType: reportType || 'General Lab Report'
    });

    // Step 2: Analyze the report using Report Analysis Agent
    console.log('📊 Analyzing report data...');
    const analysis = await nitroClient.callAgent('report-analysis-agent', {
      extractedData,
      userContext: {
        age: user.age,
        gender: user.gender,
        name: user.name,
        healthHistory: healthHistory || {}
      },
      reportType: reportType || 'General Lab Report'
    });

    // Step 3: Save to database
    const reportId = await addMedicalReport(userId, {
      reportType: reportType || 'General Lab Report',
      reportDate: reportDate || new Date().toISOString().split('T')[0],
      extractedData,
      analysis,
      pdfSize: pdfBase64.length
    });

    console.log(`✅ Report analysis completed: ${reportId.reportId}`);

    res.status(201).json({
      success: true,
      message: 'Report analyzed successfully',
      reportId: reportId.reportId,
      userId,
      extractedData: extractedData.data || extractedData,
      analysis: analysis.summary || analysis
    });
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    console.error('Error processing report:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process medical report'
    });
  }
});

// GET /api/reports/:userId - Get all reports for user
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    // Verify user exists
    await getUser(userId);

    const reports = await getMedicalReports(userId);

    res.json({
      success: true,
      userId,
      reports,
      count: reports.length
    });
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/reports/:userId/:reportId - Get specific report details
router.get('/:userId/:reportId', async (req, res) => {
  try {
    const { userId, reportId } = req.params;

    if (!userId || !reportId) {
      return res.status(400).json({
        success: false,
        error: 'userId and reportId are required'
      });
    }

    // Verify user exists
    await getUser(userId);

    const { db } = require('../config/db');
    const doc = await db.collection('medical_reports').doc(reportId).get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    const reportData = doc.data();

    // Verify ownership
    if (reportData.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized: Report does not belong to this user'
      });
    }

    res.json({
      success: true,
      report: reportData
    });
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// DELETE /api/reports/:userId/:reportId - Delete a report
router.delete('/:userId/:reportId', async (req, res) => {
  try {
    const { userId, reportId } = req.params;

    if (!userId || !reportId) {
      return res.status(400).json({
        success: false,
        error: 'userId and reportId are required'
      });
    }

    // Verify user exists
    await getUser(userId);

    const { db } = require('../config/db');
    const doc = await db.collection('medical_reports').doc(reportId).get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    const reportData = doc.data();

    // Verify ownership
    if (reportData.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized: Report does not belong to this user'
      });
    }

    // Delete
    await db.collection('medical_reports').doc(reportId).delete();

    res.json({
      success: true,
      message: 'Report deleted successfully'
    });
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
