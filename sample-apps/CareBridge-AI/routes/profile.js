// backend/routes/profile.js
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const {
  createUser,
  getUser,
  updateUser
} = require('../config/db');

// POST /api/profile - Create new user profile
router.post('/', async (req, res) => {
  try {
    const { name, age, gender, height, weight, email } = req.body;

    // Validation
    if (!name || !age || !email) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, age, email'
      });
    }

    if (age < 0 || age > 150) {
      return res.status(400).json({
        success: false,
        error: 'Invalid age'
      });
    }

    const userId = uuidv4();

    const result = await createUser({
      userId,
      name,
      age: parseInt(age),
      gender: gender || 'Not specified',
      height: height ? parseInt(height) : null,
      weight: weight ? parseInt(weight) : null,
      email,
      profileComplete: true
    });

    console.log(`✅ User profile created: ${userId}`);

    res.status(201).json({
      success: true,
      message: 'Profile created successfully',
      userId,
      user: {
        userId,
        name,
        age,
        gender,
        height,
        weight,
        email
      }
    });
  } catch (error) {
    console.error('Error creating profile:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/profile/:userId - Get user profile
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    const user = await getUser(userId);

    res.json({
      success: true,
      profile: user
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

// PUT /api/profile/:userId - Update user profile
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

    // Verify user exists first
    await getUser(userId);

    await updateUser(userId, updateData);

    res.json({
      success: true,
      message: 'Profile updated successfully',
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

// DELETE /api/profile/:userId - Delete user profile
router.delete('/:userId', async (req, res) => {
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

    // Delete user
    await require('../config/db').db.collection('users').doc(userId).delete();

    res.json({
      success: true,
      message: 'Profile deleted successfully',
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
