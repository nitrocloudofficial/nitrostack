// backend/routes/symptoms.js
const express = require('express');
const router = express.Router();
const nitroClient = require('../config/nitrostack');
const {
  getUser,
  getHealthHistory,
  addChatMessage
} = require('../config/db');

// POST /api/symptoms/analyze - Analyze symptoms using MCP
router.post('/analyze', async (req, res) => {
  try {
    const {
      userId,
      symptom,
      duration,
      severity,
      additionalInfo
    } = req.body;

    // Validation
    if (!userId || !symptom) {
      return res.status(400).json({
        success: false,
        error: 'userId and symptom are required'
      });
    }

    if (!['mild', 'moderate', 'severe'].includes(severity)) {
      return res.status(400).json({
        success: false,
        error: 'severity must be: mild, moderate, or severe'
      });
    }

    // Get user data for context
    const user = await getUser(userId);
    const healthHistory = await getHealthHistory(userId);

    const userContext = {
      name: user.name,
      age: user.age,
      gender: user.gender,
      healthHistory: healthHistory || {}
    };

    // Call NitroStack Symptom Agent
    const guidance = await nitroClient.callAgent('symptom-guidance-agent', {
      symptom,
      duration: duration || '1 day',
      severity,
      userContext,
      additionalInfo: additionalInfo || ''
    });

    // Save to chat history
    await addChatMessage(userId, {
      type: 'symptom_inquiry',
      userMessage: symptom,
      aiResponse: guidance,
      metadata: {
        duration,
        severity,
        additionalInfo
      }
    });

    console.log(`✅ Symptom analysis completed for user: ${userId}`);

    res.status(201).json({
      success: true,
      message: 'Symptom analyzed successfully',
      userId,
      userInput: {
        symptom,
        duration,
        severity
      },
      guidance
    });
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    console.error('Error analyzing symptoms:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to analyze symptoms'
    });
  }
});

// POST /api/symptoms/ask-followup - Ask follow-up questions
router.post('/ask-followup', async (req, res) => {
  try {
    const { userId, symptom, question, answer } = req.body;

    if (!userId || !symptom || !question || answer === undefined) {
      return res.status(400).json({
        success: false,
        error: 'userId, symptom, question, and answer are required'
      });
    }

    // Get user context
    const user = await getUser(userId);
    const healthHistory = await getHealthHistory(userId);

    const userContext = {
      name: user.name,
      age: user.age,
      gender: user.gender,
      healthHistory: healthHistory || {}
    };

    // Call MCP agent with follow-up
    const updatedGuidance = await nitroClient.callAgent('symptom-guidance-agent', {
      symptom,
      followUp: {
        question,
        answer
      },
      userContext
    });

    // Save to chat history
    await addChatMessage(userId, {
      type: 'symptom_followup',
      question,
      answer,
      aiResponse: updatedGuidance
    });

    res.json({
      success: true,
      message: 'Follow-up processed successfully',
      updatedGuidance
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

// GET /api/symptoms/:userId - Get symptom history
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

    // Get chat history (symptoms only)
    const { getChatHistory } = require('../config/db');
    const allMessages = await getChatHistory(userId);
    const symptomMessages = allMessages.filter(msg => msg.type === 'symptom_inquiry');

    res.json({
      success: true,
      userId,
      symptomHistory: symptomMessages,
      count: symptomMessages.length
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
