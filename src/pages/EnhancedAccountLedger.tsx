/**
 * Enhanced Account Ledger Component
 * 
 * Advanced version with all missing functions restored:
 * - Advanced party filtering and autocomplete
 * - Entry modification functionality
 * - Commission calculation
 * - Balance refresh
 * - Performance monitoring
 * 
 * @author Account Ledger Team
 * @version 2.0.0
 */

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { partyLedgerAPI } from '../lib/api';
import { useToast } from '@/hooks/use-toast';
import TopNavigation from '@/components/TopNavigation';
import LedgerTable from '@/components/LedgerTable';
import ActionButtons from '@/components/ActionButtons';
import MondayFinalModal from '@/components/MondayFinalModal';
import AdvancedPartyInput from '@/components/AdvancedPartyInput';
import EntryModificationModal from '@/components/EntryModificationModal';
import { useCompanyName } from '@/hooks/useCompanyName';
import { useAuth } from '@/hooks/useAuth';
import { usePerformance, useAPIPerformance } from '@/utils/performanceUtils';
import { 
  filterPartiesGeneric, 
  PartyFilterOptions 
} from '@/utils/partyFiltering';
import { 
  calculateCommissionAmount, 
  hasCommission, 
  getCommissionRate 
} from '@/utils/commissionUtils';
import { 
  calculateRunningBalance, 
  refreshPartyBalance, 
  validateBalanceConsistency,
  formatBalance 
} from '@/utils/balanceUtils';
import { 
  validateEntryModification, 
  createModifiedEntry 
} from '@/utils/entryModification';

// Types
interface Party {
  _id?: string;
  id?: string;
  name: string;
  party_name?: string;
  srNo?: string;
  status?: string;
  mCommission?: string;
  rate?: string;
  commiSystem?: string;
  mondayFinal?: string;
  companyName?: string;
}

