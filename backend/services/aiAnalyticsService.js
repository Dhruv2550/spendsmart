// backend/services/aiAnalyticsService.js - Enhanced Predictions Focus
const db = require('../database');

class AIAnalyticsService {
  constructor() {
    this.models = {
      anomalyThreshold: 2.5, // Standard deviations for anomaly detection
      predictionWindow: 90,   // Days to analyze for predictions
      minDataPoints: 10       // Minimum transactions needed for analysis
    };
  }

  // ============================================
  // ENHANCED SPENDING PREDICTION ENGINE
  // ============================================

  async generateSpendingPredictions(userId = null, months = 3) {
    try {
      console.log('Generating enhanced spending predictions...');
      
      // Get more historical data for better predictions (last 12 months)
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
      const startDate = twelveMonthsAgo.toISOString().split('T')[0];
      const endDate = new Date().toISOString().split('T')[0];
      
      const historicalTransactions = await db.getTransactionsByDateRange(startDate, endDate);
      
      if (historicalTransactions.length < this.models.minDataPoints) {
        return {
          success: false,
          message: `Need at least ${this.models.minDataPoints} transactions for predictions`,
          predictions: [],
          confidence: 0,
          dataInsights: {
            currentTransactions: historicalTransactions.length,
            requiredTransactions: this.models.minDataPoints,
            suggestion: 'Add more transactions across different categories and months'
          }
        };
      }

      // Enhanced pattern analysis
      const categoryPatterns = this.analyzeCategoryPatterns(historicalTransactions);
      const seasonalTrends = this.analyzeSeasonalTrends(historicalTransactions);
      const weeklyPatterns = this.analyzeWeeklyPatterns(historicalTransactions);
      const growthRates = this.calculateEnhancedGrowthRates(historicalTransactions);
      const volatilityScores = this.calculateVolatilityScores(historicalTransactions);

      // Generate enhanced predictions for next N months
      const predictions = [];
      const currentDate = new Date();
      
      for (let i = 1; i <= months; i++) {
        const targetDate = new Date(currentDate);
        targetDate.setMonth(targetDate.getMonth() + i);
        const targetMonth = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;
        
        const monthPrediction = await this.predictMonthSpendingEnhanced(
          targetMonth,
          categoryPatterns,
          seasonalTrends,
          weeklyPatterns,
          growthRates,
          volatilityScores,
          historicalTransactions
        );
        
        predictions.push(monthPrediction);
      }

      const overallConfidence = this.calculateEnhancedConfidence(historicalTransactions, categoryPatterns, volatilityScores);
      const enhancedInsights = this.generateEnhancedPredictionInsights(predictions, categoryPatterns, seasonalTrends);

      return {
        success: true,
        predictions,
        confidence: overallConfidence,
        dataPoints: historicalTransactions.length,
        generatedAt: new Date().toISOString(),
        insights: enhancedInsights,
        modelMetrics: {
          categoriesAnalyzed: Object.keys(categoryPatterns).length,
          monthsOfData: this.getUniqueMonths(historicalTransactions).length,
          seasonalFactorsApplied: Object.keys(seasonalTrends).length,
          averageVolatility: this.calculateAverageVolatility(volatilityScores)
        }
      };

    } catch (error) {
      console.error('Error generating spending predictions:', error);
      return {
        success: false,
        message: 'Failed to generate predictions',
        error: error.message
      };
    }
  }

  // Enhanced pattern analysis with volatility
  analyzeCategoryPatterns(transactions) {
    const patterns = {};
    const monthlyData = {};

    // Group transactions by month and category
    transactions.filter(t => t.type === 'expense').forEach(transaction => {
      const month = transaction.date.substring(0, 7);
      const category = transaction.category;
      
      if (!monthlyData[month]) monthlyData[month] = {};
      if (!monthlyData[month][category]) monthlyData[month][category] = [];
      monthlyData[month][category].push(transaction.amount);
    });

    // Calculate enhanced statistics for each category
    const categories = new Set();
    Object.values(monthlyData).forEach(monthData => {
      Object.keys(monthData).forEach(cat => categories.add(cat));
    });

    categories.forEach(category => {
      const monthlyTotals = [];
      const allTransactions = [];
      
      Object.values(monthlyData).forEach(monthData => {
        if (monthData[category]) {
          const monthTotal = monthData[category].reduce((sum, amount) => sum + amount, 0);
          monthlyTotals.push(monthTotal);
          allTransactions.push(...monthData[category]);
        }
      });

      if (monthlyTotals.length >= 2) {
        const avg = monthlyTotals.reduce((sum, a) => sum + a, 0) / monthlyTotals.length;
        const variance = monthlyTotals.reduce((sum, a) => sum + Math.pow(a - avg, 2), 0) / monthlyTotals.length;
        const stdDev = Math.sqrt(variance);
        
        // Calculate transaction-level statistics
        const avgTransactionSize = allTransactions.reduce((sum, a) => sum + a, 0) / allTransactions.length;
        const transactionVariance = allTransactions.reduce((sum, a) => sum + Math.pow(a - avgTransactionSize, 2), 0) / allTransactions.length;
        const transactionStdDev = Math.sqrt(transactionVariance);
        
        patterns[category] = {
          average: avg,
          standardDeviation: stdDev,
          min: Math.min(...monthlyTotals),
          max: Math.max(...monthlyTotals),
          trend: this.calculateTrend(monthlyTotals),
          confidence: Math.min(monthlyTotals.length / 6, 1), // Higher confidence with more data
          monthlyData: monthlyTotals,
          volatility: stdDev / avg, // Coefficient of variation
          avgTransactionSize,
          transactionStdDev,
          totalTransactions: allTransactions.length,
          predictability: this.calculatePredictability(monthlyTotals)
        };
      }
    });

    return patterns;
  }

