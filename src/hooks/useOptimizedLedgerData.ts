/**
 * ULTRA-OPTIMIZED Ledger Data Hook
 * 
 * Uses single API call to load all account ledger page data
 * Performance: 3-5 API calls → 1 API call (80% faster)
 * 
 * @author Account Ledger Team
 * @version 2.0.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { dashboardAPI } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

interface OptimizedLedgerData {
  parties: any[];
  ledgerData?: {
    ledgerEntries: any[];
    oldRecords: any[];
    closingBalance: number;
    summary: any;
    mondayFinalData: any;
  };
  userSettings: any;
  stats: any;
  performance?: {
    totalTime: number;
    queriesExecuted: number;
    cacheHit: boolean;
  };
}

export const useOptimizedLedgerData = (selectedPartyName?: string) => {
  const { user } = useAuth();
  const [data, setData] = useState<OptimizedLedgerData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Performance tracking
  const loadingRef = useRef(false);
  const lastRequestTime = useRef<Map<string, number>>(new Map());
  const requestTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const MIN_REQUEST_INTERVAL = 100; // 100ms minimum between requests
  
  // Clear request queue for a specific party
  const clearRequestQueueForParty = useCallback((partyName: string) => {
    lastRequestTime.current.delete(partyName);
    if (requestTimeoutRef.current) {
      clearTimeout(requestTimeoutRef.current);
      requestTimeoutRef.current = null;
    }
  }, []);
  
  // ULTRA-OPTIMIZED: Load all page data in single call
  const loadPageData = useCallback(async (showLoading = true, forceRefresh = false, partyName?: string) => {
    const currentPartyName = partyName || selectedPartyName;
    
    // Prevent simultaneous API calls
    if (loadingRef.current) {
      return;
    }
    
    // Check request frequency
    const now = Date.now();
    const lastTime = lastRequestTime.current.get(currentPartyName || 'default') || 0;
    const timeSinceLastRequest = now - lastTime;
    
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL && !forceRefresh) {
      if (requestTimeoutRef.current) {
        clearTimeout(requestTimeoutRef.current);
      }
      
      return new Promise<void>((resolve) => {
        requestTimeoutRef.current = setTimeout(() => {
          loadPageData(showLoading, forceRefresh, currentPartyName).then(resolve);
        }, MIN_REQUEST_INTERVAL - timeSinceLastRequest);
      });
    }
    
    // Update last request time
    lastRequestTime.current.set(currentPartyName || 'default', now);
    
    if (showLoading) {
      setLoading(true);
    }
    
    loadingRef.current = true;
    setError(null);
    
    try {
      console.log(`🚀 Loading optimized page data for party: ${currentPartyName || 'all'}`);
      const startTime = performance.now();
      
      // Single API call for all data
      const response = await dashboardAPI.getAccountLedgerPageData(currentPartyName);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      console.log(`✅ Page data loaded in ${duration.toFixed(2)}ms`, {
        parties: response.parties?.length || 0,
        ledgerEntries: response.ledgerData?.ledgerEntries?.length || 0,
        performance: response.performance
      });
      
      if (response.success) {
        setData(response.data);
        setError(null);
      } else {
        throw new Error(response.message || 'Failed to load page data');
      }
      
    } catch (err: any) {
      console.error('❌ Error loading optimized page data:', err);
      setError(err.message || 'Failed to load page data');
      setData(null);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [selectedPartyName]);
  
  // Load data when component mounts or party changes
  useEffect(() => {
    if (user?.id) {
      loadPageData(true, false, selectedPartyName);
    }
  }, [user?.id, selectedPartyName, loadPageData]);
  
  // Refresh function
  const refresh = useCallback((partyName?: string) => {
    return loadPageData(true, true, partyName);
  }, [loadPageData]);
  
  // Get parties from data
  const parties = data?.parties || [];
  
  // Get ledger data for current party
  const ledgerData = data?.ledgerData || null;
  
  // Get user settings
  const userSettings = data?.userSettings || {};
  
  // Get stats
  const stats = data?.stats || {};
  
  // Get performance metrics
  const performance = data?.performance || null;
  
  return {
    data,
    parties,
    ledgerData,
    userSettings,
    stats,
    performance,
    loading,
    error,
    refresh,
    loadPageData
  };
};
