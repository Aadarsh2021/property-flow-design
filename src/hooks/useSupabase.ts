/**
 * Direct Supabase Hook
 * 
 * Provides React hooks for direct Supabase operations
 * Better performance than API calls
 */

import { useState, useEffect, useCallback } from 'react';
import { SupabaseService } from '@/lib/supabaseService';
import { Party, LedgerEntry, UserSettings } from '@/lib/supabase';

// Parties hook
export const useSupabaseParties = (userId: string) => {
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchParties = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await SupabaseService.getParties(userId);
      setParties(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const createParty = useCallback(async (partyData: Omit<Party, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      const newParty = await SupabaseService.createParty(userId, partyData);
      setParties(prev => [...prev, newParty]);
      return newParty;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [userId]);

  const updateParty = useCallback(async (partyId: string, updates: Partial<Party>) => {
    try {
      const updatedParty = await SupabaseService.updateParty(partyId, updates);
      setParties(prev => prev.map(p => p.id === partyId ? updatedParty : p));
      return updatedParty;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  const deleteParty = useCallback(async (partyId: string) => {
    try {
      await SupabaseService.deleteParty(partyId);
      setParties(prev => prev.filter(p => p.id !== partyId));
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  useEffect(() => {
    if (userId) {
      fetchParties();
    }
  }, [userId, fetchParties]);

  return {
    parties,
    loading,
    error,
    refetch: fetchParties,
    createParty,
    updateParty,
    deleteParty
  };
};

// Ledger entries hook
export const useSupabaseLedgerEntries = (userId: string, partyName?: string) => {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEntries = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await SupabaseService.getLedgerEntries(userId, partyName);
      setEntries(data);
    } catch (err: any) {
      console.error('useSupabaseLedgerEntries: Error fetching entries:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId, partyName]);

  const createEntry = useCallback(async (entryData: Omit<LedgerEntry, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      const newEntry = await SupabaseService.createLedgerEntry(userId, entryData);
      setEntries(prev => [newEntry, ...prev]);
      return newEntry;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [userId]);

  const updateEntry = useCallback(async (entryId: string, updates: Partial<LedgerEntry>) => {
    try {
      const updatedEntry = await SupabaseService.updateLedgerEntry(entryId, updates);
      setEntries(prev => prev.map(e => e.id === entryId ? updatedEntry : e));
      return updatedEntry;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  const deleteEntry = useCallback(async (entryId: string) => {
    try {
      await SupabaseService.deleteLedgerEntry(entryId);
      setEntries(prev => prev.filter(e => e.id !== entryId));
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  useEffect(() => {
    if (userId) {
      fetchEntries();
    }
  }, [userId, partyName, fetchEntries]);

  return {
    entries,
    loading,
    error,
    refetch: fetchEntries,
    createEntry,
    updateEntry,
    deleteEntry
  };
};

// User settings hook
export const useSupabaseUserSettings = (userId: string) => {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await SupabaseService.getUserSettings(userId);
      setSettings(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const updateSettings = useCallback(async (updates: Partial<UserSettings>) => {
    try {
      const updatedSettings = await SupabaseService.upsertUserSettings(userId, updates);
      setSettings(updatedSettings);
      return updatedSettings;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchSettings();
    }
  }, [userId, fetchSettings]);

  return {
    settings,
    loading,
    error,
    refetch: fetchSettings,
    updateSettings
  };
};

// Real-time subscriptions hook
export const useSupabaseRealtime = (userId: string) => {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Subscribe to parties changes
    const partiesSubscription = SupabaseService.subscribeToParties(userId, (parties) => {
      console.log('Parties updated:', parties);
    });

    // Subscribe to ledger entries changes
    const ledgerSubscription = SupabaseService.subscribeToLedgerEntries(userId, '', (entries) => {
      console.log('Ledger entries updated:', entries);
    });

    setIsConnected(true);

    return () => {
      partiesSubscription.unsubscribe();
      ledgerSubscription.unsubscribe();
      setIsConnected(false);
    };
  }, [userId]);

  return { isConnected };
};