interface LedgerEntry {
  id?: string;
  _id?: string;
  partyName?: string;
  party_name?: string;
  date: string;
  remarks: string;
  tnsType: string;
  debit: number;
  credit: number;
  balance: number;
  chk?: boolean;
  ti?: string;
  isOldRecord?: boolean;
  settlementDate?: string | null;
  settlementMondayFinalId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

interface LedgerData {
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
}

const EnhancedAccountLedger: React.FC = () => {
  const { partyName: initialPartyName } = useParams<{ partyName?: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { companyName } = useCompanyName(user?.id);
  
  // Performance monitoring
  const { measure, endMeasure } = usePerformance();
  const { measureAPICall } = useAPIPerformance();

  // State management
  const [selectedPartyName, setSelectedPartyName] = useState<string>('');
  const [ledgerData, setLedgerData] = useState<LedgerData | null>(null);
  const [allParties, setAllParties] = useState<Party[]>([]);
  const [selectedEntries, setSelectedEntries] = useState<string[]>([]);
  const [showOldRecords, setShowOldRecords] = useState(false);
  const [showMondayFinalModal, setShowMondayFinalModal] = useState(false);
  const [showModifyModal, setShowModifyModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<LedgerEntry | null>(null);
  
  // Loading states
  const [partiesLoading, setPartiesLoading] = useState(false);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // New entry state
  const [newEntry, setNewEntry] = useState({
    amount: '',
    partyName: '',
    remarks: '',
  });

  // Refs for performance optimization
  const lastRequestTime = useRef<Map<string, number>>(new Map());
  const initializationRef = useRef(false);

  // Initialize party name from URL params
  useEffect(() => {
    if (initialPartyName) {
      const decodedPartyName = decodeURIComponent(initialPartyName);
      setSelectedPartyName(decodedPartyName);
    }
  }, [initialPartyName]);

  // Load available parties
  const loadAvailableParties = useCallback(async () => {
    if (partiesLoading) return;
    
    const measureStart = measure('loadAvailableParties');
    setPartiesLoading(true);
    
    try {
      const response = await measureAPICall(
        () => partyLedgerAPI.getAllParties(),
        '/api/parties',
        'GET'
      );
      
      if (response.success) {
        const mappedParties = (response.data || []).map((party: any) => ({
          _id: party.id || party._id,
          name: party.name || party.party_name || party.partyName,
          party_name: party.party_name || party.partyName,
          srNo: party.srNo || party.sr_no,
          status: party.status,
          mCommission: party.mCommission || party.m_commission,
          rate: party.rate,
          commiSystem: party.commiSystem || party.commission_system,
          mondayFinal: party.mondayFinal || party.monday_final,
          companyName: party.companyName || party.company_name
        }));
        
        setAllParties(mappedParties);
        endMeasure(measureStart, true);
      } else {
        endMeasure(measureStart, false, response.error);
        toast({
          title: "Error",
          description: "Failed to load parties",
          variant: "destructive"
        });
      }
    } catch (error) {
      endMeasure(measureStart, false, error instanceof Error ? error.message : 'Unknown error');
      console.error('Error loading parties:', error);
    } finally {
      setPartiesLoading(false);
    }
  }, [partiesLoading, measure, endMeasure, measureAPICall, toast]);

  // Load ledger data
  const loadLedgerData = useCallback(async (showLoading = true) => {
    if (!selectedPartyName) return;
    
    const measureStart = measure('loadLedgerData');
    if (showLoading) setLedgerLoading(true);
    
    try {
      const response = await measureAPICall(
        () => partyLedgerAPI.getPartyLedger(selectedPartyName),
        `/api/party-ledger/${selectedPartyName}`,
        'GET'
      );
      
      if (response.success) {
        setLedgerData(response.data);
        endMeasure(measureStart, true);
      } else {
        endMeasure(measureStart, false, response.error);
        toast({
          title: "Error",
          description: "Failed to load ledger data",
          variant: "destructive"
        });
      }
    } catch (error) {
      endMeasure(measureStart, false, error instanceof Error ? error.message : 'Unknown error');
      console.error('Error loading ledger data:', error);
    } finally {
      if (showLoading) setLedgerLoading(false);
    }
  }, [selectedPartyName, measure, endMeasure, measureAPICall, toast]);

  // Initialize data
  useEffect(() => {
    if (!initializationRef.current) {
      initializationRef.current = true;
      loadAvailableParties();
    }
  }, [loadAvailableParties]);

  useEffect(() => {
    if (selectedPartyName) {
      loadLedgerData();
    }
  }, [selectedPartyName, loadLedgerData]);

  // Handle party selection
  const handlePartySelect = useCallback((party: Party) => {
    const partyName = party.name || party.party_name || '';
    setSelectedPartyName(partyName);
    setSelectedEntries([]);
    
    // Update URL
    navigate(`/account-ledger/${encodeURIComponent(partyName)}`, { replace: true });
  }, [navigate]);

  // Handle add entry
  const handleAddEntry = useCallback(async () => {
    if (!newEntry.partyName || !newEntry.amount) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setActionLoading(true);
    const measureStart = measure('handleAddEntry');
    
    try {
      const amount = parseFloat(newEntry.amount);
      const tnsType = amount >= 0 ? 'CR' : 'DR';
      const credit = tnsType === 'CR' ? Math.abs(amount) : 0;
      const debit = tnsType === 'DR' ? Math.abs(amount) : 0;

      // Check for commission calculation
      const selectedParty = allParties.find(p => 
        (p.name || p.party_name) === newEntry.partyName
      );
      
      let finalCredit = credit;
      let finalDebit = debit;
      let remarks = newEntry.remarks;

      if (selectedParty && hasCommission(selectedParty)) {
        const commission = calculateCommissionAmount(Math.abs(amount), selectedParty);
        if (commission.isValid && commission.amount > 0) {
          if (commission.system === 'Take') {
            // Commission is taken from the amount
            if (tnsType === 'CR') {
              finalCredit = credit - commission.amount;
            } else {
              finalDebit = debit + commission.amount;
            }
          } else if (commission.system === 'Give') {
            // Commission is given in addition
            if (tnsType === 'CR') {
              finalCredit = credit + commission.amount;
            } else {
              finalDebit = debit - commission.amount;
            }
          }
          
          remarks += ` (Commission: ${commission.system} ${commission.rate}%)`;
        }
      }

      const entryData = {
        partyName: newEntry.partyName,
        date: new Date().toLocaleDateString('en-GB'),
        remarks: remarks || 'Transaction',
        tnsType,
        credit: finalCredit,
        debit: finalDebit
      };

      const response = await measureAPICall(
        () => partyLedgerAPI.addLedgerEntry(entryData),
        '/api/party-ledger/entry',
        'POST'
      );

      if (response.success) {
        toast({
          title: "Success",
          description: "Entry added successfully"
        });
        
        setNewEntry({ amount: '', partyName: '', remarks: '' });
        await loadLedgerData(false); // Refresh without loading indicator
        endMeasure(measureStart, true);
      } else {
        endMeasure(measureStart, false, response.error);
        toast({
          title: "Error",
          description: "Failed to add entry",
          variant: "destructive"
        });
      }
    } catch (error) {
      endMeasure(measureStart, false, error instanceof Error ? error.message : 'Unknown error');
      console.error('Error adding entry:', error);
      toast({
        title: "Error",
        description: "Failed to add entry",
        variant: "destructive"
      });
    } finally {
      setActionLoading(false);
    }
  }, [newEntry, allParties, measure, endMeasure, measureAPICall, toast, loadLedgerData]);

  // Handle modify entry
  const handleModifyEntry = useCallback(async (modifiedEntry: Partial<LedgerEntry>) => {
    if (!editingEntry) return;

    setActionLoading(true);
    const measureStart = measure('handleModifyEntry');
    
    try {
      const response = await measureAPICall(
        () => partyLedgerAPI.updateLedgerEntry(editingEntry.id || editingEntry._id!, modifiedEntry),
        `/api/party-ledger/entry/${editingEntry.id || editingEntry._id}`,
        'PUT'
      );

      if (response.success) {
        toast({
          title: "Success",
          description: "Entry modified successfully"
        });
        
        setShowModifyModal(false);
        setEditingEntry(null);
        await loadLedgerData(false);
        endMeasure(measureStart, true);
      } else {
        endMeasure(measureStart, false, response.error);
        toast({
          title: "Error",
          description: "Failed to modify entry",
          variant: "destructive"
        });
      }
    } catch (error) {
      endMeasure(measureStart, false, error instanceof Error ? error.message : 'Unknown error');
      console.error('Error modifying entry:', error);
      toast({
        title: "Error",
        description: "Failed to modify entry",
        variant: "destructive"
      });
    } finally {
      setActionLoading(false);
    }
  }, [editingEntry, measure, endMeasure, measureAPICall, toast, loadLedgerData]);

  // Handle delete entry
  const handleDeleteEntry = useCallback(async () => {
    if (selectedEntries.length === 0) {
      toast({
        title: "No Selection",
        description: "Please select entries to delete",
        variant: "destructive"
      });
      return;
    }

    setActionLoading(true);
    const measureStart = measure('handleDeleteEntry');
    
    try {
      const response = await measureAPICall(
        () => partyLedgerAPI.deleteLedgerEntries(selectedEntries),
        '/api/party-ledger/entries',
        'DELETE'
      );

      if (response.success) {
        toast({
          title: "Success",
          description: `${selectedEntries.length} entries deleted successfully`
        });
        
        setSelectedEntries([]);
        await loadLedgerData(false);
        endMeasure(measureStart, true);
      } else {
        endMeasure(measureStart, false, response.error);
        toast({
          title: "Error",
          description: "Failed to delete entries",
          variant: "destructive"
        });
      }
    } catch (error) {
      endMeasure(measureStart, false, error instanceof Error ? error.message : 'Unknown error');
      console.error('Error deleting entries:', error);
      toast({
        title: "Error",
        description: "Failed to delete entries",
        variant: "destructive"
      });
    } finally {
      setActionLoading(false);
    }
  }, [selectedEntries, measure, endMeasure, measureAPICall, toast, loadLedgerData]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setActionLoading(true);
    const measureStart = measure('handleRefresh');
    
    try {
      await loadLedgerData(false);
      endMeasure(measureStart, true);
      toast({
        title: "Success",
        description: "Data refreshed successfully"
      });
    } catch (error) {
      endMeasure(measureStart, false, error instanceof Error ? error.message : 'Unknown error');
      console.error('Error refreshing data:', error);
    } finally {
      setActionLoading(false);
    }
  }, [measure, endMeasure, loadLedgerData, toast]);

  // Handle Monday Final
  const handleMondayFinal = useCallback(() => {
    if (selectedEntries.length === 0) {
      toast({
        title: "No Selection",
        description: "Please select entries for Monday Final",
        variant: "destructive"
      });
      return;
    }
    setShowMondayFinalModal(true);
  }, [selectedEntries, toast]);

  // Handle checkbox change
  const handleCheckboxChange = useCallback((id: string | number, checked: boolean) => {
    if (checked) {
      setSelectedEntries(prev => [...prev, id.toString()]);
    } else {
      setSelectedEntries(prev => prev.filter(entryId => entryId !== id.toString()));
    }
  }, []);

  // Handle modify button click
  const handleModifyClick = useCallback(() => {
    if (selectedEntries.length !== 1) {
      toast({
        title: "Invalid Selection",
        description: "Please select exactly one entry to modify",
        variant: "destructive"
      });
      return;
    }

    const entryId = selectedEntries[0];
    const entries = showOldRecords ? ledgerData?.oldRecords : ledgerData?.ledgerEntries;
    const entry = entries?.find(e => 
      (e.id || e._id || e.ti)?.toString() === entryId
    );

    if (entry) {
      setEditingEntry(entry);
      setShowModifyModal(true);
    }
  }, [selectedEntries, showOldRecords, ledgerData, toast]);

  // Handle check all
  const handleCheckAll = useCallback(() => {
    if (!ledgerData) return;

    const entriesToToggle = showOldRecords 
      ? [...ledgerData.oldRecords, ...ledgerData.ledgerEntries.filter(entry => entry.tnsType === 'Monday Settlement')]
      : ledgerData.ledgerEntries;

    const allChecked = entriesToToggle.every(entry => 
      selectedEntries.includes((entry.id || entry._id || entry.ti)?.toString() || '')
    );
    
    if (!allChecked) {
      const allEntryIds = entriesToToggle.map((entry, index) => {
        const entryId = entry.id || entry._id || entry.ti || `entry_${index}`;
        return entryId.toString();
      });
      setSelectedEntries(allEntryIds);
    } else {
      setSelectedEntries([]);
    }
  }, [ledgerData, showOldRecords, selectedEntries]);

  // Handle print
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // Handle exit
  const handleExit = useCallback(() => {
    navigate('/');
  }, [navigate]);

  // Handle toggle old records
  const handleToggleOldRecords = useCallback(() => {
    setShowOldRecords(prev => !prev);
    setSelectedEntries([]);
  }, []);

  // Memoized filtered parties for autocomplete
  const filteredParties = useMemo(() => {
    if (!newEntry.partyName.trim()) return allParties.slice(0, 10);
    
    const filterOptions: PartyFilterOptions = {
      excludeCurrentParty: true,
      currentPartyName: selectedPartyName,
      maxResults: 10
    };
    
    return filterPartiesGeneric(newEntry.partyName, allParties, filterOptions);
  }, [newEntry.partyName, allParties, selectedPartyName]);

  // Get current entries for display
  const displayEntries = useMemo(() => {
    if (!ledgerData) return [];
    
    if (showOldRecords) {
      return [...ledgerData.oldRecords, ...ledgerData.ledgerEntries.filter(entry => entry.tnsType === 'Monday Settlement')];
    }
    
    return ledgerData.ledgerEntries;
  }, [ledgerData, showOldRecords]);

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNavigation />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Account Ledger
          </h1>
          <p className="text-gray-600">
            {companyName && `Company: ${companyName}`}
            {selectedPartyName && ` | Party: ${selectedPartyName}`}
          </p>
        </div>

        {/* Party Selection */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Select Party</h2>
          <AdvancedPartyInput
            value={selectedPartyName}
            onChange={setSelectedPartyName}
            onSelect={handlePartySelect}
            parties={allParties}
            placeholder="Search and select a party..."
            disabled={partiesLoading}
            filterOptions={{
              excludeCurrentParty: false,
              maxResults: 10
            }}
          />
        </div>

        {/* Transaction Form */}
        {selectedPartyName && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Add New Transaction</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Party Name</label>
                <AdvancedPartyInput
                  value={newEntry.partyName}
                  onChange={(value) => setNewEntry(prev => ({ ...prev, partyName: value }))}
                  onSelect={(party) => setNewEntry(prev => ({ 
                    ...prev, 
                    partyName: party.name || party.party_name || '' 
                  }))}
                  parties={filteredParties}
                  placeholder="Search party..."
                  filterOptions={{
                    excludeCurrentParty: false,
                    maxResults: 5
                  }}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Amount (+ for Credit, - for Debit)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newEntry.amount}
                  onChange={(e) => setNewEntry(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="+10000 for Credit, -5000 for Debit"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Remarks</label>
                <input
                  type="text"
                  value={newEntry.remarks}
                  onChange={(e) => setNewEntry(prev => ({ ...prev, remarks: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Transaction remarks"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">&nbsp;</label>
                <button
                  onClick={handleAddEntry}
                  disabled={actionLoading}
                  className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-all duration-200"
                >
                  {actionLoading ? 'Adding...' : 'Add Entry'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Ledger Table */}
        {selectedPartyName && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Ledger Entries</h2>
              <div className="text-sm text-gray-600">
                Selected: {selectedEntries.length} entries
              </div>
            </div>
            
            <LedgerTable
              entries={displayEntries}
              loading={ledgerLoading}
              showOldRecords={showOldRecords}
              selectedEntries={selectedEntries}
              onCheckboxChange={handleCheckboxChange}
            />
          </div>
        )}

        {/* Action Buttons */}
        {selectedPartyName && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <ActionButtons
              selectedEntries={selectedEntries}
              actionLoading={actionLoading}
              showOldRecords={showOldRecords}
              ledgerData={ledgerData}
              onRefresh={handleRefresh}
              onMondayFinal={handleMondayFinal}
              onToggleOldRecords={handleToggleOldRecords}
              onModify={handleModifyClick}
              onDelete={handleDeleteEntry}
              onPrint={handlePrint}
              onCheckAll={handleCheckAll}
              onExit={handleExit}
            />
          </div>
        )}

        {/* Modals */}
        <MondayFinalModal
          isOpen={showMondayFinalModal}
          onClose={() => setShowMondayFinalModal(false)}
          selectedEntries={selectedEntries}
          ledgerData={ledgerData}
          onSuccess={() => {
            setSelectedEntries([]);
            loadLedgerData(false);
          }}
        />

        <EntryModificationModal
          isOpen={showModifyModal}
          onClose={() => {
            setShowModifyModal(false);
            setEditingEntry(null);
          }}
          entry={editingEntry}
          onSave={handleModifyEntry}
          previousBalance={ledgerData?.closingBalance || 0}
        />
      </div>
    </div>
  );
};

export default EnhancedAccountLedger;
