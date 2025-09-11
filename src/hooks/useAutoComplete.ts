import { useState, useCallback, useRef, useEffect } from 'react';
import { Party } from '@/types';

interface UseAutoCompleteProps {
  parties: Party[];
  onPartySelect: (partyName: string) => void;
  excludeCurrentParty?: boolean;
  currentPartyName?: string;
}

export const useAutoComplete = ({
  parties,
  onPartySelect,
  excludeCurrentParty = false,
  currentPartyName = ''
}: UseAutoCompleteProps) => {
  const [searchTerm, setSearchTerm] = useState(currentPartyName);
  const [filteredParties, setFilteredParties] = useState<Party[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [autoCompleteText, setAutoCompleteText] = useState('');
  const [showInlineSuggestion, setShowInlineSuggestion] = useState(false);
  const [textWidth, setTextWidth] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update search term when currentPartyName changes
  useEffect(() => {
    setSearchTerm(currentPartyName);
  }, [currentPartyName]);

  // Filter parties based on search term
  const filterParties = useCallback((searchTerm: string) => {
    let availableParties = parties;
    
    if (excludeCurrentParty && currentPartyName) {
      availableParties = parties.filter(party => 
        (party.party_name || party.name) !== currentPartyName
      );
    }
    
    if (!searchTerm.trim()) {
      setFilteredParties(availableParties);
      setHighlightedIndex(-1);
      setAutoCompleteText('');
      setShowInlineSuggestion(false);
      return;
    }
    
    const filtered = availableParties.filter(party => {
      const partyName = (party.party_name || party.name || '').toLowerCase();
      const companyName = (party.companyName || '').toLowerCase();
      const searchLower = searchTerm.toLowerCase();
      
      return partyName.startsWith(searchLower) || partyName.includes(searchLower) ||
             (companyName.startsWith(searchLower) || companyName.includes(searchLower));
    }).sort((a, b) => {
      const aName = (a.party_name || a.name || '').toLowerCase();
      const bName = (b.party_name || b.name || '').toLowerCase();
      const searchLower = searchTerm.toLowerCase();
      
      const aStartsWith = aName.startsWith(searchLower);
      const bStartsWith = bName.startsWith(searchLower);
      
      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;
      return aName.localeCompare(bName);
    });
    
    setFilteredParties(filtered);
    setHighlightedIndex(-1); // Don't auto-highlight first item
    
    // Auto-complete suggestion
    if (filtered.length > 0) {
      const bestMatch = filtered[0];
      const partyName = bestMatch.party_name || bestMatch.name || '';
      const searchLower = searchTerm.toLowerCase();
      const partyLower = partyName.toLowerCase();
      
      if (partyLower.startsWith(searchLower) && partyLower !== searchLower) {
        const autoCompleteText = partyName.substring(searchTerm.length);
        setAutoCompleteText(autoCompleteText);
        setShowInlineSuggestion(true);
      } else {
        setAutoCompleteText('');
        setShowInlineSuggestion(false);
      }
    } else {
      setAutoCompleteText('');
      setShowInlineSuggestion(false);
    }
  }, [parties, excludeCurrentParty, currentPartyName]);

  // Handle input change
  const handleInputChange = useCallback((value: string) => {
    setSearchTerm(value);
    setHighlightedIndex(-1);
    
    // Calculate text width for positioning
    if (inputRef.current) {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (context) {
        context.font = window.getComputedStyle(inputRef.current).font;
        const width = context.measureText(value).width;
        setTextWidth(width);
      }
    }
    
    filterParties(value);
    
    // Show suggestions when there's text or when focusing
    setShowSuggestions(true);
  }, [filterParties]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      handleAutoComplete();
      return;
    }

    if (!showSuggestions || filteredParties.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < Math.min(10, filteredParties.length) - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : prev);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredParties.length) {
          // Select highlighted suggestion
          const selectedParty = filteredParties[highlightedIndex];
          const partyName = selectedParty.party_name || selectedParty.name;
          setSearchTerm(partyName);
          setShowSuggestions(false);
          setHighlightedIndex(-1);
          onPartySelect(partyName);
        } else if (filteredParties.length > 0) {
          // Select first suggestion if none highlighted
          const firstParty = filteredParties[0];
          const partyName = firstParty.party_name || firstParty.name;
          setSearchTerm(partyName);
          setShowSuggestions(false);
          setHighlightedIndex(-1);
          onPartySelect(partyName);
        } else if (searchTerm.trim()) {
          // If no suggestions but has text, use the typed text
          onPartySelect(searchTerm.trim());
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setHighlightedIndex(-1);
        break;
    }
  }, [showSuggestions, filteredParties, highlightedIndex, onPartySelect]);

  // Handle auto-complete
  const handleAutoComplete = useCallback(() => {
    if (showInlineSuggestion && autoCompleteText) {
      const matchingParty = filteredParties.find(party => {
        const partyName = (party.party_name || party.name || '').toLowerCase();
        return partyName.startsWith(searchTerm.toLowerCase());
      });
      
      if (matchingParty) {
        const partyName = matchingParty.party_name || matchingParty.name;
        setSearchTerm(partyName);
        setShowSuggestions(false);
        setHighlightedIndex(-1);
        onPartySelect(partyName);
      }
    }
  }, [showInlineSuggestion, autoCompleteText, filteredParties, searchTerm, onPartySelect]);

  // Handle suggestion click
  const handleSuggestionClick = useCallback((party: Party) => {
    const partyName = party.party_name || party.name;
    setSearchTerm(partyName);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    onPartySelect(partyName);
  }, [onPartySelect]);

  // Handle focus
  const handleFocus = useCallback(() => {
    setShowSuggestions(true);
    if (searchTerm.length > 0) {
      filterParties(searchTerm);
    } else {
      // Show all available parties when focusing on empty input
      let availableParties = parties;
      if (excludeCurrentParty && currentPartyName) {
        availableParties = parties.filter(party => 
          (party.party_name || party.name) !== currentPartyName
        );
      }
      setFilteredParties(availableParties);
    }
  }, [searchTerm, parties, excludeCurrentParty, currentPartyName, filterParties]);

  // Handle blur
  const handleBlur = useCallback(() => {
    // Delay hiding suggestions to allow clicks
    setTimeout(() => {
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    }, 200);
  }, []);

  // Reset function
  const reset = useCallback(() => {
    setSearchTerm('');
    setFilteredParties(parties);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    setAutoCompleteText('');
    setShowInlineSuggestion(false);
  }, [parties]);

  return {
    searchTerm,
    filteredParties,
    showSuggestions,
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
    handleBlur,
    reset
  };
};
