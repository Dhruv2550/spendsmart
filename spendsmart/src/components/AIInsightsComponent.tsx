// src/components/AIInsightsComponent.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Brain, 
  TrendingUp, 
  AlertTriangle, 
  RefreshCw,
  Target,
  CheckCircle,
  XCircle,
  Activity,
  BarChart3,
  Calendar,
  DollarSign,
  Sparkles,
  Bot,
  Clock,
  Zap,
  Eye,
  TrendingDown,
  ArrowRight,
  Info
} from 'lucide-react';

interface Prediction {
  month: string;
  monthName: string;
  totalPredicted: number;
  categoryBreakdown: Record<string, {
    predicted: number;
    confidence: number;
    range: { low: number; high: number };
    factors: {
      baseAverage: number;
      seasonalAdjustment: string;
      growthAdjustment: string;
    };
  }>;
  confidence: number;
  factors: {
    historicalAverage: number;
    seasonalFactor: string;
    trendFactor: string;
  };
}

interface Anomaly {
  type: string;
  severity: number;
  transaction?: {
    id: number;
    date: string;
    category: string;
    amount: number;
    note: string;
  };
  category?: string;
  date?: string;
  details: Record<string, any>;
  message: string;
}

interface AIInsights {
  predictions: {
    success: boolean;
    data: Prediction[];
    confidence: number;
    insights: string[];
  };
  anomalies: {
    success: boolean;
    data: Anomaly[];
    summary: {
      totalAnomalies: number;
      highSeverity: number;
      mediumSeverity: number;
      lowSeverity: number;
    };
  };
  summary: {
    totalInsights: number;
    highPriorityItems: number;
    potentialSavings: number;
  };
  generatedAt: string;
}

interface AIInsightsComponentProps {
  selectedMonth?: string;
  budgetTemplate?: string;
}

