import React, { useState, useCallback, useEffect, useMemo, memo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import TopNavigation from '@/components/TopNavigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { newPartyAPI, partyLedgerAPI, userSettingsAPI } from '@/lib/api';
import { Party, LedgerEntry, LedgerData } from '@/types';
import { debounce } from 'lodash'; // Add lodash for debouncing
import { clearCacheByPattern } from '@/lib/apiCache';
import { useCompanyName } from '@/hooks/useCompanyName';
import { 
  isCompanyParty, 
  isCommissionParty,
  isMondayFinalAllowed, 
  isPartyEditingAllowed, 
  isPartyDeletionAllowed, 
  isTransactionAdditionAllowed,
  getCompanyPartyRestrictionMessage,
  getCommissionPartyRestrictionMessage
} from '@/lib/companyPartyUtils';

// Memoized table row component for performance
const TableRow = memo(({ 
  entry, 
  index, 
  isSelected, 
  onCheckboxChange 
}: { 
  entry: any; 
  index: number; 
  isSelected: boolean; 
  onCheckboxChange: (id: string | number, checked: boolean) => void; 
}) => {
  const entryId = entry.id || entry._id || entry.ti || `entry_${index}`;
  
  return (
    <tr 
      className={`hover:bg-blue-50 cursor-pointer transition-colors duration-150 ${
        isSelected ? 'bg-blue-100' : ''
      } ${entry.is_old_record ? 'bg-gray-50 opacity-75' : ''}`}
      onClick={() => onCheckboxChange(entryId, !isSelected)}
    >
      <td className="px-4 py-3 text-gray-700">
        {new Date(entry.date).toLocaleDateString('en-GB')}
      </td>
      <td className="px-4 py-3 text-gray-800 font-medium">
        <div className="flex items-center space-x-2">
          <span>{entry.remarks}</span>
          {entry.is_old_record && (
            <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full font-medium">
              Old Record
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-center">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          entry.tnsType === 'CR' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {entry.tnsType}
        </span>
      </td>
      <td className="px-4 py-3 text-center font-medium text-green-600">
        {entry.credit || 0}
      </td>
      <td className="px-4 py-3 text-center font-medium text-red-600">
        {entry.debit || 0}
      </td>
      <td className="px-4 py-3 text-center font-semibold">
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          (entry.balance || 0) > 0 
            ? 'bg-green-100 text-green-800' 
            : (entry.balance || 0) < 0 
              ? 'bg-red-100 text-red-800'
              : 'bg-gray-100 text-gray-800'
        }`}>
          ₹{(entry.balance || 0).toLocaleString()}
        </span>
      </td>
      <td className="px-4 py-3 text-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onCheckboxChange(entryId, e.target.checked)}
          onClick={(e) => e.stopPropagation()}
          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
        />
      </td>
      <td className="px-4 py-3 text-center text-gray-500 text-xs">
        {entry.ti || index}
      </td>
    </tr>
  );
});

TableRow.displayName = 'TableRow';

const AccountLedger = () => {
  // Performance monitoring
  useEffect(() => {
    console.log('🔥 CONSOLE LOG TEST - AccountLedger page loaded!');
    const startTime = performance.now();
    console.log('🚀 AccountLedger page started loading...');
    
    return () => {
      const endTime = performance.now();
      console.log(`✅ AccountLedger page loaded in ${(endTime - startTime).toFixed(2)}ms`);
    };
  }, []);
  // Router hooks for navigation and URL parameters
  const { partyName: initialPartyName } = useParams<{ partyName: string }>();
  const navigate = useNavigate();
  
  // Toast notification hook for user feedback
  const { toast } = useToast();
  
  // Loading states for better user experience
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [partiesLoading, setPartiesLoading] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);
  
  // Party selection state
  const [selectedPartyName, setSelectedPartyName] = useState(initialPartyName || 'Test Company 1');
  const [typingPartyName, setTypingPartyName] = useState(initialPartyName || 'Test Company 1');
  const [availableParties, setAvailableParties] = useState<Party[]>([]);
  
  // Handle URL parameter changes
  useEffect(() => {
    if (initialPartyName && initialPartyName !== selectedPartyName) {
      const decodedPartyName = decodeURIComponent(initialPartyName);
      setSelectedPartyName(decodedPartyName);
      setTypingPartyName(decodedPartyName);
    }
  }, [initialPartyName, selectedPartyName]);
  
  // Main ledger data state
  const [ledgerData, setLedgerData] = useState<{
    ledgerEntries: LedgerEntry[];
    oldRecords: LedgerEntry[];
    closingBalance: number;
    summary: {
      totalCredit: number;
      totalDebit: number;
      calculatedBalance: number;
      totalEntries: number;
    };
    mondayFinalData: {
      transactionCount: number;
      totalCredit: number;
      totalDebit: number;
      startingBalance: number;
      finalBalance: number;
    };
  } | null>(null);
  
  // UI State Management
  const [showOldRecords, setShowOldRecords] = useState(false);
  const [showMondayFinalModal, setShowMondayFinalModal] = useState(false);
  const [showModifyModal, setShowModifyModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  // Removed tableRefreshKey and forceUpdate to prevent unnecessary re-renders
  
  // State for new entry
  const [newEntry, setNewEntry] = useState({
    amount: '',
    partyName: '', // Separate field for party name - ALWAYS EMPTY for new transactions
    remarks: '',   // Separate field for remarks
  });

  // State for parties dropdown (bottom section)
  const [showPartyDropdown, setShowPartyDropdown] = useState(false);
  const [filteredParties, setFilteredParties] = useState<Party[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isTyping, setIsTyping] = useState(false);
  const [autoCompleteText, setAutoCompleteText] = useState('');
  const [showInlineSuggestion, setShowInlineSuggestion] = useState(false);
  const [inputRef, setInputRef] = useState<HTMLInputElement | null>(null);
  const [textWidth, setTextWidth] = useState(0);
  
  // State for top section dropdown
  const [showTopPartyDropdown, setShowTopPartyDropdown] = useState(false);
  const [filteredTopParties, setFilteredTopParties] = useState<Party[]>([]);
  const [editingEntry, setEditingEntry] = useState<LedgerEntry | null>(null);
  const [topAutoCompleteText, setTopAutoCompleteText] = useState('');
  const [showTopInlineSuggestion, setShowTopInlineSuggestion] = useState(false);
  const [topInputRef, setTopInputRef] = useState<HTMLInputElement | null>(null);
  const [topTextWidth, setTopTextWidth] = useState(0);
  const [entryToDelete, setEntryToDelete] = useState<LedgerEntry | null>(null);
  
  // Selected entries for bulk operations
  const [selectedEntries, setSelectedEntries] = useState<string[]>([]);
  
  // Track if user manually entered commission amount
  const [isManualCommissionAmount, setIsManualCommissionAmount] = useState(false);
  
  // Company name from global hook
  const { companyName } = useCompanyName();

  // Load available parties for dropdown
  const loadAvailableParties = useCallback(async () => {
    // Prevent multiple simultaneous calls
    if (partiesLoading) {
      console.log('⏳ Parties already loading, skipping...');
      return;
    }
    
    const startTime = performance.now();
    console.log('🚀 FUNCTION: loadAvailableParties started...');
    
    setPartiesLoading(true);
    try {
      const response = await partyLedgerAPI.getAllParties();
      if (response.success) {
        const endTime = performance.now();
        const duration = endTime - startTime;
        console.log(`✅ FUNCTION: loadAvailableParties completed in ${duration.toFixed(2)}ms`);
        console.log(`📊 PARTIES: Loaded ${response.data.length} parties`);
        
        // Map backend party data to frontend Party type
        const mappedParties = (response.data || []).map((party: any) => ({
          _id: party.id || party._id,
          name: party.name || party.party_name || party.partyName, // Support multiple field names
          party_name: party.party_name || party.partyName, // Keep original for compatibility
          srNo: party.sr_no || party.srNo,
          status: party.status || 'A',
          mCommission: party.mCommission || party.m_commission || 'No Commission',
          rate: party.rate || '0',
          commiSystem: party.commiSystem || party.commi_system || 'Take',
          mondayFinal: party.mondayFinal || party.monday_final || 'No',
          companyName: party.companyName || party.company_name || party.party_name || party.partyName
        }));
      
      // Create virtual parties with current company account
      const createVirtualParties = () => {
        const virtualParties = [
          {
            _id: 'virtual_commission',
            name: 'Commission',
            srNo: 999,
            status: 'Active',
            mCommission: 'With Commission',
            rate: '3',
            commiSystem: 'Take',
            mondayFinal: 'No' as 'No'
          }
        ];
        
        // Only add virtual company party if real company party doesn't exist
        const companyPartyExists = mappedParties.some(party => 
          party.name === companyName || party.party_name === companyName
        );
        
        if (!companyPartyExists && companyName !== 'Company') {
          virtualParties.push({
            _id: 'virtual_company',
            name: companyName,
            srNo: 998,
            status: 'Active',
            mCommission: 'With Commission',
            rate: '1',
            commiSystem: 'Give',
            mondayFinal: 'No' as 'No'
          });
          console.log(`🔄 Added virtual company party: ${companyName}`);
        } else if (companyPartyExists) {
          console.log(`ℹ️ Real company party exists, skipping virtual: ${companyName}`);
        }
        
        return virtualParties;
      };
      
      // Add virtual parties (Commission and Company) for transaction creation
      const virtualParties = createVirtualParties();
      
        // Combined parties for different purposes
        const allPartiesWithVirtual = [...mappedParties, ...virtualParties];
        
        setAvailableParties(mappedParties); // Only real parties for top selection
        setAllPartiesForTransaction(allPartiesWithVirtual); // Store all parties for transaction dropdown
        setFilteredParties(allPartiesWithVirtual); // All parties (including virtual) for bottom dropdown
        setFilteredTopParties(mappedParties); // Only real parties for top dropdown
      }
    } catch (error: any) {
      console.error('❌ Load parties error:', error);
      toast({
        title: "Error",
        description: "Failed to load parties",
        variant: "destructive"
      });
    } finally {
      setPartiesLoading(false);
    }
  }, [companyName]);

  // State for storing all parties including virtual ones for bottom dropdown
  const [allPartiesForTransaction, setAllPartiesForTransaction] = useState<Party[]>([]);

  // Update virtual parties when company account changes
  const updateVirtualParties = useCallback(() => {
    if (allPartiesForTransaction.length > 0) {
      // Find and update the virtual company party
      const updatedParties = allPartiesForTransaction.map(party => {
        if (party._id === 'virtual_company') {
          return {
            ...party,
            name: companyName
          };
        }
        return party;
      });
      
      setAllPartiesForTransaction(updatedParties);
      setFilteredParties(updatedParties);
    }
  }, [companyName]);

  // Update virtual parties when company account changes
  useEffect(() => {
    if (companyName !== 'Company' && allPartiesForTransaction.length > 0) {
      updateVirtualParties();
    }
  }, [companyName, updateVirtualParties]);

  // Filter parties based on search input (bottom section) - Exclude current party
  const filterParties = useCallback((searchTerm: string) => {
    // Always exclude current party from bottom dropdown
    const availablePartiesExcludingCurrent = allPartiesForTransaction.filter(party => 
      (party.party_name || party.name) !== selectedPartyName
    );
    
    if (!searchTerm.trim()) {
      setFilteredParties(availablePartiesExcludingCurrent);
      setHighlightedIndex(-1);
      setAutoCompleteText('');
      setShowInlineSuggestion(false);
      return;
    }
    
    const filtered = availablePartiesExcludingCurrent.filter(party => {
      const partyName = (party.party_name || party.name || '').toLowerCase();
      const searchLower = searchTerm.toLowerCase();
      
      // Better matching: starts with, then contains
      return partyName.startsWith(searchLower) || partyName.includes(searchLower);
    }).sort((a, b) => {
      const aName = (a.party_name || a.name || '').toLowerCase();
      const bName = (b.party_name || b.name || '').toLowerCase();
      const searchLower = searchTerm.toLowerCase();
      
      // Sort by: starts with first, then alphabetically
      const aStartsWith = aName.startsWith(searchLower);
      const bStartsWith = bName.startsWith(searchLower);
      
      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;
      return aName.localeCompare(bName);
    });
    setFilteredParties(filtered);
    setHighlightedIndex(0); // Highlight first suggestion
    
    // VS Code style auto-complete: Find best match for inline suggestion (case insensitive)
    if (filtered.length > 0) {
      const bestMatch = filtered[0];
      const partyName = bestMatch.party_name || bestMatch.name || '';
      const searchLower = searchTerm.toLowerCase();
      const partyLower = partyName.toLowerCase();
      
      
      if (partyLower.startsWith(searchLower) && partyLower !== searchLower) {
        // Find the actual position where the match starts (case insensitive)
        const matchIndex = partyName.toLowerCase().indexOf(searchLower);
        if (matchIndex === 0) {
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
    } else {
      setAutoCompleteText('');
      setShowInlineSuggestion(false);
    }
  }, [allPartiesForTransaction, selectedPartyName]);

  // Filter parties for top section dropdown - Exclude current party
  const filterTopParties = useCallback((searchTerm: string) => {
    // Always exclude current party from top dropdown
    const availablePartiesExcludingCurrent = availableParties.filter(party => 
      (party.party_name || party.name) !== selectedPartyName
    );
    
    if (!searchTerm.trim()) {
      // Show available parties (excluding current) when no search term
      setFilteredTopParties(availablePartiesExcludingCurrent);
      setTopAutoCompleteText('');
      setShowTopInlineSuggestion(false);
      return;
    }
    
    // Filter parties based on search term (excluding current) - improved matching
    const filtered = availablePartiesExcludingCurrent.filter(party => {
      const partyName = (party.party_name || party.name || '').toLowerCase();
      const companyName = (party.companyName || '').toLowerCase();
      const searchLower = searchTerm.toLowerCase();
      
      // Better matching: starts with, then contains
      return partyName.startsWith(searchLower) || partyName.includes(searchLower) ||
             companyName.startsWith(searchLower) || companyName.includes(searchLower);
    }).sort((a, b) => {
      const aName = (a.party_name || a.name || '').toLowerCase();
      const bName = (b.party_name || b.name || '').toLowerCase();
      const searchLower = searchTerm.toLowerCase();
      
      // Sort by: starts with first, then alphabetically
      const aStartsWith = aName.startsWith(searchLower);
      const bStartsWith = bName.startsWith(searchLower);
      
      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;
      return aName.localeCompare(bName);
    });
    setFilteredTopParties(filtered);
    
    // VS Code style auto-complete: Find best match for inline suggestion (case insensitive)
    if (filtered.length > 0) {
      const bestMatch = filtered[0];
      const partyName = bestMatch.party_name || bestMatch.name || '';
      const searchLower = searchTerm.toLowerCase();
      const partyLower = partyName.toLowerCase();
      
      if (partyLower.startsWith(searchLower) && partyLower !== searchLower) {
        // Find the actual position where the match starts (case insensitive)
        const matchIndex = partyName.toLowerCase().indexOf(searchLower);
        if (matchIndex === 0) {
          const autoCompleteText = partyName.substring(searchTerm.length);
          setTopAutoCompleteText(autoCompleteText);
          setShowTopInlineSuggestion(true);
        } else {
          setTopAutoCompleteText('');
          setShowTopInlineSuggestion(false);
        }
      } else {
        setTopAutoCompleteText('');
        setShowTopInlineSuggestion(false);
      }
    } else {
      setTopAutoCompleteText('');
      setShowTopInlineSuggestion(false);
    }
  }, [availableParties, selectedPartyName]);

  // Handle party selection from dropdown (bottom section)
  const handlePartySelect = (partyName: string) => {
    const startTime = performance.now();
    console.log(`🚀 ACTION: handlePartySelect started for ${partyName}...`);
    
    setNewEntry(prev => ({ ...prev, partyName }));
    setShowPartyDropdown(false);
    
    // Reset manual commission flag
    setIsManualCommissionAmount(false);
    
    // Auto-calculate commission if "Commission" is selected from dropdown
    if (partyName.toLowerCase().trim() === 'commission') {
      calculateCommissionAmount(partyName);
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    console.log(`✅ ACTION: handlePartySelect completed in ${duration.toFixed(2)}ms`);
  };

  // Handle party selection from top dropdown
  const handleTopPartySelect = (partyName: string) => {
    handlePartyChange(partyName);
    setShowTopPartyDropdown(false);
    
    // ALWAYS clear bottom form when selecting party from top dropdown
    setNewEntry({
      amount: '',
      partyName: '', // ALWAYS EMPTY - for new transactions
      remarks: ''
    });
  };



  // Calculate commission amount (extracted function)
  const calculateCommissionAmount = useCallback((partyNameValue: string) => {
    if (!ledgerData) {
      toast({
        title: "No Data",
        description: "No ledger data available for commission calculation",
        variant: "destructive"
      });
      return;
    }

    // Auto-calculate commission amount if party name is "commission"
    if (partyNameValue.toLowerCase().trim() === 'commission') {
      // Get all entries (current + old records) to find the last NON-COMMISSION transaction
      const allEntries = [...ledgerData.ledgerEntries, ...ledgerData.oldRecords];
      
      // Filter out commission transactions to find the last regular transaction
      const nonCommissionEntries = allEntries.filter(entry => 
        !entry.remarks.toLowerCase().includes('commission') &&
        entry.tnsType !== 'Monday Settlement'
      );
      
      if (nonCommissionEntries.length > 0) {
        // Sort by date and creation time to get the most recent non-commission entry
        const sortedEntries = nonCommissionEntries.sort((a, b) => {
          const dateA = new Date(a.date);
          const dateB = new Date(b.date);
          if (dateA.getTime() !== dateB.getTime()) {
            return dateA.getTime() - dateB.getTime();
          }
          return 0;
        });
        
        const lastEntry = sortedEntries[sortedEntries.length - 1];
        const lastAmount = Math.abs(lastEntry.credit || lastEntry.debit || 0);
        
        // Find the selected party to get commission settings
        const selectedParty = allPartiesForTransaction.find(party => party.name === selectedPartyName);
        
        if (selectedParty) {
          // Calculate commission based on selected party settings (not Commission party)
          let commissionAmount = 0;
          let commissionRate = 0;
          
          if (selectedParty.mCommission === 'With Commission' && selectedParty.rate) {
            commissionRate = parseFloat(selectedParty.rate) || 0;
            // Calculate raw commission amount
            const rawCommission = (lastAmount * commissionRate) / 100;
            
            // Apply standard rounding logic: >= 0.5 round up, < 0.5 round down
            commissionAmount = Math.round(rawCommission);
            
            // Ensure minimum commission is 1 if rate > 0
            if (commissionAmount < 1 && rawCommission > 0) {
              commissionAmount = 1;
            }
          } else {
            // Default to 3% if no commission settings
            const rawCommission = lastAmount * 0.03;
            
            // Apply standard rounding logic: >= 0.5 round up, < 0.5 round down
            commissionAmount = Math.round(rawCommission);
            
            // Ensure minimum commission is 1 if amount > 0
            if (commissionAmount < 1 && rawCommission > 0) {
              commissionAmount = 1;
            }
            
            commissionRate = 3;
          }
          
          // Ensure commission amount is a whole number (double-check)
          commissionAmount = Math.round(commissionAmount);
          
          // Set commission amount based on selected party's commission system
          let finalAmount = 0;
          if (selectedParty.commiSystem === 'Take') {
            // Take System: Company takes commission from party → Party debit (negative)
            finalAmount = -commissionAmount;
          } else if (selectedParty.commiSystem === 'Give') {
            // Give System: Company gives commission to party → Party credit (positive)
            finalAmount = commissionAmount;
          } else {
            // Default system: opposite logic based on last transaction
            finalAmount = lastEntry.tnsType === 'CR' ? -commissionAmount : commissionAmount;
          }
          
          setNewEntry(prev => {
            const updated = { 
              ...prev, 
              partyName: partyNameValue,
              amount: finalAmount.toString()
            };
            return updated;
          });
          
          // Mark as auto-calculated (not manual)
          setIsManualCommissionAmount(false);
          
          toast({
            title: "Commission Auto-Calculated",
            description: `Commission amount: ₹${commissionAmount} (${commissionRate}% of ₹${lastAmount}) - Rounded using standard rounding: >= 0.5 = round up, < 0.5 = round down`,
          });
        } else {
          toast({
            title: "Party Not Found",
            description: "Could not find party commission settings",
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "No Regular Transactions",
          description: "No non-commission transactions found for commission calculation",
          variant: "destructive"
        });
      }
    } else {
      toast({
        title: "No Transactions Found",
        description: "No previous transactions found for commission calculation",
        variant: "destructive"
      });
    }
  }, [ledgerData, selectedPartyName, allPartiesForTransaction]);

  // Handle party name change and auto-calculate commission
  const handlePartyNameChange = (value: string) => {
    setNewEntry(prev => ({ ...prev, partyName: value }));
    setIsTyping(true);
    
    // Calculate text width for proper positioning
    if (inputRef) {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (context) {
        context.font = window.getComputedStyle(inputRef).font;
        const width = context.measureText(value).width;
        setTextWidth(width);
      }
    }
    
    // Reset manual commission flag when party changes
    setIsManualCommissionAmount(false);
    
    // Auto-calculate commission when typing "commission"
    if (value.toLowerCase().trim() === 'commission') {
      calculateCommissionAmount(value);
      // Clear any existing amount when switching to commission
      setNewEntry(prev => ({ ...prev, amount: '' }));
    }
  };

  // Auto-complete functionality
  const handleAutoComplete = () => {
    if (filteredParties.length > 0 && highlightedIndex >= 0) {
      const selectedParty = filteredParties[highlightedIndex];
      const partyName = selectedParty.party_name || selectedParty.name;
      setNewEntry(prev => ({ ...prev, partyName }));
      setShowPartyDropdown(false);
      setHighlightedIndex(-1);
      setIsTyping(false);
      setAutoCompleteText('');
      setShowInlineSuggestion(false);
      
      // Auto-fill commission if commission is selected
      if (partyName.toLowerCase().trim() === 'commission') {
        handleCommissionAutoFill();
      }
    }
  };

  // VS Code style Tab completion
  const handleTabComplete = () => {
    if (showInlineSuggestion && autoCompleteText) {
      // Find the matching party from filteredParties to get original case
      const matchingParty = filteredParties.find(party => {
        const partyName = party.party_name || party.name;
        return partyName.toLowerCase().startsWith(newEntry.partyName.toLowerCase());
      });
      
      if (matchingParty) {
        // Use original party name from database (proper case)
        const originalPartyName = matchingParty.party_name || matchingParty.name;
        setNewEntry(prev => ({ ...prev, partyName: originalPartyName }));
      } else {
        // Fallback to concatenation if no match found
        const currentValue = newEntry.partyName;
        const completedValue = currentValue + autoCompleteText;
        setNewEntry(prev => ({ ...prev, partyName: completedValue }));
      }
      
      setAutoCompleteText('');
      setShowInlineSuggestion(false);
      setShowPartyDropdown(false);
      
      // Auto-fill commission if commission is selected
      const finalPartyName = matchingParty ? (matchingParty.party_name || matchingParty.name) : (newEntry.partyName + autoCompleteText);
      if (finalPartyName.toLowerCase().trim() === 'commission') {
        handleCommissionAutoFill();
      }
    }
  };

  // Top section auto-complete functionality
  const handleTopAutoComplete = () => {
    if (filteredTopParties.length > 0) {
      const selectedParty = filteredTopParties[0];
      const partyName = selectedParty.party_name || selectedParty.name;
      setTypingPartyName(partyName);
      setShowTopPartyDropdown(false);
      setTopAutoCompleteText('');
      setShowTopInlineSuggestion(false);
    }
  };

  // Top section Tab completion
  const handleTopTabComplete = () => {
    if (showTopInlineSuggestion && topAutoCompleteText) {
      // Find the original party name from the filtered parties to preserve case
      const originalParty = filteredTopParties[0];
      const originalPartyName = originalParty?.party_name || originalParty?.name || '';
      
      // Use the original party name instead of concatenating user input + auto-complete
      const completedValue = originalPartyName;
      setTypingPartyName(completedValue);
      setTopAutoCompleteText('');
      setShowTopInlineSuggestion(false);
      setShowTopPartyDropdown(false);
    }
  };

  // Helper function to format party display name
  const formatPartyDisplayName = (party: Party) => {
    return party.name;
  };

  // Helper function to extract party name from display format
  const extractPartyNameFromDisplay = (displayName: string) => {
    return displayName;
  };

  // Helper function to find party by display name
  const findPartyByDisplayName = (displayName: string) => {
    return availableParties.find(party => party.name === displayName);
  };

  // Load ledger data for selected party
  const loadLedgerData = useCallback(async (showLoading = true, forceRefresh = false) => {
    if (!selectedPartyName) return;
    
    // Prevent multiple simultaneous calls only if not forcing refresh
    if (loading && !forceRefresh) {
      console.log('⏳ Ledger data already loading, skipping...');
      return;
    }
    
    const startTime = performance.now();
    console.log(`🚀 FUNCTION: loadLedgerData started for ${selectedPartyName}... (forceRefresh: ${forceRefresh})`);
    
    if (showLoading || forceRefresh) {
      setLoading(true);
    }
    
    
    try {
      const response = await partyLedgerAPI.getPartyLedger(selectedPartyName);
      
      if (response.success && response.data) {
        const responseData = response.data as any; // Type assertion for API response
        
        // Transform backend data to frontend format
        const transformEntry = (entry: any) => ({
          id: entry.id || entry._id || entry.ti || '',
          partyName: entry.party_name || entry.partyName || '',
          date: entry.date || '',
          remarks: entry.remarks || '',
          tnsType: entry.tns_type || entry.tnsType || '',
          debit: parseFloat(entry.debit || 0),
          credit: parseFloat(entry.credit || 0),
          balance: parseFloat(entry.balance || 0),
          chk: entry.chk || false,
          ti: entry.ti || '',
          isOldRecord: entry.is_old_record || entry.isOldRecord || false,
          settlementDate: entry.settlement_date || entry.settlementDate || null,
          settlementMondayFinalId: entry.settlement_monday_final_id || entry.settlementMondayFinalId || null,
          createdAt: entry.created_at || entry.createdAt || '',
          updatedAt: entry.updated_at || entry.updatedAt || ''
        });

        // Optimized data transformation
        const transformedData: LedgerData = {
          ledgerEntries: (responseData.ledgerEntries || []).map(transformEntry),
          oldRecords: (responseData.oldRecords || []).map(transformEntry),
          closingBalance: responseData.closingBalance || 0,
          summary: {
            totalCredit: responseData.summary?.totalCredit || 0,
            totalDebit: responseData.summary?.totalDebit || 0,
            calculatedBalance: responseData.summary?.calculatedBalance || 0,
            totalEntries: responseData.summary?.totalEntries || 0
          },
          mondayFinalData: {
            transactionCount: responseData.mondayFinalData?.transactionCount || 0,
            totalCredit: responseData.mondayFinalData?.totalCredit || 0,
            totalDebit: responseData.mondayFinalData?.totalDebit || 0,
            startingBalance: responseData.mondayFinalData?.startingBalance || 0,
            finalBalance: responseData.mondayFinalData?.finalBalance || 0
          }
        };
        
        setLedgerData(transformedData);
        
        const endTime = performance.now();
        const duration = endTime - startTime;
        console.log(`✅ FUNCTION: loadLedgerData completed for ${selectedPartyName} in ${duration.toFixed(2)}ms`);
        console.log(`📊 LEDGER: Loaded ${transformedData.ledgerEntries.length} entries`);
        
        // Force UI update by triggering a re-render
        setForceUpdate(prev => prev + 1);
        
        // Auto-enable old records view if all transactions are settled
        if (transformedData.ledgerEntries.length === 0 && transformedData.oldRecords.length > 0) {
          setShowOldRecords(true);
        } else if (transformedData.ledgerEntries.length > 0) {
          // If there are current entries (like settlement transactions), show current records
          setShowOldRecords(false);
        }
        
        // Force table refresh after data update
        // Removed setTableRefreshKey to prevent unnecessary re-renders
      } else {
        console.error('❌ Failed to load ledger data:', {
          message: response.message,
          success: response.success,
          data: response.data,
          partyName: selectedPartyName
        });
        toast({
          title: "Error",
          description: response.message || "Failed to load ledger data",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('❌ Error loading ledger data:', {
        error: error.message,
        partyName: selectedPartyName,
        stack: error.stack
      });
      toast({
        title: "Error",
        description: "Failed to load ledger data",
        variant: "destructive"
      });
    } finally {
      // Always reset loading state when forceRefresh is true
      if (showLoading || forceRefresh) {
        setLoading(false);
      }
    }
  }, [selectedPartyName]);

  // Handle party change
  const handlePartyChange = (newPartyName: string) => {
    // Trim whitespace and validate
    const trimmedName = newPartyName.trim();
    if (!trimmedName) {
      toast({
        title: "Error",
        description: "Party name cannot be empty",
        variant: "destructive"
      });
      return;
    }
    
    // Extract actual party name from display format
    const actualPartyName = extractPartyNameFromDisplay(trimmedName);
    
    
    setSelectedPartyName(actualPartyName);
    setTypingPartyName(trimmedName); // Keep display format for typing
    
    // ALWAYS clear bottom form when changing parties
    setNewEntry({
      amount: '',
      partyName: '', // ALWAYS EMPTY - for new transactions
      remarks: ''
    });
    
    // Update URL to reflect selected party
    navigate(`/account-ledger/${encodeURIComponent(actualPartyName)}`);
    
    // Show success message for new party
    if (!availableParties.some(party => party.name.toLowerCase() === actualPartyName.toLowerCase())) {
      toast({
        title: "New Party",
        description: `Using "${actualPartyName}" as new party`,
      });
    }
  };

  // Handle commission auto-fill when commission is selected
  const handleCommissionAutoFill = () => {
    if (selectedPartyName) {
      const currentParty = allPartiesForTransaction.find(party => 
        party.name === selectedPartyName || party.party_name === selectedPartyName
      );
      
      if (currentParty && currentParty.mCommission === 'With Commission' && currentParty.rate) {
        const rate = parseFloat(currentParty.rate) || 0;
        if (rate > 0) {
          // Smart Commission Calculation based on Previous Transactions
          let totalTransactionAmount = 0;
          let transactionCount = 0;
          
          // Get current ledger entries for the selected party
          if (ledgerData && ledgerData.ledgerEntries) {
            
            const partyEntries = ledgerData.ledgerEntries.filter(entry => 
              (entry.partyName || entry.party_name) === selectedPartyName && 
              !entry.remarks?.includes('Monday Final Settlement') &&
              !entry.remarks?.includes('Monday Settlement')
              // Include Commission transactions for calculation
            );
            
            // Calculate total amount from previous transactions based on commission system
            // Take system → commission on incoming CR amounts
            // Give system → commission on outgoing DR amounts
            const isTakeSystem = currentParty.commiSystem === 'Take';
            const isGiveSystem = currentParty.commiSystem === 'Give';

            const baseTransactions = partyEntries.filter(entry => {
              const tType = entry.tnsType;
              const r = entry.remarks || '';
              if (r.includes('Monday Final Settlement') || r.includes('Monday Settlement')) return false;
              if (r === companyName || r === 'Commission') return false;
              return isTakeSystem ? tType === 'CR' : tType === 'DR';
            });

            totalTransactionAmount = baseTransactions.reduce((sum, entry) => {
              return sum + (isTakeSystem ? (entry.credit || 0) : (entry.debit || 0));
            }, 0);
            transactionCount = baseTransactions.length;
          }
          
          // Calculate commission based on total transaction amount
          const rawCommission = (totalTransactionAmount * rate) / 100;
          
          // Apply standard rounding logic: >= 0.5 round up, < 0.5 round down
          const commissionAmount = Math.round(rawCommission);
          
          // Prepare smart remarks
          let remarks = `Commission for ${selectedPartyName} (${rate}%)`;
          if (transactionCount > 0) {
            if (transactionCount === 1) {
              const transactionType = currentParty.commiSystem === 'Take' ? 'CR' : 'DR';
              remarks += ` - Single ${transactionType} transaction: ₹${totalTransactionAmount.toLocaleString()}`;
            } else {
              const transactionType = currentParty.commiSystem === 'Take' ? 'CR' : 'DR';
              remarks += ` - ${transactionCount} ${transactionType} transactions total: ₹${totalTransactionAmount.toLocaleString()}`;
            }
          } else {
            const transactionType = currentParty.commiSystem === 'Take' ? 'CR' : 'DR';
            remarks += ` - No applicable ${transactionType} transactions found`;
          }
          
          // Set commission amount with correct sign based on commission system
          let finalAmount = commissionAmount;
          if (currentParty.commiSystem === 'Take') {
            // Take System: Party pays commission → Negative amount
            finalAmount = -commissionAmount;
          } else if (currentParty.commiSystem === 'Give') {
            // Give System: Party receives commission → Positive amount
            finalAmount = commissionAmount;
          }
          
          setNewEntry(prev => ({
            ...prev,
            amount: finalAmount.toString(),
            remarks: remarks
          }));
          
          // Smart notification based on transaction count
          let notificationMessage = `Commission calculated: ₹${commissionAmount.toLocaleString()} (${rate}%)`;
          if (transactionCount === 0) {
            const transactionType = currentParty.commiSystem === 'Take' ? 'CR' : 'DR';
            notificationMessage += `\n⚠️ No applicable ${transactionType} transactions found. Commission set to 0.`;
            notificationMessage += `\n💡 Only ${transactionType} transactions (excluding ${companyName}, Commission, Monday Settlement) are considered.`;
          } else if (transactionCount === 1) {
            const transactionType = currentParty.commiSystem === 'Take' ? 'CR' : 'DR';
            notificationMessage += `\n📊 Based on 1 ${transactionType} transaction: ₹${totalTransactionAmount.toLocaleString()}`;
            notificationMessage += `\n🔢 Raw: ₹${rawCommission.toFixed(2)} → Rounded: ₹${commissionAmount}`;
          } else {
            const transactionType = currentParty.commiSystem === 'Take' ? 'CR' : 'DR';
            notificationMessage += `\n📊 Based on ${transactionCount} ${transactionType} transactions: ₹${totalTransactionAmount.toLocaleString()}`;
            notificationMessage += `\n🔢 Raw: ₹${rawCommission.toFixed(2)} → Rounded: ₹${commissionAmount}`;
          }
          
          toast({
            title: "Smart Commission Auto-Fill",
            description: notificationMessage,
            variant: "default"
          });
        }
      } else {
        // No commission structure, set default
        setNewEntry(prev => ({
          ...prev,
          amount: '1000', // Default commission amount
          remarks: `Commission for ${selectedPartyName}`
        }));
        
        toast({
          title: "Commission Auto-Fill",
          description: "Default commission amount ₹1,000 filled. Modify as needed.",
          variant: "default"
        });
      }
    }
  };

  // Handle checkbox state change for ledger entries
  const handleCheckboxChange = async (id: string | number, checked: boolean) => {
    if (!ledgerData) return;

    // Update selectedEntries state
    if (checked) {
      setSelectedEntries(prev => [...prev, id.toString()]);
    } else {
      setSelectedEntries(prev => prev.filter(entryId => entryId !== id.toString()));
    }

    if (showOldRecords) {
      // Update old records with proper ID comparison
      const updatedOldRecords = ledgerData.oldRecords.map(entry => {
        const entryId = entry.id || entry._id || entry.ti;
        return entryId === id ? { ...entry, chk: checked } : entry;
      });
      
      // Update Monday Final entries in ledger entries
      const updatedLedgerEntries = ledgerData.ledgerEntries.map(entry => {
        if (entry.remarks?.includes('Monday Final Settlement')) {
          const entryId = entry.id || entry._id || entry.ti;
          return entryId === id ? { ...entry, chk: checked } : entry;
        }
        return entry;
      });

      setLedgerData({
        ...ledgerData,
        oldRecords: updatedOldRecords,
        ledgerEntries: updatedLedgerEntries
      });
    } else {
      // Update current ledger entries with proper ID comparison
      const updatedEntries = ledgerData.ledgerEntries.map(entry => {
        const entryId = entry.id || entry._id || entry.ti;
        return entryId === id ? { ...entry, chk: checked } : entry;
      });

      setLedgerData({
        ...ledgerData,
        ledgerEntries: updatedEntries
      });
    }
  };

  // Handle "Check All" functionality
  const handleCheckAll = () => {
    if (!ledgerData) return;

    // Get the appropriate entries based on current view
    const entriesToToggle = showOldRecords 
      ? [...ledgerData.oldRecords, ...ledgerData.ledgerEntries.filter(entry => entry.tnsType === 'Monday Settlement')]
      : ledgerData.ledgerEntries;

    // Check if all entries are currently checked
    const allChecked = entriesToToggle.every(entry => entry.chk);
    
    // Update selectedEntries state
    if (!allChecked) {
      // Check all entries with proper ID extraction
      const allEntryIds = entriesToToggle.map((entry, index) => {
        const entryId = entry.id || entry._id || entry.ti || `entry_${index}`;
        return entryId.toString();
      });
      setSelectedEntries(allEntryIds);
    } else {
      // Uncheck all entries
      setSelectedEntries([]);
    }
    
    // Toggle all entries to the opposite state
    const updatedEntries = entriesToToggle.map(entry => ({
      ...entry,
      chk: !allChecked
    }));

    // Update ledger data with new checkbox states
    if (showOldRecords) {
      // Update old records with proper ID comparison
      const updatedOldRecords = ledgerData.oldRecords.map(entry => {
        const entryId = entry.id || entry._id || entry.ti;
        const updatedEntry = updatedEntries.find(e => {
          const eId = e.id || e._id || e.ti;
          return eId === entryId;
        });
        return updatedEntry || entry;
      });
      
      // Update Monday Final entries in ledger entries
      const updatedLedgerEntries = ledgerData.ledgerEntries.map(entry => {
        if (entry.remarks?.includes('Monday Final Settlement')) {
          const entryId = entry.id || entry._id || entry.ti;
          const updatedEntry = updatedEntries.find(e => {
            const eId = e.id || e._id || e.ti;
            return eId === entryId;
          });
          return updatedEntry || entry;
        }
        return entry;
      });

      setLedgerData({
        ...ledgerData,
        oldRecords: updatedOldRecords,
        ledgerEntries: updatedLedgerEntries
      });
    } else {
      // Update current ledger entries
      setLedgerData({
        ...ledgerData,
        ledgerEntries: updatedEntries
      });
    }
  };

  // Handle adding new ledger entry
  const handleAddEntry = async () => {
    const startTime = performance.now();
    console.log('🚀 ACTION: handleAddEntry started...');
    console.log('📊 JOURNEY: Step 6 - Adding Transactions to Party');
    console.log('📊 FORM: Starting new entry submission...');
    
    if (!selectedPartyName) {
      toast({
        title: "Error",
        description: "Please select a party first",
        variant: "destructive"
      });
      const endTime = performance.now();
      const duration = endTime - startTime;
      console.log(`❌ ACTION: handleAddEntry failed in ${duration.toFixed(2)}ms - No party selected`);
      return;
    }

    const amount = parseFloat(newEntry.amount);
    if (isNaN(amount) || amount === 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Determine transaction type based on amount
      const tnsType = amount > 0 ? 'CR' : 'DR';

      // Format: Party Name(Remarks) - combine party name and remarks
      let finalRemarks = '';
      const partyName = newEntry.partyName && newEntry.partyName.trim() ? newEntry.partyName.trim() : '';
      const remarks = newEntry.remarks && newEntry.remarks.trim() ? newEntry.remarks.trim() : '';
      
      if (partyName && remarks) {
        // Both party name and remarks provided: Party Name(Remarks)
        finalRemarks = `${partyName}(${remarks})`;
      } else if (partyName) {
        // Only party name provided: Party Name
        finalRemarks = partyName;
      } else if (remarks) {
        // Only remarks provided: Remarks
        finalRemarks = remarks;
      } else {
        // Neither provided: default
        finalRemarks = 'Transaction';
      }

      // Check if this is a commission transaction
      const isCommissionTransaction = newEntry.partyName && 
        newEntry.partyName.toLowerCase().trim() === 'commission';

      // Business Logic Validation
      const selectedParty = allPartiesForTransaction.find(party => 
        party.name === selectedPartyName || party.party_name === selectedPartyName
      );

      if (selectedParty) {
        // 1. Balance Limit Check
        if (selectedParty.balanceLimit && selectedParty.balanceLimit !== '0' && selectedParty.balanceLimit !== 'Unlimited') {
          const currentBalance = ledgerData?.summary?.calculatedBalance || 0;
          const balanceLimit = typeof selectedParty.balanceLimit === 'string' 
            ? parseFloat(selectedParty.balanceLimit) || 0
            : selectedParty.balanceLimit || 0;
          
          // Only check if balanceLimit > 0 (not unlimited)
          if (balanceLimit > 0 && tnsType === 'DR' && (currentBalance + Math.abs(amount)) > balanceLimit) {
            toast({
              title: "Balance Limit Exceeded",
              description: `Transaction would exceed balance limit of ₹${balanceLimit.toLocaleString()}. Current balance: ₹${currentBalance.toLocaleString()}`,
              variant: "destructive"
            });
            return;
          }
        }

        // 2. Party Status Check
        if (selectedParty.status === 'I') {
          toast({
            title: "Party Inactive",
            description: "Cannot create transactions for inactive parties",
            variant: "destructive"
          });
          return;
        }

        // 3. Monday Final Check - Only show warning, not alert
        if (selectedParty.mondayFinal === 'Yes') {
          // Don't show alert - user already knows party is settled
        }
      }

              // Check if this is a party-to-party transaction (only if remarks is empty AND party name is clearly another party)
        const isPartyToParty = newEntry.partyName && 
          newEntry.partyName.trim() !== '' && 
          newEntry.partyName.trim() !== selectedPartyName &&
          allPartiesForTransaction.some(party => party.name === newEntry.partyName.trim()) &&
          !newEntry.remarks && // Only trigger if remarks is empty
          newEntry.partyName.trim().toLowerCase() !== 'commission' && // Don't trigger for commission
                      newEntry.partyName.trim().toLowerCase() !== companyName.toLowerCase() && // Don't trigger for Company
          newEntry.partyName.trim().toLowerCase() !== 'company' && // Don't trigger for company
          newEntry.partyName.trim().toLowerCase() !== 'settlement'; // Don't trigger for settlement

        // Enhanced: Check if this is a Commission Waterfall Transaction
        const isCommissionWaterfall = newEntry.partyName && 
          newEntry.partyName.trim() !== '' && 
          newEntry.partyName.trim() !== selectedPartyName &&
          allPartiesForTransaction.some(party => party.name === newEntry.partyName.trim()) &&
          selectedParty && selectedParty.mCommission === 'With Commission' && selectedParty.rate;

      if (isPartyToParty) {
        // Dual-party transaction logic - Simple 2 entries only
        const otherPartyName = newEntry.partyName.trim();
        const otherParty = allPartiesForTransaction.find(party => party.name === otherPartyName);
        
        if (!otherParty) {
          toast({
            title: "Error",
            description: `Party "${otherPartyName}" not found`,
            variant: "destructive"
          });
          return;
        }



        // Create only 2 entries for dual-party transaction
        const entries = [];

        // 1. Entry for current party
        entries.push({
        partyName: selectedPartyName,
          amount: Math.abs(amount),
          remarks: otherPartyName, // Simple - just the other party name
          tnsType,
          credit: tnsType === 'CR' ? Math.abs(amount) : 0,
          debit: tnsType === 'DR' ? Math.abs(amount) : 0,
          date: new Date().toISOString().split('T')[0], // Add current date
          ti: `${Date.now()}::`
        });

        // 2. Entry for other party (opposite transaction)
        entries.push({
          partyName: otherPartyName,
          amount: Math.abs(amount),
          remarks: selectedPartyName, // Simple - just the current party name
          tnsType: tnsType === 'CR' ? 'DR' : 'CR', // Opposite transaction type
          credit: tnsType === 'CR' ? 0 : Math.abs(amount),
          debit: tnsType === 'CR' ? Math.abs(amount) : 0,
          date: new Date().toISOString().split('T')[0], // Add current date
          ti: `${Date.now() + 1}::`
        });

        // Add both entries
        let successCount = 0;
        for (const entryData of entries) {
          try {
            const response = await partyLedgerAPI.addEntry(entryData);
      if (response.success) {
              successCount++;
            }
          } catch (error) {
            console.error('Failed to add entry:', entryData, error);
          }
        }

        if (successCount === entries.length) {
          // Enhanced Success Message with Waterfall Details
          let successMessage = `Dual-party transaction completed: ${selectedPartyName} ↔ ${otherPartyName}`;
          
          // Add commission waterfall details if applicable
          if (isCommissionWaterfall && selectedParty) {
            const rate = parseFloat(selectedParty.rate) || 0;
            const commissionAmount = (Math.abs(amount) * rate) / 100;
            
            if (selectedParty.commiSystem === 'Take') {
              successMessage += `\n💼 ${companyName} takes ₹${commissionAmount.toLocaleString()} (${rate}%) commission`;
            } else if (selectedParty.commiSystem === 'Give') {
              successMessage += `\n💼 ${companyName} pays ₹${commissionAmount.toLocaleString()} (${rate}%) incentive`;
            }
          }

          // Now add the AQC/Company party entry to the database if it's involved
          // Create company entry for Take system (company receives money) or when other party is company
          if (otherPartyName === companyName || otherPartyName.toLowerCase().includes('aqc') || 
              (selectedParty && selectedParty.commiSystem === 'Take')) {
            const aqcEntry = {
              partyName: companyName,
              amount: Math.abs(amount),
              remarks: `Transaction with ${selectedPartyName}`,
              tnsType: tnsType === 'CR' ? 'DR' : 'CR', // Opposite transaction type
              credit: tnsType === 'CR' ? 0 : Math.abs(amount),
              debit: tnsType === 'CR' ? Math.abs(amount) : 0,
              date: new Date().toISOString().split('T')[0],
              ti: `${Date.now() + 2}::`
            };

            try {
              const aqcResponse = await partyLedgerAPI.addEntry(aqcEntry);
              if (aqcResponse.success) {
                if (import.meta.env.DEV) {
                  console.log('✅ AQC/Company party entry saved successfully');
                }
                successMessage += `\n💼 ${companyName} party entry saved`;
              } else {
                console.error('❌ Failed to save AQC/Company party entry:', aqcResponse.message);
              }
            } catch (error) {
              console.error('❌ Error saving AQC/Company party entry:', error);
            }
          }
          
          toast({
            title: "Success",
            description: successMessage
          });
          
          // Clear cache to ensure fresh data after adding entry
          console.log('💾 CACHE: Clearing cache after adding entry');
          clearCacheByPattern(`.*party-ledger.*${selectedPartyName}.*`);
          clearCacheByPattern(`.*all-parties.*`);
          
          // Wait a bit for backend processing to complete
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Refresh ledger data to show new entries
          await loadLedgerData(false, true); // Force refresh to bypass loading check
          
          // Clear form after successful transaction
          setNewEntry({
            amount: '',
            partyName: '',
            remarks: ''
          });
        } else {
          toast({
            title: "Partial Success",
            description: `${successCount}/${entries.length} entries added successfully`,
            variant: "destructive"
          });
        }

      } else if (isCommissionTransaction) {
        // Smart Commission Transaction Logic
        const selectedParty = allPartiesForTransaction.find(party => 
          party.name === selectedPartyName || party.party_name === selectedPartyName
        );
        
        if (!selectedParty) {
          toast({
            title: "Error",
            description: "Selected party not found",
            variant: "destructive"
          });
          return;
        }

        // Smart Commission Waterfall Calculation
        let commissionAmount = Math.abs(amount);
        let commissionType = 'Manual';
        let waterfallDetails = '';
        
        // Auto-calculate commission if party has commission structure
        if (selectedParty.mCommission === 'With Commission' && selectedParty.rate) {
          const rate = parseFloat(selectedParty.rate) || 0;
          if (rate > 0) {
            // Calculate commission based on the transaction amount
            commissionAmount = (Math.abs(amount) * rate) / 100;
            commissionType = 'Auto-calculated';
            
            // Waterfall Commission Logic
            if (selectedParty.commiSystem === 'Take') {
              // Company takes commission from client (e.g., RAJ RTGS)
              const netAmount = Math.abs(amount) - commissionAmount;
              waterfallDetails = `${companyName} takes ₹${commissionAmount.toLocaleString()} (${rate}%) from ₹${Math.abs(amount).toLocaleString()}. Net payment: ₹${netAmount.toLocaleString()}`;
            } else if (selectedParty.commiSystem === 'Give') {
              // Company gives commission to vendor (e.g., SS Enterprise)
              waterfallDetails = `${companyName} pays ₹${commissionAmount.toLocaleString()} (${rate}%) incentive to vendor. Total transaction: ₹${Math.abs(amount).toLocaleString()}`;
            }
          }
        }

        // Add entry for selected party
        // For Take system: Party should DEBIT (pay commission)
        // For Give system: Party should CREDIT (receive commission)
        let partyTnsType = tnsType;
        if (selectedParty.commiSystem === 'Take') {
          // Take System: Party pays commission → DR (Debit)
          partyTnsType = 'DR';
        } else if (selectedParty.commiSystem === 'Give') {
          // Give System: Party receives commission → CR (Credit)
          partyTnsType = 'CR';
        }
        
        const partyEntry = {
          partyName: selectedPartyName,
          amount: Math.abs(amount),
          remarks: `Commission ${commissionType} (${commissionAmount.toLocaleString()})`,
          tnsType: partyTnsType,
          credit: partyTnsType === 'CR' ? Math.abs(amount) : 0,
          debit: partyTnsType === 'DR' ? Math.abs(amount) : 0,
          date: new Date().toISOString().split('T')[0],
          ti: `${Date.now()}::`
        };

        const response = await partyLedgerAPI.addEntry(partyEntry);
        
        if (response.success) {
          // Determine Commission entry type based on selected party's commission system
          let commissionTnsType = '';
          
          if (selectedParty.commiSystem === 'Take') {
            // Take System: Company takes commission from party
            // Party DR (debit) → Commission CR (Company receives commission)
            commissionTnsType = 'CR';
          } else if (selectedParty.commiSystem === 'Give') {
            // Give System: Company gives commission to party
            // Company DR (debit) → Commission DR (debit from Company)
            commissionTnsType = 'DR';
          } else {
            // Default: opposite logic (backward compatibility)
            commissionTnsType = tnsType === 'CR' ? 'DR' : 'CR';
          }

          // Initialize success message for commission entries
          let successMessage = `Transaction of ₹${Math.abs(amount).toLocaleString()} added successfully for ${selectedPartyName}`;

          // Create Commission party entry
          const commissionEntry = {
            partyName: 'Commission',
            amount: commissionAmount,
            remarks: `Commission ${commissionType} (${commissionAmount.toLocaleString()})`,
            tnsType: commissionTnsType,
            credit: commissionTnsType === 'CR' ? commissionAmount : 0,
            debit: commissionTnsType === 'DR' ? commissionAmount : 0,
            date: new Date().toISOString().split('T')[0],
            ti: `${Date.now() + 1}::`
          };

          try {
            const commissionResponse = await partyLedgerAPI.addEntry(commissionEntry);
            if (commissionResponse.success) {
              console.log('✅ Commission entry created successfully');
              successMessage += `\n💰 Commission entry saved`;
            } else {
              console.error('❌ Failed to create commission entry:', commissionResponse.message);
            }
          } catch (error) {
            console.error('❌ Error creating commission entry:', error);
          }
          
          toast({
            title: "Success",
            description: `Transaction of ₹${Math.abs(amount).toLocaleString()} added successfully for ${selectedPartyName}`
          });
        } else {
          toast({
            title: "Error",
            description: "Failed to add commission entry",
            variant: "destructive"
          });
        }

      } else {
        // Regular transaction logic
        const entryData = {
          partyName: selectedPartyName,
          amount: Math.abs(amount),
          remarks: finalRemarks,
          tnsType,
          credit: tnsType === 'CR' ? Math.abs(amount) : 0,
          debit: tnsType === 'DR' ? Math.abs(amount) : 0,
          date: new Date().toISOString().split('T')[0], // Add current date
          ti: `${Date.now()}::`
        };

        const response = await partyLedgerAPI.addEntry(entryData);

                if (response.success) {
          // Business Workflow Automation
          const transactionAmount = Math.abs(amount);
          
          // 1. High Value Transaction Alert
          if (transactionAmount >= 100000) {
            toast({
              title: "High Value Transaction",
              description: `Large transaction of ₹${transactionAmount.toLocaleString()} recorded. Consider review.`,
              variant: "default"
            });
          }
          
          // 2. Balance Status Check
          const currentBalance = ledgerData?.summary?.calculatedBalance || 0;
          if (currentBalance < 0) {
            toast({
              title: "Negative Balance Alert",
              description: `Party balance is now ₹${currentBalance.toLocaleString()}. Consider settlement.`,
              variant: "default"
            });
          }
          
          // 3. Success Message
          toast({
            title: "Success",
            description: `Transaction of ₹${transactionAmount.toLocaleString()} added successfully`
          });
        } else {
          toast({
            title: "Error",
            description: response.message || "Failed to add entry",
            variant: "destructive"
          });
        }
      }

      // Clear form
      setNewEntry({
        amount: '',
        partyName: '',
        remarks: ''
      });

      // Reload ledger data and update balance
      await loadLedgerData(false, true); // Force refresh to bypass loading check
      
      // Enhanced balance refresh with multiple attempts
      await refreshBalanceColumn();
      
      // Additional refresh after a delay to ensure backend processing
      setTimeout(async () => {
        await refreshBalanceColumn();
      }, 2000);
    } catch (error: any) {
      console.error('❌ Add entry error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add entry",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      const endTime = performance.now();
      const duration = endTime - startTime;
      console.log(`✅ ACTION: handleAddEntry completed in ${duration.toFixed(2)}ms`);
      console.log('📊 FORM: New entry submission finished');
    }
  };

  // Enhanced balance refresh function
  const refreshBalanceColumn = async () => {
    try {
      // Reload ledger data to get updated balances
      await loadLedgerData(false, true); // Force refresh to bypass loading check
      
      // Force table re-render
      // Removed setForceUpdate to prevent unnecessary re-renders
    } catch (error) {
      console.error('❌ Balance refresh error:', error);
    }
  };

  // Function to create missing commission and company entries for existing transactions
  const createMissingEntries = async () => {
    if (!selectedPartyName || !ledgerData?.ledgerEntries) return;
    
    console.log('🔧 Creating missing commission and company entries...');
    
    try {
      const selectedParty = allPartiesForTransaction.find(party => 
        party.name === selectedPartyName || party.party_name === selectedPartyName
      );
      
      if (!selectedParty || selectedParty.mCommission !== 'With Commission') {
        console.log('ℹ️ No commission system or party not found, skipping...');
        return;
      }
      
      const rate = parseFloat(selectedParty.rate) || 0;
      if (rate <= 0) {
        console.log('ℹ️ No commission rate, skipping...');
        return;
      }
      
      // Find transactions that need commission/company entries
      const transactionsNeedingEntries = ledgerData.ledgerEntries.filter(entry => {
        const remarks = entry.remarks || '';
        // Skip if already has commission or company entries
        if (remarks.includes('Commission') || remarks.includes(companyName)) {
          return false;
        }
        // Skip Monday Final settlements
        if (remarks.includes('Monday Final Settlement') || remarks.includes('Monday Settlement')) {
          return false;
        }
        // Include base transactions
        return true;
      });
      
      console.log(`🔧 Found ${transactionsNeedingEntries.length} transactions needing entries`);
      
      for (const transaction of transactionsNeedingEntries) {
        const amount = transaction.tnsType === 'CR' ? transaction.credit : transaction.debit;
        const commissionAmount = (amount * rate) / 100;
        
        // Create Commission entry
        const commissionEntry = {
          partyName: 'Commission',
          amount: commissionAmount,
          remarks: `Commission Auto-calculated (${rate})`,
          tnsType: selectedParty.commiSystem === 'Take' ? 'CR' : 'DR',
          credit: selectedParty.commiSystem === 'Take' ? commissionAmount : 0,
          debit: selectedParty.commiSystem === 'Take' ? 0 : commissionAmount,
          date: transaction.date,
          ti: `${Date.now() + Math.random()}::`
        };
        
        // Create Company entry
        const companyEntry = {
          partyName: companyName,
          amount: amount,
          remarks: `Transaction with ${selectedPartyName}`,
          tnsType: transaction.tnsType === 'CR' ? 'DR' : 'CR',
          credit: transaction.tnsType === 'CR' ? 0 : amount,
          debit: transaction.tnsType === 'CR' ? amount : 0,
          date: transaction.date,
          ti: `${Date.now() + Math.random() + 1}::`
        };
        
        try {
          // Add Commission entry
          const commissionResponse = await partyLedgerAPI.addEntry(commissionEntry);
          if (commissionResponse.success) {
            console.log(`✅ Created commission entry for transaction ${transaction.id}`);
          }
          
          // Add Company entry
          const companyResponse = await partyLedgerAPI.addEntry(companyEntry);
          if (companyResponse.success) {
            console.log(`✅ Created company entry for transaction ${transaction.id}`);
          }
        } catch (error) {
          console.error(`❌ Error creating entries for transaction ${transaction.id}:`, error);
        }
      }
      
      // Refresh data after creating entries
      await loadLedgerData(false, true);
      
      toast({
        title: "Success",
        description: `Created missing entries for ${transactionsNeedingEntries.length} transactions`
      });
      
    } catch (error) {
      console.error('❌ Error creating missing entries:', error);
      toast({
        title: "Error",
        description: "Failed to create missing entries",
        variant: "destructive"
      });
    }
  };

  // Handle modifying an existing ledger entry
  const handleModifyEntry = async () => {
    // Validate that we have an entry to modify
    if (!editingEntry) {
      toast({
        title: "Error",
        description: "No entry selected for modification",
        variant: "destructive"
      });
      return;
    }

    // Validate amount
    const amount = editingEntry.tnsType === 'CR' ? editingEntry.credit : editingEntry.debit;
    if (!amount || amount <= 0) {
      toast({
        title: "Error",
        description: "Amount must be greater than 0",
        variant: "destructive"
      });
      return;
    }

    const entryId = editingEntry.id || editingEntry._id || editingEntry.ti;
    if (!entryId) {
      console.error('Modify entry error: No entry ID found', editingEntry);
      toast({
        title: "Error",
        description: "No entry ID found for modification",
        variant: "destructive"
      });
      return;
    }
    
    setActionLoading(true);
    try {
      // Prepare update data based on transaction type using editingEntry (modified data)
      const updateData = {
        remarks: editingEntry.remarks,
        credit: editingEntry.tnsType === 'CR' ? parseFloat(String(editingEntry.credit || '0')) : 0,
        debit: editingEntry.tnsType === 'DR' ? parseFloat(String(editingEntry.debit || '0')) : 0,
        tnsType: editingEntry.tnsType
      };
      
      const response = await partyLedgerAPI.updateEntry(entryId, updateData as any);
      
      if (response.success) {
        // Reload data without showing loading spinner
        await loadLedgerData(false);
        
        // Clear UI state
        setEditingEntry(null);
        setShowModifyModal(false);
        setSelectedEntries([]); // Clear selection
        
        // Clear cache to ensure fresh data after modifying entry
        console.log('💾 CACHE: Clearing cache after modifying entry');
        clearCacheByPattern(`.*party-ledger.*${selectedPartyName}.*`);
        clearCacheByPattern(`.*all-parties.*`);
        
        // Force table refresh with small delay to ensure state updates
        // Removed setTableRefreshKey and setForceUpdate to prevent unnecessary re-renders
        
        toast({
          title: "Success",
          description: "Entry modified successfully"
        });
      } else {
        // Handle specific error codes
        if (response.code === 'OLD_RECORD_PROTECTED') {
          toast({
            title: "Old Record Protected",
            description: "This entry was settled in Monday Final and cannot be modified. Delete the Monday Final entry first to unsettle transactions.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Error",
            description: response.message || "Failed to modify entry",
            variant: "destructive"
          });
        }
      }
    } catch (error: any) {
      console.error('Modify entry error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to modify entry",
        variant: "destructive"
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle deleting multiple ledger entries
  const handleDeleteEntry = async () => {
    // Calculate displayEntries for this function
    const currentEntries = showOldRecords ? ledgerData?.oldRecords : ledgerData?.ledgerEntries;
    const displayEntriesForDelete = showOldRecords 
      ? [...(ledgerData?.oldRecords || []), ...(ledgerData?.ledgerEntries?.filter(entry => entry.remarks?.includes('Monday Final Settlement')) || [])]
      : currentEntries || [];

    // Get all selected entries from selectedEntries state
    const entriesToDelete = displayEntriesForDelete.filter(entry => 
      selectedEntries.includes((entry.id || entry._id || entry.ti || '').toString())
    );
    
    // Validate that we have entries to delete
    if (entriesToDelete.length === 0) {
      console.error('Delete entry error: No entries selected for deletion');
      toast({
        title: "Error",
        description: "No entries selected for deletion",
        variant: "destructive"
      });
      return;
    }

    setActionLoading(true);
    
    try {
      // Check if any Monday Final entries are being deleted
      const mondayFinalEntries = entriesToDelete.filter(entry => entry.remarks?.includes('Monday Final Settlement'));
      const regularEntries = entriesToDelete.filter(entry => !entry.remarks?.includes('Monday Final Settlement'));



      let successCount = 0;
      let errorCount = 0;
      
      // Handle Monday Final deletions first
      if (mondayFinalEntries.length > 0) {
        for (const mondayFinalEntry of mondayFinalEntries) {
          try {
            // Extract entry ID with fallback
            const entryId = mondayFinalEntry.id || mondayFinalEntry._id || mondayFinalEntry.ti;
            
            if (!entryId) {
              console.error('❌ Monday Final Entry ID not found for deletion:', mondayFinalEntry);
              errorCount++;
              continue;
            }
            
             // Use the new API to delete Monday Final and unsettle only its transactions
            const deleteResponse = await partyLedgerAPI.deleteMondayFinalEntry(entryId);
            
            if (deleteResponse.success) {
              successCount++;
            } else {
              errorCount++;
              console.error(`❌ Failed to delete Monday Final entry ${entryId}:`, deleteResponse.message);
            }
          } catch (error: any) {
            errorCount++;
            console.error(`❌ Error deleting Monday Final entry:`, error);
          }
        }
      }
      
      // Handle regular entry deletions
      if (regularEntries.length > 0) {
        for (const entry of regularEntries) {
          try {
            // Extract entry ID with fallback
            const entryId = entry.id || entry._id || entry.ti;
            
            if (!entryId) {
              console.error('❌ Entry ID not found for deletion:', entry);
              errorCount++;
              continue;
            }
            
            const response = await partyLedgerAPI.deleteEntry(entryId);
            
            if (response.success) {
              successCount++;
            } else {
              errorCount++;
              // Handle specific error codes
              if (response.code === 'OLD_RECORD_PROTECTED') {
                console.error(`❌ Cannot delete old record ${entryId}: Entry was settled in Monday Final`);
              } else {
                console.error(`❌ Failed to delete entry ${entryId}:`, response.message);
              }
            }
          } catch (error: any) {
            errorCount++;
            console.error(`❌ Error deleting entry:`, error);
          }
        }
      }
      
      // Clear selected entries after deletion attempt
      setSelectedEntries([]);
      
      // Clear cache to ensure fresh data after deletion
      console.log('💾 CACHE: Clearing cache after entry deletion');
      clearCacheByPattern(`.*party-ledger.*${selectedPartyName}.*`);
      clearCacheByPattern(`.*all-parties.*`);
      
      // Show appropriate success/error message
      if (successCount > 0 && errorCount === 0) {
        if (mondayFinalEntries.length > 0) {
          toast({
            title: "Success",
            description: `Monday Final deleted and ${successCount} transactions unsettled`
          });
        } else {
          // Check if any related transactions were deleted
          const hasRelatedTransactions = successCount > regularEntries.length;
          const relatedCount = successCount - regularEntries.length;
          
          if (hasRelatedTransactions) {
            toast({
              title: "Success",
              description: `Successfully deleted ${successCount} transactions (including ${relatedCount} related company/commission transactions)`
            });
          } else {
            toast({
              title: "Success",
              description: `Successfully deleted ${successCount} entr${successCount === 1 ? 'y' : 'ies'}`
            });
          }
        }
      } else if (successCount > 0 && errorCount > 0) {
        toast({
          title: "Partial Success",
          description: `Deleted ${successCount} entr${successCount === 1 ? 'y' : 'ies'}, ${errorCount} failed. Some entries may be protected as old records.`,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to delete any entries. Some entries may be protected as old records after Monday Final settlement.",
          variant: "destructive"
        });
      }
      
      // Reload data with proper delay for Monday Final deletions
      if (mondayFinalEntries.length > 0) {
        // For Monday Final deletions, add a delay and force refresh
        
        // Wait a bit for database to fully update
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Force reload data with loading spinner for better UX
        await loadLedgerData(true, true); // Force refresh to bypass loading check
        
                 // Force table refresh
         // Removed setTableRefreshKey to prevent unnecessary re-renders
        
        // Clear view state to ensure proper rendering
        setShowOldRecords(false);
      } else {
        // Regular deletion - standard refresh
        await loadLedgerData(false, true); // Force refresh to bypass loading check
      }
      
      setEntryToDelete(null);
      setShowDeleteModal(false);
    } catch (error: any) {
      console.error('Delete entries error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete entries",
        variant: "destructive"
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Monday Final settlement
  const handleMondayFinal = async () => {
    if (!selectedPartyName) {
      toast({
        title: "Error",
        description: "Please select a party first",
        variant: "destructive"
      });
      return;
    }
    
    setActionLoading(true);
    try {
      
      const response = await partyLedgerAPI.updateMondayFinal([selectedPartyName]);
      
      if (response.success) {
        toast({
          title: "Monday Final Success",
          description: `Settlement completed! ${response.data?.settledEntries || 0} transactions settled.`,
        });
        
        // Monday Final completed successfully
        
        // Close the modal
        setShowMondayFinalModal(false);
        
        // 1. Clear current data to force refresh
        setLedgerData(prev => ({
          ...prev,
          ledgerEntries: [],
          oldRecords: []
        }));
        
        // 2. Immediate reload for fast response
        await loadLedgerData(false);
        
                 // 3. Force table re-render immediately
         // Removed setForceUpdate and setTableRefreshKey to prevent unnecessary re-renders
         
         // 4. Clear selected entries
         setSelectedEntries([]);
         
         // 5. Show old records immediately
         setShowOldRecords(true);
         
         // 6. Quick final refresh (reduced from 1500ms to 200ms)
         setTimeout(async () => {
           await loadLedgerData(false);
           // Removed setForceUpdate and setTableRefreshKey to prevent unnecessary re-renders
         }, 200); // Reduced from 1500ms to 200ms
        
      } else {
        console.error('❌ Monday Final failed:', response.message);
        toast({
          title: "Error",
          description: response.message || "Failed to process Monday Final",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('❌ Monday Final error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to process Monday Final",
        variant: "destructive"
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle print functionality
  const handlePrint = () => {
    window.print();
  };

  // Handle refresh functionality
  const handleRefresh = useCallback(async () => {
    const startTime = performance.now();
    console.log('🚀 ACTION: handleRefresh started...');
    console.log('🔄 REFRESH: Starting data refresh...');
    
    if (!selectedPartyName) return;
    
    setActionLoading(true);
    try {
      // Clear cache to ensure fresh data on refresh
      console.log('💾 CACHE: Clearing cache on manual refresh');
      clearCacheByPattern(`.*party-ledger.*${selectedPartyName}.*`);
      clearCacheByPattern(`.*all-parties.*`);
      
      await loadLedgerData(false, true); // Force refresh to bypass loading check
      toast({
        title: "Success",
        description: "Ledger data refreshed successfully"
      });
      const endTime = performance.now();
      const duration = endTime - startTime;
      console.log(`✅ ACTION: handleRefresh completed in ${duration.toFixed(2)}ms`);
      console.log('🔄 REFRESH: Data refresh finished');
    } catch (error) {
      console.error('Refresh error:', error);
      const endTime = performance.now();
      const duration = endTime - startTime;
      console.log(`❌ ACTION: handleRefresh failed in ${duration.toFixed(2)}ms`);
    } finally {
      setActionLoading(false);
    }
  }, [selectedPartyName]);

  // Handle exit functionality
  const handleExit = () => {
    const startTime = performance.now();
    console.log('🚀 ACTION: handleExit started...');
    console.log('🚪 NAVIGATION: Navigating to Party Ledger...');
    
    navigate('/party-ledger');
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    console.log(`✅ ACTION: handleExit completed in ${duration.toFixed(2)}ms`);
    console.log('🚪 NAVIGATION: Navigation completed');
  };

  // Load data on component mount - OPTIMIZED
  useEffect(() => {
    const initializeData = async () => {
      const startTime = performance.now();
      console.log('🚀 FUNCTION: initializeData started...');
      
      try {
        // Load parties and ledger data
        await loadAvailableParties();
        
        // Load ledger data only if party name is available
        if (selectedPartyName) {
          await loadLedgerData(true);
        }
        
        const endTime = performance.now();
        const duration = endTime - startTime;
        console.log(`✅ FUNCTION: initializeData completed in ${duration.toFixed(2)}ms`);
      } catch (error) {
        console.error('Initialization error:', error);
      }
    };
    
    initializeData();
  }, [selectedPartyName]); // Only depend on selectedPartyName

  // Reload parties when company account changes
  useEffect(() => {
    if (companyName !== 'Company') {
      loadAvailableParties();
    }
  }, [companyName, loadAvailableParties]); // Added function dependency back

  // Listen for parties refresh events (e.g., when company party is created)
  useEffect(() => {
    const handlePartiesRefresh = (event: CustomEvent) => {
      console.log('🔄 Parties refresh event received:', event.detail);
      loadAvailableParties();
    };

    window.addEventListener('partiesRefreshed', handlePartiesRefresh as EventListener);
    
    return () => {
      window.removeEventListener('partiesRefreshed', handlePartiesRefresh as EventListener);
    };
  }, [loadAvailableParties]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.party-dropdown-container')) {
        setShowPartyDropdown(false);
      }
      if (!target.closest('.top-party-dropdown-container')) {
        setShowTopPartyDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Performance optimization: Memoized party filtering
  const availablePartiesExcludingCurrent = useMemo(() => {
    if (!availableParties || !selectedPartyName) return [];
    
    return availableParties.filter(party => 
      (party.party_name || party.name) !== selectedPartyName &&
      party.status === 'A'
    );
  }, [availableParties, selectedPartyName]);

  // Performance optimization: Debounced search
  const debouncedSearch = useMemo(
    () => debounce((searchTerm: string) => {
      if (!searchTerm.trim()) {
        setFilteredTopParties(availablePartiesExcludingCurrent);
        return;
      }
      
      const filtered = availablePartiesExcludingCurrent.filter(party =>
        (party.party_name || party.name).toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredTopParties(filtered);
    }, 300),
    [availablePartiesExcludingCurrent]
  );

  // Performance optimization: Memoized calculations with pagination
  const memoizedDisplayEntries = useMemo(() => {
    if (!ledgerData) return [];
    
    const entries = showOldRecords 
      ? [...(ledgerData.oldRecords || []), ...(ledgerData.ledgerEntries?.filter(entry => entry.remarks?.includes('Monday Final Settlement')) || [])]
      : ledgerData.ledgerEntries || [];
    
    // Limit entries for better performance (show only first 100)
    return entries.slice(0, 100);
  }, [ledgerData, showOldRecords]);

  // Check if party is already settled for Monday Final
  const isPartySettled = useMemo(() => {
    // TEMPORARILY DISABLED: All parties should show tables
    return false;
    
    // Original logic (commented out for now):
    /*
    if (!ledgerData || !selectedPartyName) return false;
    
    // Skip settlement check for virtual parties (Commission, Give, Company, etc.)
    const virtualParties = ['commission', 'give', 'company', 'settlement'];
    if (virtualParties.includes(selectedPartyName.toLowerCase())) {
      return false;
    }
    
    // Check if there are any Monday Final Settlement entries for the CURRENT party
    const mondayFinalEntries = ledgerData.oldRecords.filter(entry => 
      entry.remarks?.includes('Monday Final Settlement') &&
      entry.partyName === selectedPartyName
    );
    
    // Also check current ledger entries for Monday Final Settlement
    const currentMondayFinalEntries = ledgerData.ledgerEntries.filter(entry => 
      entry.remarks?.includes('Monday Final Settlement') &&
      entry.partyName === selectedPartyName
    );
    
    // Party is settled if there are Monday Final entries for this specific party
    return mondayFinalEntries.length > 0 || currentMondayFinalEntries.length > 0;
    */
  }, [ledgerData, selectedPartyName]);

  // Show toast when party is settled (TEMPORARILY DISABLED)
  useEffect(() => {
    // TEMPORARILY DISABLED: No settlement toasts
    /*
    if (isPartySettled) {
      console.log('🔍 Party Settlement Debug:', {
        partyName: selectedPartyName,
        oldRecordsCount: ledgerData?.oldRecords?.length || 0,
        ledgerEntriesCount: ledgerData?.ledgerEntries?.length || 0,
        mondayFinalInOld: ledgerData?.oldRecords?.filter(e => e.remarks?.includes('Monday Final Settlement') && e.partyName === selectedPartyName)?.length || 0,
        mondayFinalInCurrent: ledgerData?.ledgerEntries?.filter(e => e.remarks?.includes('Monday Final Settlement') && e.partyName === selectedPartyName)?.length || 0
      });
      
      toast({
        title: "Party Already Settled",
        description: `${selectedPartyName} is already settled in Monday Final. No new transactions can be added.`,
        variant: "destructive"
      });
    }
    */
  }, [isPartySettled, selectedPartyName, ledgerData]);

  // Loading state - Show skeleton UI for better performance
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <TopNavigation />
        {/* Page Header */}
        <div className="bg-blue-800 text-white p-2">
          <h1 className="text-lg font-bold">Account Ledger</h1>
        </div>
        {/* Skeleton Loading */}
        <div className="p-6">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3">
              <div className="h-6 bg-blue-500 rounded animate-pulse"></div>
            </div>
            <div className="p-6">
              {/* Skeleton Table */}
              <div className="space-y-3">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="flex space-x-4">
                    <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded flex-1 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state - Show message when no data is available
  if (!ledgerData) {
    return (
      <div className="min-h-screen bg-gray-100">
        <TopNavigation />
        {/* Page Header */}
        <div className="bg-blue-800 text-white p-2">
          <h1 className="text-lg font-bold">Account Ledger</h1>
        </div>
        {/* No Data Message */}
        <div className="text-center py-8">
          <p className="text-gray-600">No ledger data available</p>
        </div>
      </div>
    );
  }

  // Early return if party is settled
  if (isPartySettled) {
    return (
      <div className="min-h-screen bg-gray-100">
        <TopNavigation />
        <div className="bg-blue-800 text-white p-2">
          <h1 className="text-lg font-bold">Account Ledger</h1>
        </div>
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">Party is already settled in Monday Final. No new transactions can be added.</p>
          
          {/* Debug Information */}
          <div className="bg-gray-200 p-4 rounded-lg text-left max-w-2xl mx-auto">
            <h3 className="font-semibold mb-2">Debug Information:</h3>
            <div className="text-sm space-y-1">
              <p><strong>Party Name:</strong> {selectedPartyName}</p>
              <p><strong>Total Old Records:</strong> {ledgerData?.oldRecords?.length || 0}</p>
              <p><strong>Total Current Entries:</strong> {ledgerData?.ledgerEntries?.length || 0}</p>
              
              <div className="mt-3">
                <p className="font-semibold">Monday Final Entries in Old Records:</p>
                {ledgerData?.oldRecords?.filter(e => e.remarks?.includes('Monday Final Settlement') && e.partyName === selectedPartyName).map((entry, idx) => (
                  <div key={idx} className="ml-4 text-xs bg-white p-2 rounded border">
                    <p><strong>ID:</strong> {entry.id || entry._id || entry.ti}</p>
                    <p><strong>Date:</strong> {entry.date}</p>
                    <p><strong>Remarks:</strong> {entry.remarks}</p>
                    <p><strong>Party:</strong> {entry.partyName}</p>
                  </div>
                ))}
              </div>
              
              <div className="mt-3">
                <p className="font-semibold">Monday Final Entries in Current Records:</p>
                {ledgerData?.ledgerEntries?.filter(e => e.remarks?.includes('Monday Final Settlement') && e.partyName === selectedPartyName).map((entry, idx) => (
                  <div key={idx} className="ml-4 text-xs bg-white p-2 rounded border">
                    <p><strong>ID:</strong> {entry.id || entry._id || entry.ti}</p>
                    <p><strong>Date:</strong> {entry.date}</p>
                    <p><strong>Remarks:</strong> {entry.remarks}</p>
                    <p><strong>Party:</strong> {entry.partyName}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Determine which entries to display (current or old records)
  const currentEntries = showOldRecords ? ledgerData.oldRecords : ledgerData.ledgerEntries;
  
  // When showing old records, use the oldRecords array which already includes Monday Final entries in chronological order
  const displayEntries = showOldRecords 
    ? ledgerData.oldRecords // Backend already provides chronologically sorted old records
    : currentEntries;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <TopNavigation />
      
      {/* Main Content Area - Two Column Layout */}
      <div className="flex">
        {/* Left Side - Top Section + Main Content */}
        <div className="flex-1 pr-4">
          {/* Top Section - Party Information */}
          <div className="bg-white shadow-lg border-b border-gray-200 px-6 py-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-3">
                <label className="text-sm font-semibold text-gray-700">Party Name:</label>
                <div className="relative top-party-dropdown-container">
                  <div className="relative">
                    <input
                      ref={setTopInputRef}
                      type="text"
                      value={typingPartyName}
                      onChange={(e) => {
                        const value = e.target.value;
                        setTypingPartyName(value);
                        
                        // Calculate text width for proper positioning
                        if (topInputRef) {
                          const canvas = document.createElement('canvas');
                          const context = canvas.getContext('2d');
                          if (context) {
                            context.font = window.getComputedStyle(topInputRef).font;
                            const width = context.measureText(value).width;
                            setTopTextWidth(width);
                          }
                        }
                        
                        if (value.trim()) {
                          // Filter parties when typing
                          filterTopParties(value);
                        } else {
                          // Show available parties (excluding current) when input is empty
                          const availablePartiesExcludingCurrent = availableParties.filter(party => 
                            (party.party_name || party.name) !== selectedPartyName
                          );
                          setFilteredTopParties(availablePartiesExcludingCurrent);
                          setTopAutoCompleteText('');
                          setShowTopInlineSuggestion(false);
                        }
                        setShowTopPartyDropdown(true);
                      }}
                    onFocus={() => {
                      setShowTopPartyDropdown(true);
                      // Show available parties (excluding current) when focusing on top dropdown
                      const availablePartiesExcludingCurrent = availableParties.filter(party => 
                        (party.party_name || party.name) !== selectedPartyName
                      );
                      setFilteredTopParties(availablePartiesExcludingCurrent);
                    }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          // Enter key navigates to party
                          if (showTopInlineSuggestion && topAutoCompleteText) {
                            handleTopTabComplete();
                            // After completing, navigate to the party using the completed value
                            setTimeout(() => {
                              const originalParty = filteredTopParties[0];
                              const originalPartyName = originalParty?.party_name || originalParty?.name || '';
                              handlePartyChange(originalPartyName);
                            }, 100);
                          } else if (filteredTopParties.length > 0) {
                            handleTopAutoComplete();
                            // After selecting, navigate to the party using the selected party name
                            setTimeout(() => {
                              const selectedParty = filteredTopParties[0];
                              const partyName = selectedParty?.party_name || selectedParty?.name || '';
                              handlePartyChange(partyName);
                            }, 100);
                          } else {
                            handlePartyChange(typingPartyName);
                            setShowTopPartyDropdown(false);
                          }
                        } else if (e.key === 'Tab') {
                          e.preventDefault();
                          // Tab key: Accept suggestion first, then move to next field
                          if (showTopInlineSuggestion && topAutoCompleteText) {
                            handleTopTabComplete();
                          } else {
                            // Move to next field (Amount field in bottom section)
                            const amountField = document.querySelector('input[placeholder*="Credit"], input[placeholder*="Debit"]') as HTMLInputElement;
                            if (amountField) {
                              amountField.focus();
                            }
                          }
                        } else if (e.key === 'Escape') {
                          setShowTopPartyDropdown(false);
                          setTopAutoCompleteText('');
                          setShowTopInlineSuggestion(false);
                        } else if (e.key === 'ArrowRight' && showTopInlineSuggestion) {
                          e.preventDefault();
                          handleTopTabComplete();
                        }
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-transparent relative z-10"
                      placeholder="Search party name"
                      autoComplete="off"
                    />
                    {/* VS Code style inline suggestion for top section */}
                    {showTopInlineSuggestion && topAutoCompleteText && (
                      <div 
                        className="absolute top-0 left-0 text-gray-400 pointer-events-none z-0"
                        style={{ 
                          left: `${topTextWidth + 16}px`, // 16px for padding
                          top: '8px',
                          fontSize: '14px',
                          lineHeight: '20px',
                          whiteSpace: 'nowrap',
                          fontFamily: 'inherit',
                          color: '#9CA3AF'
                        }}
                      >
                        {topAutoCompleteText}
                      </div>
                    )}
                  </div>
                  {showTopPartyDropdown && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto z-50 mt-1">
                      {partiesLoading ? (
                        <div className="px-3 py-2 text-sm text-gray-500">Loading parties...</div>
                      ) : filteredTopParties.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-gray-500">No parties found</div>
                      ) : (
                        filteredTopParties.map((party) => (
                          <div
                            key={party.id || party._id || party.party_name || party.name}
                            className="px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors duration-150"
                            onClick={() => handleTopPartySelect(party.name)}
                          >
                            {party.name}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <label className="text-sm font-semibold text-gray-700">Closing Balance:</label>
                <span className={`text-lg font-bold px-3 py-1 rounded-lg ${
                  (ledgerData?.closingBalance || 0) > 0 
                    ? 'text-green-600 bg-green-50' 
                    : (ledgerData?.closingBalance || 0) < 0 
                      ? 'text-red-600 bg-red-50'
                      : 'text-gray-600 bg-gray-50'
                }`}>
                  ₹{(ledgerData?.closingBalance || 0).toLocaleString()}
                </span>
                </div>
              </div>
            </div>
          </div>

        {/* Main Content - Table and Actions */}
        <div className="flex flex-1 overflow-hidden">
          {/* Central Table Section */}
          <div className="flex-1 overflow-auto">
            <div className="p-6">
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden" style={{ height: 'calc(100vh - 350px)' }}>
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3">
                  <h2 className="text-white font-semibold text-lg">Account Ledger Entries</h2>
                </div>
                <div className="overflow-auto" style={{ height: 'calc(100% - 60px)' }}>
              <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">Date</th>
                        <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">Party Name</th>
                        <th className="border-b border-gray-200 px-4 py-3 text-center font-semibold text-gray-700">Type</th>
                        <th className="border-b border-gray-200 px-4 py-3 text-center font-semibold text-gray-700">Credit</th>
                        <th className="border-b border-gray-200 px-4 py-3 text-center font-semibold text-gray-700">Debit</th>
                        <th className="border-b border-gray-200 px-4 py-3 text-center font-semibold text-gray-700">Balance</th>
                        <th className="border-b border-gray-200 px-4 py-3 text-center font-semibold text-gray-700">Select</th>
                        <th className="border-b border-gray-200 px-4 py-3 text-center font-semibold text-gray-700">ID</th>
                  </tr>
                </thead>
                    <tbody className="divide-y divide-gray-100">
                      {loading ? (
                        <tr>
                          <td colSpan={8} className="text-center py-12">
                            <div className="flex items-center justify-center space-x-2">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                              <span className="text-gray-500">Loading ledger entries...</span>
                            </div>
                          </td>
                        </tr>
                      ) : !ledgerData || memoizedDisplayEntries.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="text-center py-12 text-gray-500">
                            <div className="flex flex-col items-center space-y-2">
                              <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span>{showOldRecords ? 'No old records found' : 'No ledger entries found'}</span>
                            </div>
                          </td>
                        </tr>
                      ) : (
                                                memoizedDisplayEntries.map((entry, index) => {
                          const entryId = entry.id || entry._id || entry.ti || `entry_${index}`;
                          const entryIdString = entryId.toString();
                          const isSelected = selectedEntries.includes(entryIdString);
                          
                          return (
                            <TableRow
                              key={entryIdString}
                              entry={entry}
                              index={index}
                              isSelected={isSelected}
                              onCheckboxChange={handleCheckboxChange}
                            />
                          );
                        })
                  )}
                </tbody>
              </table>
            </div>
          </div>

              {/* Form Section - Right after table */}
              <div className="mt-6 bg-white rounded-xl shadow-lg border border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">Add New Entry</h3>
                  <div className="text-xs text-gray-500">
                    <strong>Format:</strong> Party Name(Remarks) | <strong>Type:</strong> + for Credit, - for Debit | <strong>Commission:</strong> Type "commission" in party name for last transaction
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Party Name</label>
                    <div className="relative party-dropdown-container">
                    <div className="relative">
                      <input
                        ref={setInputRef}
                        type="text"
                        value={newEntry.partyName}
                    onChange={(e) => {
                          const value = e.target.value;
                          handlePartyNameChange(value);
                          
                          if (value.trim()) {
                            // Filter parties when typing
                            filterParties(value);
                            setShowPartyDropdown(true);
                          } else {
                            // Show available parties (excluding current) when input is empty
                            const availablePartiesExcludingCurrent = allPartiesForTransaction.filter(party => 
                              (party.party_name || party.name) !== selectedPartyName
                            );
                            setFilteredParties(availablePartiesExcludingCurrent);
                            setHighlightedIndex(-1);
                            setShowPartyDropdown(true);
                          }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        // Ctrl+Enter submits form, Enter selects party
                        if (e.ctrlKey) {
                          handleAddEntry();
                        } else {
                          // Enter key selects party for form filling (not submit)
                          if (showInlineSuggestion && autoCompleteText) {
                            handleTabComplete();
                          } else if (filteredParties.length > 0) {
                            handleAutoComplete();
                          }
                        }
                                              } else if (e.key === 'Tab') {
                          e.preventDefault();
                          // Tab key: Accept suggestion first, then move to next field
                          if (showInlineSuggestion && autoCompleteText) {
                            handleTabComplete();
                          } else {
                            // Move to next field (Amount field)
                            const amountField = document.querySelector('input[placeholder*="Credit"], input[placeholder*="Debit"]') as HTMLInputElement;
                            if (amountField) {
                              amountField.focus();
                            }
                          }
                      } else if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setHighlightedIndex(prev => 
                          prev < filteredParties.length - 1 ? prev + 1 : 0
                        );
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setHighlightedIndex(prev => 
                          prev > 0 ? prev - 1 : filteredParties.length - 1
                        );
                      } else if (e.key === 'Escape') {
                        setShowPartyDropdown(false);
                        setHighlightedIndex(-1);
                        setAutoCompleteText('');
                        setShowInlineSuggestion(false);
                      } else if (e.key === 'ArrowRight' && showInlineSuggestion) {
                        e.preventDefault();
                        handleTabComplete();
                      }
                    }}
                    onFocus={() => {
                          setShowPartyDropdown(true);
                          // Show available parties (excluding current) when focusing on bottom dropdown
                          const availablePartiesExcludingCurrent = allPartiesForTransaction.filter(party => 
                            (party.party_name || party.name) !== selectedPartyName
                          );
                          setFilteredParties(availablePartiesExcludingCurrent);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-transparent relative z-10"
                        placeholder="Search party name"
                        autoComplete="off"
                      />
                      {/* VS Code style inline suggestion */}
                      {showInlineSuggestion && autoCompleteText && (
                        <div 
                          className="absolute top-0 left-0 text-gray-400 pointer-events-none z-0"
                          style={{ 
                            left: `${textWidth + 12}px`, // 12px for padding
                            top: '8px',
                            fontSize: '14px',
                            lineHeight: '20px',
                            whiteSpace: 'nowrap',
                            fontFamily: 'inherit',
                            color: '#9CA3AF'
                          }}
                        >
                          {autoCompleteText}
                        </div>
                      )}
                    </div>
                      {showPartyDropdown && (
                        <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto z-10 mt-1">
                          {partiesLoading ? (
                            <div className="px-3 py-2 text-sm text-gray-500">Loading parties...</div>
                          ) : filteredParties.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-gray-500">No parties found</div>
                          ) : (
                            filteredParties.map((party, index) => (
                              <div
                                key={party.id || party._id || party.party_name || party.name}
                                className={`px-3 py-2 text-sm cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors duration-150 ${
                                  index === highlightedIndex 
                                    ? 'bg-blue-100 text-blue-900 font-medium' 
                                    : 'hover:bg-blue-50'
                                }`}
                                onClick={() => {
                                  const partyName = party.party_name || party.name;
                                  handlePartySelect(partyName);
                                  
                                  // Auto-fill commission if commission is selected
                                  if (partyName.toLowerCase().trim() === 'commission') {
                                    handleCommissionAutoFill();
                                  }
                                }}
                                onMouseEnter={() => setHighlightedIndex(index)}
                              >
                                {party.party_name || party.name}
                              </div>
                            ))
                          )}
                        </div>
                      )}
                  </div>
                </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Amount (+ for Credit, - for Debit)</label>
                <input
                  type="number"
                  step="1"
                  value={newEntry.amount}
                      onChange={(e) => {
                        setNewEntry(prev => ({ ...prev, amount: e.target.value }));
                        // Mark as manual entry if user manually changes commission amount
                        if (newEntry.partyName?.toLowerCase().trim() === 'commission' && e.target.value !== '') {
                          setIsManualCommissionAmount(true);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Tab') {
                          e.preventDefault();
                          // Move to next field (Remarks field)
                          const remarksField = document.querySelector('input[placeholder*="Additional remarks"]') as HTMLInputElement;
                          if (remarksField) {
                            remarksField.focus();
                          }
                        } else if (e.key === 'Enter') {
                          e.preventDefault();
                          // Enter submits form
                          handleAddEntry();
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      placeholder="+10000 for Credit, -5000 for Debit"
                />
              </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Remarks</label>
                <input
                  type="text"
                  value={newEntry.remarks}
                      onChange={(e) => setNewEntry(prev => ({ ...prev, remarks: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Tab') {
                          e.preventDefault();
                          // Move to next field (Add Entry button)
                          const addButton = document.querySelector('button[onClick*="handleAddEntry"]') as HTMLButtonElement;
                          if (addButton) {
                            addButton.focus();
                          }
                        } else if (e.key === 'Enter') {
                          e.preventDefault();
                          // Enter submits form
                          handleAddEntry();
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      placeholder="Additional remarks (will show as Party Name(Remarks))"
                />
              </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">&nbsp;</label>
                    <button
                  onClick={() => {
                    if (isCompanyParty(selectedPartyName, companyName)) {
                      toast({
                        title: "Company Party Restriction",
                        description: getCompanyPartyRestrictionMessage(),
                        variant: "destructive"
                      });
                      return;
                    }
                    if (isCommissionParty(selectedPartyName)) {
                      toast({
                        title: "Commission Party Restriction",
                        description: getCommissionPartyRestrictionMessage(),
                        variant: "destructive"
                      });
                      return;
                    }
                    handleAddEntry();
                  }}
                      disabled={actionLoading || !isTransactionAdditionAllowed(selectedPartyName, companyName)}
                      className={`w-full px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-all duration-200 transform hover:scale-105 ${
                        isCompanyParty(selectedPartyName, companyName) || isCommissionParty(selectedPartyName)
                          ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                          : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white'
                      }`}
                      title={isCompanyParty(selectedPartyName, companyName) ? getCompanyPartyRestrictionMessage() : isCommissionParty(selectedPartyName) ? getCommissionPartyRestrictionMessage() : ''}
                    >
                      {actionLoading ? (
                        <div className="flex items-center justify-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Adding...</span>
                        </div>
                      ) : (
                        'Add Entry (Ctrl+Enter)'
                      )}
                    </button>
                  </div>
              </div>
            </div>
          </div>
          
          {/* Main Content - Ledger Tables */}
          <div className="p-6 pt-0">
            {/* Ledger Table */}
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-800">Account Ledger Entries</h2>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          checked={selectedEntries.length === displayEntries.length && displayEntries.length > 0}
                          onChange={handleCheckAll}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Party Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credit</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Debit</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Select</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {displayEntries.map((entry, index) => (
                      <TableRow
                        key={entry.id || entry._id || entry.ti || index}
                        entry={entry}
                        index={index}
                        isSelected={selectedEntries.includes((entry.id || entry._id || entry.ti || '').toString())}
                        onCheckboxChange={handleCheckboxChange}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side Action Buttons */}
        <div className="w-64 bg-white shadow-lg border-l border-gray-200 p-6 rounded-l-lg">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Actions</h3>
              <div className="text-sm text-gray-600 mb-4">
                Selected: {selectedEntries.length} entries
              </div>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={handleRefresh}
                disabled={actionLoading}
                className="w-full px-4 py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Refresh All</span>
              </button>
              
              <button
                onClick={createMissingEntries}
                disabled={actionLoading}
                className="w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                </svg>
                <span>Create Missing Entries</span>
              </button>
              
              <button
                onClick={() => toast({ title: "Info", description: "DC Report functionality coming soon" })}
                className="w-full px-4 py-3 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>DC Report</span>
              </button>
              
                          <button
              onClick={() => {
                if (isCompanyParty(selectedPartyName, companyName)) {
                  toast({
                    title: "Company Party Restriction",
                    description: getCompanyPartyRestrictionMessage(),
                    variant: "destructive"
                  });
                  return;
                }
                if (isCommissionParty(selectedPartyName)) {
                  toast({
                    title: "Commission Party Restriction",
                    description: getCommissionPartyRestrictionMessage(),
                    variant: "destructive"
                  });
                  return;
                }
                setShowMondayFinalModal(true);
              }}
              disabled={actionLoading || !isMondayFinalAllowed(selectedPartyName, companyName)}
              className={`w-full px-4 py-3 rounded-lg text-sm font-medium disabled:opacity-50 transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2 ${
                isCompanyParty(selectedPartyName, companyName) || isCommissionParty(selectedPartyName)
                  ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white'
              }`}
              title={isCompanyParty(selectedPartyName, companyName) ? getCompanyPartyRestrictionMessage() : isCommissionParty(selectedPartyName) ? getCommissionPartyRestrictionMessage() : ''}
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Monday Final</span>
              </button>
              
              <button
                onClick={() => setShowOldRecords(!showOldRecords)}
                className="w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{showOldRecords ? 'Current Records' : 'Old Record'}</span>
              </button>
              
              <button
              onClick={() => {
                if (isCompanyParty(selectedPartyName, companyName)) {
                  toast({
                    title: "Company Party Restriction",
                    description: getCompanyPartyRestrictionMessage(),
                    variant: "destructive"
                  });
                  return;
                }
                if (isCommissionParty(selectedPartyName)) {
                  toast({
                    title: "Commission Party Restriction",
                    description: getCommissionPartyRestrictionMessage(),
                    variant: "destructive"
                  });
                  return;
                }
                if (selectedEntries.length === 1) {
                  const displayEntries = showOldRecords ? ledgerData.oldRecords : ledgerData.ledgerEntries;
                  const selectedEntry = displayEntries.find(entry => 
                    (entry.id || entry._id || entry.ti || '').toString() === selectedEntries[0]
                  );
                  if (selectedEntry) {
                    setEditingEntry({...selectedEntry});
                    setShowModifyModal(true);
                  }
                }
              }}
              disabled={selectedEntries.length !== 1 || selectedEntries.some(entryId => {
                const displayEntries = showOldRecords ? ledgerData?.oldRecords : ledgerData?.ledgerEntries;
                const entry = displayEntries?.find(e => (e.id || e._id || e.ti || '').toString() === entryId);
                return entry?.is_old_record === true;
              }) || isCompanyParty(selectedPartyName, companyName) || isCommissionParty(selectedPartyName)}
                className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2"
                title={selectedEntries.some(entryId => {
                  const displayEntries = showOldRecords ? ledgerData?.oldRecords : ledgerData?.ledgerEntries;
                  const entry = displayEntries?.find(e => (e.id || e._id || e.ti || '').toString() === entryId);
                  return entry?.is_old_record === true;
                }) ? "Cannot modify old records. Delete Monday Final entry first to unsettle transactions." : ""}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>Modify</span>
              </button>
              
              <button
              onClick={() => {
                if (isCompanyParty(selectedPartyName, companyName)) {
                  toast({
                    title: "Company Party Restriction",
                    description: getCompanyPartyRestrictionMessage(),
                    variant: "destructive"
                  });
                  return;
                }
                if (isCommissionParty(selectedPartyName)) {
                  toast({
                    title: "Commission Party Restriction",
                    description: getCommissionPartyRestrictionMessage(),
                    variant: "destructive"
                  });
                  return;
                }
                setShowDeleteModal(true);
              }}
              disabled={selectedEntries.length === 0 || isCompanyParty(selectedPartyName, companyName) || isCommissionParty(selectedPartyName)}
                className="w-full px-4 py-3 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2"
                title="Delete selected entries"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Delete</span>
              </button>
              
              <button
              onClick={handlePrint}
                className="w-full px-4 py-3 bg-gradient-to-r from-teal-500 to-green-500 hover:from-teal-600 hover:to-green-600 text-white rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span>Print</span>
              </button>
              
              <button
                onClick={handleCheckAll}
                className="w-full px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Check All</span>
              </button>
              
              <button
              onClick={handleExit}
                className="w-full px-4 py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Exit</span>
              </button>
          </div>
        </div>
      </div>



      </div>

      {/* Monday Final Modal - Temporary Simple Version */}
      {showMondayFinalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Monday Final Settlement</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to process Monday Final settlement for selected entries?
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowMondayFinalModal(false)}
                disabled={actionLoading}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleMondayFinal}
                disabled={actionLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {actionLoading ? 'Processing...' : 'Confirm Settlement'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Original AlertDialog - Commented Out for Testing */}
      {/* <AlertDialog open={showMondayFinalModal}         onOpenChange={(open) => {
          setShowMondayFinalModal(open);
        }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Monday Final Settlement</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to process Monday Final settlement for selected entries?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMondayFinal}
              disabled={actionLoading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {actionLoading ? 'Processing...' : 'Confirm Settlement'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog> */}

      {/* Modify Entry Modal */}
      <AlertDialog open={showModifyModal} onOpenChange={(open) => {
        setShowModifyModal(open);
        if (!open) setEditingEntry(null);
      }}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Modify Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Edit the details for the selected transaction entry.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {/* Editing Form */}
          {editingEntry && (
            <div className="space-y-4 py-4">
              {/* Transaction Type */}
              <div>
                <label className="block text-sm font-medium mb-2">Transaction Type</label>
                <select
                  value={editingEntry.tnsType}
                  onChange={(e) => setEditingEntry({...editingEntry, tnsType: e.target.value as 'CR' | 'DR'})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="CR">Credit (CR)</option>
                  <option value="DR">Debit (DR)</option>
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium mb-2">Amount</label>
                <input
                  type="number"
                  value={editingEntry.tnsType === 'CR' ? (editingEntry.credit || 0) : (editingEntry.debit || 0)}
                  onChange={(e) => {
                    const amount = parseFloat(e.target.value) || 0;
                    if (editingEntry.tnsType === 'CR') {
                      setEditingEntry({...editingEntry, credit: amount, debit: 0});
                    } else {
                      setEditingEntry({...editingEntry, debit: amount, credit: 0});
                    }
                  }}
                  placeholder="Enter amount"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-sm font-medium mb-2">Remarks</label>
                <input
                  type="text"
                  value={editingEntry.remarks || ''}
                  onChange={(e) => setEditingEntry({...editingEntry, remarks: e.target.value})}
                  placeholder="Enter remarks"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
          
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleModifyEntry}
              disabled={actionLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {actionLoading ? 'Saving...' : 'Save Changes'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Entry Modal */}
      <AlertDialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the selected entry? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEntry}
              disabled={actionLoading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {actionLoading ? 'Deleting...' : 'Delete Entry'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      </div>
    </div>
  );
};

export default AccountLedger;