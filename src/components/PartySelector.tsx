import React from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { uiSlice } from '../store/slices/uiSlice';
import { partiesSlice } from '../store/slices/partiesSlice';
import { Input } from '@/components/ui/input';

interface PartySelectorProps {
  selectedPartyName: string;
  onPartySelect: (partyName: string) => void;
  isTopSection?: boolean;
}

const PartySelector: React.FC<PartySelectorProps> = ({
  selectedPartyName,
  onPartySelect,
  isTopSection = false
}) => {
  const dispatch = useAppDispatch();
  
  const {
    availableParties = []
  } = useAppSelector(state => state.parties);
  
  const {
    typingPartyName,
    topAutoCompleteText,
    showTopInlineSuggestion,
    showTopPartyDropdown,
    topHighlightedIndex,
    filteredTopParties = []
  } = useAppSelector(state => state.ui);

  // Calculate text width for proper auto-complete positioning
  const calculateTextWidth = (text: string) => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return text.length * 8.5;
    
    // Get the computed style of the input element
    const inputElement = document.querySelector('input[placeholder*="Search party"]') as HTMLInputElement;
    if (inputElement) {
      const computedStyle = window.getComputedStyle(inputElement);
      context.font = `${computedStyle.fontSize} ${computedStyle.fontFamily}`;
    } else {
      context.font = '14px system-ui, -apple-system, sans-serif';
    }
    
    return context.measureText(text).width;
  };

  // Top Section Party Selection Functions
  const handlePartyNameChange = (value: string) => {
    dispatch(uiSlice.actions.setTypingPartyName(value));
    dispatch(uiSlice.actions.setTopHighlightedIndex(-1));

    if (value.trim()) {
      const filtered = availableParties.filter(party => {
        const partyName = party.party_name || party.name;
        const searchLower = value.toLowerCase();
        const partyLower = partyName.toLowerCase();
        
        return partyLower.startsWith(searchLower);
      });

      const sortedFiltered = filtered.sort((a, b) => {
        const aName = (a.party_name || a.name).toLowerCase();
        const bName = (b.party_name || b.name).toLowerCase();
        const searchLower = value.toLowerCase();
        
        if (aName === searchLower && bName !== searchLower) return -1;
        if (bName === searchLower && aName !== searchLower) return 1;
        
        return aName.localeCompare(bName);
      });

      dispatch(partiesSlice.actions.setFilteredTopParties(sortedFiltered));

      if (sortedFiltered.length > 0) {
        const firstParty = sortedFiltered[0];
        const partyName = firstParty.party_name || firstParty.name;
        const autoCompleteText = partyName.substring(value.length);
        dispatch(uiSlice.actions.setTopAutoCompleteText(autoCompleteText));
        dispatch(uiSlice.actions.setShowTopInlineSuggestion(true));
      } else {
        dispatch(uiSlice.actions.setTopAutoCompleteText(''));
        dispatch(uiSlice.actions.setShowTopInlineSuggestion(false));
      }

      dispatch(uiSlice.actions.setShowTopPartyDropdown(true));
    } else {
      dispatch(partiesSlice.actions.setFilteredTopParties(availableParties));
      dispatch(uiSlice.actions.setTopAutoCompleteText(''));
      dispatch(uiSlice.actions.setShowTopInlineSuggestion(false));
      dispatch(uiSlice.actions.setShowTopPartyDropdown(true));
    }
  };

  const handlePartySelect = (partyName: string) => {
    dispatch(uiSlice.actions.setTypingPartyName(partyName));
    dispatch(uiSlice.actions.setShowTopPartyDropdown(false));
    dispatch(partiesSlice.actions.setTopSearchTerm(''));
    dispatch(uiSlice.actions.setTopAutoCompleteText(''));
    dispatch(uiSlice.actions.setShowTopInlineSuggestion(false));
    dispatch(uiSlice.actions.setTopHighlightedIndex(-1));
    onPartySelect(partyName);
  };

  // Auto-complete functionality
  const handleAutoComplete = () => {
    if (filteredTopParties.length > 0) {
      const selectedParty = filteredTopParties[0];
      const partyName = selectedParty.party_name || selectedParty.name;
      handlePartySelect(partyName);
    }
  };

  // Tab complete functionality
  const handleTabComplete = () => {
    if (showTopInlineSuggestion && topAutoCompleteText) {
      const currentValue = typingPartyName;
      const completedValue = currentValue + topAutoCompleteText;
      
      const matchingParty = filteredTopParties.find(party => {
        const partyName = party.party_name || party.name;
        return partyName.toLowerCase() === completedValue.toLowerCase();
      });

      if (matchingParty) {
        handlePartySelect(completedValue);
      }
    }
  };

  // Show dropdown when input is focused
  const handleInputFocus = () => {
    if (availableParties.length > 0) {
      dispatch(uiSlice.actions.setShowTopPartyDropdown(true));
      const filtered = availableParties.filter(party => {
        const partyName = party.party_name || party.name;
        return partyName.toLowerCase().includes(typingPartyName.toLowerCase());
      });
      dispatch(partiesSlice.actions.setFilteredTopParties(filtered));
    }
  };

  if (!isTopSection) return null;

  return (
    <div className="flex items-center space-x-3">
      <label className="text-sm font-semibold text-gray-700">Party Name:</label>
      <div className="relative top-party-dropdown-container">
        <div className="relative">
          <input
            type="text"
            value={typingPartyName}
            onChange={(e) => handlePartyNameChange(e.target.value)}
            onFocus={handleInputFocus}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (topHighlightedIndex >= 0 && topHighlightedIndex < filteredTopParties.length) {
                  const selectedParty = filteredTopParties[topHighlightedIndex];
                  handlePartySelect(selectedParty.party_name || selectedParty.name);
                } else if (showTopInlineSuggestion && topAutoCompleteText) {
                  handleTabComplete();
                } else if (filteredTopParties.length > 0) {
                  handleAutoComplete();
                }
              } else if (e.key === 'Tab') {
                e.preventDefault();
                handleTabComplete();
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                dispatch(uiSlice.actions.setTopHighlightedIndex(
                  Math.min(topHighlightedIndex + 1, Math.min(filteredTopParties.length - 1, 9))
                ));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                dispatch(uiSlice.actions.setTopHighlightedIndex(
                  Math.max(topHighlightedIndex - 1, -1)
                ));
              } else if (e.key === 'Escape') {
                dispatch(uiSlice.actions.setShowTopPartyDropdown(false));
                dispatch(uiSlice.actions.setTopAutoCompleteText(''));
                dispatch(uiSlice.actions.setShowTopInlineSuggestion(false));
                dispatch(uiSlice.actions.setTopHighlightedIndex(-1));
              }
            }}
            placeholder="Search party..."
            className="w-80 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 relative"
            autoComplete="off"
          />
          
          {/* Auto-complete suggestion */}
          {showTopInlineSuggestion && topAutoCompleteText && (
            <div 
              className="absolute inset-0 pointer-events-none flex items-center"
              style={{ left: `${calculateTextWidth(typingPartyName)}px` }}
            >
              <span className="text-gray-400 text-sm">
                {topAutoCompleteText}
              </span>
            </div>
          )}
        </div>
        
        {/* Dropdown */}
        {showTopPartyDropdown && filteredTopParties.length > 0 && (
          <div className="absolute top-full left-0 mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
            {filteredTopParties.slice(0, 10).map((party, index) => {
              const partyName = party.party_name || party.name;
              const searchTerm = typingPartyName.toLowerCase();
              const partyNameLower = partyName.toLowerCase();
              const matchIndex = partyNameLower.indexOf(searchTerm);
              
              const beforeMatch = partyName.substring(0, matchIndex);
              const matchText = partyName.substring(matchIndex, matchIndex + searchTerm.length);
              const afterMatch = partyName.substring(matchIndex + searchTerm.length);
              
              const isHighlighted = index === topHighlightedIndex;
              
              return (
                <div
                  key={party._id || party.id || index}
                  className={`px-4 py-2 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors duration-150 ${
                    isHighlighted 
                      ? 'bg-blue-100 border-blue-200' 
                      : 'hover:bg-blue-50'
                  }`}
                  onClick={() => handlePartySelect(partyName)}
                  onMouseEnter={() => dispatch(uiSlice.actions.setTopHighlightedIndex(index))}
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
                  <div className="text-sm text-gray-500">{party.companyName}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PartySelector;