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
  getTransactionsByDateRange: (startDate, endDate) => database.getTransactionsByDateRange(startDate, endDate),
  
  // Recurring transaction methods
  getAllRecurringTransactions: () => database.getAllRecurringTransactions(),
  getRecurringTransactionById: (id) => database.getRecurringTransactionById(id),
  createRecurringTransaction: (recurring) => database.createRecurringTransaction(recurring),
  updateRecurringTransaction: (id, recurring) => database.updateRecurringTransaction(id, recurring),
  deleteRecurringTransaction: (id) => database.deleteRecurringTransaction(id),
  getDueRecurringTransactions: () => database.getDueRecurringTransactions(),
  processRecurringTransactions: () => database.processRecurringTransactions(),
  calculateNextDueDate: (date, frequency) => database.calculateNextDueDate(date, frequency),
  updateNextDueDate: (id, date) => database.updateNextDueDate(id, date)
};

module.exports = db;