import { useState, useCallback, useEffect } from 'react';
import { partyLedgerAPI } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Party } from '@/types';

export const usePartyManagement = () => {
  const { toast } = useToast();
  const [availableParties, setAvailableParties] = useState<Party[]>([]);
  const [allPartiesForTransaction, setAllPartiesForTransaction] = useState<Party[]>([]);
  const [partiesLoading, setPartiesLoading] = useState(false);

  // Load available parties
  const loadAvailableParties = useCallback(async () => {
    if (partiesLoading) return;
    
    setPartiesLoading(true);
    try {
      const response = await partyLedgerAPI.getAllParties();
      if (response.success) {
        const mappedParties = (response.data || []).map((party: any) => ({
          _id: party.id || party._id,
          name: party.name || party.party_name || party.partyName,
          party_name: party.party_name || party.partyName,
          srNo: party.sr_no || party.srNo,
          status: party.status || 'A',
          mCommission: party.mCommission || party.m_commission || 'No Commission',
          rate: party.rate || '0',
          commiSystem: party.commiSystem || party.commi_system || 'Take',
          mondayFinal: party.mondayFinal || party.monday_final || 'No',
          companyName: party.companyName || party.company_name || party.party_name || party.partyName
        }));
      
        setAvailableParties(mappedParties);
        setAllPartiesForTransaction(mappedParties);
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
  }, [partiesLoading, toast]);

  // Load parties on mount
  useEffect(() => {
    loadAvailableParties();
  }, [loadAvailableParties]);

  // Format party display name
  const formatPartyDisplayName = useCallback((party: Party) => {
    const partyName = party.party_name || party.name;
    const companyName = party.companyName;
    
    if (companyName && companyName !== partyName) {
      return `${partyName} (${companyName})`;
    }
    return partyName;
  }, []);

  // Extract party name from display format
  const extractPartyNameFromDisplay = useCallback((displayName: string) => {
    const match = displayName.match(/^([^(]+)/);
    return match ? match[1].trim() : displayName.trim();
  }, []);

  // Find party by display name
  const findPartyByDisplayName = useCallback((displayName: string) => {
    const partyName = extractPartyNameFromDisplay(displayName);
    return availableParties.find(party => 
      (party.party_name || party.name) === partyName
    );
  }, [availableParties, extractPartyNameFromDisplay]);

  // Load parties on mount
  useEffect(() => {
    loadAvailableParties();
  }, [loadAvailableParties]);

  return {
    availableParties,
    allPartiesForTransaction,
    partiesLoading,
    loadAvailableParties,
    formatPartyDisplayName,
    extractPartyNameFromDisplay,
    findPartyByDisplayName
  };
};
