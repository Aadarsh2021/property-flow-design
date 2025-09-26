import React, { memo, useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Loader2 } from 'lucide-react';
import { Party } from '@/types';

interface TransactionFormProps {
  newEntry: {
    amount: string;
    partyName: string;
    remarks: string;
  };
  loading: boolean;
  availableParties: Party[];
  selectedPartyName: string;
  onPartyNameChange: (value: string) => void;
  onAmountChange: (value: string) => void;
  onRemarksChange: (value: string) => void;
  onAddEntry: () => void;
  onTransactionKeyDown: (e: React.KeyboardEvent) => void;
  onTransactionPartyKeyDown: (e: React.KeyboardEvent) => void;
  onTransactionSuggestionClick: (party: Party) => void;
  onFilterTransactionParties: (searchTerm: string) => void;
  showTransactionPartyDropdown: boolean;
  filteredTransactionParties: Party[];
  highlightedTransactionIndex: number;
  showTransactionInlineSuggestion: boolean;
  transactionAutoCompleteText: string;
  transactionTextWidth: number;
  setTransactionInputRef: (ref: HTMLInputElement | null) => void;
}

const TransactionForm = memo(({
  newEntry,
  loading,
  availableParties,
  selectedPartyName,
  onPartyNameChange,
  onAmountChange,
  onRemarksChange,
  onAddEntry,
  onTransactionKeyDown,
  onTransactionPartyKeyDown,
  onTransactionSuggestionClick,
  onFilterTransactionParties,
  showTransactionPartyDropdown,
  filteredTransactionParties,
  highlightedTransactionIndex,
  showTransactionInlineSuggestion,
  transactionAutoCompleteText,
  transactionTextWidth,
  setTransactionInputRef
}: TransactionFormProps) => {
  const handlePartyNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onPartyNameChange(value);
    
    // Calculate text width for proper positioning
    if (setTransactionInputRef) {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (context) {
        context.font = window.getComputedStyle(e.target).font;
        const width = context.measureText(value).width;
        // This would need to be passed as a callback to update text width
      }
    }
    
    // Show dropdown and filter parties when typing
    if (value.trim()) {
      onFilterTransactionParties(value);
    } else {
      onFilterTransactionParties('');
    }
  }, [onPartyNameChange, onFilterTransactionParties, setTransactionInputRef]);

  const handleFocus = useCallback(() => {
    console.log('🔍 [FOCUS] Input focused, current party name:', newEntry.partyName);
    if (newEntry.partyName.trim()) {
      console.log('🔍 [FOCUS] Filtering with existing party name');
      onFilterTransactionParties(newEntry.partyName);
    } else {
      console.log('🔍 [FOCUS] Showing all parties (empty input)');
      // Show all parties when focused and empty
      onFilterTransactionParties('');
    }
  }, [newEntry.partyName, onFilterTransactionParties]);

  return (
    <div className="mt-6 bg-white rounded-xl shadow-lg border border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Add New Entry</h3>
        <div className="text-xs text-gray-500">
          <strong>Format:</strong> Party Name(Remarks) | <strong>Type:</strong> + for Credit, - for Debit
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">Party Name</Label>
          <div className="relative transaction-party-dropdown-container">
            <Input
              ref={setTransactionInputRef}
              type="text"
              value={newEntry.partyName}
              onChange={handlePartyNameChange}
              onFocus={handleFocus}
              onKeyDown={onTransactionPartyKeyDown}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              placeholder="Search party name"
            />
            
            {/* Inline suggestion */}
            {showTransactionInlineSuggestion && transactionAutoCompleteText && (
              <div 
                className="absolute top-0 left-0 px-3 py-2 text-gray-400 pointer-events-none"
                style={{ 
                  left: `${transactionTextWidth + 12}px`,
                  top: '8px',
                  fontSize: '14px',
                  fontFamily: 'inherit'
                }}
              >
                {transactionAutoCompleteText}
              </div>
            )}
            
            {/* Dropdown suggestions */}
            {showTransactionPartyDropdown && filteredTransactionParties.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredTransactionParties.map((party: any, index: number) => (
                  <div
                    key={party._id || party.id}
                    onClick={() => onTransactionSuggestionClick(party)}
                    className={`px-3 py-2 cursor-pointer text-sm hover:bg-blue-50 ${
                      index === highlightedTransactionIndex ? 'bg-blue-100' : ''
                    }`}
                  >
                    <div className="font-medium text-gray-900">
                      {party.party_name || party.name}
                    </div>
                    {party.sr_no && (
                      <div className="text-xs text-gray-500">
                        SR: {party.sr_no}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">Amount (+ for Credit, - for Debit)</Label>
          <Input
            type="number"
            step="1"
            value={newEntry.amount}
            onChange={(e) => onAmountChange(e.target.value)}
            onKeyDown={onTransactionKeyDown}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            placeholder="+10000 for Credit, -5000 for Debit"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">Remarks</Label>
          <Input
            type="text"
            value={newEntry.remarks}
            onChange={(e) => onRemarksChange(e.target.value)}
            onKeyDown={onTransactionKeyDown}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            placeholder="Additional remarks"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">&nbsp;</Label>
          <Button
            onClick={onAddEntry}
            disabled={loading || !newEntry.amount}
            className="w-full px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-all duration-200 transform hover:scale-105 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
          >
            {loading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Adding...</span>
              </div>
            ) : (
              'Add Entry'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
});

TransactionForm.displayName = 'TransactionForm';

export default TransactionForm;