  // New: Analyze weekly spending patterns
  analyzeWeeklyPatterns(transactions) {
    const weeklyData = {};
    
    transactions.filter(t => t.type === 'expense').forEach(transaction => {
      const date = new Date(transaction.date);
      const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
      const category = transaction.category;
      
      if (!weeklyData[dayOfWeek]) weeklyData[dayOfWeek] = {};
      if (!weeklyData[dayOfWeek][category]) weeklyData[dayOfWeek][category] = [];
      weeklyData[dayOfWeek][category].push(transaction.amount);
    });

    // Calculate day-of-week multipliers for each category
    const weeklyMultipliers = {};
    Object.keys(weeklyData).forEach(day => {
      weeklyMultipliers[day] = {};
      Object.keys(weeklyData[day]).forEach(category => {
        const amounts = weeklyData[day][category];
        const dayAvg = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
        
        // Compare to overall category average
        const allAmounts = [];
        Object.values(weeklyData).forEach(dayData => {
          if (dayData[category]) {
            allAmounts.push(...dayData[category]);
          }
        });
        const overallAvg = allAmounts.reduce((sum, a) => sum + a, 0) / allAmounts.length;
        
        weeklyMultipliers[day][category] = overallAvg > 0 ? dayAvg / overallAvg : 1;
      });
    });

    return weeklyMultipliers;
  }

  // Enhanced growth rate calculation
  calculateEnhancedGrowthRates(transactions) {
    const monthlyTotals = {};
    const categoryGrowthRates = {};
    
    transactions.filter(t => t.type === 'expense').forEach(transaction => {
      const month = transaction.date.substring(0, 7);
      const category = transaction.category;
      
      if (!monthlyTotals[month]) monthlyTotals[month] = 0;
      monthlyTotals[month] += transaction.amount;
      
      if (!categoryGrowthRates[category]) categoryGrowthRates[category] = {};
      if (!categoryGrowthRates[category][month]) categoryGrowthRates[category][month] = 0;
      categoryGrowthRates[category][month] += transaction.amount;
    });

    const sortedMonths = Object.keys(monthlyTotals).sort();
    
    // Calculate overall growth rate
    let overallGrowthRate = 0;
    if (sortedMonths.length >= 3) {
      const growthRates = [];
      for (let i = 1; i < sortedMonths.length; i++) {
        const current = monthlyTotals[sortedMonths[i]];
        const previous = monthlyTotals[sortedMonths[i - 1]];
        if (previous > 0) {
          growthRates.push((current - previous) / previous);
        }
      }
      overallGrowthRate = growthRates.length > 0 ? 
        growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length : 0;
    }

    // Calculate category-specific growth rates
    const categoryGrowth = {};
    Object.keys(categoryGrowthRates).forEach(category => {
      const categoryMonths = Object.keys(categoryGrowthRates[category]).sort();
      if (categoryMonths.length >= 3) {
        const growthRates = [];
        for (let i = 1; i < categoryMonths.length; i++) {
          const current = categoryGrowthRates[category][categoryMonths[i]];
          const previous = categoryGrowthRates[category][categoryMonths[i - 1]];
          if (previous > 0) {
            growthRates.push((current - previous) / previous);
          }
        }
        categoryGrowth[category] = growthRates.length > 0 ? 
          growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length : 0;
      }
    });

    return {
      overall: overallGrowthRate,
      categories: categoryGrowth
    };
  }

