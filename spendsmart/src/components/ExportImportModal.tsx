import { API_BASE_URL } from '../config/api';
import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { X, Download, Upload, FileText, FileSpreadsheet, Calendar, CheckCircle, AlertCircle, Info } from 'lucide-react';

interface Transaction {
  id: number;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  note: string;
  date: string;
  timestamp: string;
}

interface ExportImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  onImportSuccess: () => void;
}

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

const ToastContainer = ({ toasts, removeToast }: { 
  toasts: Toast[]; 
  removeToast: (id: number) => void;
}) => (
  <div className="fixed top-4 right-4 z-50 space-y-2">
    {toasts.map((toast) => (
      <div
        key={toast.id}
        className={`max-w-md px-4 py-3 rounded-lg shadow-lg border flex items-center justify-between animate-in slide-in-from-right-full duration-300 ${
          toast.type === 'error' 
            ? 'bg-red-50 border-red-200 text-red-800' 
            : toast.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-blue-50 border-blue-200 text-blue-800'
        }`}
      >
        <div className="flex items-center gap-2">
          {toast.type === 'success' ? (
            <CheckCircle className="h-4 w-4" />
          ) : toast.type === 'error' ? (
            <AlertCircle className="h-4 w-4" />
          ) : (
            <Info className="h-4 w-4" />
          )}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
        <button
          onClick={() => removeToast(toast.id)}
          className="ml-3 text-gray-400 hover:text-gray-600 transition-colors duration-200"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    ))}
  </div>
);

