import React from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { Party } from '@/types';
import { useAutoComplete } from '@/hooks/useAutoComplete';

interface PartySelectorProps {
  parties: Party[];
  selectedPartyName: string;
  onPartySelect: (partyName: string) => void;
  placeholder?: string;
  className?: string;
  showSuggestions?: boolean;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

export const PartySelector: React.FC<PartySelectorProps> = ({
  parties,
  selectedPartyName,
  onPartySelect,
  placeholder = "Search parties...",
  className = "",
  showSuggestions = true,
  onKeyDown
}) => {
  const {
    searchTerm,
    filteredParties,
    showSuggestions: showSuggestionsState,
    highlightedIndex,
    autoCompleteText,
    showInlineSuggestion,
    textWidth,
    inputRef,
    handleInputChange,
    handleKeyDown,
    handleAutoComplete,
    handleSuggestionClick,
    handleFocus,
    handleBlur
  } = useAutoComplete({
    parties,
    onPartySelect,
    excludeCurrentParty: true,
    currentPartyName: selectedPartyName
  });

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          ref={inputRef}
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={(e) => {
            handleKeyDown(e);
            if (onKeyDown) {
              onKeyDown(e);
            }
          }}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className="pl-10 pr-10"
        />
        
        {/* Auto-complete hint */}
        {searchTerm && showInlineSuggestion && autoCompleteText && (
          <div 
            className="absolute top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400 text-sm"
            style={{ 
              left: `${textWidth + 40}px`,
              zIndex: 1
            }}
          >
            {autoCompleteText}
          </div>
        )}
        
        {/* Tab hint */}
        {searchTerm && showInlineSuggestion && autoCompleteText && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs">
            Tab
          </div>
        )}
      </div>
      
      {/* Auto-suggestion dropdown */}
      {showSuggestions && showSuggestionsState && filteredParties.length > 0 && (
        <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto">
          {filteredParties.slice(0, 10).map((party, index) => (
            <div
              key={party._id}
              className={`px-4 py-2 cursor-pointer border-b border-gray-100 last:border-b-0 ${
                index === highlightedIndex 
                  ? 'bg-blue-100 text-blue-900' 
                  : 'hover:bg-gray-100'
              }`}
              onClick={() => handleSuggestionClick(party)}
            >
              <div className="font-medium text-gray-900">
                {party.party_name || party.name}
              </div>
              {party.srNo && (
                <div className="text-sm text-gray-500">Sr. No: {party.srNo}</div>
              )}
            </div>
          ))}
          {filteredParties.length > 10 && (
            <div className="px-4 py-2 text-sm text-gray-500 text-center bg-gray-50">
              And {filteredParties.length - 10} more...
            </div>
          )}
        </div>
      )}
    </div>
  );
};
