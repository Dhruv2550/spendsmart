const express = require('express');
const cors = require('cors');
const db = require('./database'); // Import our database abstraction layer

const app = express();
const PORT = 3001;

// Middleware
app.use(cors()); // Allow frontend to connect
app.use(express.json()); // Parse JSON data

// Initialize database on startup
const initializeServer = async () => {
  try {
    await db.init();
    console.log('Database connection established');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    process.exit(1); // Exit if database connection fails
  }
};

// ============================================
// TRANSACTION ROUTES
// ============================================

// Get all records
app.get('/api/records', async (req, res) => {
  try {
    const records = await db.getAllTransactions();
    res.json(records);
  } catch (error) {
    console.error('Error getting records:', error);
    res.status(500).json({ error: 'Failed to retrieve records' });
  }
});

// Add a new record (income or expense)
app.post('/api/records', async (req, res) => {
  try {
    const { type, category, amount, note, date } = req.body;
    
    // Validate required fields
    if (!type || !category || !amount) {
      return res.status(400).json({ error: 'Missing required fields: type, category, amount' });
    }
    
    // Validate type
    if (type !== 'income' && type !== 'expense') {
      return res.status(400).json({ error: 'Type must be either "income" or "expense"' });
    }
    
    const newRecord = {
      type,
      category,
      amount: parseFloat(amount),
      note: note || '',
      date: date || new Date().toISOString().split('T')[0] // YYYY-MM-DD format
    };
    
    const createdRecord = await db.createTransaction(newRecord);
    res.status(201).json(createdRecord);
  } catch (error) {
    console.error('Error creating record:', error);
    res.status(500).json({ error: 'Failed to create record' });
  }
});

// Update a record
app.put('/api/records/:id', async (req, res) => {
  try {
    const id = req.params.id; // Keep as string for UUID compatibility
    const { type, category, amount, note, date } = req.body;
    
    // Validate required fields
    if (!type || !category || !amount) {
      return res.status(400).json({ error: 'Missing required fields: type, category, amount' });
    }
    
    // Validate type
    if (type !== 'income' && type !== 'expense') {
      return res.status(400).json({ error: 'Type must be either "income" or "expense"' });
    }
    
    const updatedRecord = {
      type,
      category,
      amount: parseFloat(amount),
      note: note || '',
      date: date || new Date().toISOString().split('T')[0]
    };
    
    const result = await db.updateTransaction(id, updatedRecord);
    res.json(result);
  } catch (error) {
    console.error('Error updating record:', error);
    if (error.message === 'Transaction not found') {
      res.status(404).json({ error: 'Record not found' });
    } else {
      res.status(500).json({ error: 'Failed to update record' });
    }
  }
});

// Delete a record
app.delete('/api/records/:id', async (req, res) => {
  try {
    const id = req.params.id; // Keep as string for UUID compatibility
    
    await db.deleteTransaction(id);
    res.json({ message: 'Record deleted successfully' });
  } catch (error) {
    console.error('Error deleting record:', error);
    if (error.message === 'Transaction not found') {
      res.status(404).json({ error: 'Record not found' });
    } else {
      res.status(500).json({ error: 'Failed to delete record' });
    }
  }
});

// Get monthly summary
app.get('/api/summary/:month', async (req, res) => {
  try {
    const month = req.params.month; // Format: YYYY-MM
    
    // Validate month format
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: 'Invalid month format. Use YYYY-MM' });
    }
    
    const monthlyRecords = await db.getTransactionsByMonth(month);
    
    const totalIncome = monthlyRecords
      .filter(record => record.type === 'income')
      .reduce((sum, record) => sum + record.amount, 0);
      
    const totalExpenses = monthlyRecords
      .filter(record => record.type === 'expense')
      .reduce((sum, record) => sum + record.amount, 0);
      
    const savings = totalIncome - totalExpenses;
    
    // Category breakdown
    const categoryBreakdown = {};
    monthlyRecords.forEach(record => {
      if (!categoryBreakdown[record.category]) {
        categoryBreakdown[record.category] = 0;
      }
      categoryBreakdown[record.category] += record.amount;
    });
    
    res.json({
      month,
      totalIncome,
      totalExpenses,
      savings,
      categoryBreakdown,
      recordCount: monthlyRecords.length
    });
  } catch (error) {
    console.error('Error getting monthly summary:', error);
    res.status(500).json({ error: 'Failed to retrieve monthly summary' });
  }
});

// ============================================
// RECURRING TRANSACTIONS ROUTES
// ============================================

// Get all recurring transactions
app.get('/api/recurring', async (req, res) => {
  try {
    const recurringTransactions = await db.getAllRecurringTransactions();
    res.json(recurringTransactions);
  } catch (error) {
    console.error('Error getting recurring transactions:', error);
    res.status(500).json({ error: 'Failed to retrieve recurring transactions' });
  }
});

