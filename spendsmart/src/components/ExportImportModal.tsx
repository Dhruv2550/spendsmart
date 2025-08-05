// src/components/ExportImportModal.tsx
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { X, Download, Upload, FileText, FileSpreadsheet, Calendar } from 'lucide-react';

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

  // Get available months from transactions
  const getAvailableMonths = () => {
    const months = new Set<string>();
    transactions.forEach(t => {
      months.add(t.date.substring(0, 7));
    });
    return Array.from(months).sort().reverse();
  };

  // Filter transactions based on export range
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

  // Convert transactions to CSV format
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

  // Download file
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

  // Handle export
  const handleExport = () => {
    const filteredData = getFilteredTransactions();
    
    if (filteredData.length === 0) {
      alert('No transactions to export for the selected range.');
      return;
    }

    const timestamp = new Date().toISOString().split('T')[0];
    let filename = `spendsmart-export-${timestamp}`;
    
    if (exportRange === 'month') {
      filename = `spendsmart-${selectedMonth}-${timestamp}`;
    } else if (exportRange === 'custom') {
      filename = `spendsmart-${startDate}-to-${endDate}-${timestamp}`;
    }

    if (exportFormat === 'csv') {
      const csvContent = convertToCSV(filteredData);
      downloadFile(csvContent, `${filename}.csv`, 'text/csv');
    } else {
      // For now, export Excel as CSV (can enhance later with proper Excel format)
      const csvContent = convertToCSV(filteredData);
      downloadFile(csvContent, `${filename}.csv`, 'text/csv');
    }

    alert(`Exported ${filteredData.length} transactions successfully!`);
  };

  // Download CSV template
  const downloadTemplate = () => {
    const template = [
      'Date,Type,Category,Amount,Description',
      '2024-01-15,expense,Groceries,45.67,Weekly shopping',
      '2024-01-16,income,Salary,3000.00,Monthly salary',
      '2024-01-17,expense,Transportation,12.50,Bus fare'
    ].join('\n');
    
    downloadFile(template, 'spendsmart-import-template.csv', 'text/csv');
  };

  // Handle file import
  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      alert('Please select a CSV file');
      return;
    }

    setImporting(true);
    
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        alert('CSV file appears to be empty or invalid');
        setImporting(false);
        return;
      }

      // Skip header row
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
        
        // Validate data
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
        alert(`Found ${errors.length} errors:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? '\n...' : ''}`);
      }

      if (validTransactions.length === 0) {
        alert('No valid transactions found to import');
        setImporting(false);
        return;
      }

      // Import transactions to backend
      let successCount = 0;
      for (const transaction of validTransactions) {
        try {
          const response = await fetch('http://localhost:3001/api/records', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(transaction)
          });
          
          if (response.ok) successCount++;
        } catch (error) {
          console.error('Error importing transaction:', error);
        }
      }

      alert(`Successfully imported ${successCount} out of ${validTransactions.length} transactions!`);
      onImportSuccess();
      onClose();
    } catch (error) {
      console.error('Error processing file:', error);
      alert('Error processing file. Please check the format and try again.');
    } finally {
      setImporting(false);
      // Reset file input
      event.target.value = '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Export/Import Transactions
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          <button
            className={`flex-1 py-2 px-4 rounded text-sm font-medium transition-colors ${
              activeTab === 'export' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
            onClick={() => setActiveTab('export')}
          >
            <Download className="h-4 w-4 inline mr-2" />
            Export
          </button>
          <button
            className={`flex-1 py-2 px-4 rounded text-sm font-medium transition-colors ${
              activeTab === 'import' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
            onClick={() => setActiveTab('import')}
          >
            <Upload className="h-4 w-4 inline mr-2" />
            Import
          </button>
        </div>

        {/* Export Tab */}
        {activeTab === 'export' && (
          <div className="space-y-4">
            {/* Format Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">Export Format</label>
              <Select value={exportFormat} onValueChange={(value: string) => setExportFormat(value as 'csv' | 'excel')}>
                <SelectTrigger>
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

            {/* Date Range Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">Date Range</label>
              <Select value={exportRange} onValueChange={(value: string) => setExportRange(value as 'all' | 'month' | 'custom')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Transactions</SelectItem>
                  <SelectItem value="month">Specific Month</SelectItem>
                  <SelectItem value="custom">Custom Date Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Month Selection */}
            {exportRange === 'month' && (
              <div>
                <label className="block text-sm font-medium mb-2">Select Month</label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger>
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

            {/* Custom Date Range */}
            {exportRange === 'custom' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Start Date</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">End Date</label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Export Summary */}
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600">
                Ready to export {getFilteredTransactions().length} transactions
              </p>
            </div>

            {/* Export Button */}
            <Button onClick={handleExport} className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Export Transactions
            </Button>
          </div>
        )}

        {/* Import Tab */}
        {activeTab === 'import' && (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-blue-800 mb-2">Import Instructions</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>- CSV file with columns: Date, Type, Category, Amount, Description</li>
                <li>- Type must be either "income" or "expense"</li>
                <li>- Date format: YYYY-MM-DD (e.g., 2024-01-15)</li>
                <li>- Amount should be a number (e.g., 45.67)</li>
              </ul>
            </div>

            {/* Download Template */}
            <Button variant="outline" onClick={downloadTemplate} className="w-full">
              <FileText className="h-4 w-4 mr-2" />
              Download CSV Template
            </Button>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium mb-2">Select CSV File</label>
              <Input
                type="file"
                accept=".csv"
                onChange={handleFileImport}
                disabled={importing}
              />
            </div>

            {importing && (
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <p className="text-sm text-gray-600">Importing transactions...</p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};