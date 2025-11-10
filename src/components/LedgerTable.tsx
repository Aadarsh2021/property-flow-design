import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';

// Helper function to format party name display for old transactions
// Handles legacy formats like "PartyName: Remarks" or just party name in remarks
const formatPartyNameDisplay = (remarks: string, partyName?: string) => {
  if (!remarks && !partyName) return '';
  
  // If partyName is available, use it as primary source
  if (partyName) {
    // If remarks exist and don't contain ":" (old format indicator), show PartyName(Remarks)
    if (remarks && remarks.trim() && !remarks.includes(':')) {
      return `${partyName}(${remarks.trim()})`;
    }
    // If no remarks or remarks contain ":" (legacy format), just show party name
    return partyName;
  }
  
  // Fallback: Handle legacy formats in remarks
  if (!remarks) return '';
  
  // Check if remarks contains old format "PartyName: Remarks"
  if (remarks.includes(':')) {
    const [legacyPartyName, legacyRemarks] = remarks.split(':', 2);
    const cleanRemarks = legacyRemarks.trim();
    
    // If there are actual remarks, show "PartyName(Remarks)" format
    if (cleanRemarks && cleanRemarks !== legacyPartyName.trim()) {
      return `${legacyPartyName.trim()}(${cleanRemarks})`;
    }
    
    // If no meaningful remarks, just show party name
    return legacyPartyName.trim();
  }
  
  // If remarks don't contain ":", treat as party name only (for backward compatibility)
  return remarks;
};

// Table row component
const TableRow = ({ 
  entry, 
  index, 
  isSelected, 
  onCheckboxChange 
}: { 
  entry: any; 
  index: number; 
  isSelected: boolean; 
  onCheckboxChange: (id: string | number, checked: boolean) => void; 
}) => {
  const entryId = entry.id || entry._id || entry.ti || `entry_${index}`;
  
  // Format date
  const formattedDate = entry.date ? new Date(entry.date).toLocaleDateString('en-GB') : '-';
  
  // CSS classes for type
  const typeClasses = `px-2 py-1 rounded-full text-xs font-medium ${
    (entry.tnsType || entry.tns_type || entry.type) === 'CR' 
      ? 'bg-green-100 text-green-800' 
      : 'bg-red-100 text-red-800'
  }`;
  
  // CSS classes for balance
  const balanceClasses = `px-3 py-1 rounded-full text-sm font-medium ${
    (entry.balance || 0) > 0 
      ? 'bg-green-100 text-green-800' 
      : (entry.balance || 0) < 0 
        ? 'bg-red-100 text-red-800'
        : 'bg-gray-100 text-gray-800'
  }`;
  
  return (
    <tr 
      className={`hover:bg-blue-50 cursor-pointer transition-colors duration-150 ${
        isSelected ? 'bg-blue-100' : ''
      } ${entry.is_old_record ? 'bg-gray-50 opacity-75' : ''} ${
        entry.isOptimistic ? 'bg-green-50 border-l-4 border-green-400 animate-pulse' : ''
      }`}
      onClick={() => onCheckboxChange(entryId, !isSelected)}
    >
      <td className="px-4 py-3 text-gray-700">
        {formattedDate}
      </td>
      <td className="px-4 py-3 text-gray-800 font-medium">
        <div className="flex items-center space-x-2">
          <span>
            {(() => {
              // Priority: transactionPartyName (user-selected) > partyName/party_name (ledger owner)
              const displayPartyName = entry.transactionPartyName || entry.partyName || entry.party_name;
              const remarks = entry.remarks || '';
              
              if (displayPartyName) {
                // Show remarks if they exist and are actual user remarks (not old format)
                // Remarks are user-provided actual remarks, not party names
                const remarksTrimmed = remarks.trim();
                if (remarksTrimmed && !remarksTrimmed.includes(':')) {
                  // Show PartyName(Remarks) format if remarks are provided
                  return `${displayPartyName}(${remarksTrimmed})`;
                }
                // Otherwise just show party name
                return displayPartyName;
              } else {
                // Fallback for very old entries
                return formatPartyNameDisplay(remarks, entry.partyName || entry.party_name);
              }
            })()}
          </span>
        </div>
      </td>
      <td className="px-4 py-3 text-center">
        <span className={typeClasses}>
          {entry.tnsType || entry.tns_type || entry.type || '-'}
        </span>
      </td>
      <td className="px-4 py-3 text-center font-medium text-green-600">
        {entry.credit || 0}
      </td>
      <td className="px-4 py-3 text-center font-medium text-red-600">
        {entry.debit || 0}
      </td>
      <td className="px-4 py-3 text-center font-semibold">
        <span className={balanceClasses}>
          ₹{(entry.balance || 0).toLocaleString()}
        </span>
      </td>
      <td className="px-4 py-3 text-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onCheckboxChange(entryId, e.target.checked)}
          onClick={(e) => e.stopPropagation()}
          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
        />
      </td>
      <td className="px-4 py-3 text-center text-gray-500 text-xs">
        {entry.ti || index}
      </td>
    </tr>
  );
};

interface LedgerTableProps {
  ledgerData: any;
  showOldRecords: boolean;
  selectedEntries: (string | number)[];
  onEntrySelect: (id: string | number, checked: boolean) => void;
  loading?: boolean;
}

const LedgerTable: React.FC<LedgerTableProps> = ({
  ledgerData,
  showOldRecords,
  selectedEntries,
  onEntrySelect,
  loading = false
}) => {
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading ledger data...</p>
        </div>
      </div>
    );
  }

  // Determine which entries to show - handle null ledgerData
  const entriesToShow = ledgerData 
    ? (showOldRecords 
        ? (ledgerData.oldRecords || [])
        : (ledgerData.ledgerEntries || []))
    : [];

  // Show table even if no entries, with empty message in body
  const hasEntries = entriesToShow.length > 0;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 sticky top-0">
          <tr>
            <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">Date</th>
            <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">Party Name</th>
            <th className="border-b border-gray-200 px-4 py-3 text-center font-semibold text-gray-700">Type</th>
            <th className="border-b border-gray-200 px-4 py-3 text-center font-semibold text-gray-700">Credit</th>
            <th className="border-b border-gray-200 px-4 py-3 text-center font-semibold text-gray-700">Debit</th>
            <th className="border-b border-gray-200 px-4 py-3 text-center font-semibold text-gray-700">Balance</th>
            <th className="border-b border-gray-200 px-4 py-3 text-center font-semibold text-gray-700">Select</th>
            <th className="border-b border-gray-200 px-4 py-3 text-center font-semibold text-gray-700">ID</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {hasEntries ? (
            entriesToShow.map((entry: any, index: number) => {
              // Use combination of ID and index to ensure unique keys
              const entryId = entry.id || entry._id || entry.ti || `entry_${index}`;
              // Create unique key combining ID with index to prevent duplicate key warnings
              const uniqueKey = `${entryId}_${index}`;
              const isSelected = selectedEntries.includes(entryId);
              
              return (
                <TableRow
                  key={uniqueKey}
                  entry={entry}
                  index={index}
                  isSelected={isSelected}
                  onCheckboxChange={onEntrySelect}
                />
              );
            })
          ) : (
            <tr>
              <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                {!ledgerData 
                  ? 'No ledger data loaded. Please select a party to view transactions.'
                  : showOldRecords 
                    ? 'No old records available' 
                    : 'No current entries available. Add your first transaction to get started.'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default LedgerTable;