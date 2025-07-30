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
          console.error('Error creating table:', err);
          reject(err);
        } else {
          console.log('Transactions table ready');
          resolve();
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

module.exports = {
  init,
  getAllTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getTransactionsByMonth,
  getTransactionsByDateRange
};