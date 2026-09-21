// backend/routes/summary.js
const express = require('express');
const router = express.Router();
const nitroClient = require('../config/nitrostack');
const {
  getUser,
  getHealthHistory,
  getMedicalReports,
  addHealthSummary,
  getChatHistory
} = require('../config/db');

// GET /api/summary/:userId - Generate health summary
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    console.log(`📋 Generating health summary for user: ${userId}`);

    // Get all user data
    const user = await getUser(userId);
    const healthHistory = await getHealthHistory(userId);
    const medicalReports = await getMedicalReports(userId);
    const chatHistory = await getChatHistory(userId, 20); // Last 20 messages

    // Prepare context for summary agent
    const summaryContext = {
      userProfile: {
        name: user.name,
        age: user.age,
        gender: user.gender,
        height: user.height,
        weight: user.weight,
        email: user.email
      },
      healthHistory: healthHistory || {},
      recentReports: medicalReports.slice(0, 3), // Last 3 reports
      recentConversations: chatHistory.map(msg => ({
        type: msg.type,
        userMessage: msg.userMessage || msg.question,
        timestamp: msg.timestamp
      }))
    };

    // Call NitroStack Summary Agent
    const summary = await nitroClient.callAgent('health-summary-agent', summaryContext);

    // Save summary to database
    await addHealthSummary(userId, {
      userId,
      summary,
      context: {
        profileComplete: !!user.profileComplete,
        hasHealthHistory: !!healthHistory,
        reportsCount: medicalReports.length,
        conversationsCount: chatHistory.length
      }
    });

    console.log(`✅ Health summary generated for user: ${userId}`);

    res.json({
      success: true,
      userId,
      summary,
      metadata: {
        generatedAt: new Date().toISOString(),
        profileComplete: !!user.profileComplete,
        dataPoints: {
          reportsCount: medicalReports.length,
          conversationsCount: chatHistory.length,
          hasHealthHistory: !!healthHistory
        }
      }
    });
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    console.error('Error generating summary:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate health summary'
    });
  }
});

// POST /api/summary/:userId/export - Export summary as text/PDF
router.post('/:userId/export', async (req, res) => {
  try {
    const { userId } = req.params;
    const { format } = req.body; // 'text' or 'pdf'

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    // Verify user exists
    const user = await getUser(userId);

    // Get latest summary
    const { db } = require('../config/db');
    const summarySnap = await db.collection('health_summaries')
      .where('userId', '==', userId)
      .orderBy('generatedAt', 'desc')
      .limit(1)
      .get();

    if (summarySnap.empty) {
      return res.status(404).json({
        success: false,
        error: 'No summary found. Please generate one first.'
      });
    }

    const summaryData = summarySnap.docs[0].data();

    if (format === 'text') {
      // Return as plain text
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="health-summary-${userId}.txt"`);
      res.send(summaryData.summary);
    } else if (format === 'pdf') {
      // For PDF, return JSON with message
      res.json({
        success: true,
        message: 'PDF export feature requires additional setup',
        summary: summaryData.summary,
        exportUrl: `/api/summary/${userId}/pdf`
      });
    } else {
      res.json({
        success: true,
        summary: summaryData.summary,
        generatedAt: summaryData.generatedAt
      });
    }
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

// GET /api/summary/:userId/history - Get all summaries for user
router.get('/:userId/history', async (req, res) => {
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

    const { db } = require('../config/db');
    const summaries = await db.collection('health_summaries')
      .where('userId', '==', userId)
      .orderBy('generatedAt', 'desc')
      .get();

    const summaryHistory = summaries.docs.map(doc => ({
      id: doc.id,
      generatedAt: doc.data().generatedAt,
      metadata: doc.data().context
    }));

    res.json({
      success: true,
      userId,
      summaries: summaryHistory,
      count: summaryHistory.length
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