const AIInsightsComponent: React.FC<AIInsightsComponentProps> = ({ 
  selectedMonth, 
  budgetTemplate = 'Default' 
}) => {
  const [insights, setInsights] = useState<AIInsights | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedPredictionMonth, setSelectedPredictionMonth] = useState<string>('');

  // Load AI insights
  const loadInsights = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`http://localhost:3001/api/analytics/insights?template=${budgetTemplate}`);
      if (!response.ok) {
        throw new Error('Failed to load AI insights');
      }
      
      const data = await response.json();
      setInsights(data);
      setLastUpdated(new Date());
      
      // Set default selected prediction month to next month
      if (data.predictions.success && data.predictions.data.length > 0) {
        setSelectedPredictionMonth(data.predictions.data[0].month);
      }
    } catch (err) {
      console.error('Error loading AI insights:', err);
      setError(err instanceof Error ? err.message : 'Failed to load insights');
    } finally {
      setLoading(false);
    }
  };

  // Load insights on component mount
  useEffect(() => {
    loadInsights();
  }, [selectedMonth, budgetTemplate]);

  const formatCurrency = (amount: number) => `$${amount.toLocaleString()}`;

  const getSeverityColor = (severity: number) => {
    if (severity >= 8) return 'text-red-600 bg-red-50 border-red-200';
    if (severity >= 5) return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-yellow-600 bg-yellow-50 border-yellow-200';
  };

  const getAnomalyIcon = (type: string) => {
    switch (type) {
      case 'unusual_amount': return AlertTriangle;
      case 'new_category': return Sparkles;
      case 'unusual_frequency': return Activity;
      case 'unusual_daily_total': return BarChart3;
      default: return AlertTriangle;
    }
  };

  const getSelectedPrediction = () => {
    if (!insights?.predictions.success || !selectedPredictionMonth) return null;
    return insights.predictions.data.find(p => p.month === selectedPredictionMonth) || insights.predictions.data[0];
  };

  const generateSpendingForecast = (prediction: Prediction) => {
    const categories = Object.entries(prediction.categoryBreakdown)
      .sort(([,a], [,b]) => b.predicted - a.predicted);
    
    const insights = [];
    
    // Compare to historical average
    if (prediction.totalPredicted > prediction.factors.historicalAverage * 1.1) {
      insights.push({
        type: 'warning',
        message: `Predicted spending is ${((prediction.totalPredicted / prediction.factors.historicalAverage - 1) * 100).toFixed(0)}% higher than your historical average`
      });
    } else if (prediction.totalPredicted < prediction.factors.historicalAverage * 0.9) {
      insights.push({
        type: 'positive',
        message: `Predicted spending is ${((1 - prediction.totalPredicted / prediction.factors.historicalAverage) * 100).toFixed(0)}% lower than your historical average`
      });
    }
    
    // Identify fastest growing categories
    const growingCategories = categories.filter(([cat, pred]) => {
      const growthFactor = parseFloat(pred.factors.growthAdjustment.replace('%', ''));
      return growthFactor > 5; // Growing by more than 5%
    });
    
    if (growingCategories.length > 0) {
      insights.push({
        type: 'info',
        message: `${growingCategories[0][0]} is your fastest growing expense category`
      });
    }
    
    return insights;
  };

  if (loading && !insights) {
    return (
      <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95">
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-3">
            <Bot className="h-6 w-6 text-primary animate-pulse" />
            <div className="text-lg font-medium">Analyzing your spending patterns...</div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary to-primary/60 animate-pulse"></div>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Generating predictions and detecting anomalies using statistical analysis
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-0 shadow-md bg-gradient-to-br from-red-50 to-red-100">
        <CardContent className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <XCircle className="h-6 w-6 text-red-500" />
            <div className="text-lg font-medium text-red-800">AI Insights Unavailable</div>
          </div>
          <p className="text-red-700 mb-4">{error}</p>
          <Button onClick={loadInsights} variant="outline" className="border-red-300 text-red-700">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!insights) {
    return null;
  }

  const selectedPrediction = getSelectedPrediction();

  return (
    <div className="space-y-6">
      {/* AI Insights Header */}
      <Card className="border-0 shadow-md bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-3 rounded-full bg-primary/10">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">AI Financial Predictions</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Mathematical forecasting based on your spending history
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {lastUpdated && (
                <div className="text-xs text-muted-foreground">
                  Updated {lastUpdated.toLocaleTimeString()}
                </div>
              )}
              <Button 
                onClick={loadInsights} 
                variant="outline" 
                size="sm"
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="text-center p-4 bg-white/50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {insights.predictions.success ? insights.predictions.confidence : 0}%
              </div>
              <div className="text-sm text-muted-foreground">Prediction Confidence</div>
            </div>
            <div className="text-center p-4 bg-white/50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {insights.anomalies.success ? insights.anomalies.data.length : 0}
              </div>
              <div className="text-sm text-muted-foreground">Anomalies Detected</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Insights Tabs */}
      <Tabs defaultValue="predictions" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="predictions" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Spending Predictions
            {insights.predictions.success && insights.predictions.data.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {insights.predictions.data.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="anomalies" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Anomaly Detection
            {insights.anomalies.success && insights.anomalies.data.length > 0 && (
              <Badge variant="destructive" className="ml-1">
                {insights.anomalies.data.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Enhanced Spending Predictions Tab */}
        <TabsContent value="predictions" className="space-y-6">
          {insights.predictions.success && insights.predictions.data.length > 0 ? (
            <div className="space-y-6">
              {/* Prediction Overview */}
              <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-blue-100">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-blue-600" />
                    Prediction Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-white/50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{insights.predictions.confidence}%</div>
                      <div className="text-sm text-blue-700">Overall Confidence</div>
                      <div className="text-xs text-blue-500 mt-1">
                        Based on {insights.predictions.data.length} month forecast
                      </div>
                    </div>
                    <div className="text-center p-4 bg-white/50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {formatCurrency(insights.predictions.data[0]?.totalPredicted || 0)}
                      </div>
                      <div className="text-sm text-blue-700">Next Month Forecast</div>
                      <div className="text-xs text-blue-500 mt-1">
                        {insights.predictions.data[0]?.monthName}
                      </div>
                    </div>
                    <div className="text-center p-4 bg-white/50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {Object.keys(insights.predictions.data[0]?.categoryBreakdown || {}).length}
                      </div>
                      <div className="text-sm text-blue-700">Categories Tracked</div>
                      <div className="text-xs text-blue-500 mt-1">
                        Active spending patterns
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Month Selector for Detailed View */}
              {insights.predictions.data.length > 1 && (
                <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <label className="text-sm font-medium">View Detailed Forecast:</label>
                      <select 
                        value={selectedPredictionMonth}
                        onChange={(e) => setSelectedPredictionMonth(e.target.value)}
                        className="px-3 py-2 border rounded-lg text-sm bg-card"
                      >
                        {insights.predictions.data.map(prediction => (
                          <option key={prediction.month} value={prediction.month}>
                            {prediction.monthName}
                          </option>
                        ))}
                      </select>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Detailed Prediction View */}
              {selectedPrediction && (
                <div className="space-y-4">
                  {/* Forecast Summary */}
                  <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        {selectedPrediction.monthName} Forecast
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Total Prediction with Comparison */}
                      <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <div className="text-sm text-blue-700">Predicted Total Spending</div>
                            <div className="text-3xl font-bold text-blue-800">
                              {formatCurrency(selectedPrediction.totalPredicted)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-blue-600">Confidence: {selectedPrediction.confidence}%</div>
                            <div className="text-xs text-blue-500">
                              vs Historical: {formatCurrency(selectedPrediction.factors.historicalAverage)}
                            </div>
                          </div>
                        </div>
                        
                        {/* Prediction vs Historical Comparison */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-blue-700">Predicted:</span>
                            <span className="font-bold text-blue-800">{formatCurrency(selectedPrediction.totalPredicted)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-blue-600">Historical Average:</span>
                            <span className="font-medium text-blue-700">{formatCurrency(selectedPrediction.factors.historicalAverage)}</span>
                          </div>
                          <div className="flex justify-between text-sm border-t border-blue-200 pt-2">
                            <span className="text-blue-700">Difference:</span>
                            <span className={`font-bold ${
                              selectedPrediction.totalPredicted > selectedPrediction.factors.historicalAverage 
                                ? 'text-red-600' 
                                : 'text-green-600'
                            }`}>
                              {selectedPrediction.totalPredicted > selectedPrediction.factors.historicalAverage ? '+' : ''}
                              {formatCurrency(selectedPrediction.totalPredicted - selectedPrediction.factors.historicalAverage)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Prediction Factors */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-xs text-gray-500">Seasonal Factor</div>
                          <div className="font-bold text-sm">{selectedPrediction.factors.seasonalFactor}</div>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-xs text-gray-500">Growth Trend</div>
                          <div className="font-bold text-sm">{selectedPrediction.factors.trendFactor}</div>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-xs text-gray-500">Confidence</div>
                          <div className="font-bold text-sm">{selectedPrediction.confidence}%</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Category Predictions with Enhanced Details */}
                  <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Category Forecasts
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {Object.entries(selectedPrediction.categoryBreakdown)
                          .sort(([,a], [,b]) => b.predicted - a.predicted)
                          .map(([category, categoryPred], index) => {
                            const growthFactor = parseFloat(categoryPred.factors.growthAdjustment.replace('%', ''));
                            const seasonalFactor = parseFloat(categoryPred.factors.seasonalAdjustment);
                            
                            return (
                              <div key={category} className="border rounded-lg p-4 bg-gray-50/50">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-4 h-4 rounded-full ${
                                      index === 0 ? 'bg-red-500' :
                                      index === 1 ? 'bg-orange-500' :
                                      index === 2 ? 'bg-yellow-500' :
                                      'bg-blue-500'
                                    }`}></div>
                                    <div>
                                      <div className="font-semibold text-lg">{category}</div>
                                      <div className="text-xs text-gray-500">
                                        Range: {formatCurrency(categoryPred.range.low)} - {formatCurrency(categoryPred.range.high)}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-2xl font-bold text-blue-600">
                                      {formatCurrency(categoryPred.predicted)}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {Math.round(categoryPred.confidence * 100)}% confidence
                                    </div>
                                  </div>
                                </div>

                                {/* Prediction Breakdown */}
                                <div className="grid grid-cols-3 gap-3 text-xs">
                                  <div className="text-center p-2 bg-white/60 rounded">
                                    <div className="text-gray-500">Base Average</div>
                                    <div className="font-bold">{formatCurrency(categoryPred.factors.baseAverage)}</div>
                                  </div>
                                  <div className="text-center p-2 bg-white/60 rounded">
                                    <div className="text-gray-500">Seasonal Adj</div>
                                    <div className={`font-bold ${seasonalFactor > 1.1 ? 'text-red-600' : seasonalFactor < 0.9 ? 'text-green-600' : 'text-gray-700'}`}>
                                      {((seasonalFactor - 1) * 100).toFixed(0)}%
                                    </div>
                                  </div>
                                  <div className="text-center p-2 bg-white/60 rounded">
                                    <div className="text-gray-500">Growth Trend</div>
                                    <div className={`font-bold ${growthFactor > 5 ? 'text-red-600' : growthFactor < -5 ? 'text-green-600' : 'text-gray-700'}`}>
                                      {categoryPred.factors.growthAdjustment}
                                    </div>
                                  </div>
                                </div>

                                {/* Trend Indicator */}
                                {(growthFactor > 10 || seasonalFactor > 1.2) && (
                                  <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded flex items-center gap-2">
                                    <Zap className="h-4 w-4 text-yellow-600" />
                                    <span className="text-xs text-yellow-700">
                                      {growthFactor > 10 ? `Fast growing category (+${growthFactor.toFixed(0)}% trend)` : 
                                       `Seasonal increase expected (+${((seasonalFactor - 1) * 100).toFixed(0)}%)`}
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Smart Forecast Insights */}
                  <Card className="border-0 shadow-md bg-gradient-to-br from-green-50 to-green-100">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Eye className="h-5 w-5 text-green-600" />
                        Forecast Insights
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {generateSpendingForecast(selectedPrediction).map((insight, index) => (
                          <div key={index} className={`p-3 rounded-lg border ${
                            insight.type === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                            insight.type === 'positive' ? 'bg-green-50 border-green-200' :
                            'bg-blue-50 border-blue-200'
                          }`}>
                            <div className="flex items-center gap-2">
                              {insight.type === 'warning' ? (
                                <TrendingUp className="h-4 w-4 text-yellow-600" />
                              ) : insight.type === 'positive' ? (
                                <TrendingDown className="h-4 w-4 text-green-600" />
                              ) : (
                                <Info className="h-4 w-4 text-blue-600" />
                              )}
                              <span className={`text-sm font-medium ${
                                insight.type === 'warning' ? 'text-yellow-800' :
                                insight.type === 'positive' ? 'text-green-800' :
                                'text-blue-800'
                              }`}>
                                {insight.message}
                              </span>
                            </div>
                          </div>
                        ))}
                        
                        {/* General prediction insights */}
                        {insights.predictions.insights.length > 0 && (
                          <div className="pt-3 border-t border-green-200">
                            <h4 className="font-medium text-green-800 mb-2">Additional Insights:</h4>
                            {insights.predictions.insights.map((insight, index) => (
                              <div key={index} className="flex items-start space-x-2">
                                <ArrowRight className="h-3 w-3 text-green-600 mt-1 flex-shrink-0" />
                                <p className="text-sm text-green-700">{insight}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Multi-Month Comparison */}
                  {insights.predictions.data.length > 1 && (
                    <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Clock className="h-5 w-5" />
                          Multi-Month Forecast
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {insights.predictions.data.map((prediction, index) => (
                            <div key={prediction.month} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <Badge variant={index === 0 ? "default" : "secondary"} className="text-xs">
                                  {index === 0 ? "Next" : `+${index + 1}M`}
                                </Badge>
                                <div>
                                  <div className="font-medium text-sm">{prediction.monthName}</div>
                                  <div className="text-xs text-gray-500">
                                    {prediction.confidence}% confidence
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-lg">{formatCurrency(prediction.totalPredicted)}</div>
                                <div className="text-xs text-gray-500">
                                  {prediction.totalPredicted > prediction.factors.historicalAverage ? (
                                    <span className="text-red-600">
                                      +{formatCurrency(prediction.totalPredicted - prediction.factors.historicalAverage)} vs avg
                                    </span>
                                  ) : (
                                    <span className="text-green-600">
                                      {formatCurrency(prediction.totalPredicted - prediction.factors.historicalAverage)} vs avg
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </div>
          ) : (
            <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95">
              <CardContent className="text-center py-12">
                <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">Predictions Not Available</h3>
                <p className="text-muted-foreground mb-4">
                  Need more transaction data to generate accurate spending predictions
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                  <h4 className="font-medium text-blue-800 mb-2">How Predictions Work:</h4>
                  <ul className="text-sm text-blue-700 space-y-1 text-left">
                    <li>- Analyzes your historical spending patterns</li>
                    <li>- Identifies seasonal trends (e.g., higher December spending)</li>
                    <li>- Calculates growth/decline rates per category</li>
                    <li>- Generates forecasts with confidence scores</li>
                    <li>- Requires at least 10 transactions for accuracy</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Enhanced Anomaly Detection Tab */}
        <TabsContent value="anomalies" className="space-y-4">
          {insights.anomalies.success && insights.anomalies.data.length > 0 ? (
            <div className="space-y-4">
              {/* Anomaly Summary */}
              <Card className="border-0 shadow-md bg-gradient-to-br from-card to-card/95">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Anomaly Detection Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">
                        {insights.anomalies.summary.highSeverity || 0}
                      </div>
                      <div className="text-sm text-red-500">High Severity</div>
                      <div className="text-xs text-red-400">Immediate attention</div>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">
                        {insights.anomalies.summary.mediumSeverity || 0}
                      </div>
                      <div className="text-sm text-orange-500">Medium Severity</div>
                      <div className="text-xs text-orange-400">Worth reviewing</div>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600">
                        {insights.anomalies.summary.lowSeverity || 0}
                      </div>
                      <div className="text-sm text-yellow-500">Low Severity</div>
                      <div className="text-xs text-yellow-400">Minor variations</div>
                    </div>
                  </div>
                  
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-800 mb-1">How Anomaly Detection Works:</h4>
                    <p className="text-sm text-blue-700">
                      Uses statistical analysis (z-scores) to identify transactions that are more than 2.5 standard deviations 
                      from your normal spending patterns. The higher the severity, the more unusual the transaction.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Detailed Anomaly List */}
              <div className="space-y-3">
                {insights.anomalies.data.map((anomaly, index) => {
                  const AnomalyIcon = getAnomalyIcon(anomaly.type);
                  
                  return (
                    <Card key={index} className={`border-0 shadow-md ${getSeverityColor(anomaly.severity)} border`}>
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-3">
                          <div className="p-2 rounded-full bg-white/80">
                            <AnomalyIcon className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <div className="font-medium text-sm">{anomaly.message}</div>
                              <Badge variant="outline" className="text-xs">
                                Severity: {anomaly.severity.toFixed(1)}/10
                              </Badge>
                            </div>
                            
                            {anomaly.transaction && (
                              <div className="text-sm space-y-2 bg-white/60 p-3 rounded">
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Date:</span>
                                    <span className="font-medium">{new Date(anomaly.transaction.date).toLocaleDateString()}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Category:</span>
                                    <span className="font-medium">{anomaly.transaction.category}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Amount:</span>
                                    <span className="font-medium">{formatCurrency(anomaly.transaction.amount)}</span>
                                  </div>
                                  {anomaly.details?.zScore && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Z-Score:</span>
                                      <span className="font-medium">{anomaly.details.zScore}σ</span>
                                    </div>
                                  )}
                                </div>
                                {anomaly.transaction.note && (
                                  <div className="pt-2 border-t border-gray-200">
                                    <span className="text-gray-600">Note: </span>
                                    <span className="font-medium text-xs">{anomaly.transaction.note}</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Statistical Details */}
                            {anomaly.details && Object.keys(anomaly.details).length > 0 && (
                              <div className="mt-2 text-xs text-gray-600 bg-white/40 p-2 rounded">
                                <div className="font-medium mb-1">Statistical Analysis:</div>
                                <div className="grid grid-cols-2 gap-2">
                                  {Object.entries(anomaly.details).map(([key, value]) => (
                                    <div key={key} className="flex justify-between">
                                      <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                                      <span className="font-medium">
                                        {typeof value === 'number' && (key.includes('Amount') || key.includes('average')) ? 
                                          formatCurrency(value) : 
                                          String(value)
                                        }
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ) : (
            <Card className="border-0 shadow-md bg-gradient-to-br from-green-50 to-green-100">
              <CardContent className="text-center py-12">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-green-800 mb-2">No Anomalies Detected</h3>
                <p className="text-green-700 mb-4">
                  Your recent spending patterns look normal and consistent with your historical behavior
                </p>
                <div className="bg-green-100 border border-green-200 rounded-lg p-4 mt-4">
                  <h4 className="font-medium text-green-800 mb-2">What We're Monitoring:</h4>
                  <ul className="text-sm text-green-700 space-y-1 text-left">
                    <li>- Unusual transaction amounts (outside normal range)</li>
                    <li>- New spending categories</li>
                    <li>- Abnormal transaction frequency</li>
                    <li>- Daily spending spikes</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AIInsightsComponent;