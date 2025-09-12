import React, { memo, useCallback, Profiler } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Loader2 } from 'lucide-react';
import { Party } from '@/types';
import { PartySelector } from './PartySelector';
import { usePerformance } from '@/hooks/usePerformance';

interface TransactionFormProps {
  newEntry: {
    amount: string;
    partyName: string;
    remarks: string;
  };
  loading: boolean;
  allPartiesForTransaction: Party[];
  selectedPartyName: string;
  onPartyNameChange: (value: string) => void;
  onAmountChange: (value: string) => void;
  onRemarksChange: (value: string) => void;
  onAddEntry: () => void;
  onReset: () => void;
  validationErrors?: string[];
  validationWarnings?: string[];
}

const TransactionFormComponent: React.FC<TransactionFormProps> = ({
  newEntry,
  loading,
  allPartiesForTransaction,
  selectedPartyName,
  onPartyNameChange,
  onAmountChange,
  onRemarksChange,
  onAddEntry,
  onReset,
  validationErrors = [],
  validationWarnings = []
}) => {
  // Performance monitoring
  const { measureRender } = usePerformance('TransactionForm');
  
  // React Profiler callback for performance tracking
  const onRenderCallback = useCallback((id: string, phase: string, actualDuration: number, baseDuration: number, startTime: number, commitTime: number) => {
    // Only log significant renders (> 3ms for form)
    if (actualDuration > 3) {
      console.log(`🔍 Profiler [${id}]: ${phase} phase took ${actualDuration.toFixed(2)}ms (base: ${baseDuration.toFixed(2)}ms)`);
    }
  }, []);
  
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    onAddEntry();
  }, [onAddEntry]);

  // Handle keyboard navigation - ENHANCED like old system
  const handlePartyNameKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Ctrl+Enter submits form, Enter moves to next field
      if (e.ctrlKey) {
        onAddEntry();
      } else {
        // Move to amount field after party name auto-fill
        setTimeout(() => {
          const amountField = document.querySelector('input[placeholder*="+10000 for Credit"]') as HTMLInputElement;
          if (amountField) {
            amountField.focus();
          }
        }, 100); // Small delay to ensure party name is filled
      }
    }
  }, [onAddEntry]);

  const handleAmountKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Ctrl+Enter submits form, Enter moves to next field
      if (e.ctrlKey) {
        onAddEntry();
      } else {
        // Move to remarks field after amount is filled
        setTimeout(() => {
          const remarksField = document.querySelector('input[placeholder*="Additional remarks"]') as HTMLInputElement;
          if (remarksField) {
            remarksField.focus();
          }
        }, 50); // Small delay to ensure amount is processed
      }
    }
  }, [onAddEntry]);

  const handleRemarksKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Enter submits form (like old system)
      if (newEntry.amount && newEntry.partyName) {
        onAddEntry();
      }
    }
  }, [onAddEntry, newEntry.amount, newEntry.partyName]);

  return (
    <Profiler id="TransactionForm" onRender={onRenderCallback}>
      <div className="space-y-4">
      {/* Validation Messages */}
      {(validationErrors.length > 0 || validationWarnings.length > 0) && (
        <div className="space-y-2">
          {validationErrors.map((error, index) => (
            <div key={index} className="p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                <span className="text-sm text-red-700">{error}</span>
              </div>
            </div>
          ))}
          {validationWarnings.map((warning, index) => (
            <div key={index} className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                <span className="text-sm text-yellow-700">{warning}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Party Name 
            <span className="text-red-500 ml-1">*</span>
            <span className="text-xs text-gray-500 ml-1">(Required - other party name for transaction)</span>
          </label>
          <PartySelector
            parties={allPartiesForTransaction}
            selectedPartyName=""
            onPartySelect={onPartyNameChange}
            placeholder="Search other party name"
            className="w-full"
            onKeyDown={handlePartyNameKeyDown}
            excludeCurrentParty={true}
            currentPartyName=""
          />
        </div>
      
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Amount (+ for Credit, - for Debit)</label>
        <Input
          type="text"
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
          placeholder="Additional remarks (optional - will show as Party Name(Remarks) if provided)"
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
              <>
                <Plus className="w-4 h-4 mr-2" />
                Add Entry (Enter)
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
      </div>
    </Profiler>
  );
};

// Memoize the component to prevent unnecessary re-renders
export const TransactionForm = memo(TransactionFormComponent);
