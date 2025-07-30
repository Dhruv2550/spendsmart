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

// Routes

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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
const startServer = async () => {
  await initializeServer();
  
  app.listen(PORT, () => {
    console.log(`SpendSmart Backend running on http://localhost:${PORT}`);
    console.log(`API endpoints available at:`);
    console.log(`   GET    /api/records - Get all records`);
    console.log(`   POST   /api/records - Add new record`);
    console.log(`   PUT    /api/records/:id - Update record`);
    console.log(`   DELETE /api/records/:id - Delete record`);
    console.log(`   GET    /api/summary/:month - Get monthly summary`);
    console.log(`   GET    /api/health - Health check`);
  });
};

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Shutting down gracefully...');
  process.exit(0);
});

// Start the server
startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});