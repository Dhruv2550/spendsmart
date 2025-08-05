const express = require('express');
const cors = require('cors');
const db = require('./database'); // Import our database abstraction layer
const aiAnalyticsService = require('./services/aiAnalyticsService');

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

// Add a new record (income or expense) - Enhanced with alert checking
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
    
    // Check for budget alerts after creating the transaction
    let alerts = [];
    if (type === 'expense') {
      try {
        alerts = await db.checkBudgetAlerts(createdRecord);
      } catch (alertError) {
        console.error('Error checking alerts:', alertError);
        // Don't fail the transaction creation if alert checking fails
      }
    }
    
    res.status(201).json({ 
      transaction: createdRecord,
      alerts: alerts,
      alertCount: alerts.length
    });
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

// ============================================
// ENVELOPE BUDGETING ROUTES
// ============================================

// Get envelope budgets for a specific template and month
app.get('/api/budgets/:templateName/:month', async (req, res) => {
  try {
    const { templateName, month } = req.params;
    
    // Validate month format
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: 'Invalid month format. Use YYYY-MM' });
    }
    
    const budgets = await db.getEnvelopeBudgets(templateName, month);
    res.json(budgets);
  } catch (error) {
    console.error('Error getting envelope budgets:', error);
    res.status(500).json({ error: 'Failed to retrieve envelope budgets' });
  }
});

// Get all budget templates
app.get('/api/budget-templates', async (req, res) => {
  try {
    const templates = await db.getBudgetTemplates();
    res.json(templates);
  } catch (error) {
    console.error('Error getting budget templates:', error);
    res.status(500).json({ error: 'Failed to retrieve budget templates' });
  }
});

// Create or update envelope budget
app.post('/api/budgets', async (req, res) => {
  try {
    const { template_name, category, budget_amount, month, rollover_enabled, rollover_amount } = req.body;
    
    // Validate required fields
    if (!template_name || !category || !budget_amount || !month) {
      return res.status(400).json({ 
        error: 'Missing required fields: template_name, category, budget_amount, month' 
      });
    }
    
    // Validate month format
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: 'Invalid month format. Use YYYY-MM' });
    }
    
    const envelopeBudget = {
      template_name,
      category,
      budget_amount: parseFloat(budget_amount),
      month,
      rollover_enabled: rollover_enabled || false,
      rollover_amount: parseFloat(rollover_amount || 0),
      is_active: true
    };
    
    const created = await db.upsertEnvelopeBudget(envelopeBudget);
    res.status(201).json(created);
  } catch (error) {
    console.error('Error creating envelope budget:', error);
    res.status(500).json({ error: 'Failed to create envelope budget' });
  }
});

// Create budget template with multiple categories
app.post('/api/budget-templates', async (req, res) => {
  try {
    const { template_name, month, budgets } = req.body;
    
    // Validate required fields
    if (!template_name || !month || !budgets || !Array.isArray(budgets)) {
      return res.status(400).json({ 
        error: 'Missing required fields: template_name, month, budgets (array)' 
      });
    }
    
    // Validate month format
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: 'Invalid month format. Use YYYY-MM' });
    }
    
    // Validate budgets array
    for (const budget of budgets) {
      if (!budget.category || !budget.budget_amount) {
        return res.status(400).json({ 
          error: 'Each budget must have category and budget_amount' 
        });
      }
    }
    
    const created = await db.createBudgetFromTemplate(template_name, month, budgets);
    res.status(201).json({ 
      message: `Created budget template ${template_name} for ${month}`,
      budgets: created 
    });
  } catch (error) {
    console.error('Error creating budget template:', error);
    res.status(500).json({ error: 'Failed to create budget template' });
  }
});

// Delete budget template
app.delete('/api/budget-templates/:templateName', async (req, res) => {
  try {
    const { templateName } = req.params;
    
    const result = await db.deleteBudgetTemplate(templateName);
    res.json({ 
      message: `Budget template ${templateName} deleted successfully`,
      changes: result.changes 
    });
  } catch (error) {
    console.error('Error deleting budget template:', error);
    res.status(500).json({ error: 'Failed to delete budget template' });
  }
});

