import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Loader2 } from 'lucide-react';
import { Party } from '@/types';
import { PartySelector } from './PartySelector';

interface TransactionFormProps {
  newEntry: {
    amount: string;
    partyName: string;
    remarks: string;
  };
  loading: boolean;
  allPartiesForTransaction: Party[];
  onPartyNameChange: (value: string) => void;
  onAmountChange: (value: string) => void;
  onRemarksChange: (value: string) => void;
  onAddEntry: () => void;
  onReset: () => void;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({
  newEntry,
  loading,
  allPartiesForTransaction,
  onPartyNameChange,
  onAmountChange,
  onRemarksChange,
  onAddEntry,
  onReset
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddEntry();
  };

  // Handle keyboard navigation
  const handlePartyNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Move to amount field
      const amountField = document.querySelector('input[type="number"]') as HTMLInputElement;
      if (amountField) {
        amountField.focus();
      }
    }
  };

  const handleAmountKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Move to remarks field
      const remarksField = document.querySelector('input[placeholder*="Additional remarks"]') as HTMLInputElement;
      if (remarksField) {
        remarksField.focus();
      }
    }
  };

  const handleRemarksKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Submit form
      onAddEntry();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Party Name</label>
        <PartySelector
          parties={allPartiesForTransaction}
          selectedPartyName=""
          onPartySelect={onPartyNameChange}
          placeholder="Search party name"
          className="w-full"
          onKeyDown={handlePartyNameKeyDown}
        />
      </div>
      
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Amount (+ for Credit, - for Debit)</label>
        <Input
          type="number"
          step="1"
          value={newEntry.amount}
          onChange={(e) => onAmountChange(e.target.value)}
          onKeyDown={handleAmountKeyDown}
          placeholder="+10000 for Credit, -5000 for Debit"
          className="w-full"
        />
      </div>
      
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Remarks</label>
        <Input
          type="text"
          value={newEntry.remarks}
          onChange={(e) => onRemarksChange(e.target.value)}
          onKeyDown={handleRemarksKeyDown}
          placeholder="Additional remarks (will show as Party Name(Remarks))"
          className="w-full"
        />
      </div>
      
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">&nbsp;</label>
        <div className="flex space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={onReset}
            disabled={loading}
            className="flex-1"
          >
            Reset
          </Button>
          <Button
            type="submit"
            disabled={loading || !newEntry.amount || !newEntry.partyName}
            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              'Add Entry (Ctrl+Enter)'
            )}
          </Button>
        </div>
      </div>
    </form>
  );
};