  // Calculate volatility scores for prediction confidence
  calculateVolatilityScores(transactions) {
    const volatilityScores = {};
    const monthlyData = {};

    // Group by category and month
    transactions.filter(t => t.type === 'expense').forEach(transaction => {
      const month = transaction.date.substring(0, 7);
      const category = transaction.category;
      
      if (!monthlyData[category]) monthlyData[category] = [];
      if (!monthlyData[category][month]) monthlyData[category][month] = 0;
      monthlyData[category][month] += transaction.amount;
    });

    // Calculate volatility (coefficient of variation) for each category
    Object.keys(monthlyData).forEach(category => {
      const amounts = Object.values(monthlyData[category]).filter(amount => amount > 0);
      if (amounts.length >= 3) {
        const mean = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
        const variance = amounts.reduce((sum, a) => sum + Math.pow(a - mean, 2), 0) / amounts.length;
        const stdDev = Math.sqrt(variance);
        
        volatilityScores[category] = {
          volatility: mean > 0 ? stdDev / mean : 0, // Coefficient of variation
          stability: Math.max(0, 1 - (stdDev / mean)), // Inverse of volatility
          predictability: this.calculatePredictability(amounts)
        };
      }
    });

    return volatilityScores;
  }

  // Enhanced month prediction with more factors
  async predictMonthSpendingEnhanced(targetMonth, categoryPatterns, seasonalTrends, weeklyPatterns, growthRates, volatilityScores, historicalTransactions) {
    const targetDate = new Date(targetMonth + '-01');
    const targetMonthNum = targetDate.getMonth() + 1;
    
    const categoryPredictions = {};
    let totalPredicted = 0;

    Object.keys(categoryPatterns).forEach(category => {
      const pattern = categoryPatterns[category];
      const volatility = volatilityScores[category] || { volatility: 0.2, stability: 0.8, predictability: 0.7 };
      
      let prediction = pattern.average;

      // Apply seasonal adjustment
      const seasonalMultiplier = seasonalTrends[targetMonthNum]?.[category] || 1;
      prediction *= seasonalMultiplier;

      // Apply category-specific or overall growth trend
      const categoryGrowthRate = growthRates.categories[category] || growthRates.overall;
      prediction *= (1 + categoryGrowthRate);

      // Adjust prediction confidence based on volatility
      const confidenceAdjustment = volatility.stability;
      const adjustedConfidence = pattern.confidence * confidenceAdjustment;

      // Calculate prediction range based on volatility
      const rangeMultiplier = Math.max(0.15, volatility.volatility); // At least 15% range
      const lowRange = prediction * (1 - rangeMultiplier);
      const highRange = prediction * (1 + rangeMultiplier);

      // Ensure prediction is within reasonable bounds
      prediction = Math.max(0, Math.min(prediction, pattern.max * 2.5));

      categoryPredictions[category] = {
        predicted: Math.round(prediction),
        confidence: adjustedConfidence,
        range: {
          low: Math.round(lowRange),
          high: Math.round(highRange)
        },
        factors: {
          baseAverage: Math.round(pattern.average),
          seasonalAdjustment: seasonalMultiplier.toFixed(2),
          growthAdjustment: (categoryGrowthRate * 100).toFixed(1) + '%',
          volatilityScore: volatility.volatility.toFixed(2),
          stabilityScore: volatility.stability.toFixed(2)
        },
        insights: this.generateCategoryInsights(category, pattern, seasonalMultiplier, categoryGrowthRate, volatility)
      };

      totalPredicted += prediction;
    });

    // Generate month-level insights
    const monthInsights = this.generateMonthInsights(targetMonth, totalPredicted, historicalTransactions, seasonalTrends);

    return {
      month: targetMonth,
      monthName: targetDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
      totalPredicted: Math.round(totalPredicted),
      categoryBreakdown: categoryPredictions,
      confidence: this.calculateMonthConfidence(categoryPredictions),
      factors: {
        historicalAverage: Math.round(this.getHistoricalMonthlyAverage(historicalTransactions)),
        seasonalFactor: seasonalTrends[targetMonthNum] ? 'Applied' : 'None',
        trendFactor: (growthRates.overall * 100).toFixed(1) + '%',
        dataQuality: this.assessDataQuality(historicalTransactions)
      },
      insights: monthInsights,
      riskFactors: this.identifyRiskFactors(categoryPredictions, volatilityScores)
    };
  }

  // Generate category-specific insights
  generateCategoryInsights(category, pattern, seasonalMultiplier, growthRate, volatility) {
    const insights = [];
    
    if (volatility.volatility > 0.5) {
      insights.push(`${category} spending is highly variable - predictions less reliable`);
    }
    
    if (Math.abs(growthRate) > 0.1) {
      insights.push(`${category} has a ${growthRate > 0 ? 'growing' : 'declining'} trend of ${Math.abs(growthRate * 100).toFixed(1)}% per month`);
    }
    
    if (seasonalMultiplier > 1.2) {
      insights.push(`${category} typically increases by ${((seasonalMultiplier - 1) * 100).toFixed(0)}% this month`);
    } else if (seasonalMultiplier < 0.8) {
      insights.push(`${category} typically decreases by ${((1 - seasonalMultiplier) * 100).toFixed(0)}% this month`);
    }
    
    return insights;
  }