// Get budget vs actual analysis
app.get('/api/budget-analysis/:templateName/:month', async (req, res) => {
  try {
    const { templateName, month } = req.params;
    
    // Validate month format
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: 'Invalid month format. Use YYYY-MM' });
    }
    
    const analysis = await db.getBudgetVsActual(templateName, month);
    
    // Calculate summary statistics
    const totalBudgeted = analysis.reduce((sum, item) => sum + item.budgeted, 0);
    const totalActual = analysis.reduce((sum, item) => sum + item.actual, 0);
    const totalRemaining = analysis.reduce((sum, item) => sum + item.remaining, 0);
    const overBudgetCategories = analysis.filter(item => item.actual > item.budgeted).length;
    
    res.json({
      analysis,
      summary: {
        totalBudgeted,
        totalActual,
        totalRemaining,
        overBudgetCategories,
        budgetUtilization: totalBudgeted > 0 ? (totalActual / totalBudgeted) * 100 : 0
      }
    });
  } catch (error) {
    console.error('Error getting budget analysis:', error);
    res.status(500).json({ error: 'Failed to retrieve budget analysis' });
  }
});

// Copy budget template to new month
app.post('/api/budget-templates/:templateName/copy', async (req, res) => {
  try {
    const { templateName } = req.params;
    const { source_month, target_month, apply_rollover } = req.body;
    
    if (!source_month || !target_month) {
      return res.status(400).json({ 
        error: 'Missing required fields: source_month, target_month' 
      });
    }
    
    // Get source budget
    const sourceBudgets = await db.getEnvelopeBudgets(templateName, source_month);
    
    if (sourceBudgets.length === 0) {
      return res.status(404).json({ error: 'Source budget template not found' });
    }
    
    // Prepare budgets for new month
    const newBudgets = sourceBudgets.map(budget => ({
      category: budget.category,
      budget_amount: budget.budget_amount,
      rollover_enabled: budget.rollover_enabled,
      rollover_amount: apply_rollover && budget.rollover_enabled ? budget.rollover_amount : 0
    }));
    
    const created = await db.createBudgetFromTemplate(templateName, target_month, newBudgets);
    
    res.status(201).json({ 
      message: `Copied budget template ${templateName} from ${source_month} to ${target_month}`,
      budgets: created 
    });
  } catch (error) {
    console.error('Error copying budget template:', error);
    res.status(500).json({ error: 'Failed to copy budget template' });
  }
});

// ============================================
// SPENDING ALERTS ROUTES
// ============================================

// Get active alerts for a month
app.get('/api/alerts/:month', async (req, res) => {
  try {
    const { month } = req.params;
    
    // Validate month format
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: 'Invalid month format. Use YYYY-MM' });
    }
    
    const alerts = await db.getActiveAlerts(month);
    res.json(alerts);
  } catch (error) {
    console.error('Error getting alerts:', error);
    res.status(500).json({ error: 'Failed to retrieve alerts' });
  }
});

// Get all active alerts (no month filter)
app.get('/api/alerts', async (req, res) => {
  try {
    const alerts = await db.getActiveAlerts(null);
    res.json(alerts);
  } catch (error) {
    console.error('Error getting alerts:', error);
    res.status(500).json({ error: 'Failed to retrieve alerts' });
  }
});

// Mark alert as read
app.patch('/api/alerts/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.markAlertAsRead(id);
    res.json({ message: 'Alert marked as read', success: result.success });
  } catch (error) {
    console.error('Error marking alert as read:', error);
    res.status(500).json({ error: 'Failed to mark alert as read' });
  }
});

// Dismiss alert
app.patch('/api/alerts/:id/dismiss', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.dismissAlert(id);
    res.json({ message: 'Alert dismissed', success: result.success });
  } catch (error) {
    console.error('Error dismissing alert:', error);
    res.status(500).json({ error: 'Failed to dismiss alert' });
  }
});

// Dismiss all alerts for a month
app.patch('/api/alerts/dismiss-all/:month', async (req, res) => {
  try {
    const { month } = req.params;
    
    // Validate month format
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: 'Invalid month format. Use YYYY-MM' });
    }
    
    const result = await db.dismissAllAlerts(month);
    res.json({ 
      message: `Dismissed all alerts for ${month}`,
      changes: result.changes 
    });
  } catch (error) {
    console.error('Error dismissing all alerts:', error);
    res.status(500).json({ error: 'Failed to dismiss all alerts' });
  }
});

// ============================================
// AI ANALYTICS ROUTES
// ============================================

// Get spending predictions
app.get('/api/analytics/predictions', async (req, res) => {
  try {
    const { months = 3, userId } = req.query;
    
    const predictions = await aiAnalyticsService.generateSpendingPredictions(
      userId, 
      parseInt(months)
    );
    
    res.json(predictions);
  } catch (error) {
    console.error('Error getting spending predictions:', error);
    res.status(500).json({ error: 'Failed to generate spending predictions' });
  }
});

