// backend/database/sqlite.js
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const path = require('path');

let db;

// Initialize SQLite database
const init = () => {
  return new Promise((resolve, reject) => {
    // Create database file in backend directory
    const dbPath = path.join(__dirname, '..', 'transactions.db');
    
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err);
        reject(err);
        return;
      }
      
      console.log('Connected to SQLite database');
      
      // Create transactions table if it doesn't exist
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS transactions (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
          category TEXT NOT NULL,
          amount REAL NOT NULL,
          note TEXT,
          date TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `;
      
      db.run(createTableQuery, (err) => {
        if (err) {
          console.error('Error creating transactions table:', err);
          reject(err);
        } else {
          console.log('Transactions table ready');
          
          // Create recurring transactions table
          const createRecurringTableQuery = `
            CREATE TABLE IF NOT EXISTS recurring_transactions (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL,
              type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
              category TEXT NOT NULL,
              amount REAL NOT NULL,
              note TEXT,
              frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'monthly', 'quarterly', 'yearly')),
              start_date TEXT NOT NULL,
              end_date TEXT,
              next_due_date TEXT NOT NULL,
              is_active INTEGER DEFAULT 1,
              last_processed TEXT,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `;
          
          db.run(createRecurringTableQuery, (err) => {
            if (err) {
              console.error('Error creating recurring_transactions table:', err);
              reject(err);
            } else {
              console.log('Recurring transactions table ready');
              resolve();
            }
          });
        }
      });
    });
  });
};

// Get all transactions
const getAllTransactions = () => {
  return new Promise((resolve, reject) => {
    const query = 'SELECT * FROM transactions ORDER BY date DESC, timestamp DESC';
    
    db.all(query, [], (err, rows) => {
      if (err) {
        console.error('Error getting transactions:', err);
        reject(err);
      } else {
        // Convert amount back to number and ensure proper types
        const transactions = rows.map(row => ({
          ...row,
          amount: parseFloat(row.amount)
        }));
        console.log(`Retrieved ${transactions.length} transactions`);
        resolve(transactions);
      }
    });
  });
};

// Get transaction by ID
const getTransactionById = (id) => {
  return new Promise((resolve, reject) => {
    const query = 'SELECT * FROM transactions WHERE id = ?';
    
    db.get(query, [id], (err, row) => {
      if (err) {
        console.error('Error getting transaction by ID:', err);
        reject(err);
      } else if (row) {
        resolve({
          ...row,
          amount: parseFloat(row.amount)
        });
      } else {
        resolve(null);
      }
    });
  });
};

// Create new transaction
const createTransaction = (transaction) => {
  return new Promise((resolve, reject) => {
    const id = uuidv4();
    const timestamp = new Date().toISOString();
    
    const query = `
      INSERT INTO transactions (id, type, category, amount, note, date, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    const values = [
      id,
      transaction.type,
      transaction.category,
      parseFloat(transaction.amount),
      transaction.note || '',
      transaction.date,
      timestamp
    ];
    
    db.run(query, values, function(err) {
      if (err) {
        console.error('Error creating transaction:', err);
        reject(err);
      } else {
        const newTransaction = {
          id,
          ...transaction,
          amount: parseFloat(transaction.amount),
          timestamp
        };
        console.log('Created transaction:', newTransaction.id);
        resolve(newTransaction);
      }
    });
  });
};

// Update transaction
const updateTransaction = (id, transaction) => {
  return new Promise((resolve, reject) => {
    const query = `
      UPDATE transactions 
      SET type = ?, category = ?, amount = ?, note = ?, date = ?
      WHERE id = ?
    `;
    
    const values = [
      transaction.type,
      transaction.category,
      parseFloat(transaction.amount),
      transaction.note || '',
      transaction.date,
      id
    ];
    
    db.run(query, values, function(err) {
      if (err) {
        console.error('Error updating transaction:', err);
        reject(err);
      } else if (this.changes === 0) {
        reject(new Error('Transaction not found'));
      } else {
        const updatedTransaction = {
          id,
          ...transaction,
          amount: parseFloat(transaction.amount)
        };
        console.log('Updated transaction:', id);
        resolve(updatedTransaction);
      }
    });
  });
};

// Delete transaction
const deleteTransaction = (id) => {
  return new Promise((resolve, reject) => {
    const query = 'DELETE FROM transactions WHERE id = ?';
    
    db.run(query, [id], function(err) {
      if (err) {
        console.error('Error deleting transaction:', err);
        reject(err);
      } else if (this.changes === 0) {
        reject(new Error('Transaction not found'));
      } else {
        console.log('Deleted transaction:', id);
        resolve({ success: true });
      }
    });
  });
};

// Get transactions by month (YYYY-MM format)
const getTransactionsByMonth = (month) => {
  return new Promise((resolve, reject) => {
    const query = 'SELECT * FROM transactions WHERE date LIKE ? ORDER BY date DESC';
    
    db.all(query, [`${month}%`], (err, rows) => {
      if (err) {
        console.error('Error getting transactions by month:', err);
        reject(err);
      } else {
        const transactions = rows.map(row => ({
          ...row,
          amount: parseFloat(row.amount)
        }));
        console.log(`📅 Retrieved ${transactions.length} transactions for ${month}`);
        resolve(transactions);
      }
    });
  });
};

// Get transactions by date range
const getTransactionsByDateRange = (startDate, endDate) => {
  return new Promise((resolve, reject) => {
    const query = 'SELECT * FROM transactions WHERE date BETWEEN ? AND ? ORDER BY date DESC';
    
    db.all(query, [startDate, endDate], (err, rows) => {
      if (err) {
        console.error('Error getting transactions by date range:', err);
        reject(err);
      } else {
        const transactions = rows.map(row => ({
          ...row,
          amount: parseFloat(row.amount)
        }));
        console.log(`📅 Retrieved ${transactions.length} transactions from ${startDate} to ${endDate}`);
        resolve(transactions);
      }
    });
  });
};

// ============================================
// RECURRING TRANSACTIONS FUNCTIONS
// ============================================

// Get all recurring transactions
const getAllRecurringTransactions = () => {
  return new Promise((resolve, reject) => {
    const query = 'SELECT * FROM recurring_transactions ORDER BY next_due_date ASC';
    
    db.all(query, [], (err, rows) => {
      if (err) {
        console.error('Error getting recurring transactions:', err);
        reject(err);
      } else {
        const recurringTransactions = rows.map(row => ({
          ...row,
          amount: parseFloat(row.amount),
          is_active: Boolean(row.is_active)
        }));
        console.log(`Retrieved ${recurringTransactions.length} recurring transactions`);
        resolve(recurringTransactions);
      }
    });
  });
};

// Get recurring transaction by ID
const getRecurringTransactionById = (id) => {
  return new Promise((resolve, reject) => {
    const query = 'SELECT * FROM recurring_transactions WHERE id = ?';
    
    db.get(query, [id], (err, row) => {
      if (err) {
        console.error('Error getting recurring transaction by ID:', err);
        reject(err);
      } else if (row) {
        resolve({
          ...row,
          amount: parseFloat(row.amount),
          is_active: Boolean(row.is_active)
        });
      } else {
        resolve(null);
      }
    });
  });
};