  // Generate month-level insights
  generateMonthInsights(targetMonth, totalPredicted, historicalTransactions, seasonalTrends) {
    const insights = [];
    const targetMonthNum = new Date(targetMonth + '-01').getMonth() + 1;
    const historicalAvg = this.getHistoricalMonthlyAverage(historicalTransactions);
    
    // Compare to historical average
    const percentDifference = ((totalPredicted - historicalAvg) / historicalAvg) * 100;
    
    if (Math.abs(percentDifference) > 10) {
      insights.push(`Predicted spending is ${Math.abs(percentDifference).toFixed(0)}% ${percentDifference > 0 ? 'higher' : 'lower'} than your typical month`);
    }
    
    // Seasonal insights
    const seasonalCategories = Object.keys(seasonalTrends[targetMonthNum] || {});
    const highSeasonalCategories = seasonalCategories.filter(cat => seasonalTrends[targetMonthNum][cat] > 1.2);
    
    if (highSeasonalCategories.length > 0) {
      insights.push(`${new Date(targetMonth + '-01').toLocaleDateString('en-US', { month: 'long' })} typically sees higher spending in: ${highSeasonalCategories.join(', ')}`);
    }
    
    return insights;
  }

  // Identify risk factors in predictions
  identifyRiskFactors(categoryPredictions, volatilityScores) {
    const riskFactors = [];
    
    Object.entries(categoryPredictions).forEach(([category, prediction]) => {
      const volatility = volatilityScores[category];
      
      if (volatility && volatility.volatility > 0.4) {
        riskFactors.push({
          category,
          risk: 'high_volatility',
          severity: Math.min(volatility.volatility * 10, 10),
          description: `${category} spending is unpredictable (${(volatility.volatility * 100).toFixed(0)}% variation)`
        });
      }
      
      if (prediction.confidence < 0.5) {
        riskFactors.push({
          category,
          risk: 'low_confidence',
          severity: (1 - prediction.confidence) * 10,
          description: `${category} prediction has low confidence due to limited data`
        });
      }
    });
    
    return riskFactors.sort((a, b) => b.severity - a.severity);
  }

  // ============================================
  // ENHANCED ANOMALY DETECTION
  // ============================================

  async detectSpendingAnomalies(userId = null, days = 30) {
    try {
      console.log('Detecting spending anomalies with enhanced algorithms...');
      
      // Get recent transactions
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString().split('T')[0];
      
      const recentTransactions = await db.getTransactionsByDateRange(startDateStr, endDate);
      
      // Get historical baseline (last 6 months for comparison)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const historicalStart = sixMonthsAgo.toISOString().split('T')[0];
      
      const historicalTransactions = await db.getTransactionsByDateRange(historicalStart, startDateStr);
      
      if (historicalTransactions.length < this.models.minDataPoints) {
        return {
          success: false,
          message: 'Insufficient historical data for anomaly detection',
          anomalies: [],
          dataInsights: {
            historicalTransactions: historicalTransactions.length,
            recentTransactions: recentTransactions.length,
            requiredTransactions: this.models.minDataPoints
          }
        };
      }

      const anomalies = [];

      // 1. Enhanced amount anomaly detection
      const amountAnomalies = this.detectAmountAnomaliesEnhanced(recentTransactions, historicalTransactions);
      anomalies.push(...amountAnomalies);

      // 2. Enhanced category anomalies
      const categoryAnomalies = this.detectCategoryAnomaliesEnhanced(recentTransactions, historicalTransactions);
      anomalies.push(...categoryAnomalies);

      // 3. Enhanced frequency anomalies
      const frequencyAnomalies = this.detectFrequencyAnomaliesEnhanced(recentTransactions, historicalTransactions);
      anomalies.push(...frequencyAnomalies);

      // 4. Enhanced daily spending anomalies
      const dailyAnomalies = this.detectDailyAnomaliesEnhanced(recentTransactions, historicalTransactions);
      anomalies.push(...dailyAnomalies);

      // Sort by severity and confidence
      anomalies.sort((a, b) => (b.severity * (b.confidence || 1)) - (a.severity * (a.confidence || 1)));

      return {
        success: true,
        anomalies: anomalies.slice(0, 20), // Top 20 anomalies
        summary: {
          totalAnomalies: anomalies.length,
          highSeverity: anomalies.filter(a => a.severity >= 8).length,
          mediumSeverity: anomalies.filter(a => a.severity >= 5 && a.severity < 8).length,
          lowSeverity: anomalies.filter(a => a.severity < 5).length
        },
        analysisWindow: {
          recentDays: days,
          recentTransactions: recentTransactions.length,
          historicalTransactions: historicalTransactions.length
        },
        generatedAt: new Date().toISOString(),
        modelPerformance: {
          detectionAccuracy: this.calculateDetectionAccuracy(anomalies),
          falsePositiveRate: this.estimateFalsePositiveRate(anomalies),
          coverageScore: this.calculateCoverageScore(recentTransactions, anomalies)
        }
      };

    } catch (error) {
      console.error('Error detecting anomalies:', error);
      return {
        success: false,
        message: 'Failed to detect anomalies',
        error: error.message
      };
    }
  }

