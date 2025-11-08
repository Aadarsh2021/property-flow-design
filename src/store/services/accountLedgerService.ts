/**
 * Account Ledger Page Service
 *
 * Loads aggregated data (parties, user settings, stats, ledger entries)
 * in a single request to the backend page-data endpoint.
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
import { accountLedgerAPI } from '@/lib/api';
import { setParties } from '../slices/partiesSlice';
import { setCompanyName } from '../slices/authSlice';
import { setLedgerData, setSelectedPartyName } from '../slices/ledgerSlice';
import { setTypingPartyName } from '../slices/uiSlice';

type LoadAccountLedgerArgs = {
  partyName?: string;
  forceRefresh?: boolean;
};

const convertParty = (party: any) => ({
  _id: party._id || party.id || '',
  name: party.name || party.partyName || party.party_name || '',
  party_name: party.party_name || party.partyName || party.name || '',
  srNo: String(party.srNo ?? party.sr_no ?? ''),
  status: (party.status as 'A' | 'I') || 'A',
  mCommission: party.mCommission || party.m_commission || '',
  rate: String(party.rate ?? '0'),
  commiSystem: (party.commiSystem || party.commi_system || 'Take') as 'Take' | 'Give',
  mondayFinal: (party.mondayFinal || party.mondayFinalStatus || party.monday_final || 'No') as 'Yes' | 'No',
  companyName: party.companyName || '',
});

const normalizeLedgerData = (ledgerData: any) => {
  if (!ledgerData) {
    return {
      ledgerEntries: [],
      oldRecords: [],
      totalBalance: 0,
      totalDebit: 0,
      totalCredit: 0,
      summary: {
        totalCredit: 0,
        totalDebit: 0,
        calculatedBalance: 0,
        totalEntries: 0,
      },
      mondayFinalData: {
        transactionCount: 0,
        totalCredit: 0,
        totalDebit: 0,
        startingBalance: 0,
        finalBalance: 0,
      },
    };
  }

  const summary = ledgerData.summary || {};
  return {
    ledgerEntries: ledgerData.ledgerEntries || [],
    oldRecords: ledgerData.oldRecords || [],
    totalBalance: ledgerData.closingBalance ?? summary.calculatedBalance ?? 0,
    totalDebit: summary.totalDebit ?? 0,
    totalCredit: summary.totalCredit ?? 0,
    summary: {
      totalCredit: summary.totalCredit ?? 0,
      totalDebit: summary.totalDebit ?? 0,
      calculatedBalance: summary.calculatedBalance ?? 0,
      totalEntries: summary.totalEntries ?? 0,
    },
    mondayFinalData: ledgerData.mondayFinalData || {
      transactionCount: 0,
      totalCredit: 0,
      totalDebit: 0,
      startingBalance: 0,
      finalBalance: 0,
    },
  };
};

export const loadAccountLedgerPage = createAsyncThunk(
  'accountLedger/loadPage',
  async ({ partyName, forceRefresh }: LoadAccountLedgerArgs, { dispatch, rejectWithValue }) => {
    try {
      const response = await accountLedgerAPI.getPageData(partyName, { forceRefresh });

      if (!response.success) {
        return rejectWithValue(response.message || 'Failed to load account ledger data');
      }

      const payload = response.data || {};
      const parties = (payload.parties || []).map(convertParty);

      if (parties.length) {
        dispatch(setParties(parties));
      }

      const effectivePartyName =
        payload.selectedPartyName ||
        partyName ||
        (parties.length ? parties[0].party_name || parties[0].name : '');

      if (payload.userSettings?.company_account) {
        dispatch(setCompanyName(payload.userSettings.company_account));
      }

      const ledgerData = normalizeLedgerData(payload.ledgerData);
      dispatch(setLedgerData(ledgerData));

      if (effectivePartyName) {
        dispatch(setSelectedPartyName(effectivePartyName));
        dispatch(setTypingPartyName(effectivePartyName));
      }

      return {
        ...payload,
        selectedPartyName: effectivePartyName,
        parties,
        ledgerData,
      };
    } catch (error: any) {
      console.error('❌ Error loading account ledger page data:', error);
      return rejectWithValue(error.message || 'Failed to load account ledger data');
    }
  }
);

