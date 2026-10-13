// backend/routes/healthHistory.js
const express = require('express');
const router = express.Router();
const {
  addHealthHistory,
  getHealthHistory,
  getUser
} = require('../config/db');

// POST /api/health-history - Add or update health history
router.post('/', async (req, res) => {
  try {
    const {
      userId,
      chronicDiseases,
      currentMedications,
      allergies,
      familyHistory,
      lifestyle,
      surgeries
    } = req.body;

    // Validation
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    // Verify user exists
    await getUser(userId);

    const historyData = {
      userId,
      chronicDiseases: chronicDiseases || [],
      currentMedications: currentMedications || [],
      allergies: allergies || [],
      familyHistory: familyHistory || '',
      lifestyle: lifestyle || '',
      surgeries: surgeries || [],
      lastUpdated: new Date().toISOString()
    };

    await addHealthHistory(userId, historyData);

    console.log(`✅ Health history saved for user: ${userId}`);

    res.status(201).json({
      success: true,
      message: 'Health history saved successfully',
      userId,
      data: historyData
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

// GET /api/health-history/:userId - Get user's health history
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

    const history = await getHealthHistory(userId);

    if (!history) {
      return res.json({
        success: true,
        message: 'No health history found',
        history: null
      });
    }

    res.json({
      success: true,
      history
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

// PUT /api/health-history/:userId - Update health history
router.put('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const updateData = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    // Verify user exists
    await getUser(userId);

    updateData.lastUpdated = new Date().toISOString();

    await addHealthHistory(userId, updateData);

    res.json({
      success: true,
      message: 'Health history updated successfully',
      userId
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