  // Enhanced amount anomaly detection with confidence scoring
  detectAmountAnomaliesEnhanced(recentTransactions, historicalTransactions) {
    const anomalies = [];
    const categoryStats = {};

    // Calculate historical statistics by category
    historicalTransactions.filter(t => t.type === 'expense').forEach(transaction => {
      const category = transaction.category;
      if (!categoryStats[category]) categoryStats[category] = [];
      categoryStats[category].push(transaction.amount);
    });

    // Calculate enhanced statistics for each category
    Object.keys(categoryStats).forEach(category => {
      const amounts = categoryStats[category];
      const mean = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
      const variance = amounts.reduce((sum, a) => sum + Math.pow(a - mean, 2), 0) / amounts.length;
      const stdDev = Math.sqrt(variance);
      
      // Calculate additional statistical measures
      const median = this.calculateMedian(amounts);
      const q1 = this.calculatePercentile(amounts, 25);
      const q3 = this.calculatePercentile(amounts, 75);
      const iqr = q3 - q1;
      
      categoryStats[category] = { 
        mean, 
        stdDev, 
        amounts, 
        median, 
        q1, 
        q3, 
        iqr,
        dataPoints: amounts.length
      };
    });

    // Check recent transactions for anomalies with enhanced detection
    recentTransactions.filter(t => t.type === 'expense').forEach(transaction => {
      const category = transaction.category;
      const stats = categoryStats[category];
      
      if (stats && stats.stdDev > 0 && stats.dataPoints >= 5) {
        const zScore = Math.abs((transaction.amount - stats.mean) / stats.stdDev);
        
        // Enhanced anomaly detection using multiple methods
        const isOutlierByZScore = zScore > this.models.anomalyThreshold;
        const isOutlierByIQR = transaction.amount > stats.q3 + 1.5 * stats.iqr || 
                              transaction.amount < stats.q1 - 1.5 * stats.iqr;
        
        if (isOutlierByZScore || isOutlierByIQR) {
          const confidence = Math.min(stats.dataPoints / 20, 1); // Higher confidence with more data
          
          anomalies.push({
            type: 'unusual_amount',
            severity: Math.min(zScore, 10),
            confidence: confidence,
            transaction: {
              id: transaction.id,
              date: transaction.date,
              category: transaction.category,
              amount: transaction.amount,
              note: transaction.note
            },
            details: {
              zScore: zScore.toFixed(2),
              categoryAverage: stats.mean.toFixed(2),
              categoryMedian: stats.median.toFixed(2),
              standardDeviation: stats.stdDev.toFixed(2),
              percentile: this.calculatePercentilePosition(transaction.amount, stats.amounts),
              dataPoints: stats.dataPoints,
              detectionMethod: isOutlierByZScore ? 'Z-Score' : 'IQR'
            },
            message: `Unusually ${transaction.amount > stats.mean ? 'high' : 'low'} ${category} expense: ${this.formatCurrency(transaction.amount)} (${zScore.toFixed(1)}σ from average)`
          });
        }
      }
    });

    return anomalies;
  }

  // Enhanced category anomaly detection
  detectCategoryAnomaliesEnhanced(recentTransactions, historicalTransactions) {
    const anomalies = [];
    
    // Get category usage patterns
    const historicalCategories = {};
    const recentCategories = {};
    
    historicalTransactions.filter(t => t.type === 'expense').forEach(t => {
      const month = t.date.substring(0, 7);
      if (!historicalCategories[t.category]) historicalCategories[t.category] = new Set();
      historicalCategories[t.category].add(month);
    });
    
    recentTransactions.filter(t => t.type === 'expense').forEach(t => {
      recentCategories[t.category] = (recentCategories[t.category] || 0) + 1;
    });

    // Detect new or rarely used categories
    Object.keys(recentCategories).forEach(category => {
      const historicalMonths = historicalCategories[category]?.size || 0;
      const recentTransactionCount = recentCategories[category];
      
      if (historicalMonths < 2) { // Category used in less than 2 historical months
        const recentAmount = recentTransactions
          .filter(t => t.category === category && t.type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0);
        
        const severity = historicalMonths === 0 ? 7 : 5; // Higher severity for completely new categories
          
        anomalies.push({
          type: 'new_category',
          severity: severity,
          confidence: 0.9, // High confidence for new category detection
          category,
          details: {
            recentTransactions: recentTransactionCount,
            totalSpent: recentAmount,
            firstSeen: recentTransactions.find(t => t.category === category)?.date,
            historicalUsage: historicalMonths,
            averageTransactionSize: recentAmount / recentTransactionCount
          },
          message: `${historicalMonths === 0 ? 'New' : 'Rarely used'} spending category: ${category} (${this.formatCurrency(recentAmount)} across ${recentTransactionCount} transactions)`
        });
      }
    });

    return anomalies;
  }

