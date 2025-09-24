/**
 * Direct Supabase Client for Frontend
 * 
 * This provides direct access to Supabase database from frontend
 * Bypasses backend API for better performance and real-time updates
 */

import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          phone: string | null;
          address: string | null;
          city: string | null;
          state: string | null;
          pincode: string | null;
          is_approved: boolean;
          approved_at: string | null;
          auth_provider: string;
          google_id: string | null;
          profile_picture: string | null;
          email_verified: boolean;
          firebase_uid: string | null;
          last_login: string | null;
          status: string;
          company_account: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          password_hash: string;
          name?: string | null;
          phone?: string | null;
          address?: string | null;
          city?: string | null;
          state?: string | null;
          pincode?: string | null;
          is_approved?: boolean;
          approved_at?: string | null;
          auth_provider?: string;
          google_id?: string | null;
          profile_picture?: string | null;
          email_verified?: boolean;
          firebase_uid?: string | null;
          last_login?: string | null;
          status?: string;
          company_account?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          password_hash?: string;
          name?: string | null;
          phone?: string | null;
          address?: string | null;
          city?: string | null;
          state?: string | null;
          pincode?: string | null;
          is_approved?: boolean;
          approved_at?: string | null;
          auth_provider?: string;
          google_id?: string | null;
          profile_picture?: string | null;
          email_verified?: boolean;
          firebase_uid?: string | null;
          last_login?: string | null;
          status?: string;
          company_account?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      parties: {
        Row: {
          id: string;
          user_id: string;
          party_name: string;
          sr_no: string | null;
          status: string;
          commi_system: string;
          balance_limit: string;
          m_commission: string;
          rate: string;
          monday_final: string;
          address: string | null;
          phone: string | null;
          email: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          party_name: string;
          sr_no?: string | null;
          status?: string;
          commi_system?: string;
          balance_limit?: string;
          m_commission?: string;
          rate?: string;
          monday_final?: string;
          address?: string | null;
          phone?: string | null;
          email?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          party_name?: string;
          sr_no?: string | null;
          status?: string;
          commi_system?: string;
          balance_limit?: string;
          m_commission?: string;
          rate?: string;
          monday_final?: string;
          address?: string | null;
          phone?: string | null;
          email?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      ledger_entries: {
        Row: {
          id: string;
          user_id: string;
          party_name: string;
          date: string;
          remarks: string | null;
          tns_type: string;
          debit: number;
          credit: number;
          balance: number;
          chk: boolean;
          ti: string | null;
          is_old_record: boolean;
          settlement_date: string | null;
          settlement_monday_final_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          party_name: string;
          date: string;
          remarks?: string | null;
          tns_type: string;
          debit?: number;
          credit?: number;
          balance?: number;
          chk?: boolean;
          ti?: string | null;
          is_old_record?: boolean;
          settlement_date?: string | null;
          settlement_monday_final_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          party_name?: string;
          date?: string;
          remarks?: string | null;
          tns_type?: string;
          debit?: number;
          credit?: number;
          balance?: number;
          chk?: boolean;
          ti?: string | null;
          is_old_record?: boolean;
          settlement_date?: string | null;
          settlement_monday_final_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_settings: {
        Row: {
          id: string;
          user_id: string;
          company_account: string | null;
          decimal_format: string | null;
          entry_order: string | null;
          nt_position: string | null;
          agent_report: string | null;
          color: string | null;
          is_locked: boolean | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          company_account?: string | null;
          decimal_format?: string | null;
          entry_order?: string | null;
          nt_position?: string | null;
          agent_report?: string | null;
          color?: string | null;
          is_locked?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          company_account?: string | null;
          decimal_format?: string | null;
          entry_order?: string | null;
          nt_position?: string | null;
          agent_report?: string | null;
          color?: string | null;
          is_locked?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}

// Type exports
export type User = Database['public']['Tables']['users']['Row'];
export type Party = Database['public']['Tables']['parties']['Row'];
export type LedgerEntry = Database['public']['Tables']['ledger_entries']['Row'];
export type UserSettings = Database['public']['Tables']['user_settings']['Row'];

// Insert types
export type UserInsert = Database['public']['Tables']['users']['Insert'];
export type PartyInsert = Database['public']['Tables']['parties']['Insert'];
export type LedgerEntryInsert = Database['public']['Tables']['ledger_entries']['Insert'];
export type UserSettingsInsert = Database['public']['Tables']['user_settings']['Insert'];

// Update types
export type UserUpdate = Database['public']['Tables']['users']['Update'];
export type PartyUpdate = Database['public']['Tables']['parties']['Update'];
export type LedgerEntryUpdate = Database['public']['Tables']['ledger_entries']['Update'];
export type UserSettingsUpdate = Database['public']['Tables']['user_settings']['Update'];

export default supabase;
