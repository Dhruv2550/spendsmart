// backend/database/index.js
const config = {
  environment: process.env.NODE_ENV || 'development'
};

let database;

if (config.environment === 'production') {
  // Use DynamoDB in production (AWS)
  database = require('./dynamodb');
} else {
  // Use SQLite in development (local)
  database = require('./sqlite');
}

// Initialize database
const initDatabase = async () => {
  try {
    await database.init();
    console.log(`Database initialized (${config.environment})`);
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
};

// Database interface methods
const db = {
  // Initialize database
  init: initDatabase,
  
  // Transaction methods
  getAllTransactions: () => database.getAllTransactions(),
  getTransactionById: (id) => database.getTransactionById(id),
  createTransaction: (transaction) => database.createTransaction(transaction),
  updateTransaction: (id, transaction) => database.updateTransaction(id, transaction),
  deleteTransaction: (id) => database.deleteTransaction(id),
  
  // Analytics methods
  getTransactionsByMonth: (month) => database.getTransactionsByMonth(month),
  getTransactionsByDateRange: (startDate, endDate) => database.getTransactionsByDateRange(startDate, endDate)
};

module.exports = db;