// Create new recurring transaction
app.post('/api/recurring', async (req, res) => {
  try {
    const { name, type, category, amount, note, frequency, start_date, end_date } = req.body;
    
    // Validate required fields
    if (!name || !type || !category || !amount || !frequency || !start_date) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, type, category, amount, frequency, start_date' 
      });
    }
    
    // Validate type and frequency
    if (!['income', 'expense'].includes(type)) {
      return res.status(400).json({ error: 'Type must be either "income" or "expense"' });
    }
    
    if (!['weekly', 'monthly', 'quarterly', 'yearly'].includes(frequency)) {
      return res.status(400).json({ error: 'Invalid frequency' });
    }
    
    const newRecurringTransaction = {
      name,
      type,
      category,
      amount: parseFloat(amount),
      note: note || '',
      frequency,
      start_date,
      end_date: end_date || null,
      next_due_date: start_date, // First occurrence
      is_active: true
    };
    
    const createdRecurring = await db.createRecurringTransaction(newRecurringTransaction);
    res.status(201).json(createdRecurring);
  } catch (error) {
    console.error('Error creating recurring transaction:', error);
    res.status(500).json({ error: 'Failed to create recurring transaction' });
  }
});

// Update recurring transaction
app.put('/api/recurring/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { name, type, category, amount, note, frequency, start_date, end_date, is_active, next_due_date } = req.body;
    
    // Validate required fields
    if (!name || !type || !category || !amount || !frequency || !start_date) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, type, category, amount, frequency, start_date' 
      });
    }
    
    const updatedRecurringTransaction = {
      name,
      type,
      category,
      amount: parseFloat(amount),
      note: note || '',
      frequency,
      start_date,
      end_date: end_date || null,
      next_due_date: next_due_date || start_date,
      is_active: is_active !== undefined ? is_active : true
    };
    
    const result = await db.updateRecurringTransaction(id, updatedRecurringTransaction);
    res.json(result);
  } catch (error) {
    console.error('Error updating recurring transaction:', error);
    if (error.message === 'Recurring transaction not found') {
      res.status(404).json({ error: 'Recurring transaction not found' });
    } else {
      res.status(500).json({ error: 'Failed to update recurring transaction' });
    }
  }
});

// Delete recurring transaction
app.delete('/api/recurring/:id', async (req, res) => {
  try {
    const id = req.params.id;
    
    await db.deleteRecurringTransaction(id);
    res.json({ message: 'Recurring transaction deleted successfully' });
  } catch (error) {
    console.error('Error deleting recurring transaction:', error);
    if (error.message === 'Recurring transaction not found') {
      res.status(404).json({ error: 'Recurring transaction not found' });
    } else {
      res.status(500).json({ error: 'Failed to delete recurring transaction' });
    }
  }
});

// Process recurring transactions (manual trigger)
app.post('/api/recurring/process', async (req, res) => {
  try {
    const processed = await db.processRecurringTransactions();
    res.json({ 
      message: `Processed ${processed.length} recurring transactions`,
      processed 
    });
  } catch (error) {
    console.error('Error processing recurring transactions:', error);
    res.status(500).json({ error: 'Failed to process recurring transactions' });
  }
});

// Toggle recurring transaction active status
app.patch('/api/recurring/:id/toggle', async (req, res) => {
  try {
    const id = req.params.id;
    
    // Get current transaction
    const current = await db.getRecurringTransactionById(id);
    if (!current) {
      return res.status(404).json({ error: 'Recurring transaction not found' });
    }
    
    // Toggle active status
    const updated = await db.updateRecurringTransaction(id, {
      ...current,
      is_active: !current.is_active
    });
    
    res.json(updated);
  } catch (error) {
    console.error('Error toggling recurring transaction:', error);
    res.status(500).json({ error: 'Failed to toggle recurring transaction' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ============================================
// BACKGROUND PROCESSING
// ============================================

let recurringProcessInterval;

// Start background processing
const startRecurringProcessor = () => {
  // Process recurring transactions every hour
  recurringProcessInterval = setInterval(async () => {
    try {
      console.log('🔄 Checking for due recurring transactions...');
      const processed = await db.processRecurringTransactions();
      
      if (processed.length > 0) {
        console.log(`✅ Auto-processed ${processed.length} recurring transactions`);
      }
    } catch (error) {
      console.error('❌ Error in recurring transaction processor:', error);
    }
  }, 60 * 60 * 1000); // Run every hour
  
  console.log('🤖 Recurring transaction processor started');
};

// Stop background processing
const stopRecurringProcessor = () => {
  if (recurringProcessInterval) {
    clearInterval(recurringProcessInterval);
    console.log('🛑 Recurring transaction processor stopped');
  }
};

// Start server
const startServer = async () => {
  await initializeServer();
  
  // Start recurring transaction processor
  startRecurringProcessor();
  
  app.listen(PORT, () => {
    console.log(`SpendSmart Backend running on http://localhost:${PORT}`);
    console.log(`API endpoints available at:`);
    console.log(`   GET    /api/records - Get all records`);
    console.log(`   POST   /api/records - Add new record`);
    console.log(`   PUT    /api/records/:id - Update record`);
    console.log(`   DELETE /api/records/:id - Delete record`);
    console.log(`   GET    /api/summary/:month - Get monthly summary`);
    console.log(`   GET    /api/health - Health check`);
    console.log(`   GET    /api/recurring - Get all recurring transactions`);
    console.log(`   POST   /api/recurring - Add new recurring transaction`);
    console.log(`   PUT    /api/recurring/:id - Update recurring transaction`);
    console.log(`   DELETE /api/recurring/:id - Delete recurring transaction`);
    console.log(`   POST   /api/recurring/process - Process due recurring transactions`);
    console.log(`   PATCH  /api/recurring/:id/toggle - Toggle recurring transaction`);
  });
};

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  stopRecurringProcessor();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Shutting down gracefully...');
  stopRecurringProcessor();
  process.exit(0);
});

// Start the server
startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});