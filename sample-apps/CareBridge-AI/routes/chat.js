// backend/routes/chat.js
const express = require('express');
const router = express.Router();
const {
  getUser,
  getChatHistory,
  addChatMessage
} = require('../config/db');

// GET /api/chat/:userId - Get chat history
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    // Verify user exists
    await getUser(userId);

    const chatLimit = parseInt(limit) || 50;
    const history = await getChatHistory(userId, chatLimit);

    res.json({
      success: true,
      userId,
      messages: history,
      count: history.length
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

// POST /api/chat/:userId/clear - Clear chat history
router.post('/:userId/clear', async (req, res) => {
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

    // Delete all chat messages for this user
    const snapshot = await db.collection('chat_history')
      .where('userId', '==', userId)
      .get();

    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    console.log(`✅ Chat history cleared for user: ${userId}`);

    res.json({
      success: true,
      message: 'Chat history cleared successfully',
      deletedMessages: snapshot.size
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

// GET /api/chat/:userId/filter - Filter chat by type
router.get('/:userId/filter', async (req, res) => {
  try {
    const { userId } = req.params;
    const { type } = req.query; // symptom_inquiry, report_analysis, etc.

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    // Verify user exists
    await getUser(userId);

    const { db } = require('../config/db');

    let query = db.collection('chat_history').where('userId', '==', userId);

    if (type) {
      query = query.where('type', '==', type);
    }

    const snapshot = await query.orderBy('timestamp', 'desc').get();
    const messages = snapshot.docs.map(doc => doc.data());

    res.json({
      success: true,
      userId,
      filter: type || 'all',
      messages,
      count: messages.length
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

// POST /api/chat/:userId/export - Export chat history
router.post('/:userId/export', async (req, res) => {
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

    const history = await getChatHistory(userId, 1000);

    // Format as text
    let exportText = `CareBridge AI - Chat History Export\n`;
    exportText += `User ID: ${userId}\n`;
    exportText += `Generated: ${new Date().toISOString()}\n`;
    exportText += `\n${'='.repeat(50)}\n\n`;

    history.forEach((msg, index) => {
      exportText += `[${index + 1}] ${msg.timestamp || 'N/A'}\n`;
      exportText += `Type: ${msg.type}\n`;
      if (msg.userMessage) exportText += `User: ${msg.userMessage}\n`;
      if (msg.question) exportText += `Q: ${msg.question}\n`;
      if (msg.aiResponse) exportText += `AI: ${msg.aiResponse}\n`;
      exportText += `\n`;
    });

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="carebridge-chat-${userId}.txt"`);
    res.send(exportText);
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
