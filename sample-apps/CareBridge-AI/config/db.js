// backend/config/db.js
const admin = require('firebase-admin');
require('dotenv').config();

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    // Option 1: Using service account JSON (secure for production)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL
      });
    } 
    // Option 2: Using environment variables
    else {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        databaseURL: process.env.FIREBASE_DATABASE_URL
      });
    }
    console.log('✅ Firebase initialized successfully');
  } catch (error) {
    console.error('❌ Firebase initialization error:', error.message);
  }
}

const db = admin.firestore();

// Collections Reference
const collections = {
  users: db.collection('users'),
  healthHistory: db.collection('health_history'),
  medicalReports: db.collection('medical_reports'),
  chatHistory: db.collection('chat_history'),
  healthTimeline: db.collection('health_timeline'),
  healthSummaries: db.collection('health_summaries')
};

// Utility Functions
async function createUser(userData) {
  try {
    const userId = userData.userId || Date.now().toString();
    await collections.users.doc(userId).set({
      ...userData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return { success: true, userId };
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

async function getUser(userId) {
  try {
    const doc = await collections.users.doc(userId).get();
    if (!doc.exists) {
      throw new Error('User not found');
    }
    return doc.data();
  } catch (error) {
    console.error('Error getting user:', error);
    throw error;
  }
}

async function updateUser(userId, updateData) {
  try {
    await collections.users.doc(userId).update({
      ...updateData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
}

async function addHealthHistory(userId, historyData) {
  try {
    await collections.healthHistory.doc(userId).set({
      userId,
      ...historyData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Error adding health history:', error);
    throw error;
  }
}

async function getHealthHistory(userId) {
  try {
    const doc = await collections.healthHistory.doc(userId).get();
    return doc.exists ? doc.data() : null;
  } catch (error) {
    console.error('Error getting health history:', error);
    throw error;
  }
}

async function addChatMessage(userId, message) {
  try {
    await collections.chatHistory.add({
      userId,
      ...message,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Error adding chat message:', error);
    throw error;
  }
}

async function getChatHistory(userId, limit = 50) {
  try {
    const snapshot = await collections.chatHistory
      .where('userId', '==', userId)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();
    
    return snapshot.docs.map(doc => doc.data()).reverse();
  } catch (error) {
    console.error('Error getting chat history:', error);
    throw error;
  }
}

async function addMedicalReport(userId, reportData) {
  try {
    const reportId = Date.now().toString();
    await collections.medicalReports.doc(reportId).set({
      userId,
      reportId,
      ...reportData,
      uploadedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return { success: true, reportId };
  } catch (error) {
    console.error('Error adding medical report:', error);
    throw error;
  }
}

async function getMedicalReports(userId) {
  try {
    const snapshot = await collections.medicalReports
      .where('userId', '==', userId)
      .orderBy('uploadedAt', 'desc')
      .get();
    
    return snapshot.docs.map(doc => doc.data());
  } catch (error) {
    console.error('Error getting medical reports:', error);
    throw error;
  }
}

async function addHealthSummary(userId, summaryData) {
  try {
    await collections.healthSummaries.add({
      userId,
      ...summaryData,
      generatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Error adding health summary:', error);
    throw error;
  }
}

module.exports = {
  db,
  collections,
  createUser,
  getUser,
  updateUser,
  addHealthHistory,
  getHealthHistory,
  addChatMessage,
  getChatHistory,
  addMedicalReport,
  getMedicalReports,
  addHealthSummary
};
