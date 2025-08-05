// backend/database/dynamodb.js
const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

// Configure AWS (will use environment variables in production)
const dynamoDb = new AWS.DynamoDB.DocumentClient({
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'spendsmart-transactions';

// Initialize DynamoDB (table should already exist in AWS)
const init = async () => {
  try {
    // Test connection by describing the table
    const tableInfo = await dynamoDb.scan({
      TableName: TABLE_NAME,
      Limit: 1
    }).promise();
    
    console.log('Connected to DynamoDB');
    console.log(`Table: ${TABLE_NAME}`);
    return Promise.resolve();
  } catch (error) {
    console.error('DynamoDB connection failed:', error.message);
    throw error;
  }
};

// Get all transactions
const getAllTransactions = async () => {
  try {
    const params = {
      TableName: TABLE_NAME
    };
    
    const result = await dynamoDb.scan(params).promise();
    
    // Sort by date descending (DynamoDB doesn't guarantee order)
    const transactions = result.Items.sort((a, b) => {
      const dateA = new Date(a.date + 'T' + (a.timestamp || '00:00:00'));
      const dateB = new Date(b.date + 'T' + (b.timestamp || '00:00:00'));
      return dateB - dateA;
    });
    
    console.log(`Retrieved ${transactions.length} transactions from DynamoDB`);
    return transactions;
  } catch (error) {
    console.error('Error getting transactions from DynamoDB:', error);
    throw error;
  }
};

// Get transaction by ID
const getTransactionById = async (id) => {
  try {
    const params = {
      TableName: TABLE_NAME,
      Key: { id }
    };
    
    const result = await dynamoDb.get(params).promise();
    return result.Item || null;
  } catch (error) {
    console.error('Error getting transaction by ID from DynamoDB:', error);
    throw error;
  }
};

// Create new transaction
const createTransaction = async (transaction) => {
  try {
    const id = uuidv4();
    const timestamp = new Date().toISOString();
    
    const newTransaction = {
      id,
      type: transaction.type,
      category: transaction.category,
      amount: parseFloat(transaction.amount),
      note: transaction.note || '',
      date: transaction.date,
      timestamp,
      created_at: new Date().toISOString()
    };
    
    const params = {
      TableName: TABLE_NAME,
      Item: newTransaction
    };
    
    await dynamoDb.put(params).promise();
    
    console.log('Created transaction in DynamoDB:', id);
    return newTransaction;
  } catch (error) {
    console.error('Error creating transaction in DynamoDB:', error);
    throw error;
  }
};

// Update transaction
const updateTransaction = async (id, transaction) => {
  try {
    const params = {
      TableName: TABLE_NAME,
      Key: { id },
      UpdateExpression: 'SET #type = :type, category = :category, amount = :amount, note = :note, #date = :date',
      ExpressionAttributeNames: {
        '#type': 'type',  // 'type' is a reserved word in DynamoDB
        '#date': 'date'   // 'date' is a reserved word in DynamoDB
      },
      ExpressionAttributeValues: {
        ':type': transaction.type,
        ':category': transaction.category,
        ':amount': parseFloat(transaction.amount),
        ':note': transaction.note || '',
        ':date': transaction.date
      },
      ReturnValues: 'ALL_NEW'
    };
    
    const result = await dynamoDb.update(params).promise();
    
    console.log('Updated transaction in DynamoDB:', id);
    return result.Attributes;
  } catch (error) {
    if (error.code === 'ValidationException') {
      throw new Error('Transaction not found');
    }
    console.error('Error updating transaction in DynamoDB:', error);
    throw error;
  }
};

// Delete transaction
const deleteTransaction = async (id) => {
  try {
    const params = {
      TableName: TABLE_NAME,
      Key: { id },
      ReturnValues: 'ALL_OLD'
    };
    
    const result = await dynamoDb.delete(params).promise();
    
    if (!result.Attributes) {
      throw new Error('Transaction not found');
    }
    
    console.log('Deleted transaction from DynamoDB:', id);
    return { success: true };
  } catch (error) {
    console.error('Error deleting transaction from DynamoDB:', error);
    throw error;
  }
};

// Get transactions by month (YYYY-MM format)
const getTransactionsByMonth = async (month) => {
  try {
    const params = {
      TableName: TABLE_NAME,
      FilterExpression: 'begins_with(#date, :month)',
      ExpressionAttributeNames: {
        '#date': 'date'
      },
      ExpressionAttributeValues: {
        ':month': month
      }
    };
    
    const result = await dynamoDb.scan(params).promise();
    
    // Sort by date descending
    const transactions = result.Items.sort((a, b) => {
      const dateA = new Date(a.date + 'T' + (a.timestamp || '00:00:00'));
      const dateB = new Date(b.date + 'T' + (b.timestamp || '00:00:00'));
      return dateB - dateA;
    });
    
    console.log(`Retrieved ${transactions.length} transactions for ${month} from DynamoDB`);
    return transactions;
  } catch (error) {
    console.error('Error getting transactions by month from DynamoDB:', error);
    throw error;
  }
};

// Get transactions by date range
const getTransactionsByDateRange = async (startDate, endDate) => {
  try {
    const params = {
      TableName: TABLE_NAME,
      FilterExpression: '#date BETWEEN :startDate AND :endDate',
      ExpressionAttributeNames: {
        '#date': 'date'
      },
      ExpressionAttributeValues: {
        ':startDate': startDate,
        ':endDate': endDate
      }
    };
    
    const result = await dynamoDb.scan(params).promise();
    
    // Sort by date descending
    const transactions = result.Items.sort((a, b) => {
      const dateA = new Date(a.date + 'T' + (a.timestamp || '00:00:00'));
      const dateB = new Date(b.date + 'T' + (b.timestamp || '00:00:00'));
      return dateB - dateA;
    });
    
    console.log(`Retrieved ${transactions.length} transactions from ${startDate} to ${endDate} from DynamoDB`);
    return transactions;
  } catch (error) {
    console.error('Error getting transactions by date range from DynamoDB:', error);
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
  getTransactionsByDateRange
};