  // ============================================
  // ENHANCED HELPER FUNCTIONS
  // ============================================

  calculatePredictability(amounts) {
    if (amounts.length < 3) return 0.5;
    
    // Calculate how predictable the pattern is using autocorrelation
    const mean = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
    const variance = amounts.reduce((sum, a) => sum + Math.pow(a - mean, 2), 0) / amounts.length;
    
    if (variance === 0) return 1; // Perfectly predictable (same amount every time)
    
    // Simple autocorrelation at lag 1
    let autocorr = 0;
    for (let i = 1; i < amounts.length; i++) {
      autocorr += (amounts[i] - mean) * (amounts[i-1] - mean);
    }
    autocorr = autocorr / ((amounts.length - 1) * variance);
    
    return Math.max(0, Math.min(1, (autocorr + 1) / 2)); // Normalize to 0-1
  }

  calculateEnhancedConfidence(transactions, categoryPatterns, volatilityScores) {
    const categories = Object.keys(categoryPatterns);
    if (categories.length === 0) return 0;
    
    let totalConfidence = 0;
    let weightedSum = 0;
    
    categories.forEach(category => {
      const pattern = categoryPatterns[category];
      const volatility = volatilityScores[category] || { stability: 0.5 };
      
      // Weight confidence by spending amount and stability
      const weight = pattern.average * volatility.stability;
      const categoryConfidence = pattern.confidence * volatility.stability;
      
      totalConfidence += categoryConfidence * weight;
      weightedSum += weight;
    });
    
    const avgConfidence = weightedSum > 0 ? totalConfidence / weightedSum : 0;
    const dataRichness = Math.min(transactions.length / 200, 1); // More data = higher confidence
    const monthsOfData = this.getUniqueMonths(transactions).length;
    const timespan = Math.min(monthsOfData / 6, 1); // 6+ months = full confidence
    
    return Math.round((avgConfidence * 0.5 + dataRichness * 0.3 + timespan * 0.2) * 100);
  }

  assessDataQuality(transactions) {
    const uniqueMonths = this.getUniqueMonths(transactions).length;
    const uniqueCategories = new Set(transactions.map(t => t.category)).size;
    const avgTransactionsPerMonth = transactions.length / Math.max(uniqueMonths, 1);
    
    let qualityScore = 0;
    
    if (uniqueMonths >= 6) qualityScore += 3; // Good time span
    else if (uniqueMonths >= 3) qualityScore += 2;
    else qualityScore += 1;
    
    if (uniqueCategories >= 5) qualityScore += 2; // Good diversity
    else if (uniqueCategories >= 3) qualityScore += 1;
    
    if (avgTransactionsPerMonth >= 20) qualityScore += 2; // Good volume
    else if (avgTransactionsPerMonth >= 10) qualityScore += 1;
    
    const qualityLabels = ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
    return qualityLabels[Math.min(qualityScore - 1, 4)] || 'Poor';
  }

  calculateAverageVolatility(volatilityScores) {
    const volatilities = Object.values(volatilityScores).map(v => v.volatility);
    if (volatilities.length === 0) return 0;
    return volatilities.reduce((sum, v) => sum + v, 0) / volatilities.length;
  }

  getUniqueMonths(transactions) {
    return [...new Set(transactions.map(t => t.date.substring(0, 7)))];
  }

