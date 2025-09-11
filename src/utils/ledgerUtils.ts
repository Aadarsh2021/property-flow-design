import { LedgerEntry } from '@/types';

// Format currency amount
export const formatCurrency = (amount: number): string => {
  return `₹${amount.toLocaleString()}`;
};

// Format date for display
export const formatDate = (date: string | Date): string => {
  return new Date(date).toLocaleDateString('en-GB');
};

// Calculate balance color class
export const getBalanceColorClass = (balance: number): string => {
  if (balance > 0) return 'bg-green-100 text-green-800';
  if (balance < 0) return 'bg-red-100 text-red-800';
  return 'bg-gray-100 text-gray-800';
};

// Calculate transaction type color class
export const getTransactionTypeColorClass = (type: string): string => {
  return type === 'CR' 
    ? 'bg-green-100 text-green-800' 
    : 'bg-red-100 text-red-800';
};

// Validate transaction entry
export const validateTransactionEntry = (entry: {
  amount: string;
  partyName: string;
  remarks?: string;
}): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!entry.amount || entry.amount.trim() === '') {
    errors.push('Amount is required');
  } else {
    const amount = parseFloat(entry.amount);
    if (isNaN(amount) || amount === 0) {
      errors.push('Please enter a valid amount');
    }
  }

  if (!entry.partyName || entry.partyName.trim() === '') {
    errors.push('Party name is required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Calculate summary statistics
export const calculateSummary = (entries: LedgerEntry[]) => {
  const totalCredit = entries.reduce((sum, entry) => sum + (entry.credit || 0), 0);
  const totalDebit = entries.reduce((sum, entry) => sum + (entry.debit || 0), 0);
  const calculatedBalance = totalCredit - totalDebit;
  const totalEntries = entries.length;

  return {
    totalCredit,
    totalDebit,
    calculatedBalance,
    totalEntries
  };
};

// Filter entries by type
export const filterEntriesByType = (entries: LedgerEntry[], type: 'current' | 'old') => {
  if (type === 'old') {
    return entries.filter(entry => entry.is_old_record);
  }
  return entries.filter(entry => !entry.is_old_record);
};

// Sort entries by date
export const sortEntriesByDate = (entries: LedgerEntry[], ascending = true) => {
  return [...entries].sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return ascending ? dateA - dateB : dateB - dateA;
  });
};

// Search entries
export const searchEntries = (entries: LedgerEntry[], searchTerm: string) => {
  if (!searchTerm.trim()) return entries;
  
  const term = searchTerm.toLowerCase();
  return entries.filter(entry => 
    entry.remarks.toLowerCase().includes(term) ||
    entry.partyName.toLowerCase().includes(term) ||
    entry.tnsType.toLowerCase().includes(term)
  );
};

// Generate unique ID for entries
export const generateEntryId = (): string => {
  return `${Date.now()}::`;
};

// Check if entry is selectable
export const isEntrySelectable = (entry: LedgerEntry): boolean => {
  // Add any business logic for entry selection
  return !entry.is_old_record || true; // Allow selection of old records too
};