export const ExportImportModal: React.FC<ExportImportModalProps> = ({
  isOpen,
  onClose,
  transactions,
  onImportSuccess
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel'>('csv');
  const [exportRange, setExportRange] = useState<'all' | 'month' | 'custom'>('all');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  const toastIdRef = useRef(0);

  const addToast = (message: string, type: Toast['type'] = 'info', duration = 4000) => {
    const id = ++toastIdRef.current;
    const newToast: Toast = { id, message, type };
    
    setToasts(prev => [...prev, newToast]);
    
    setTimeout(() => removeToast(id), duration);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const optimisticTabSwitch = (newTab: 'export' | 'import') => {
    setActiveTab(newTab);
    addToast(`Switched to ${newTab} mode`, 'info', 2000);
  };

  const optimisticExportRangeChange = (newRange: string) => {
    setExportRange(newRange as 'all' | 'month' | 'custom');
    const filteredCount = getFilteredTransactions().length;
    
    let message = '';
    switch (newRange) {
      case 'all':
        message = `Selected all ${transactions.length} transactions`;
        break;
      case 'month':
        message = `Selected month view (${filteredCount} transactions)`;
        break;
      case 'custom':
        message = 'Selected custom date range';
        break;
    }
    
    addToast(message, 'info', 2000);
  };

  const optimisticMonthChange = (newMonth: string) => {
    setSelectedMonth(newMonth);
    const monthName = new Date(newMonth + '-01').toLocaleDateString('en-US', { 
      month: 'long', 
      year: 'numeric' 
    });
    const filteredCount = transactions.filter(t => t.date.startsWith(newMonth)).length;
    addToast(`Selected ${monthName} (${filteredCount} transactions)`, 'info', 2000);
  };

  const getAvailableMonths = () => {
    const months = new Set<string>();
    transactions.forEach(t => {
      months.add(t.date.substring(0, 7));
    });
    return Array.from(months).sort().reverse();
  };

  const getFilteredTransactions = () => {
    switch (exportRange) {
      case 'month':
        return transactions.filter(t => t.date.startsWith(selectedMonth));
      case 'custom':
        if (startDate && endDate) {
          return transactions.filter(t => t.date >= startDate && t.date <= endDate);
        }
        return transactions;
      default:
        return transactions;
    }
  };

  const convertToCSV = (data: Transaction[]) => {
    const headers = ['Date', 'Type', 'Category', 'Amount', 'Description'];
    const csvContent = [
      headers.join(','),
      ...data.map(t => [
        t.date,
        t.type,
        `"${t.category}"`,
        t.amount,
        `"${t.note || ''}"`
      ].join(','))
    ].join('\n');
    
    return csvContent;
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    const filteredData = getFilteredTransactions();
    
    if (filteredData.length === 0) {
      addToast('No transactions to export for the selected range', 'error', 4000);
      return;
    }

    setExporting(true);
    addToast(`Preparing ${filteredData.length} transactions for export...`, 'info', 3000);

    try {
      await new Promise(resolve => setTimeout(resolve, 500));

      const timestamp = new Date().toISOString().split('T')[0];
      let filename = `spendsmart-export-${timestamp}`;
      
      if (exportRange === 'month') {
        filename = `spendsmart-${selectedMonth}-${timestamp}`;
      } else if (exportRange === 'custom') {
        filename = `spendsmart-${startDate}-to-${endDate}-${timestamp}`;
      }

      const csvContent = convertToCSV(filteredData);
      downloadFile(csvContent, `${filename}.csv`, 'text/csv');

      addToast(`Successfully exported ${filteredData.length} transactions`, 'success', 4000);
    } catch (error) {
      addToast('Failed to export transactions', 'error', 4000);
    } finally {
      setExporting(false);
    }
  };

  const downloadTemplate = () => {
    addToast('Downloading CSV template...', 'info', 2000);
    
    const template = [
      'Date,Type,Category,Amount,Description',
      '2024-01-15,expense,Groceries,45.67,Weekly shopping',
      '2024-01-16,income,Salary,3000.00,Monthly salary',
      '2024-01-17,expense,Transportation,12.50,Bus fare'
    ].join('\n');
    
    downloadFile(template, 'spendsmart-import-template.csv', 'text/csv');
    addToast('Template downloaded successfully', 'success', 3000);
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      addToast('Please select a CSV file', 'error', 4000);
      return;
    }

    setImporting(true);
    addToast('Processing CSV file...', 'info', 3000);
    
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        addToast('CSV file appears to be empty or invalid', 'error', 4000);
        setImporting(false);
        return;
      }

      const dataLines = lines.slice(1);
      const validTransactions = [];
      const errors = [];

      for (let i = 0; i < dataLines.length; i++) {
        const line = dataLines[i];
        const parts = line.split(',').map(part => part.replace(/"/g, '').trim());
        
        if (parts.length < 4) {
          errors.push(`Line ${i + 2}: Not enough columns`);
          continue;
        }

        const [date, type, category, amount, note] = parts;
        
        if (!date || !type || !category || !amount) {
          errors.push(`Line ${i + 2}: Missing required fields`);
          continue;
        }
        
        if (type !== 'income' && type !== 'expense') {
          errors.push(`Line ${i + 2}: Type must be 'income' or 'expense'`);
          continue;
        }
        
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount)) {
          errors.push(`Line ${i + 2}: Invalid amount`);
          continue;
        }

        validTransactions.push({
          type: type as 'income' | 'expense',
          category,
          amount: numAmount,
          note: note || '',
          date
        });
      }

      if (errors.length > 0) {
        addToast(`Found ${errors.length} validation errors in CSV`, 'error', 5000);
      }

      if (validTransactions.length === 0) {
        addToast('No valid transactions found to import', 'error', 4000);
        setImporting(false);
        return;
      }

      addToast(`Importing ${validTransactions.length} valid transactions...`, 'info', 3000);

      let successCount = 0;
      for (const transaction of validTransactions) {
        try {
          const response = await fetch(`${API_BASE_URL}/api/records`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(transaction)
          });
          
          if (response.ok) successCount++;
        } catch (error) {
          console.error('Error importing transaction:', error);
        }
      }

      addToast(
        `Successfully imported ${successCount} out of ${validTransactions.length} transactions`, 
        successCount > 0 ? 'success' : 'error', 
        5000
      );
      
      if (successCount > 0) {
        onImportSuccess();
        setTimeout(() => onClose(), 2000);
      }
    } catch (error) {
      console.error('Error processing file:', error);
      addToast('Error processing file. Please check the format and try again', 'error', 5000);
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  const filteredCount = getFilteredTransactions().length;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              Export/Import Transactions
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onClose}
                className="transition-all duration-200 hover:bg-red-50"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            <button
              className={`flex-1 py-2 px-4 rounded text-sm font-medium transition-all duration-200 ${
                activeTab === 'export' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
              }`}
              onClick={() => optimisticTabSwitch('export')}
            >
              <Download className="h-4 w-4 inline mr-2" />
              Export
            </button>
            <button
              className={`flex-1 py-2 px-4 rounded text-sm font-medium transition-all duration-200 ${
                activeTab === 'import' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
              }`}
              onClick={() => optimisticTabSwitch('import')}
            >
              <Upload className="h-4 w-4 inline mr-2" />
              Import
            </button>
          </div>

          {activeTab === 'export' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Export Format</label>
                <Select 
                  value={exportFormat} 
                  onValueChange={(value: string) => {
                    setExportFormat(value as 'csv' | 'excel');
                    addToast(`Selected ${value.toUpperCase()} format`, 'info', 2000);
                  }}
                >
                  <SelectTrigger className="transition-all duration-200 hover:border-primary/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">
                      <FileText className="h-4 w-4 inline mr-2" />
                      CSV File
                    </SelectItem>
                    <SelectItem value="excel">
                      <FileSpreadsheet className="h-4 w-4 inline mr-2" />
                      Excel File (CSV)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Date Range</label>
                <Select value={exportRange} onValueChange={optimisticExportRangeChange}>
                  <SelectTrigger className="transition-all duration-200 hover:border-primary/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Transactions</SelectItem>
                    <SelectItem value="month">Specific Month</SelectItem>
                    <SelectItem value="custom">Custom Date Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {exportRange === 'month' && (
                <div className="transition-all duration-300 animate-in fade-in-0 slide-in-from-top-2">
                  <label className="block text-sm font-medium mb-2">Select Month</label>
                  <Select value={selectedMonth} onValueChange={optimisticMonthChange}>
                    <SelectTrigger className="transition-all duration-200 hover:border-primary/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableMonths().map(month => (
                        <SelectItem key={month} value={month}>
                          {new Date(month + '-01').toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long' 
                          })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {exportRange === 'custom' && (
                <div className="grid grid-cols-2 gap-4 transition-all duration-300 animate-in fade-in-0 slide-in-from-top-2">
                  <div>
                    <label className="block text-sm font-medium mb-2">Start Date</label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        if (e.target.value && endDate) {
                          const customFiltered = transactions.filter(t => t.date >= e.target.value && t.date <= endDate);
                          addToast(`Custom range: ${customFiltered.length} transactions`, 'info', 2000);
                        }
                      }}
                      className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">End Date</label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => {
                        setEndDate(e.target.value);
                        if (startDate && e.target.value) {
                          const customFiltered = transactions.filter(t => t.date >= startDate && t.date <= e.target.value);
                          addToast(`Custom range: ${customFiltered.length} transactions`, 'info', 2000);
                        }
                      }}
                      className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>
              )}

              <div className="bg-gray-50 p-3 rounded-lg transition-all duration-300">
                <p className="text-sm text-gray-600">
                  Ready to export <span className="font-medium text-primary">{filteredCount}</span> transactions
                </p>
              </div>

              <Button 
                onClick={handleExport} 
                className="w-full transition-all duration-200"
                disabled={exporting || filteredCount === 0}
              >
                {exporting ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Export {filteredCount} Transactions
                  </>
                )}
              </Button>
            </div>
          )}

          {activeTab === 'import' && (
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg transition-all duration-300">
                <h3 className="font-medium text-blue-800 mb-2">Import Instructions</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>- CSV file with columns: Date, Type, Category, Amount, Description</li>
                  <li>- Type must be either "income" or "expense"</li>
                  <li>- Date format: YYYY-MM-DD (e.g., 2024-01-15)</li>
                  <li>- Amount should be a number (e.g., 45.67)</li>
                </ul>
              </div>

              <Button 
                variant="outline" 
                onClick={downloadTemplate} 
                className="w-full transition-all duration-200 hover:bg-blue-50"
              >
                <FileText className="h-4 w-4 mr-2" />
                Download CSV Template
              </Button>

              <div>
                <label className="block text-sm font-medium mb-2">Select CSV File</label>
                <Input
                  type="file"
                  accept=".csv"
                  onChange={handleFileImport}
                  disabled={importing}
                  className="transition-all duration-200 focus:ring-2 focus:ring-primary/20 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-white hover:file:bg-primary/90"
                />
              </div>

              {importing && (
                <div className="bg-gray-50 p-3 rounded-lg text-center transition-all duration-300 animate-in fade-in-0">
                  <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full inline-block mr-2"></div>
                  <p className="text-sm text-gray-600 inline">Processing and importing transactions...</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </>
  );
};