  calculateMedian(amounts) {
    const sorted = [...amounts].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  calculatePercentile(amounts, percentile) {
    const sorted = [...amounts].sort((a, b) => a - b);
    const index = (percentile / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    
    if (lower === upper) {
      return sorted[lower];
    }
    
    return sorted[lower] * (upper - index) + sorted[upper] * (index - lower);
  }

  calculatePercentilePosition(value, array) {
    const sorted = [...array].sort((a, b) => a - b);
    const index = sorted.findIndex(v => v >= value);
    return index === -1 ? 100 : Math.round((index / sorted.length) * 100);
  }

  // Enhanced prediction insights
  generateEnhancedPredictionInsights(predictions, categoryPatterns, seasonalTrends) {
    const insights = [];
    
    if (predictions.length > 0) {
      const nextMonth = predictions[0];
      const historicalAvg = this.getHistoricalMonthlyAverage([]);
      
      // Overall spending trend insight
      if (nextMonth.totalPredicted > historicalAvg * 1.15) {
        insights.push(`Next month's forecast is significantly higher than usual - consider reducing spending`);
      } else if (nextMonth.totalPredicted < historicalAvg * 0.85) {
        insights.push(`Next month's forecast shows reduced spending - you're on track for savings`);
      }

      // Category-specific insights
      const categoryGrowth = Object.entries(nextMonth.categoryBreakdown)
        .map(([cat, pred]) => ({
          category: cat,
          predicted: pred.predicted,
          growth: parseFloat(pred.factors.growthAdjustment.replace('%', ''))
        }))
        .sort((a, b) => Math.abs(b.growth) - Math.abs(a.growth));

      if (categoryGrowth.length > 0 && Math.abs(categoryGrowth[0].growth) > 10) {
        insights.push(`${categoryGrowth[0].category} shows strongest ${categoryGrowth[0].growth > 0 ? 'growth' : 'decline'} trend at ${Math.abs(categoryGrowth[0].growth).toFixed(1)}% per month`);
      }

      // Seasonal insights
      const currentMonth = new Date().getMonth() + 1;
      const nextMonthNum = new Date(nextMonth.month + '-01').getMonth() + 1;
      
      const seasonalCategories = Object.keys(seasonalTrends[nextMonthNum] || {});
      const highSeasonalCategories = seasonalCategories.filter(cat => seasonalTrends[nextMonthNum][cat] > 1.3);
      
      if (highSeasonalCategories.length > 0) {
        insights.push(`Seasonal alert: ${highSeasonalCategories[0]} typically increases by ${((seasonalTrends[nextMonthNum][highSeasonalCategories[0]] - 1) * 100).toFixed(0)}% in ${nextMonth.monthName}`);
      }
    }

    return insights;
  }

  // Performance metrics for anomaly detection
  calculateDetectionAccuracy(anomalies) {
    // Simple heuristic: higher severity anomalies are more likely to be accurate
    const weightedAccuracy = anomalies.reduce((sum, anomaly) => {
      const accuracyScore = Math.min(anomaly.severity / 10, 1);
      return sum + accuracyScore;
    }, 0);
    
    return anomalies.length > 0 ? Math.round((weightedAccuracy / anomalies.length) * 100) : 100;
  }

  estimateFalsePositiveRate(anomalies) {
    // Estimate false positive rate based on severity distribution
    const lowSeverityCount = anomalies.filter(a => a.severity < 5).length;
    return anomalies.length > 0 ? Math.round((lowSeverityCount / anomalies.length) * 100) : 0;
  }

  calculateCoverageScore(transactions, anomalies) {
    // What percentage of transaction volume is being monitored
    const monitoredCategories = new Set(anomalies.map(a => a.transaction?.category || a.category).filter(Boolean));
    const totalCategories = new Set(transactions.map(t => t.category)).size;
    
    return totalCategories > 0 ? Math.round((monitoredCategories.size / totalCategories) * 100) : 0;
  }

  // Enhanced frequency and daily anomaly detection
  detectFrequencyAnomaliesEnhanced(recentTransactions, historicalTransactions) {
    const anomalies = [];
    
    const historicalDaily = this.calculateDailyFrequency(historicalTransactions);
    const recentDaily = this.calculateDailyFrequency(recentTransactions);
    
    if (historicalDaily.length < 10) return anomalies; // Need enough historical data
    
    const historicalAvg = historicalDaily.reduce((sum, d) => sum + d, 0) / historicalDaily.length;
    const historicalStdDev = Math.sqrt(
      historicalDaily.reduce((sum, d) => sum + Math.pow(d - historicalAvg, 2), 0) / historicalDaily.length
    );

    recentDaily.forEach((dailyCount, index) => {
      if (historicalStdDev > 0) {
        const zScore = Math.abs((dailyCount - historicalAvg) / historicalStdDev);
        
        if (zScore > this.models.anomalyThreshold && dailyCount > historicalAvg * 1.5) {
          const date = new Date();
          date.setDate(date.getDate() - (recentDaily.length - 1 - index));
          
          anomalies.push({
            type: 'unusual_frequency',
            severity: Math.min(zScore, 10),
            confidence: 0.8,
            date: date.toISOString().split('T')[0],
            details: {
              transactionCount: dailyCount,
              historicalAverage: historicalAvg.toFixed(1),
              zScore: zScore.toFixed(2),
              percentileRank: this.calculatePercentilePosition(dailyCount, historicalDaily)
            },
            message: `Unusually high transaction frequency: ${dailyCount} transactions on ${date.toLocaleDateString()} (${zScore.toFixed(1)}σ above normal)`
          });
        }
      }
    });

    return anomalies;
  }

  detectDailyAnomaliesEnhanced(recentTransactions, historicalTransactions) {
    const anomalies = [];
    
    const historicalDaily = this.calculateDailyTotals(historicalTransactions);
    const recentDaily = this.calculateDailyTotals(recentTransactions);
    
    const historicalAmounts = Object.values(historicalDaily);
    if (historicalAmounts.length < 10) return anomalies;
    
    const historicalAvg = historicalAmounts.reduce((sum, a) => sum + a, 0) / historicalAmounts.length;
    const historicalStdDev = Math.sqrt(
      historicalAmounts.reduce((sum, a) => sum + Math.pow(a - historicalAvg, 2), 0) / historicalAmounts.length
    );

    Object.entries(recentDaily).forEach(([date, amount]) => {
      if (historicalStdDev > 0) {
        const zScore = Math.abs((amount - historicalAvg) / historicalStdDev);
        
        if (zScore > this.models.anomalyThreshold) {
          anomalies.push({
            type: 'unusual_daily_total',
            severity: Math.min(zScore, 10),
            confidence: 0.8,
            date,
            details: {
              dailyTotal: amount,
              historicalAverage: historicalAvg.toFixed(2),
              zScore: zScore.toFixed(2),
              percentileRank: this.calculatePercentilePosition(amount, historicalAmounts),
              dayOfWeek: new Date(date).toLocaleDateString('en-US', { weekday: 'long' })
            },
            message: `Unusually ${amount > historicalAvg ? 'high' : 'low'} daily spending: ${this.formatCurrency(amount)} on ${new Date(date).toLocaleDateString()} (${zScore.toFixed(1)}σ from normal)`
          });
        }
      }
    });

    return anomalies;
  }

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

  formatCurrency(amount) {
    return `${amount.toLocaleString()}`;
  }

  calculateTrend(amounts) {
    if (amounts.length < 2) return 0;
    
    // Simple linear regression to calculate trend
    const n = amounts.length;
    const sumX = n * (n - 1) / 2;
    const sumY = amounts.reduce((sum, y) => sum + y, 0);
    const sumXY = amounts.reduce((sum, y, x) => sum + x * y, 0);
    const sumX2 = n * (n - 1) * (2 * n - 1) / 6;
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const avgY = sumY / n;
    
    return avgY !== 0 ? slope / avgY : 0; // Normalize by average
  }

  calculateMonthConfidence(categoryPredictions) {
    const confidences = Object.values(categoryPredictions).map(pred => pred.confidence);
    if (confidences.length === 0) return 0;
    return Math.round(confidences.reduce((sum, c) => sum + c, 0) / confidences.length * 100);
  }

  getHistoricalMonthlyAverage(transactions) {
    const monthlyTotals = {};
    
    transactions.filter(t => t.type === 'expense').forEach(transaction => {
      const month = transaction.date.substring(0, 7);
      if (!monthlyTotals[month]) monthlyTotals[month] = 0;
      monthlyTotals[month] += transaction.amount;
    });

    const totals = Object.values(monthlyTotals);
    return totals.length > 0 ? totals.reduce((sum, t) => sum + t, 0) / totals.length : 0;
  }

  calculateDailyFrequency(transactions) {
    const dailyCounts = {};
    
    transactions.forEach(transaction => {
      const date = transaction.date;
      dailyCounts[date] = (dailyCounts[date] || 0) + 1;
    });

    return Object.values(dailyCounts);
  }

  calculateDailyTotals(transactions) {
    const dailyTotals = {};
    
    transactions.filter(t => t.type === 'expense').forEach(transaction => {
      const date = transaction.date;
      if (!dailyTotals[date]) dailyTotals[date] = 0;
      dailyTotals[date] += transaction.amount;
    });

    return dailyTotals;
  }

  analyzeSeasonalTrends(transactions) {
    const seasonalData = {};
    
    transactions.filter(t => t.type === 'expense').forEach(transaction => {
      const date = new Date(transaction.date);
      const month = date.getMonth() + 1; // 1-12
      const category = transaction.category;
      
      if (!seasonalData[month]) seasonalData[month] = {};
      if (!seasonalData[month][category]) seasonalData[month][category] = [];
      seasonalData[month][category].push(transaction.amount);
    });

    // Calculate seasonal multipliers
    const seasonalMultipliers = {};
    Object.keys(seasonalData).forEach(month => {
      seasonalMultipliers[month] = {};
      Object.keys(seasonalData[month]).forEach(category => {
        const amounts = seasonalData[month][category];
        const avg = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
        
        // Compare to overall category average
        const allAmounts = [];
        Object.values(seasonalData).forEach(monthData => {
          if (monthData[category]) {
            allAmounts.push(...monthData[category]);
          }
        });
        const overallAvg = allAmounts.reduce((sum, a) => sum + a, 0) / allAmounts.length;
        
        seasonalMultipliers[month][category] = overallAvg > 0 ? avg / overallAvg : 1;
      });
    });

    return seasonalMultipliers;
  }
}

module.exports = new AIAnalyticsService();