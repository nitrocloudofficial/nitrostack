// backend/routes/trends.js
const express = require('express');
const router = express.Router();
const nitroClient = require('../config/nitrostack');
const {
  getUser,
  getMedicalReports,
  addChatMessage
} = require('../config/db');

// POST /api/trends/compare - Compare two medical reports
router.post('/compare', async (req, res) => {
  try {
    const { userId, previousReportId, currentReportId } = req.body;

    // Validation
    if (!userId || !previousReportId || !currentReportId) {
      return res.status(400).json({
        success: false,
        error: 'userId, previousReportId, and currentReportId are required'
      });
    }

    // Verify user exists
    const user = await getUser(userId);

    // Get both reports
    const { db } = require('../config/db');
    const prevDoc = await db.collection('medical_reports').doc(previousReportId).get();
    const currDoc = await db.collection('medical_reports').doc(currentReportId).get();

    if (!prevDoc.exists || !currDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'One or both reports not found'
      });
    }

    const prevReport = prevDoc.data();
    const currReport = currDoc.data();

    // Verify ownership
    if (prevReport.userId !== userId || currReport.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized: Reports do not belong to this user'
      });
    }

    console.log(`📈 Analyzing trends for user: ${userId}`);

    // Call NitroStack Trend Agent
    const trends = await nitroClient.callAgent('trend-analysis-agent', {
      previousReport: prevReport,
      currentReport: currReport,
      userContext: {
        age: user.age,
        name: user.name
      }
    });

    // Save to chat history
    await addChatMessage(userId, {
      type: 'trend_analysis',
      previousReportId,
      currentReportId,
      trends
    });

    console.log(`✅ Trend analysis completed for user: ${userId}`);

    res.json({
      success: true,
      message: 'Trends analyzed successfully',
      userId,
      comparison: {
        previousReport: {
          id: previousReportId,
          date: prevReport.reportDate,
          type: prevReport.reportType
        },
        currentReport: {
          id: currentReportId,
          date: currReport.reportDate,
          type: currReport.reportType
        }
      },
      trends
    });
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    console.error('Error analyzing trends:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to analyze trends'
    });
  }
});

// GET /api/trends/:userId - Get health trends for user
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

    // Get all reports
    const reports = await getMedicalReports(userId);

    if (reports.length < 2) {
      return res.json({
        success: true,
        message: 'Not enough reports to analyze trends',
        userId,
        reportCount: reports.length,
        trends: null
      });
    }

    // Prepare reports for trend analysis
    const sortedReports = reports.sort((a, b) => 
      new Date(a.reportDate) - new Date(b.reportDate)
    );

    // Call trend agent for all reports
    const overallTrends = await nitroClient.callAgent('trend-analysis-agent', {
      allReports: sortedReports,
      userContext: {
        userId
      }
    });

    res.json({
      success: true,
      userId,
      reportCount: reports.length,
      dateRange: {
        from: sortedReports[0].reportDate,
        to: sortedReports[sortedReports.length - 1].reportDate
      },
      trends: overallTrends
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

// GET /api/trends/timeline/:userId - Get health timeline
router.get('/timeline/:userId', async (req, res) => {
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

    // Get all reports
    const reports = await getMedicalReports(userId);

    // Create timeline
    const timeline = reports
      .sort((a, b) => new Date(b.reportDate) - new Date(a.reportDate))
      .map(report => ({
        id: report.reportId,
        date: report.reportDate,
        type: report.reportType,
        status: 'Completed'
      }));

    res.json({
      success: true,
      userId,
      timeline,
      totalReports: timeline.length
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
