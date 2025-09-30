import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';

// Helper function to format party name display
const formatPartyNameDisplay = (remarks: string) => {
  if (!remarks) return '';
  
  // Check if remarks contains party name format "PartyName: Remarks"
  if (remarks.includes(':')) {
    const [partyName, partyRemarks] = remarks.split(':', 2);
    const cleanRemarks = partyRemarks.trim();
    
    // If there are actual remarks, show "PartyName(Remarks)" format
    if (cleanRemarks && cleanRemarks !== partyName.trim()) {
      return `${partyName.trim()}(${cleanRemarks})`;
    }
    
    // If no meaningful remarks, just show party name
    return partyName.trim();
  }
  
  // If no ":" found, return as is (for backward compatibility)
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
  
  return (
    <tr 
      className={`hover:bg-blue-50 cursor-pointer transition-colors duration-150 ${
        isSelected ? 'bg-blue-100' : ''
      } ${entry.is_old_record ? 'bg-gray-50 opacity-75' : ''} ${
        entry.isOptimistic ? 'bg-green-50 border-l-4 border-green-400 animate-pulse' : ''
      }`}
      onClick={() => onCheckboxChange(entryId, !isSelected)}
    >
      <td className="px-4 py-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onCheckboxChange(entryId, e.target.checked)}
          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
          onClick={(e) => e.stopPropagation()}
        />
      </td>
      <td className="px-4 py-3 text-sm text-gray-900">
        {entry.date ? new Date(entry.date).toLocaleDateString() : '-'}
      </td>
      <td className="px-4 py-3 text-sm font-medium text-gray-900">
        {formatPartyNameDisplay(entry.remarks || '')}
      </td>
      <td className="px-4 py-3 text-sm text-gray-900">
        {entry.tns_type || entry.type || '-'}
      </td>
      <td className="px-4 py-3 text-sm font-medium text-green-600">
        {entry.credit && entry.credit > 0 ? `₹${entry.credit.toLocaleString()}` : '-'}
      </td>
      <td className="px-4 py-3 text-sm font-medium text-red-600">
        {entry.debit && entry.debit > 0 ? `₹${entry.debit.toLocaleString()}` : '-'}
      </td>
      <td className="px-4 py-3 text-sm font-bold text-gray-900">
        {entry.balance !== undefined ? `₹${entry.balance.toLocaleString()}` : '-'}
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
  console.log('📋 LedgerTable rendering with:', { ledgerData, loading, hasEntries: ledgerData?.ledgerEntries?.length });
  
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

  // Always show table structure, even if no data
  if (!ledgerData) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No ledger data available</p>
      </div>
    );
  }

  // Determine which entries to show
  const entriesToShow = showOldRecords 
    ? (ledgerData.oldRecords || [])
    : (ledgerData.ledgerEntries || []);

  // Show table even if no entries, with empty message in body
  const hasEntries = entriesToShow.length > 0;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Select
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Party Name
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Type
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Credit
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Debit
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Balance
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {hasEntries ? (
            entriesToShow.map((entry: any, index: number) => {
              const entryId = entry.id || entry._id || entry.ti || `entry_${index}`;
              const isSelected = selectedEntries.includes(entryId);
              
              return (
                <TableRow
                  key={entryId}
                  entry={entry}
                  index={index}
                  isSelected={isSelected}
                  onCheckboxChange={onEntrySelect}
                />
              );
            })
          ) : (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                {showOldRecords ? 'No old records available' : 'No current entries available'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default LedgerTable;