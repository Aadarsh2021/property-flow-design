import { useState, useCallback, useEffect, useRef } from 'react';
import { partyLedgerAPI } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { LedgerEntry, LedgerData } from '@/types';

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

export const useLedgerData = ({
  selectedPartyName,
  showOldRecords,
  setShowOldRecords
}: UseLedgerDataProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false);
  const [forceUpdate, setForceUpdate] = useState(0);
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
    
    console.error(`❌ ${context}:`, {
      error: errorMessage,
      code: errorCode,
      retryable,
      timestamp: new Date().toISOString()
    });

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
      console.warn('Invalid balance detected:', entry.balance, 'for entry:', entry.id);
    }
    
    
    return {
      id: entry.id || entry._id || entry.ti || `entry_${Date.now()}`,
      date: entry.date || new Date().toISOString().split('T')[0],
      remarks: entry.remarks || entry.remark || 'Transaction',
      tnsType: entry.tnsType || entry.transaction_type || 'CR',
      credit: credit,
      debit: debit,
      balance: balance,
      partyName: entry.partyName || entry.party_name || selectedPartyName,
      is_old_record: entry.is_old_record || false,
      ti: entry.ti || entry.id || entry._id
    };
  }, [selectedPartyName]);

  // Load ledger data - optimized for speed
  const loadLedgerData = useCallback(async (showLoading = true, forceRefresh = false) => {
    if (!selectedPartyName) return;
    
    // Skip loading state for force refresh to make it faster
    if (showLoading && !forceRefresh) {
      setLoading(true);
    }
    
    try {
      console.log('🔄 Loading ledger data for:', selectedPartyName, 'Force refresh:', forceRefresh);
      
      // Add cache busting parameter for force refresh
      const cacheBuster = forceRefresh ? `&_t=${Date.now()}` : '';
      const response = await partyLedgerAPI.getPartyLedger(selectedPartyName + cacheBuster);
      
      if (response.success && response.data) {
        const responseData = response.data;
        console.log('✅ Ledger data received:', responseData);
        
        // Optimized data transformation - minimal processing
        const transformedData = {
          ledgerEntries: responseData.ledgerEntries || [],
          oldRecords: responseData.oldRecords || [],
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
        
        console.log('📊 Transformed data:', transformedData);
        
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
        
        console.log('✅ Ledger data loaded successfully');
      } else {
        console.error('❌ Failed to load ledger data:', response);
        toast({
          title: "Error",
          description: response.message || "Failed to load ledger data",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('❌ Error loading ledger data:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load ledger data",
        variant: "destructive"
      });
    } finally {
      if (showLoading && !forceRefresh) {
        setLoading(false);
      }
    }
  }, [selectedPartyName, toast, setShowOldRecords]);

  // Refresh balance column - force refresh
  const refreshBalanceColumn = useCallback(async () => {
    try {
      await loadLedgerData(true, true); // Show loading and force refresh
    } catch (error) {
      console.error('Error refreshing balance:', error);
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

  // Load data when party changes - optimized for speed
  useEffect(() => {
    if (selectedPartyName) {
      // Load data immediately with loading state
      loadLedgerData(true, true); // Show loading and force refresh
    }
  }, [selectedPartyName, loadLedgerData]);

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
    
    // console.log(`📊 PERFORMANCE: Load time: ${loadTime.toFixed(2)}ms, Average: ${metrics.averageLoadTime.toFixed(2)}ms`);
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
        // console.log(`🧹 CLEANUP: Removed ${ledgerData.ledgerEntries.length - filteredEntries.length} old entries`);
        setLedgerData(prev => prev ? {
          ...prev,
          ledgerEntries: filteredEntries
        } : null);
      }
    }
  }, [ledgerData]);

  // Auto-cleanup every 5 minutes
  useEffect(() => {
    const cleanupInterval = setInterval(cleanupOldData, 5 * 60 * 1000);
    return () => clearInterval(cleanupInterval);
  }, [cleanupOldData]);

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
    performanceMetrics: performanceMetrics.current
  };
};
