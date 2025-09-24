/**
 * Direct Supabase Service
 * 
 * Provides direct database operations without backend API
 * Better performance and real-time updates
 */

import { supabase, type Party, type LedgerEntry, type UserSettings } from './supabase';

export class SupabaseService {
  // Parties operations
  static async getParties(userId: string): Promise<Party[]> {
    const { data, error } = await supabase
      .from('parties')
      .select('*')
      .eq('user_id', userId)
      .order('sr_no');
    
    if (error) throw error;
    return data || [];
  }

  static async createParty(userId: string, partyData: Omit<Party, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Party> {
    const { data, error } = await supabase
      .from('parties')
      .insert([{ ...partyData, user_id: userId }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async updateParty(partyId: string, updates: Partial<Party>): Promise<Party> {
    const { data, error } = await supabase
      .from('parties')
      .update(updates)
      .eq('id', partyId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async deleteParty(partyId: string): Promise<void> {
    const { error } = await supabase
      .from('parties')
      .delete()
      .eq('id', partyId);
    
    if (error) throw error;
  }

  // Ledger entries operations
  static async getLedgerEntries(userId: string, partyName?: string): Promise<LedgerEntry[]> {
    if (!userId) {
      console.warn('getLedgerEntries called with empty userId');
      return [];
    }
    
    let query = supabase
      .from('ledger_entries')
      .select('*')
      .eq('user_id', userId);
    
    if (partyName) {
      query = query.eq('party_name', partyName);
    }
    
    const { data, error } = await query.order('date', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  static async createLedgerEntry(userId: string, entryData: Omit<LedgerEntry, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<LedgerEntry> {
    if (!userId) {
      throw new Error('createLedgerEntry called with empty userId');
    }
    
    const { data, error } = await supabase
      .from('ledger_entries')
      .insert([{ ...entryData, user_id: userId }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async updateLedgerEntry(entryId: string, updates: Partial<LedgerEntry>): Promise<LedgerEntry> {
    const { data, error } = await supabase
      .from('ledger_entries')
      .update(updates)
      .eq('id', entryId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async deleteLedgerEntry(entryId: string): Promise<void> {
    const { error } = await supabase
      .from('ledger_entries')
      .delete()
      .eq('id', entryId);
    
    if (error) throw error;
  }

  // User settings operations
  static async getUserSettings(userId: string): Promise<UserSettings | null> {
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  static async upsertUserSettings(userId: string, settings: Partial<UserSettings>): Promise<UserSettings> {
    const { data, error } = await supabase
      .from('user_settings')
      .upsert([{ ...settings, user_id: userId }], {
        onConflict: 'user_id'
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // Real-time subscriptions
  static subscribeToParties(userId: string, callback: (parties: Party[]) => void) {
    return supabase
      .channel('parties')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'parties',
          filter: `user_id=eq.${userId}`
        }, 
        async () => {
          const parties = await this.getParties(userId);
          callback(parties);
        }
      )
      .subscribe();
  }

  static subscribeToLedgerEntries(userId: string, partyName: string, callback: (entries: LedgerEntry[]) => void) {
    return supabase
      .channel('ledger_entries')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'ledger_entries',
          filter: `user_id=eq.${userId}`
        }, 
        async () => {
          const entries = await this.getLedgerEntries(userId, partyName);
          callback(entries);
        }
      )
      .subscribe();
  }

  // Utility functions
  static async getPartyBalance(userId: string, partyName: string): Promise<number> {
    if (!userId) {
      console.warn('getPartyBalance called with empty userId');
      return 0;
    }
    
    const { data, error } = await supabase
      .from('ledger_entries')
      .select('balance')
      .eq('user_id', userId)
      .eq('party_name', partyName)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data?.balance || 0;
  }

  static async getTotalBalance(userId: string): Promise<number> {
    const { data, error } = await supabase
      .from('ledger_entries')
      .select('balance')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Get latest balance for each party
    const partyBalances = new Map<string, number>();
    data?.forEach(entry => {
      if (!partyBalances.has(entry.party_name)) {
        partyBalances.set(entry.party_name, entry.balance);
      }
    });
    
    return Array.from(partyBalances.values()).reduce((sum, balance) => sum + balance, 0);
  }
}

export default SupabaseService;