// Create new recurring transaction
const createRecurringTransaction = (recurringTransaction) => {
  return new Promise((resolve, reject) => {
    const id = uuidv4();
    const timestamp = new Date().toISOString();
    
    const query = `
      INSERT INTO recurring_transactions 
      (id, name, type, category, amount, note, frequency, start_date, end_date, next_due_date, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const values = [
      id,
      recurringTransaction.name,
      recurringTransaction.type,
      recurringTransaction.category,
      parseFloat(recurringTransaction.amount),
      recurringTransaction.note || '',
      recurringTransaction.frequency,
      recurringTransaction.start_date,
      recurringTransaction.end_date || null,
      recurringTransaction.next_due_date || recurringTransaction.start_date,
      recurringTransaction.is_active ? 1 : 0
    ];
    
    db.run(query, values, function(err) {
      if (err) {
        console.error('Error creating recurring transaction:', err);
        reject(err);
      } else {
        const newRecurringTransaction = {
          id,
          ...recurringTransaction,
          amount: parseFloat(recurringTransaction.amount),
          is_active: Boolean(recurringTransaction.is_active),
          created_at: timestamp
        };
        console.log('Created recurring transaction:', newRecurringTransaction.id);
        resolve(newRecurringTransaction);
      }
    });
  });
};

// Update recurring transaction
const updateRecurringTransaction = (id, recurringTransaction) => {
  return new Promise((resolve, reject) => {
    const query = `
      UPDATE recurring_transactions 
      SET name = ?, type = ?, category = ?, amount = ?, note = ?, 
          frequency = ?, start_date = ?, end_date = ?, next_due_date = ?, is_active = ?
      WHERE id = ?
    `;
    
    const values = [
      recurringTransaction.name,
      recurringTransaction.type,
      recurringTransaction.category,
      parseFloat(recurringTransaction.amount),
      recurringTransaction.note || '',
      recurringTransaction.frequency,
      recurringTransaction.start_date,
      recurringTransaction.end_date || null,
      recurringTransaction.next_due_date,
      recurringTransaction.is_active ? 1 : 0,
      id
    ];
    
    db.run(query, values, function(err) {
      if (err) {
        console.error('Error updating recurring transaction:', err);
        reject(err);
      } else if (this.changes === 0) {
        reject(new Error('Recurring transaction not found'));
      } else {
        const updatedRecurringTransaction = {
          id,
          ...recurringTransaction,
          amount: parseFloat(recurringTransaction.amount),
          is_active: Boolean(recurringTransaction.is_active)
        };
        console.log('Updated recurring transaction:', id);
        resolve(updatedRecurringTransaction);
      }
    });
  });
};

// Delete recurring transaction
const deleteRecurringTransaction = (id) => {
  return new Promise((resolve, reject) => {
    const query = 'DELETE FROM recurring_transactions WHERE id = ?';
    
    db.run(query, [id], function(err) {
      if (err) {
        console.error('Error deleting recurring transaction:', err);
        reject(err);
      } else if (this.changes === 0) {
        reject(new Error('Recurring transaction not found'));
      } else {
        console.log('Deleted recurring transaction:', id);
        resolve({ success: true });
      }
    });
  });
};

// Get recurring transactions due for processing
const getDueRecurringTransactions = () => {
  return new Promise((resolve, reject) => {
    const today = new Date().toISOString().split('T')[0];
    const query = `
      SELECT * FROM recurring_transactions 
      WHERE is_active = 1 AND next_due_date <= ? 
      AND (end_date IS NULL OR end_date >= ?)
      ORDER BY next_due_date ASC
    `;
    
    db.all(query, [today, today], (err, rows) => {
      if (err) {
        console.error('Error getting due recurring transactions:', err);
        reject(err);
      } else {
        const recurringTransactions = rows.map(row => ({
          ...row,
          amount: parseFloat(row.amount),
          is_active: Boolean(row.is_active)
        }));
        console.log(`Found ${recurringTransactions.length} due recurring transactions`);
        resolve(recurringTransactions);
      }
    });
  });
};

// Update next due date for recurring transaction
const updateNextDueDate = (id, nextDueDate) => {
  return new Promise((resolve, reject) => {
    const query = `
      UPDATE recurring_transactions 
      SET next_due_date = ?, last_processed = ?
      WHERE id = ?
    `;
    
    const lastProcessed = new Date().toISOString().split('T')[0];
    
    db.run(query, [nextDueDate, lastProcessed, id], function(err) {
      if (err) {
        console.error('Error updating next due date:', err);
        reject(err);
      } else {
        console.log('Updated next due date for recurring transaction:', id);
        resolve({ success: true });
      }
    });
  });
};

// Calculate next due date based on frequency
const calculateNextDueDate = (currentDate, frequency) => {
  const date = new Date(currentDate);
  
  switch (frequency) {
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'quarterly':
      date.setMonth(date.getMonth() + 3);
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;
    default:
      throw new Error('Invalid frequency');
  }
  
  return date.toISOString().split('T')[0];
};

// Process due recurring transactions
const processRecurringTransactions = async () => {
  try {
    const dueRecurringTransactions = await getDueRecurringTransactions();
    const processedCount = [];
    
    for (const recurring of dueRecurringTransactions) {
      try {
        // Create the actual transaction
        const transaction = {
          type: recurring.type,
          category: recurring.category,
          amount: recurring.amount,
          note: `${recurring.note} (Auto: ${recurring.name})`,
          date: recurring.next_due_date
        };
        
        const createdTransaction = await createTransaction(transaction);
        
        // Calculate next due date
        const nextDueDate = calculateNextDueDate(recurring.next_due_date, recurring.frequency);
        
        // Update the recurring transaction's next due date
        await updateNextDueDate(recurring.id, nextDueDate);
        
        processedCount.push({
          recurringId: recurring.id,
          transactionId: createdTransaction.id,
          name: recurring.name,
          amount: recurring.amount
        });
        
        console.log(`Processed recurring transaction: ${recurring.name} -> $${recurring.amount}`);
      } catch (error) {
        console.error(`Error processing recurring transaction ${recurring.id}:`, error);
      }
    }
    
    if (processedCount.length > 0) {
      console.log(`Successfully processed ${processedCount.length} recurring transactions`);
    }
    
    return processedCount;
  } catch (error) {
    console.error('Error in processRecurringTransactions:', error);
    throw error;
  }
};

module.exports = {
  init,
  getAllTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getTransactionsByMonth,
  getTransactionsByDateRange,
  // Recurring transactions methods
  getAllRecurringTransactions,
  getRecurringTransactionById,
  createRecurringTransaction,
  updateRecurringTransaction,
  deleteRecurringTransaction,
  getDueRecurringTransactions,
  processRecurringTransactions,
  calculateNextDueDate,
  updateNextDueDate
};