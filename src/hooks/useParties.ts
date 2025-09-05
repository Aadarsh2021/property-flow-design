import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { partyLedgerAPI, newPartyAPI } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

// Query keys for consistent caching
export const PARTY_QUERY_KEYS = {
  all: ['parties'] as const,
  lists: () => [...PARTY_QUERY_KEYS.all, 'list'] as const,
  list: (filters: string) => [...PARTY_QUERY_KEYS.lists(), { filters }] as const,
  details: () => [...PARTY_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...PARTY_QUERY_KEYS.details(), id] as const,
  ledger: (partyName: string) => [...PARTY_QUERY_KEYS.all, 'ledger', partyName] as const,
  balance: (partyName: string) => [...PARTY_QUERY_KEYS.all, 'balance', partyName] as const,
};

// Hook to fetch all parties with caching
export const useParties = () => {
  return useQuery({
    queryKey: PARTY_QUERY_KEYS.lists(),
    queryFn: async () => {
      const response = await partyLedgerAPI.getAllParties();
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch parties');
      }
      return response.data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Hook to fetch party ledger with caching
export const usePartyLedger = (partyName: string, enabled = true) => {
  return useQuery({
    queryKey: PARTY_QUERY_KEYS.ledger(partyName),
    queryFn: async () => {
      const response = await partyLedgerAPI.getPartyLedger(partyName);
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch party ledger');
      }
      return response.data;
    },
    enabled: enabled && !!partyName,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Hook to fetch party balance with caching
export const usePartyBalance = (partyName: string, enabled = true) => {
  return useQuery({
    queryKey: PARTY_QUERY_KEYS.balance(partyName),
    queryFn: async () => {
      const response = await partyLedgerAPI.getPartyLedger(partyName);
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch party balance');
      }
      
      const data = response.data as any;
      return {
        balance: data.closingBalance || 0,
        creditTotal: data.summary?.totalCredit || 0,
        debitTotal: data.summary?.totalDebit || 0
      };
    },
    enabled: enabled && !!partyName,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Hook to delete party with cache invalidation
export const useDeleteParty = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (partyId: string) => {
      const response = await newPartyAPI.delete(partyId);
      if (!response.success) {
        throw new Error(response.message || 'Failed to delete party');
      }
      return response.data;
    },
    onSuccess: (data) => {
      // Invalidate all party queries to refetch data
      queryClient.invalidateQueries({ queryKey: PARTY_QUERY_KEYS.all });
      
      toast({
        title: "✅ Success",
        description: `Party "${data.partyName}" and ${data.deletedTransactions} transactions deleted permanently from database`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "❌ Error",
        description: error.message || "Failed to delete party",
        variant: "destructive"
      });
    },
  });
};

// Hook to refresh all party data
export const useRefreshParties = () => {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.invalidateQueries({ queryKey: PARTY_QUERY_KEYS.all });
  };
};