// Detect spending anomalies
app.get('/api/analytics/anomalies', async (req, res) => {
  try {
    const { days = 30, userId } = req.query;
    
    const anomalies = await aiAnalyticsService.detectSpendingAnomalies(
      userId, 
      parseInt(days)
    );
    
    res.json(anomalies);
  } catch (error) {
    console.error('Error detecting anomalies:', error);
    res.status(500).json({ error: 'Failed to detect spending anomalies' });
  }
});

// Get budget recommendations
app.get('/api/analytics/recommendations', async (req, res) => {
  try {
    const { userId, template = 'Default' } = req.query;
    
    const recommendations = await aiAnalyticsService.generateBudgetRecommendations(
      userId, 
      template
    );
    
    res.json(recommendations);
  } catch (error) {
    console.error('Error generating recommendations:', error);
    res.status(500).json({ error: 'Failed to generate budget recommendations' });
  }
});

// Get comprehensive AI insights (combines all AI features)
app.get('/api/analytics/insights', async (req, res) => {
  try {
    const { userId, template = 'Default' } = req.query;
    
    console.log('🧠 Generating comprehensive AI insights...');
    
    // Run all AI analyses in parallel for better performance
    const [predictions, anomalies, recommendations] = await Promise.all([
      aiAnalyticsService.generateSpendingPredictions(userId, 2),
      aiAnalyticsService.detectSpendingAnomalies(userId, 30),
      aiAnalyticsService.generateBudgetRecommendations(userId, template)
    ]);
    
    // Combine insights
    const insights = {
      success: true,
      predictions: {
        success: predictions.success,
        data: predictions.success ? predictions.predictions : [],
        confidence: predictions.confidence || 0,
        insights: predictions.insights || []
      },
      anomalies: {
        success: anomalies.success,
        data: anomalies.success ? anomalies.anomalies.slice(0, 10) : [], // Top 10
        summary: anomalies.summary || {}
      },
      recommendations: {
        success: recommendations.success,
        data: recommendations.success ? recommendations.recommendations.slice(0, 10) : [], // Top 10
        summary: recommendations.summary || {}
      },
      summary: {
        totalInsights: (predictions.success ? predictions.predictions.length : 0) +
                      (anomalies.success ? anomalies.anomalies.length : 0) +
                      (recommendations.success ? recommendations.recommendations.length : 0),
        highPriorityItems: (anomalies.success ? anomalies.summary.highSeverity || 0 : 0) +
                          (recommendations.success ? recommendations.summary.highPriority || 0 : 0),
        potentialSavings: recommendations.success ? recommendations.summary.potentialMonthlySavings || 0 : 0
      },
      generatedAt: new Date().toISOString()
    };
    
    res.json(insights);
  } catch (error) {
    console.error('Error generating comprehensive insights:', error);
    res.status(500).json({ error: 'Failed to generate AI insights' });
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
    console.log(`   POST   /api/records - Add new record (with alert checking)`);
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
    console.log(`   GET    /api/budgets/:template/:month - Get envelope budgets`);
    console.log(`   POST   /api/budgets - Create/update envelope budget`);
    console.log(`   GET    /api/budget-templates - Get all budget templates`);
    console.log(`   POST   /api/budget-templates - Create budget template`);
    console.log(`   DELETE /api/budget-templates/:name - Delete budget template`);
    console.log(`   GET    /api/budget-analysis/:template/:month - Get budget vs actual`);
    console.log(`   POST   /api/budget-templates/:name/copy - Copy template to new month`);
    console.log(`   GET    /api/alerts/:month - Get active alerts for month`);
    console.log(`   GET    /api/alerts - Get all active alerts`);
    console.log(`   PATCH  /api/alerts/:id/read - Mark alert as read`);
    console.log(`   PATCH  /api/alerts/:id/dismiss - Dismiss alert`);
    console.log(`   PATCH  /api/alerts/dismiss-all/:month - Dismiss all alerts for month`);
    console.log('🤖 AI Analytics API endpoints:');
    console.log('   GET    /api/analytics/predictions - Get spending predictions');
    console.log('   GET    /api/analytics/anomalies - Detect spending anomalies');
    console.log('   GET    /api/analytics/recommendations - Get budget recommendations');
    console.log('   GET    /api/analytics/insights - Get comprehensive AI insights');
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