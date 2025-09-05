import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { partyLedgerAPI } from '@/lib/api';

// Query keys for trial balance caching
export const TRIAL_BALANCE_QUERY_KEYS = {
  all: ['trialBalance'] as const,
  current: () => [...TRIAL_BALANCE_QUERY_KEYS.all, 'current'] as const,
  forceRefresh: () => [...TRIAL_BALANCE_QUERY_KEYS.all, 'forceRefresh'] as const,
};

// Hook to fetch trial balance with caching
export const useTrialBalance = (autoRefresh = false) => {
  return useQuery({
    queryKey: TRIAL_BALANCE_QUERY_KEYS.current(),
    queryFn: async () => {
      const response = await partyLedgerAPI.getFinalTrialBalance();
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch trial balance');
      }
      return response.data;
    },
    staleTime: autoRefresh ? 30 * 1000 : 2 * 60 * 1000, // 30 seconds if auto-refresh, 2 minutes otherwise
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: autoRefresh ? 30 * 1000 : false, // Auto-refresh every 30 seconds if enabled
    refetchIntervalInBackground: false, // Don't refetch when tab is not active
  });
};

// Hook to force refresh trial balance
export const useForceRefreshTrialBalance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await partyLedgerAPI.forceRefreshTrialBalance();
      if (!response.success) {
        throw new Error(response.message || 'Failed to refresh trial balance');
      }
      return response.data;
    },
    onSuccess: () => {
      // Invalidate trial balance queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: TRIAL_BALANCE_QUERY_KEYS.all });
    },
  });
};
