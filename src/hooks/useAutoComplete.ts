import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Party } from '@/types';
import { debounce } from 'lodash';

interface UseAutoCompleteProps {
  parties: Party[];
  onPartySelect: (partyName: string) => void;
  excludeCurrentParty?: boolean;
  currentPartyName?: string;
  maxSuggestions?: number;
  enableFuzzySearch?: boolean;
  enableSmartMatching?: boolean;
}

interface SearchResult {
  party: Party;
  score: number;
  matchType: 'exact' | 'startsWith' | 'contains' | 'fuzzy';
  highlightedText: string;
}

export const useAutoComplete = ({
  parties,
  onPartySelect,
  excludeCurrentParty = false,
  currentPartyName = '',
  maxSuggestions = 10,
  enableFuzzySearch = true,
  enableSmartMatching = true
}: UseAutoCompleteProps) => {
  const [searchTerm, setSearchTerm] = useState(currentPartyName);
  const [filteredParties, setFilteredParties] = useState<Party[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [autoCompleteText, setAutoCompleteText] = useState('');
  const [showInlineSuggestion, setShowInlineSuggestion] = useState(false);
  const [textWidth, setTextWidth] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Update search term when currentPartyName changes - but only if it's not empty
  useEffect(() => {
    if (currentPartyName && currentPartyName.trim() !== '') {
      setSearchTerm(currentPartyName);
    }
  }, [currentPartyName]);

  // Trigger search when search term changes
  useEffect(() => {
    if (searchTerm !== undefined) {
      filterParties(searchTerm);
    }
  }, [searchTerm]); // Removed filterParties dependency to prevent infinite loop

  // Fuzzy search implementation
  const fuzzySearch = useCallback((text: string, query: string): number => {
    if (!query) return 0;
    
    const textLower = text.toLowerCase();
    const queryLower = query.toLowerCase();
    
    // Exact match gets highest score
    if (textLower === queryLower) return 100;
    
    // Starts with gets high score
    if (textLower.startsWith(queryLower)) return 90;
    
    // Contains gets medium score
    if (textLower.includes(queryLower)) return 70;
    
    // Fuzzy matching
    let score = 0;
    let queryIndex = 0;
    
    for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
      if (textLower[i] === queryLower[queryIndex]) {
        score += 10;
        queryIndex++;
      }
    }
    
    // Bonus for consecutive matches
    if (queryIndex === queryLower.length) {
      score += 20;
    }
    
    return score;
  }, []);

  // Highlight matching text
  const highlightText = useCallback((text: string, query: string): string => {
    if (!query) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200 font-semibold">$1</mark>');
  }, []);

  // Enhanced search with fuzzy matching and smart scoring
  const performSearch = useCallback((searchTerm: string): SearchResult[] => {
    const startTime = performance.now();
    
    let availableParties = parties;
    
    if (excludeCurrentParty && currentPartyName) {
      availableParties = parties.filter(party => 
        (party.party_name || party.name) !== currentPartyName
      );
    }
    
    if (!searchTerm.trim()) {
      const results = availableParties.slice(0, maxSuggestions).map(party => ({
        party,
        score: 0,
        matchType: 'exact' as const,
        highlightedText: party.party_name || party.name || ''
      }));
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      return results;
    }
    
    const results: SearchResult[] = [];
    const searchLower = searchTerm.toLowerCase();
    
    for (const party of availableParties) {
      const partyName = party.party_name || party.name || '';
      const companyName = party.companyName || '';
      
      let bestScore = 0;
      let bestMatchType: 'exact' | 'startsWith' | 'contains' | 'fuzzy' = 'fuzzy';
      let highlightedText = partyName;
      
      // Check party name
      const partyScore = fuzzySearch(partyName, searchTerm);
      if (partyScore > bestScore) {
        bestScore = partyScore;
        if (partyName.toLowerCase() === searchLower) bestMatchType = 'exact';
        else if (partyName.toLowerCase().startsWith(searchLower)) bestMatchType = 'startsWith';
        else if (partyName.toLowerCase().includes(searchLower)) bestMatchType = 'contains';
        else bestMatchType = 'fuzzy';
        highlightedText = highlightText(partyName, searchTerm);
      }
      
      // Check company name if enabled
      if (enableSmartMatching && companyName) {
        const companyScore = fuzzySearch(companyName, searchTerm);
        if (companyScore > bestScore) {
          bestScore = companyScore;
          if (companyName.toLowerCase() === searchLower) bestMatchType = 'exact';
          else if (companyName.toLowerCase().startsWith(searchLower)) bestMatchType = 'startsWith';
          else if (companyName.toLowerCase().includes(searchLower)) bestMatchType = 'contains';
          else bestMatchType = 'fuzzy';
          highlightedText = `${partyName} <span class="text-gray-500">(${highlightText(companyName, searchTerm)})</span>`;
        }
      }
      
      // Only include results with meaningful scores
      if (bestScore > 0) {
        results.push({
          party,
          score: bestScore,
          matchType: bestMatchType,
          highlightedText
        });
      }
    }
    
    // Sort by score (highest first), then by match type priority, then alphabetically
    results.sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      
      const typePriority = { exact: 4, startsWith: 3, contains: 2, fuzzy: 1 };
      if (typePriority[a.matchType] !== typePriority[b.matchType]) {
        return typePriority[b.matchType] - typePriority[a.matchType];
      }
      
      return (a.party.party_name || a.party.name || '').localeCompare(b.party.party_name || b.party.name || '');
    });
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    return results.slice(0, maxSuggestions);
  }, [parties, excludeCurrentParty, currentPartyName, maxSuggestions, enableSmartMatching, fuzzySearch, highlightText]);

  // Debounced search function - Reduced delay for instant response
  const debouncedSearch = useMemo(
    () => debounce((searchTerm: string) => {
      setIsSearching(true);
      const results = performSearch(searchTerm);
      setSearchResults(results);
      setFilteredParties(results.map(r => r.party));
      setHighlightedIndex(-1);
      
      // Auto-complete suggestion
      if (results.length > 0) {
        const bestMatch = results[0];
        const partyName = bestMatch.party.party_name || bestMatch.party.name || '';
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
      
      setIsSearching(false);
    }, 50), // Reduced from 150ms to 50ms for instant response
    [performSearch]
  );

  // Filter parties based on search term - Enhanced like old version
  const filterParties = useCallback((searchTerm: string) => {
    filterPartiesGeneric(parties, searchTerm, false);
  }, [parties]);

  // Filter top parties - Like old version
  const filterTopParties = useCallback((searchTerm: string) => {
    filterPartiesGeneric(parties, searchTerm, true);
  }, [parties]);

  // Generic party filtering function - Like old version
  const filterPartiesGeneric = useCallback((partiesList: Party[], searchTerm: string, isTopSection: boolean) => {
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Set loading state
    setIsSearching(true);
    
    // Debounce the search - Reduced delay for instant response
    searchTimeoutRef.current = setTimeout(() => {
      debouncedSearch(searchTerm);
    }, 25); // Reduced from 50ms to 25ms for instant response
  }, [debouncedSearch]);

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
        // Clear auto-complete hint on Enter
        setAutoCompleteText('');
        setShowInlineSuggestion(false);
        
        if (highlightedIndex >= 0 && highlightedIndex < filteredParties.length) {
          // Select highlighted suggestion
          const selectedParty = filteredParties[highlightedIndex];
          const partyName = selectedParty.party_name || selectedParty.name;
          setSearchTerm(partyName);
          setShowSuggestions(false);
          setHighlightedIndex(-1);
          onPartySelect(partyName);
          
          // Move focus to amount field after party selection
          setTimeout(() => {
            const amountField = document.querySelector('input[placeholder*="+10000 for Credit"]') as HTMLInputElement;
            if (amountField) {
              amountField.focus();
            }
          }, 100);
        } else if (filteredParties.length > 0) {
          // Select first suggestion if none highlighted
          const firstParty = filteredParties[0];
          const partyName = firstParty.party_name || firstParty.name;
          setSearchTerm(partyName);
          setShowSuggestions(false);
          setHighlightedIndex(-1);
          onPartySelect(partyName);
          
          // Move focus to amount field after party selection
          setTimeout(() => {
            const amountField = document.querySelector('input[placeholder*="+10000 for Credit"]') as HTMLInputElement;
            if (amountField) {
              amountField.focus();
            }
          }, 100);
        } else if (searchTerm.trim()) {
          // If no suggestions but has text, use the typed text
          onPartySelect(searchTerm.trim());
          
          // Move focus to amount field after party selection
          setTimeout(() => {
            const amountField = document.querySelector('input[placeholder*="+10000 for Credit"]') as HTMLInputElement;
            if (amountField) {
              amountField.focus();
            }
          }, 100);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setHighlightedIndex(-1);
        break;
    }
  }, [showSuggestions, filteredParties, highlightedIndex, onPartySelect]);

  // Handle auto-complete - Enhanced like old version
  const handleAutoComplete = useCallback(() => {
    handleAutoCompleteGeneric(false);
  }, [showInlineSuggestion, autoCompleteText, filteredParties, searchTerm, onPartySelect]);

  // Handle tab complete - Like old version
  const handleTabComplete = useCallback(() => {
    handleTabCompleteGeneric(false);
  }, [showInlineSuggestion, autoCompleteText, filteredParties, searchTerm, onPartySelect]);

  // Handle top auto-complete - Like old version
  const handleTopAutoComplete = useCallback(() => {
    handleAutoCompleteGeneric(true);
  }, [showInlineSuggestion, autoCompleteText, filteredParties, searchTerm, onPartySelect]);

  // Handle top tab complete - Like old version
  const handleTopTabComplete = useCallback(() => {
    handleTabCompleteGeneric(true);
  }, [showInlineSuggestion, autoCompleteText, filteredParties, searchTerm, onPartySelect]);

  // Generic auto-complete function - Like old version
  const handleAutoCompleteGeneric = useCallback((isTopSection: boolean = false) => {
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

  // Generic tab complete function - Like old version
  const handleTabCompleteGeneric = useCallback((isTopSection: boolean = false) => {
    if (filteredParties.length > 0) {
      const selectedParty = isTopSection ? filteredParties[0] : filteredParties[highlightedIndex >= 0 ? highlightedIndex : 0];
      if (selectedParty) {
        const partyName = selectedParty.party_name || selectedParty.name;
        setSearchTerm(partyName);
        setShowSuggestions(false);
        setHighlightedIndex(-1);
        onPartySelect(partyName);
      }
    }
  }, [filteredParties, highlightedIndex, onPartySelect]);

  // Handle suggestion click
  const handleSuggestionClick = useCallback((party: Party) => {
    const partyName = party.party_name || party.name;
    setSearchTerm(partyName);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    // Clear auto-complete hint on click
    setAutoCompleteText('');
    setShowInlineSuggestion(false);
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
      // Clear auto-complete hint on blur
      setAutoCompleteText('');
      setShowInlineSuggestion(false);
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

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return {
    searchTerm,
    filteredParties,
    searchResults,
    showSuggestions,
    highlightedIndex,
    autoCompleteText,
    showInlineSuggestion,
    textWidth,
    isSearching,
    inputRef,
    handleInputChange,
    handleKeyDown,
    handleAutoComplete,
    handleTabComplete,
    handleTopAutoComplete,
    handleTopTabComplete,
    handleAutoCompleteGeneric,
    handleTabCompleteGeneric,
    filterParties,
    filterTopParties,
    filterPartiesGeneric,
    handleSuggestionClick,
    handleFocus,
    handleBlur,
    reset,
    // Enhanced features
    performSearch,
    highlightText,
    fuzzySearch
  };
};
