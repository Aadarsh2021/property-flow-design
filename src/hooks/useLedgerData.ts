import { useState, useCallback, useEffect, useRef } from 'react';
import { partyLedgerAPI } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { LedgerEntry, LedgerData } from '@/types';
import { clearCacheByPattern } from '@/lib/apiCache';

interface ErrorState {
  hasError: boolean;
  error: string | null;
  errorCode?: string;
  retryCount: number;
  lastErrorTime: number;
}

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

interface UseLedgerDataProps {
  selectedPartyName: string;
  showOldRecords: boolean;
  setShowOldRecords: (show: boolean) => void;
}

// Request queue to prevent concurrent API calls
const requestQueue = new Map<string, Promise<any>>();
const lastRequestTime = new Map<string, number>();
const MIN_REQUEST_INTERVAL = 500; // Minimum 500ms between requests for same party

// Clear request queue for a specific party
const clearRequestQueueForParty = (partyName: string) => {
  for (const [key, promise] of requestQueue.entries()) {
    if (key.includes(partyName)) {
      requestQueue.delete(key);
    }
  }
  lastRequestTime.delete(partyName);
};

export const useLedgerData = ({
  selectedPartyName,
  showOldRecords,
  setShowOldRecords
}: UseLedgerDataProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false);
  const [forceUpdate, setForceUpdate] = useState(0);
  const requestTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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
  const [errorState, setErrorState] = useState<ErrorState>({
    hasError: false,
    error: null,
    retryCount: 0,
    lastErrorTime: 0
  });

  // Retry configuration
  const retryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2
  };

  // Calculate retry delay with exponential backoff
  const calculateRetryDelay = useCallback((retryCount: number): number => {
    const delay = retryConfig.baseDelay * Math.pow(retryConfig.backoffMultiplier, retryCount);
    return Math.min(delay, retryConfig.maxDelay);
  }, [retryConfig]);

  // Enhanced error handling
  const handleError = useCallback((error: any, context: string, retryable: boolean = true) => {
    const errorMessage = error?.message || error?.toString() || 'Unknown error occurred';
    const errorCode = error?.code || error?.status?.toString() || 'UNKNOWN_ERROR';
    
    // Only log critical errors to console
    if (errorCode === '500' || errorCode === 'NETWORK_ERROR' || errorCode === 'TIMEOUT') {
      console.warn(`⚠️ ${context}: ${errorMessage}`);
    }

    setErrorState(prev => ({
      hasError: true,
      error: errorMessage,
      errorCode,
      retryCount: retryable ? prev.retryCount + 1 : prev.retryCount,
      lastErrorTime: Date.now()
    }));

    // Show user-friendly error message
    const userMessage = getErrorMessage(errorCode, errorMessage, context);
    toast({
      title: "Error",
      description: userMessage,
      variant: "destructive"
    });
  }, [toast]);

  // Get user-friendly error messages
  const getErrorMessage = useCallback((errorCode: string, errorMessage: string, context: string): string => {
    switch (errorCode) {
      case 'NETWORK_ERROR':
      case 'FETCH_ERROR':
        return 'Network connection failed. Please check your internet connection and try again.';
      case 'TIMEOUT':
        return 'Request timed out. The server is taking too long to respond.';
      case 'UNAUTHORIZED':
      case '401':
        return 'Session expired. Please refresh the page and log in again.';
      case 'FORBIDDEN':
      case '403':
        return 'You do not have permission to access this data.';
      case 'NOT_FOUND':
      case '404':
        return 'The requested data was not found.';
      case 'SERVER_ERROR':
      case '500':
        return 'Server error occurred. Please try again later.';
      case 'RATE_LIMITED':
      case '429':
        return 'Too many requests. Please wait a moment before trying again.';
      default:
        return `Failed to ${context.toLowerCase()}. ${errorMessage}`;
    }
  }, []);

  // Clear error state
  const clearError = useCallback(() => {
    setErrorState({
      hasError: false,
      error: null,
      retryCount: 0,
      lastErrorTime: 0
    });
  }, []);

  // Transform entry data with better validation
  const transformEntry = useCallback((entry: any): LedgerEntry => {
    // Ensure balance is properly parsed and validated
    const balance = parseFloat(entry.balance) || 0;
    const credit = parseFloat(entry.credit) || 0;
    const debit = parseFloat(entry.debit) || 0;
    
    // Validate balance consistency
    if (isNaN(balance)) {
      // Invalid balance detected
    }
    
    
    return {
      id: entry.id || entry._id || entry.ti || `entry_${Date.now()}`,
      date: entry.date || new Date().toISOString().split('T')[0],
      remarks: entry.remarks || entry.remark || 'Transaction',
      tnsType: entry.tnsType || entry.transaction_type || 'CR',
      credit: credit,
      debit: debit,
      balance: balance,
      chk: entry.chk || false,
      partyName: entry.partyName || entry.party_name || selectedPartyName,
      is_old_record: entry.is_old_record || false,
      ti: entry.ti || entry.id || entry._id
    };
  }, [selectedPartyName]);

  // Load ledger data - ULTRA optimized for speed with throttling
  const loadLedgerData = useCallback(async (showLoading = true, forceRefresh = false, partyName?: string) => {
    const currentPartyName = partyName || selectedPartyName;
    if (!currentPartyName) return;
    
    // CRITICAL FIX: Prevent any simultaneous API calls
    if (loadingRef.current) {
      return;
    }
    
    // Clear cache and request queue for this party when force refreshing (party change)
    if (forceRefresh) {
      // Clear ALL party-related cache, not just specific party
      clearCacheByPattern('party-ledger-.*');
      clearRequestQueueForParty(currentPartyName);
    }
    
    // Check if we're making requests too frequently for the same party
    const now = Date.now();
    const lastTime = lastRequestTime.get(currentPartyName) || 0;
    const timeSinceLastRequest = now - lastTime;
    
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL && !forceRefresh) {
      // Clear any existing timeout
      if (requestTimeoutRef.current) {
        clearTimeout(requestTimeoutRef.current);
      }
      
      // Schedule the request for later
      return new Promise<void>((resolve) => {
        requestTimeoutRef.current = setTimeout(() => {
          loadLedgerData(showLoading, forceRefresh, currentPartyName).then(resolve);
        }, MIN_REQUEST_INTERVAL - timeSinceLastRequest);
      });
    }
    
    // Update last request time
    lastRequestTime.set(currentPartyName, now);
    
    // Only show loading state if explicitly requested
    if (showLoading) {
      setLoading(true);
    }
    
    loadingRef.current = true;
    
    try {
      // Only add cache busting for force refresh
      const apiPartyName = forceRefresh ? `${currentPartyName}&_t=${Date.now()}` : currentPartyName;
      const response = await partyLedgerAPI.getPartyLedger(apiPartyName);
      
      if (response.success && response.data) {
        const responseData = response.data;
        
        
        // Check if responseData is already in LedgerData format or LedgerEntry[] format
        let transformedData: {
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
        };
        
        if (Array.isArray(responseData)) {
          // If it's an array of LedgerEntry, create a basic LedgerData structure
          transformedData = {
            ledgerEntries: responseData,
            oldRecords: [],
            closingBalance: 0,
            summary: {
              totalCredit: responseData.reduce((sum, entry) => sum + (entry.credit || 0), 0),
              totalDebit: responseData.reduce((sum, entry) => sum + (entry.debit || 0), 0),
              calculatedBalance: 0,
              totalEntries: responseData.length
            },
            mondayFinalData: {
              transactionCount: 0,
              totalCredit: 0,
              totalDebit: 0,
              startingBalance: 0,
              finalBalance: 0
            }
          };
        } else {
          // If it's already in LedgerData format
          const ledgerData = responseData as any; // Type assertion for flexibility
          transformedData = {
            ledgerEntries: ledgerData.ledgerEntries || [],
            oldRecords: ledgerData.oldRecords || [],
            closingBalance: ledgerData.closingBalance || 0,
            summary: {
              totalCredit: ledgerData.summary?.totalCredit || 0,
              totalDebit: ledgerData.summary?.totalDebit || 0,
              calculatedBalance: ledgerData.summary?.calculatedBalance || 0,
              totalEntries: ledgerData.summary?.totalEntries || 0
            },
            mondayFinalData: {
              transactionCount: ledgerData.mondayFinalData?.transactionCount || 0,
              totalCredit: ledgerData.mondayFinalData?.totalCredit || 0,
              totalDebit: ledgerData.mondayFinalData?.totalDebit || 0,
              startingBalance: ledgerData.mondayFinalData?.startingBalance || 0,
              finalBalance: ledgerData.mondayFinalData?.finalBalance || 0
            }
          };
        }
        
        // Immediate state update - no batching
        setLedgerData(transformedData);
        
        // Force UI update - increment counter
        setForceUpdate(prev => prev + 1);
        
        // Auto-enable old records view if all transactions are settled
        if (transformedData.ledgerEntries.length === 0 && transformedData.oldRecords.length > 0) {
          setShowOldRecords(true);
        } else if (transformedData.ledgerEntries.length > 0) {
          setShowOldRecords(false);
        }
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to load ledger data",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      // Only log critical errors
      if (error.message?.includes('timeout') || error.message?.includes('network')) {
        console.warn('API Error:', error.message);
      }
      
      toast({
        title: "Error",
        description: error.message || "Failed to load ledger data",
        variant: "destructive"
      });
    } finally {
      if (showLoading) {
        setLoading(false);
      }
      loadingRef.current = false;
    }
  }, [selectedPartyName, toast, setShowOldRecords]);

  // Refresh balance column - force refresh
  const refreshBalanceColumn = useCallback(async () => {
    try {
      await loadLedgerData(true, true); // Show loading and force refresh
    } catch (error) {
      // Only log critical errors
      if (error instanceof Error && (error.message.includes('timeout') || error.message.includes('network'))) {
        console.warn('Balance Refresh Error:', error.message);
      }
    }
  }, [loadLedgerData]);

  // Recalculate balances on frontend for consistency
  const recalculateBalances = useCallback((entries: LedgerEntry[]) => {
    let runningBalance = 0;
    return entries.map(entry => {
      // Skip Monday Final settlement entries - they don't affect balance
      if (entry.remarks?.includes('Monday Final Settlement')) {
        return { ...entry, balance: runningBalance };
      }
      
      if (entry.tnsType === 'CR') {
        runningBalance += entry.credit || 0;
      } else if (entry.tnsType === 'DR') {
        runningBalance -= entry.debit || 0;
      }
      
      return { ...entry, balance: runningBalance };
    });
  }, []);

  // Load data when party changes - ULTRA optimized
  // REMOVED: Automatic data loading on selectedPartyName change
  // This was causing race conditions with manual party changes
  // Data loading is now handled manually by handlePartyChange

  // Debounced refresh function to prevent excessive API calls
  const debouncedRefresh = useCallback(() => {
    const timeoutId = setTimeout(() => {
      loadLedgerData(false, true);
    }, 100); // 100ms debounce
    
    return () => clearTimeout(timeoutId);
  }, [loadLedgerData]);

  // Performance monitoring
  const performanceMetrics = useRef({
    loadTimes: [] as number[],
    averageLoadTime: 0,
    lastLoadTime: 0
  });

  // Update performance metrics
  const updatePerformanceMetrics = useCallback((loadTime: number) => {
    const metrics = performanceMetrics.current;
    metrics.loadTimes.push(loadTime);
    
    // Keep only last 10 load times for rolling average
    if (metrics.loadTimes.length > 10) {
      metrics.loadTimes.shift();
    }
    
    metrics.averageLoadTime = metrics.loadTimes.reduce((sum, time) => sum + time, 0) / metrics.loadTimes.length;
    metrics.lastLoadTime = loadTime;
    
  }, []);

  // Memory optimization: Clean up old data
  const cleanupOldData = useCallback(() => {
    if (ledgerData) {
      // Remove entries older than 1 year to prevent memory bloat
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      
      const filteredEntries = ledgerData.ledgerEntries.filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate > oneYearAgo;
      });
      
      if (filteredEntries.length !== ledgerData.ledgerEntries.length) {
        setLedgerData(prev => prev ? {
          ...prev,
          ledgerEntries: filteredEntries
        } : null);
      }
    }
  }, [ledgerData]);

  // Auto-cleanup every 10 minutes - reduced frequency
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      // Only cleanup if we have data and it's been more than 5 minutes since last cleanup
      if (ledgerData && performanceMetrics.current.lastLoadTime > 0) {
        const timeSinceLastLoad = Date.now() - performanceMetrics.current.lastLoadTime;
        if (timeSinceLastLoad > 5 * 60 * 1000) { // 5 minutes
          cleanupOldData();
        }
      }
    }, 10 * 60 * 1000); // Check every 10 minutes
    
    return () => {
      clearInterval(cleanupInterval);
      // Clear any pending request timeout
      if (requestTimeoutRef.current) {
        clearTimeout(requestTimeoutRef.current);
      }
    };
  }, []); // Empty dependency array - only run once

  // Clear ledger data instantly
  const clearLedgerData = useCallback(() => {
    setLedgerData(null);
    setForceUpdate(prev => prev + 1);
  }, []);

  // Return enhanced hook data
  return {
    ledgerData,
    loading,
    errorState,
    loadLedgerData,
    refreshBalanceColumn,
    recalculateBalances,
    debouncedRefresh,
    clearError,
    forceUpdate,
    clearLedgerData,
    setLedgerData, // Export for optimistic updates
    performanceMetrics: performanceMetrics.current
  };
};
