import React from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { uiSlice } from '../store/slices/uiSlice';
import { partiesSlice } from '../store/slices/partiesSlice';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface TransactionFormProps {
  selectedPartyName: string;
  onAddEntry: () => void;
}

const TransactionForm: React.FC<TransactionFormProps> = ({
  selectedPartyName,
  onAddEntry
}) => {
  const dispatch = useAppDispatch();
  
  const {
    availableParties = [],
    filteredTopParties = []
  } = useAppSelector(state => state.parties);
  
  const {
    newEntryPartyName,
    newEntryAmount,
    newEntryRemarks,
    showTransactionPartyDropdown,
    transactionFilteredParties = [],
    transactionHighlightedIndex,
    transactionAutoCompleteText,
    showTransactionInlineSuggestion,
    isAddingEntry
  } = useAppSelector(state => state.ui);

  // Transaction Form Party Selection Functions
  const handleTransactionPartyNameChange = (value: string) => {
    dispatch(uiSlice.actions.setNewEntryPartyName(value));
    dispatch(uiSlice.actions.setTransactionHighlightedIndex(-1));

    if (value.trim()) {
      const filtered = availableParties.filter(party => {
        const partyName = party.party_name || party.name;
        const searchLower = value.toLowerCase();
        const partyLower = partyName.toLowerCase();
        
        // Exclude current party from transaction form
        if (partyName === selectedPartyName) {
          return false;
        }
        
        // Improved matching - includes partial matches and contains
        return partyLower.startsWith(searchLower) || 
               partyLower.includes(searchLower) ||
               partyName.toLowerCase().includes(searchLower);
      });

      const sortedFiltered = filtered.sort((a, b) => {
        const aName = (a.party_name || a.name).toLowerCase();
        const bName = (b.party_name || b.name).toLowerCase();
        const searchLower = value.toLowerCase();
        
        // Exact match first
        if (aName === searchLower && bName !== searchLower) return -1;
        if (bName === searchLower && aName !== searchLower) return 1;
        
        // Starts with match second
        const aStartsWith = aName.startsWith(searchLower);
        const bStartsWith = bName.startsWith(searchLower);
        if (aStartsWith && !bStartsWith) return -1;
        if (bStartsWith && !aStartsWith) return 1;
        
        // Alphabetical order
        return aName.localeCompare(bName);
      });

      dispatch(uiSlice.actions.setTransactionFilteredParties(sortedFiltered));

      if (sortedFiltered.length > 0) {
        const firstParty = sortedFiltered[0];
        const partyName = firstParty.party_name || firstParty.name;
        
        // Only show auto-complete if it's a startsWith match
        if (partyName.toLowerCase().startsWith(value.toLowerCase())) {
          const autoCompleteText = partyName.substring(value.length);
          dispatch(uiSlice.actions.setTransactionAutoCompleteText(autoCompleteText));
          dispatch(uiSlice.actions.setShowTransactionInlineSuggestion(true));
        } else {
          dispatch(uiSlice.actions.setTransactionAutoCompleteText(''));
          dispatch(uiSlice.actions.setShowTransactionInlineSuggestion(false));
        }
      } else {
        dispatch(uiSlice.actions.setTransactionAutoCompleteText(''));
        dispatch(uiSlice.actions.setShowTransactionInlineSuggestion(false));
      }

      dispatch(uiSlice.actions.setShowTransactionPartyDropdown(true));
    } else {
      const filtered = availableParties.filter(party => {
        const partyName = party.party_name || party.name;
        return partyName !== selectedPartyName;
      });
      dispatch(uiSlice.actions.setTransactionFilteredParties(filtered));
      dispatch(uiSlice.actions.setTransactionAutoCompleteText(''));
      dispatch(uiSlice.actions.setShowTransactionInlineSuggestion(false));
      dispatch(uiSlice.actions.setShowTransactionPartyDropdown(true));
    }
  };

  const handleTransactionPartySelect = (partyName: string) => {
    dispatch(uiSlice.actions.setNewEntryPartyName(partyName));
    dispatch(uiSlice.actions.setShowTransactionPartyDropdown(false));
    dispatch(uiSlice.actions.setTransactionAutoCompleteText(''));
    dispatch(uiSlice.actions.setShowTransactionInlineSuggestion(false));
    dispatch(uiSlice.actions.setTransactionHighlightedIndex(-1));

    // Focus on amount input after a small delay
    setTimeout(() => {
      const amountInput = document.querySelector('input[placeholder*="Credit"], input[placeholder*="Debit"]') as HTMLInputElement;
      if (amountInput) {
        amountInput.focus();
      }
    }, 50);
  };


  return (
    <div className="bg-white border-t border-gray-200 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Add New Entry</h3>
          <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
            <strong>Format:</strong> Party Name(Remarks) | <strong>Type:</strong> + for Credit, - for Debit | <strong>Display:</strong> Party Name column shows "PartyName(remarks)" format
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Party Name Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Party Name</label>
            <div className="relative transaction-party-dropdown-container">
              <div className="relative">
                <input
                  type="text"
                  value={newEntryPartyName}
                  onChange={(e) => handleTransactionPartyNameChange(e.target.value)}
                  onFocus={() => {
                    if (availableParties.length > 0) {
                      dispatch(uiSlice.actions.setShowTransactionPartyDropdown(true));
                      const filtered = availableParties.filter(party => {
                        const partyName = party.party_name || party.name;
                        return partyName !== selectedPartyName;
                      });
                      dispatch(uiSlice.actions.setTransactionFilteredParties(filtered));
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (transactionHighlightedIndex >= 0 && transactionHighlightedIndex < transactionFilteredParties.length) {
                        const selectedParty = transactionFilteredParties[transactionHighlightedIndex];
                        handleTransactionPartySelect(selectedParty.party_name || selectedParty.name);
                      } else if (showTransactionInlineSuggestion && transactionAutoCompleteText) {
                        const matchingParty = transactionFilteredParties.find(party => {
                          const partyName = party.party_name || party.name;
                          return partyName.toLowerCase().startsWith(newEntryPartyName.toLowerCase());
                        });
                        if (matchingParty) {
                          handleTransactionPartySelect(matchingParty.party_name || matchingParty.name);
                        }
                      } else if (transactionFilteredParties.length > 0) {
                        const firstParty = transactionFilteredParties[0];
                        handleTransactionPartySelect(firstParty.party_name || firstParty.name);
                      } else if (newEntryPartyName.trim()) {
                        // If party name is entered, move to amount field
                        setTimeout(() => {
                          const amountInput = document.querySelector('input[placeholder*="Credit"], input[placeholder*="Debit"]') as HTMLInputElement;
                          if (amountInput) {
                            amountInput.focus();
                          }
                        }, 10);
                      }
                    } else if (e.key === 'Tab') {
                      e.preventDefault();
                      if (showTransactionInlineSuggestion && transactionAutoCompleteText) {
                        const matchingParty = transactionFilteredParties.find(party => {
                          const partyName = party.party_name || party.name;
                          return partyName.toLowerCase().startsWith(newEntryPartyName.toLowerCase());
                        });
                        if (matchingParty) {
                          handleTransactionPartySelect(matchingParty.party_name || matchingParty.name);
                        }
                      } else {
                        // Move to amount field
                        setTimeout(() => {
                          const amountInput = document.querySelector('input[placeholder*="Credit"], input[placeholder*="Debit"]') as HTMLInputElement;
                          if (amountInput) {
                            amountInput.focus();
                          }
                        }, 10);
                      }
                    } else if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      dispatch(uiSlice.actions.setTransactionHighlightedIndex(
                        Math.min(transactionHighlightedIndex + 1, Math.min(transactionFilteredParties.length - 1, 9))
                      ));
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      dispatch(uiSlice.actions.setTransactionHighlightedIndex(
                        Math.max(transactionHighlightedIndex - 1, -1)
                      ));
                    } else if (e.key === 'Escape') {
                      dispatch(uiSlice.actions.setShowTransactionPartyDropdown(false));
                      dispatch(uiSlice.actions.setTransactionAutoCompleteText(''));
                      dispatch(uiSlice.actions.setShowTransactionInlineSuggestion(false));
                      dispatch(uiSlice.actions.setTransactionHighlightedIndex(-1));
                    }
                  }}
                  placeholder="Search party name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 relative"
                  autoComplete="off"
                />
                
                {/* Auto-complete suggestion */}
                {showTransactionInlineSuggestion && transactionAutoCompleteText && (
                  <div 
                    className="absolute pointer-events-none flex items-center"
                    style={{ 
                      left: `${newEntryPartyName.length * 8.5 + 12}px`, 
                      top: '50%', 
                      transform: 'translateY(-50%)',
                      zIndex: 1
                    }}
                  >
                    <span className="text-gray-400 text-sm opacity-50 select-none">
                      {transactionAutoCompleteText}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Dropdown */}
              {showTransactionPartyDropdown && transactionFilteredParties.length > 0 && (
                <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                  {transactionFilteredParties.slice(0, 10).map((party, index) => {
                    const partyName = party.party_name || party.name;
                    const searchTerm = newEntryPartyName.toLowerCase();
                    const partyNameLower = partyName.toLowerCase();
                    const matchIndex = partyNameLower.indexOf(searchTerm);
                    
                    const beforeMatch = partyName.substring(0, matchIndex);
                    const matchText = partyName.substring(matchIndex, matchIndex + searchTerm.length);
                    const afterMatch = partyName.substring(matchIndex + searchTerm.length);
                    
                    const isHighlighted = index === transactionHighlightedIndex;
                    
                    return (
                      <div
                        key={party._id || party.id || index}
                        className={`px-4 py-2 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors duration-150 ${
                          isHighlighted 
                            ? 'bg-blue-100 border-blue-200' 
                            : 'hover:bg-blue-50'
                        }`}
                        onClick={() => handleTransactionPartySelect(partyName)}
                        onMouseEnter={() => dispatch(uiSlice.actions.setTransactionHighlightedIndex(index))}
                      >
                        <div className="font-medium text-gray-900">
                          {searchTerm && matchIndex !== -1 ? (
                            <>
                              {beforeMatch}
                              <span className="bg-yellow-200 font-bold">{matchText}</span>
                              {afterMatch}
                            </>
                          ) : (
                            partyName
                          )}
                        </div>
                        {party.companyName && (
                          <div className="text-sm text-gray-500">{party.companyName}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Amount</label>
            <input
              type="text"
              value={newEntryAmount}
              onChange={(e) => {
                let value = e.target.value;
                // Only allow numbers and a single leading minus sign
                if (value === '-' || /^-?\d*\.?\d*$/.test(value)) {
                  dispatch(uiSlice.actions.setNewEntryAmount(value));
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  // Always move to remarks field when Enter is pressed in amount field
                  requestAnimationFrame(() => {
                    const remarksInput = document.querySelector('input[placeholder*="remarks"]') as HTMLInputElement;
                    if (remarksInput) {
                      remarksInput.focus();
                      remarksInput.select(); // Select all text for better UX
                    }
                  });
                }
              }}
              placeholder={newEntryAmount.startsWith('-') ? "Debit amount" : "Credit amount"}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                newEntryAmount.startsWith('-') 
                  ? 'border-red-300 bg-red-50 text-red-900' 
                  : newEntryAmount 
                    ? 'border-green-300 bg-green-50 text-green-900'
                    : 'border-gray-300'
              }`}
            />
            
          </div>

          {/* Remarks Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Remarks (Optional)</label>
            <input
              type="text"
              value={newEntryRemarks}
              onChange={(e) => dispatch(uiSlice.actions.setNewEntryRemarks(e.target.value))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  // Submit form when Enter is pressed in remarks field
                  // Remarks is optional, so submit regardless of whether it's filled or not
                  if (newEntryPartyName.trim() && newEntryAmount.trim()) {
                    onAddEntry();
                  }
                }
              }}
              placeholder="Enter remarks (optional)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            />
          </div>

          {/* Add Entry Button */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 opacity-0">Action</label>
            <Button
              onClick={onAddEntry}
              disabled={!newEntryPartyName.trim() || !newEntryAmount.trim() || isAddingEntry}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAddingEntry ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Entry'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionForm;