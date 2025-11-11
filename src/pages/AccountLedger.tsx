import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { ledgerSlice, setPageMetadata } from '../store/slices/ledgerSlice';
import { partiesSlice } from '../store/slices/partiesSlice';
import { uiSlice } from '../store/slices/uiSlice';
import { partyLedgerAPI } from '../lib/api';
import {
  deleteLedgerEntries,
  applyOptimisticDelete
} from '../store/services/ledgerService';
import { loadAccountLedgerPage } from '../store/services/accountLedgerService';
import { useToast } from '@/hooks/use-toast';
import { setCompanyName } from '../store/slices/authSlice';
import TopNavigation from '@/components/TopNavigation';
import LedgerTable from '@/components/LedgerTable';
import ActionButtons from '@/components/ActionButtons';
import TransactionAddForm from '@/components/TransactionAddForm';
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



const AccountLedgerComponent = () => {
  const navigate = useNavigate();
  const { partyName: initialPartyName } = useParams<{ partyName: string }>();
  const { toast } = useToast();

  // Redux dispatch
  const dispatch = useAppDispatch();

  // Redux state - actually connected now!
  const authState = useAppSelector(state => state.auth) as any;
  const ledgerState = useAppSelector(state => state.ledger) as any;
  const partiesState = useAppSelector(state => state.parties) as any;
  const uiState = useAppSelector(state => state.ui) as any;

  // Fallback values for Redux state
  const { companyName } = authState || {};
  const {
    data: ledgerData,
    isLoading: loading = false,
    selectedPartyName = initialPartyName || '',
    filters = { showOldRecords: false },
    userSettings: pageUserSettings = null
  } = ledgerState || {};

  const {
    availableParties = [],
    filteredTopParties = [],
    isLoading: partiesLoading = false
  } = partiesState || {};
  const {
    isActionLoading: actionLoading = false,
    selectedEntries = [],
    showTopPartyDropdown = false,
    typingPartyName = initialPartyName || '',
    topAutoCompleteText = '',
    showTopInlineSuggestion = false,
    topHighlightedIndex = -1,
  } = uiState || {};

  // Show loading if Redux state is not properly initialized - temporarily disabled
  // if (!ledgerState || !partiesState || !uiState) {
  //   return (
  //     <div className="min-h-screen bg-gray-50">
  //       <div className="bg-blue-800 text-white p-2">
  //         <h1 className="text-lg font-bold">Account Ledger</h1>
  //       </div>
  //       <div className="text-center py-8">
  //         <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
  //         <p className="text-gray-600">Initializing application...</p>
  //       </div>
  //     </div>
  //   );
  // }

  // Local state for delete functionality
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Extract showOldRecords with default
  const showOldRecords = filters?.showOldRecords ?? false;

  const hasBootstrappedRef = useRef(false);
  const lastLoadedPartyRef = useRef<string | null>(null);
  const [showMondayFinalDialog, setShowMondayFinalDialog] = useState(false);
  const [pendingMondayFinalAction, setPendingMondayFinalAction] = useState<'create' | 'delete' | null>(null);

  const derivedCompanyName = companyName || pageUserSettings?.company_account || 'Company';

  const mondayFinalData = ledgerData?.mondayFinalData;
  const hasActiveMondayFinal = Boolean(mondayFinalData?.latestEntryId);
  const globalBusy = loading || actionLoading;

  const hydrateFromCache = useCallback((partyToLoad?: string) => {
    if (typeof window === 'undefined') {
      return false;
    }

    const cacheKey = `ledger-cache-${partyToLoad || 'default'}`;
    const cachedPayload = window.sessionStorage.getItem(cacheKey);

    if (!cachedPayload) {
      return false;
    }

    try {
      const cached = JSON.parse(cachedPayload);

      if (Array.isArray(cached.parties) && cached.parties.length) {
        dispatch(partiesSlice.actions.setParties(cached.parties));
      }

      if (cached.companyName) {
        dispatch(setCompanyName(cached.companyName));
      }

      dispatch(
        setPageMetadata({
          stats: cached.stats ?? null,
          userSettings: cached.userSettings ?? null,
          performance: null,
        }),
      );

      if (cached.ledgerData) {
        dispatch(ledgerSlice.actions.setLedgerData(cached.ledgerData));
      }

      if (cached.selectedPartyName) {
        dispatch(ledgerSlice.actions.setSelectedPartyName(cached.selectedPartyName));
        dispatch(uiSlice.actions.setTypingPartyName(cached.selectedPartyName));
        lastLoadedPartyRef.current = cached.selectedPartyName;
      }

      hasBootstrappedRef.current = true;
      return true;
    } catch (error) {
      console.warn('⚠️ Failed to hydrate ledger cache:', error);
      return false;
    }
  }, [dispatch]);

  const initializeAccountLedger = useCallback(async (partyToLoad?: string, options?: { forceRefresh?: boolean }) => {
    const forceRefresh = options?.forceRefresh ?? true;
    try {
      const result = await dispatch(
        loadAccountLedgerPage({
          partyName: partyToLoad,
          forceRefresh
        })
      ).unwrap();

      hasBootstrappedRef.current = true;
      if (result?.selectedPartyName) {
        lastLoadedPartyRef.current = result.selectedPartyName;
      } else if (partyToLoad) {
        lastLoadedPartyRef.current = partyToLoad;
      } else {
        lastLoadedPartyRef.current = null;
      }

      setRefreshKey(prev => prev + 1);
    } catch (error) {
      hasBootstrappedRef.current = true;
      console.error('❌ Failed to initialize account ledger page:', error);
    }
  }, [dispatch]);

  // Initialize data on component mount
  useEffect(() => {
    const decodedPartyName = initialPartyName ? decodeURIComponent(initialPartyName) : undefined;

    const hydrated = hydrateFromCache(decodedPartyName);

    if (!hydrated && decodedPartyName) {
      dispatch(ledgerSlice.actions.setSelectedPartyName(decodedPartyName));
      dispatch(uiSlice.actions.setTypingPartyName(decodedPartyName));
    }

    initializeAccountLedger(decodedPartyName, { forceRefresh: !hydrated });
  }, [initialPartyName, initializeAccountLedger, hydrateFromCache, dispatch]);

  // Update Redux typing state when selected party changes (only if not currently typing)
  useEffect(() => {
    // Only update if we're not currently in typing mode and the selected party changed
    if (selectedPartyName && selectedPartyName !== typingPartyName && !showTopPartyDropdown) {
      dispatch(uiSlice.actions.setTypingPartyName(selectedPartyName));
    }
  }, [selectedPartyName, typingPartyName, showTopPartyDropdown]);

  // Load ledger data when selected party changes using Redux Thunk
  useEffect(() => {
    if (!selectedPartyName) {
      return;
    }

    if (!hasBootstrappedRef.current) {
      return;
    }

    if (selectedPartyName === lastLoadedPartyRef.current) {
      return;
    }

    let isCancelled = false;

    const loadLedgerData = async () => {
      try {
        const result = await dispatch(
          loadAccountLedgerPage({
            partyName: selectedPartyName,
            forceRefresh: false
          })
        ).unwrap();
        if (!isCancelled) {
          lastLoadedPartyRef.current = result?.selectedPartyName || selectedPartyName;
          setRefreshKey(prev => prev + 1); // Force table re-render
        }
      } catch (error) {
        if (!isCancelled) {
          console.error('Error loading ledger data via Redux:', error);
        }
      }
    };

    loadLedgerData();

    return () => {
      isCancelled = true;
    };
  }, [selectedPartyName, dispatch]);

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;

      // Add small delay to ensure focus events happen first
      setTimeout(() => {
        // Handle top section dropdown
        if (!target.closest('.top-party-dropdown-container')) {
          dispatch(uiSlice.actions.setShowTopPartyDropdown(false));
          dispatch(uiSlice.actions.setTopAutoCompleteText(''));
          dispatch(uiSlice.actions.setShowTopInlineSuggestion(false));

          // If input is empty, restore selected party name
          if (!typingPartyName && selectedPartyName) {
            dispatch(uiSlice.actions.setTypingPartyName(selectedPartyName));
          }
        }

        // Handle transaction form dropdown
        if (!target.closest('.transaction-party-dropdown-container')) {
          dispatch(uiSlice.actions.setShowTransactionPartyDropdown(false));
          dispatch(uiSlice.actions.setTransactionAutoCompleteText(''));
          dispatch(uiSlice.actions.setShowTransactionInlineSuggestion(false));
        }
      }, 10); // Small delay to let focus events complete
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [typingPartyName, selectedPartyName]);

  // Redux handlers - now with actual functionality
  const handleEntrySelect = (id: string | number, checked: boolean) => {
    if (checked) {
      dispatch(uiSlice.actions.addSelectedEntry(String(id)));
      } else {
      dispatch(uiSlice.actions.removeSelectedEntry(String(id)));
    }
  };

  // Party Selection Functions using Redux with Auto-complete
  const handlePartyNameChange = (value: string) => {
    // Update Redux typing state for immediate UI feedback
    dispatch(uiSlice.actions.setTypingPartyName(value));

    // Update Redux search term for filtering
    dispatch(partiesSlice.actions.setTopSearchTerm(value));

    // Reset highlighted index when typing
    dispatch(uiSlice.actions.setTopHighlightedIndex(-1));

    // Filter parties based on input
    if (value.trim()) {
      const filtered = availableParties.filter(party => {
        const partyName = party.party_name || party.name;
        const searchLower = value.toLowerCase();
        const partyLower = partyName.toLowerCase();

        // Exclude current party
        if (partyName === selectedPartyName) return false;

        // Check if party name starts with search term
        return partyLower.startsWith(searchLower);
      });

      // Sort by relevance (exact matches first, then alphabetical)
      const sortedFiltered = filtered.sort((a, b) => {
        const aName = (a.party_name || a.name).toLowerCase();
        const bName = (b.party_name || b.name).toLowerCase();
        const searchLower = value.toLowerCase();

        // Exact match gets highest priority
        if (aName === searchLower && bName !== searchLower) return -1;
        if (bName === searchLower && aName !== searchLower) return 1;

        // Then alphabetical order
        return aName.localeCompare(bName);
      });

      dispatch(partiesSlice.actions.setFilteredTopParties(sortedFiltered));

      // Auto-complete suggestion logic - find the best match
      if (sortedFiltered.length > 0) {
        const bestMatch = sortedFiltered[0];
        const partyName = bestMatch.party_name || bestMatch.name;
        const searchLower = value.toLowerCase();
        const partyLower = partyName.toLowerCase();

        // Only show suggestion if it's a meaningful completion
        if (partyLower.startsWith(searchLower) &&
            partyLower !== searchLower &&
            partyName.length > value.length) {
          const autoCompleteText = partyName.substring(value.length);
          dispatch(uiSlice.actions.setTopAutoCompleteText(autoCompleteText));
          dispatch(uiSlice.actions.setShowTopInlineSuggestion(true));
      } else {
          dispatch(uiSlice.actions.setTopAutoCompleteText(''));
          dispatch(uiSlice.actions.setShowTopInlineSuggestion(false));
      }
    } else {
        dispatch(uiSlice.actions.setTopAutoCompleteText(''));
        dispatch(uiSlice.actions.setShowTopInlineSuggestion(false));
      }

      dispatch(uiSlice.actions.setShowTopPartyDropdown(true));
    } else {
      // Show all available parties when input is empty
      const availablePartiesExcludingCurrent = availableParties.filter(party =>
        (party.party_name || party.name) !== selectedPartyName
      );
      dispatch(partiesSlice.actions.setFilteredTopParties(availablePartiesExcludingCurrent));
      dispatch(uiSlice.actions.setTopAutoCompleteText(''));
      dispatch(uiSlice.actions.setShowTopInlineSuggestion(false));
      dispatch(uiSlice.actions.setShowTopPartyDropdown(true));
    }
  };

  // Show dropdown when input is focused
  const handleInputFocus = () => {
    // Show dropdown when input is focused (don't clear the name)
    if (availableParties.length > 0) {
      dispatch(uiSlice.actions.setShowTopPartyDropdown(true));
      // Filter and show all available parties
      const filtered = availableParties.filter(party => {
        const partyName = party.party_name || party.name;
        return partyName.toLowerCase().includes(typingPartyName.toLowerCase());
      });
      dispatch(partiesSlice.actions.setFilteredTopParties(filtered));
    }
  };

  // Calculate text width for proper auto-complete positioning
  const calculateTextWidth = (text: string) => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return 16; // Default padding

    // Use the same font as the input field
    context.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    return context.measureText(text).width + 16; // 16px for padding
  };

  const handlePartySelect = (partyName: string) => {
    // Navigate to the new party URL
    navigate(`/account-ledger/${encodeURIComponent(partyName)}`);

    // Update Redux state for selected party
    dispatch(ledgerSlice.actions.setSelectedPartyName(partyName));

    // Update Redux typing state
    dispatch(uiSlice.actions.setTypingPartyName(partyName));

    // Close dropdown and clear search
    dispatch(uiSlice.actions.setShowTopPartyDropdown(false));
    dispatch(partiesSlice.actions.setTopSearchTerm(''));

    // Clear autocomplete
    dispatch(uiSlice.actions.setTopAutoCompleteText(''));
    dispatch(uiSlice.actions.setShowTopInlineSuggestion(false));
    dispatch(uiSlice.actions.setTopHighlightedIndex(-1));

    // Show success toast
      toast({
      title: "Party Selected",
      description: `Loading ledger for ${partyName}`,
      duration: 2000,
    });

    // Load ledger data for the selected party will be handled by useEffect
  };

  // Auto-complete functionality - Tab key to accept suggestion
  const handleAutoComplete = () => {
    if (filteredTopParties.length > 0) {
      const selectedParty = filteredTopParties[0];
      const partyName = selectedParty.party_name || selectedParty.name;
      handlePartySelect(partyName);
    }
  };

  // Tab completion functionality - Tab key to accept suggestion
  const handleTabComplete = () => {
    if (showTopInlineSuggestion && topAutoCompleteText) {
      const currentValue = typingPartyName;
      const completedValue = currentValue + topAutoCompleteText;

      // Find the party that matches this completed value
      const matchingParty = filteredTopParties.find(party => {
        const partyName = party.party_name || party.name;
        return partyName.toLowerCase() === completedValue.toLowerCase();
      });

      if (matchingParty) {
        handlePartySelect(matchingParty.party_name || matchingParty.name);
          } else {
        // Fallback: just update the input without navigation
        dispatch(uiSlice.actions.setTypingPartyName(completedValue));
        dispatch(uiSlice.actions.setTopAutoCompleteText(''));
        dispatch(uiSlice.actions.setShowTopInlineSuggestion(false));
        dispatch(uiSlice.actions.setShowTopPartyDropdown(false));
      }
    }
  };

  // Delete selected entries handler with real-time updates
  const handleDeleteSelected = async () => {
    if (selectedEntries.length === 0) {
      toast({
        title: "No Selection",
        description: "Please select entries to delete.",
        variant: "destructive",
      });
      return;
    }

    // Check if any selected entries are old records AND Monday Final exists
    const entriesToDisplay = ledgerData ? (showOldRecords ? (ledgerData.oldRecords || []) : (ledgerData.ledgerEntries || [])) : [];
    const selectedOldRecords = selectedEntries.filter(entryId => {
      const entry = entriesToDisplay.find((e: any) => (e.id || e._id || e.ti) === entryId);
      return entry?.is_old_record === true;
    });

    // Only prevent deletion if Monday Final exists AND old records are selected
    if (selectedOldRecords.length > 0 && ledgerData?.mondayFinalData?.id) {
      toast({
        title: "Cannot Delete Old Records",
        description: `${selectedOldRecords.length} selected entries are old records that were settled in Monday Final. Delete the Monday Final entry first to unsettle these transactions.`,
        variant: "destructive",
      });
      setShowDeleteDialog(false);
      return;
    }

    setIsDeleting(true);

    try {
      // Use Redux Thunk action for deleting entries with optimistic updates

      // Apply optimistic delete immediately
      await dispatch(applyOptimisticDelete({
        deletedIds: selectedEntries,
        showOldRecords
      }));


      // Clear selected entries immediately
      dispatch(uiSlice.actions.clearSelectedEntries());


      // Call API to delete entries via Redux Thunk
      const result = await dispatch(deleteLedgerEntries({
        entryIds: selectedEntries,
        showOldRecords
      }));

      if (deleteLedgerEntries.fulfilled.match(result)) {
        console.log('✅ Entries deleted successfully via Redux:', result.payload);

          // Auto-refresh after successful deletion to ensure data consistency
          // Note: Disabled auto-refresh to prevent data loss due to backend caching issues
          // setTimeout(async () => {
          //   console.log('🔄 Auto-refreshing after deletion to ensure data consistency');
          //   await handleRefresh(true);
          // }, 2000); // Wait 2 seconds before refresh to allow backend transaction to commit

        toast({
          title: "Entries Deleted",
          description: `Successfully deleted ${result.payload.successfulCount} entries.`,
          duration: 2000,
        });
      } else {
        console.error('❌ Failed to delete entries via Redux:', result.payload);

        // Revert optimistic update if deletion failed with auto-refresh
        // Note: Disabled auto-refresh to prevent data loss due to backend caching issues
        // setTimeout(async () => {
        //   console.log('🔄 Auto-refreshing after delete failure to ensure data consistency');
        //   await handleRefresh(true);
        // }, 1000); // Wait 1 second before refresh

        toast({
          title: "Deletion Failed",
          description: result.payload as string || "Failed to delete entries. They might be old records or have other restrictions.",
          variant: "destructive",
          duration: 3000,
        });
      }

    } catch (error: any) {
      console.error('❌ Error deleting entries:', error);

      // Revert optimistic update on error with auto-refresh
      // Note: Disabled auto-refresh to prevent data loss due to backend caching issues
      // setTimeout(async () => {
      //   console.log('🔄 Auto-refreshing after delete error to ensure data consistency');
      //   await handleRefresh(true);
      // }, 1000); // Wait 1 second before refresh

      toast({
        title: "Error",
        description: error.message || "Failed to delete entries",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  // Handle delete button click
  const handleDeleteClick = () => {
    if (selectedEntries.length === 0) {
      toast({
        title: "No Selection",
        description: "Please select entries to delete.",
        variant: "destructive",
      });
      return;
    }
    setShowDeleteDialog(true);
  };

  // Handle check all button click
  const handleCheckAll = () => {
    // Determine which entries to display (same logic as displayEntries)
    const entriesToDisplay = ledgerData ? (showOldRecords ? (ledgerData.oldRecords || []) : (ledgerData.ledgerEntries || [])) : [];

    if (entriesToDisplay.length === 0) {
      toast({
        title: "No Entries",
        description: "No entries available to select.",
        variant: "destructive",
      });
      return;
    }

    // Get all entry IDs from display entries
    const allEntryIds = entriesToDisplay.map((entry: any, index: number) => {
      const entryId = entry.id || entry._id || entry.ti || `entry_${index}`;
      return typeof entryId === 'string' ? entryId : String(entryId);
    });

    // Select all entries
    dispatch(uiSlice.actions.setSelectedEntries(allEntryIds));

    toast({
      title: "All Entries Selected",
      description: `${allEntryIds.length} entries selected.`,
    });
  };

  const handleRefresh = useCallback(async (forceRefresh = false) => {
    if (!selectedPartyName) {
      if (forceRefresh) {
        toast({
          title: "No Party Selected",
          description: "Select a party to refresh ledger data.",
          variant: "destructive",
        });
      }
      return;
    }

    dispatch(uiSlice.actions.setActionLoading(true));
    try {
      const result = await dispatch(
        loadAccountLedgerPage({
          partyName: selectedPartyName,
          forceRefresh,
        })
      ).unwrap();

      lastLoadedPartyRef.current = result?.selectedPartyName || selectedPartyName;
      setRefreshKey((prev) => prev + 1);
    } catch (error: any) {
      console.error('❌ Error refreshing ledger data:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to refresh ledger data. Please try again.",
        variant: "destructive",
      });
    } finally {
      dispatch(uiSlice.actions.setActionLoading(false));
    }
  }, [dispatch, selectedPartyName, toast]);

  const handleToggleOldRecords = async () => {
    if (!selectedPartyName) {
      toast({
        title: "No Party Selected",
        description: "Please select a party first.",
        variant: "destructive",
      });
      return;
    }

    const nextValue = !showOldRecords;
    dispatch(ledgerSlice.actions.setFilters({ showOldRecords: nextValue }));

    toast({
      title: nextValue ? "Viewing Old Records" : "Viewing Current Entries",
      description: nextValue
        ? 'Showing transactions settled in previous Monday Finals.'
        : 'Showing active ledger transactions.',
    });

    await handleRefresh(true);
  };

  // Handle Monday Final button click (confirmation first)
  const handleMondayFinalClick = () => {
    if (!selectedPartyName) {
      toast({
        title: "No Party Selected",
        description: "Please select a party first.",
        variant: "destructive",
      });
      return;
    }

    if (hasActiveMondayFinal) {
      setPendingMondayFinalAction('delete');
    } else {
      setPendingMondayFinalAction('create');
    }
    setShowMondayFinalDialog(true);
  };

  const executeMondayFinal = useCallback(async () => {
    if (!selectedPartyName || !pendingMondayFinalAction) {
      setShowMondayFinalDialog(false);
      return;
    }

    dispatch(uiSlice.actions.setActionLoading(true));
    try {
      if (pendingMondayFinalAction === 'delete') {
        const entryId = ledgerData?.mondayFinalData?.latestEntryId;
        if (!entryId) {
          toast({
            title: "No Monday Final Found",
            description: "There is no Monday Final entry to delete.",
            variant: "destructive",
          });
          return;
        }

        const response = await partyLedgerAPI.deleteMondayFinalEntry(entryId);
        if (!response.success) {
          toast({
            title: "Error",
            description: response.message || "Failed to delete Monday Final entry",
            variant: "destructive",
          });
          return;
        }

        let unsettled = response.data?.unsettledTransactions ?? 0;
        const settlementDate = response.data?.settlementDate;

        if (unsettled === 0 && settlementDate) {
          try {
            const fallback = await partyLedgerAPI.unsettleTransactions(selectedPartyName, settlementDate);
            if (fallback?.success) {
              unsettled = fallback.data?.unsettledCount ?? unsettled;
            }
          } catch (fallbackError) {
            console.error('❌ Fallback unsettle failed:', fallbackError);
          }
        }

        toast({
          title: "Monday Final Deleted",
          description: `${unsettled} transactions moved back to current records.`,
        });
      } else {
        const currentEntries = ledgerData?.ledgerEntries || [];

        if (currentEntries.length === 0) {
          toast({
            title: "No Current Entries",
            description: "Add transactions before creating a Monday Final.",
            variant: "destructive",
          });
          return;
        }

        const response = await partyLedgerAPI.updateMondayFinal([selectedPartyName]);
        if (!response.success) {
          toast({
            title: "Error",
            description: response.message || "Failed to create Monday Final",
            variant: "destructive",
          });
          return;
        }

        const settledCount = response.data?.settledEntries ?? currentEntries.length;
        toast({
          title: "Monday Final Created",
          description: `${settledCount} transactions settled and archived as old records.`,
        });
      }

      await handleRefresh(true);
    } catch (error: any) {
      console.error('❌ Error with Monday Final:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to process Monday Final",
        variant: "destructive",
      });
    } finally {
      dispatch(uiSlice.actions.setActionLoading(false));
      setShowMondayFinalDialog(false);
      setPendingMondayFinalAction(null);
    }
  }, [dispatch, handleRefresh, ledgerData, pendingMondayFinalAction, selectedPartyName, toast, hasActiveMondayFinal]);


  const partySuggestions = useMemo((): string[] => {
    const names = (availableParties as Array<{ party_name?: string | null; name?: string | null }>)
      .reduce<string[]>((list, party) => {
        const rawName = party.party_name ?? party.name;
        if (typeof rawName === 'string') {
          const trimmed = rawName.trim();
          if (trimmed.length > 0) {
            list.push(trimmed);
          }
        }
        return list;
      }, []);

    const unique = Array.from(new Set<string>(names));
    return unique.sort((a, b) => a.localeCompare(b));
  }, [availableParties]);


  const handleShowOldRecords = (checked: boolean) => {
    dispatch(ledgerSlice.actions.setFilters({ showOldRecords: checked }));
  };

  const handleExit = () => {
    navigate('/');
  };

  // Loading state - temporarily disabled for debugging
  // if (loading) {
  //   return (
  //     <div className="min-h-screen bg-gray-100">
  //       <TopNavigation />
  //       <div className="bg-blue-800 text-white p-2">
  //         <h1 className="text-lg font-bold">Account Ledger</h1>
  //         </div>
  //       <div className="text-center py-8">
  //         <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
  //         <p className="text-gray-600">Loading ledger data...</p>
  //       </div>
  //     </div>
  //   );
  // }

  // Determine which entries to display
  const displayEntries = ledgerData ? (showOldRecords ? (ledgerData.oldRecords || []) : (ledgerData.ledgerEntries || [])) : [];


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <TopNavigation />

      {/* Main Content Area */}
      <div className="flex flex-col h-screen">
          {/* Top Section - Party Information */}
        <div className="bg-white shadow-lg border-b border-gray-200 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
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
                            // Select highlighted party
                            const selectedParty = filteredTopParties[topHighlightedIndex];
                            handlePartySelect(selectedParty.party_name || selectedParty.name);
                          } else if (showTopInlineSuggestion && topAutoCompleteText) {
                            handleTabComplete();
                          } else if (filteredTopParties.length > 0) {
                            handleAutoComplete();
                          }
                        } else if (e.key === 'Tab') {
                          e.preventDefault();
                          if (showTopInlineSuggestion && topAutoCompleteText) {
                            handleTabComplete();
                          }
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
                          // Clear input on Escape
                          dispatch(uiSlice.actions.setTypingPartyName(''));
                        }
                      }}
                      placeholder="Search party..."
                      className="w-80 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent relative"
                      autoComplete="off"
                    />
                    {/* VS Code style inline suggestion */}
                    {showTopInlineSuggestion && topAutoCompleteText && (
                      <div className="absolute inset-y-0 left-0 text-gray-400 pointer-events-none z-0 flex items-center">
                        <span
                          style={{
                            marginLeft: `${calculateTextWidth(typingPartyName)}px`,
                            color: '#9CA3AF',
                            fontSize: '14px',
                            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                            whiteSpace: 'nowrap'
                          }}
                      >
                        {topAutoCompleteText}
                        </span>
                      </div>
                    )}
                  </div>

                  {showTopPartyDropdown && filteredTopParties.length > 0 && (
                    <div className="absolute top-full left-0 mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                      {filteredTopParties.slice(0, 10).map((party, index) => {
                        const partyName = party.party_name || party.name;
                        const searchTerm = typingPartyName.toLowerCase();
                        const partyNameLower = partyName.toLowerCase();
                        const isHighlighted = index === topHighlightedIndex;

                        // Highlight matching text
                        const matchIndex = partyNameLower.indexOf(searchTerm);
                        const beforeMatch = partyName.substring(0, matchIndex);
                        const matchText = partyName.substring(matchIndex, matchIndex + searchTerm.length);
                        const afterMatch = partyName.substring(matchIndex + searchTerm.length);

                        return (
                          <div
                            key={party._id}
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

              <div className="flex items-center space-x-3">
                <label className="text-sm font-semibold text-gray-700">Company:</label>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                  {derivedCompanyName}
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
                <div className="overflow-auto p-4" style={{ height: 'calc(100% - 60px)' }}>
                  <LedgerTable
                    key={`${selectedPartyName}-${refreshKey}`}
                    ledgerData={ledgerData}
                    showOldRecords={showOldRecords}
                    selectedEntries={selectedEntries}
                    onEntrySelect={handleEntrySelect}
                    loading={loading}
                  />
                </div>
              </div>

              {/* Transaction Form - Right after table */}
              <div className="mt-6">
                <TransactionAddForm
                  selectedPartyName={selectedPartyName}
                  partySuggestions={partySuggestions}
                  disabled={globalBusy}
                />
              </div>

          </div>
        </div>

          {/* Right Side Action Buttons */}
          <div className="w-64 bg-white shadow-lg border-l border-gray-200 p-6 flex flex-col h-full">
            <ActionButtons
              onRefresh={() => handleRefresh(true)}
              onDCReport={() => {}}
              onMondayFinal={handleMondayFinalClick}
              onOldRecord={handleToggleOldRecords}
              showOldRecords={showOldRecords}
              onModify={() => {}}
              onDelete={handleDeleteClick}
              onPrint={() => {}}
              onCheckAll={handleCheckAll}
              onExit={handleExit}
            />
            </div>
          </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Entries</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedEntries.length} selected entries? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleDeleteSelected}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Monday Final Confirmation Dialog */}
      <AlertDialog open={showMondayFinalDialog} onOpenChange={setShowMondayFinalDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingMondayFinalAction === 'delete' ? 'Delete Monday Final Settlement' : 'Create Monday Final Settlement'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingMondayFinalAction === 'delete'
                ? 'This will unsettle the latest Monday Final and move the transactions back to current records.'
                : 'This will settle the current transactions and move them to old records.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={actionLoading}
              onClick={() => setPendingMondayFinalAction(null)}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className={pendingMondayFinalAction === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-600 hover:bg-orange-700'}
              onClick={executeMondayFinal}
              disabled={actionLoading}
            >
              {actionLoading
                ? 'Working…'
                : pendingMondayFinalAction === 'delete'
                  ? 'Delete Monday Final'
                  : 'Create Monday Final'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
      </div>
  );
};

export default AccountLedgerComponent;
