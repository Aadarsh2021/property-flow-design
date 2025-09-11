import React, { memo, useState } from 'react';
import { LedgerEntry } from '@/types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, Edit, Trash2 } from 'lucide-react';

interface LedgerTableProps {
  entries: LedgerEntry[];
  showOldRecords: boolean;
  onToggleOldRecords: () => void;
  onEntrySelect: (id: string | number, checked: boolean) => void;
  onModifyEntry: (entry: LedgerEntry) => void;
  onDeleteEntry: (entry: LedgerEntry) => void;
  selectedEntries: string[];
  onSelectAll: (checked: boolean) => void;
}

// Memoized table row component for performance
const TableRow = memo(({ 
  entry, 
  index, 
  isSelected, 
  onCheckboxChange,
  onModify,
  onDelete
}: { 
  entry: LedgerEntry; 
  index: number; 
  isSelected: boolean; 
  onCheckboxChange: (id: string | number, checked: boolean) => void;
  onModify: (entry: LedgerEntry) => void;
  onDelete: (entry: LedgerEntry) => void;
}) => {
  const entryId = entry.id || entry._id || entry.ti || `entry_${index}`;
  
  return (
    <tr 
      className={`hover:bg-blue-50 cursor-pointer transition-colors duration-150 ${
        isSelected ? 'bg-blue-100' : ''
      } ${entry.is_old_record ? 'bg-gray-50 opacity-75' : ''}`}
      onClick={() => onCheckboxChange(entryId, !isSelected)}
    >
      <td className="px-4 py-3 text-gray-700">
        {new Date(entry.date).toLocaleDateString('en-GB')}
      </td>
      <td className="px-4 py-3 text-gray-800 font-medium">
        <div className="flex items-center space-x-2">
          <span>{entry.partyName || entry.party_name || ''}</span>
          {entry.is_old_record && (
            <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full font-medium">
              Old Record
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-center">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          entry.tnsType === 'CR' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {entry.tnsType}
        </span>
      </td>
      <td className="px-4 py-3 text-center font-medium text-green-600">
        {entry.credit || 0}
      </td>
      <td className="px-4 py-3 text-center font-medium text-red-600">
        {entry.debit || 0}
      </td>
      <td className="px-4 py-3 text-center font-semibold">
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          (entry.balance || 0) > 0 
            ? 'bg-green-100 text-green-800' 
            : (entry.balance || 0) < 0 
              ? 'bg-red-100 text-red-800'
              : 'bg-gray-100 text-gray-800'
        }`}>
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
});

TableRow.displayName = 'TableRow';

export const LedgerTable: React.FC<LedgerTableProps> = ({
  entries,
  showOldRecords,
  onToggleOldRecords,
  onEntrySelect,
  onModifyEntry,
  onDeleteEntry,
  selectedEntries,
  onSelectAll
}) => {
  const [selectAll, setSelectAll] = useState(false);

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    onSelectAll(checked);
  };

  const currentEntries = showOldRecords ? entries.filter(entry => entry.is_old_record) : entries.filter(entry => !entry.is_old_record);
  const allCurrentSelected = currentEntries.length > 0 && currentEntries.every(entry => 
    selectedEntries.includes(entry.id || entry._id || entry.ti || '')
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Ledger Entries
          </h3>
        </div>
      </div>

      {/* Table */}
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
            {currentEntries.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  {showOldRecords ? 'No old records found' : 'No current entries found'}
                </td>
              </tr>
            ) : (
              currentEntries.map((entry, index) => (
                <TableRow
                  key={entry.id || entry._id || entry.ti || index}
                  entry={entry}
                  index={index}
                  isSelected={selectedEntries.includes(entry.id || entry._id || entry.ti || '')}
                  onCheckboxChange={onEntrySelect}
                  onModify={onModifyEntry}
                  onDelete={onDeleteEntry}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      {currentEntries.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Total Entries: {currentEntries.length}</span>
            <span>Selected: {selectedEntries.length}</span>
          </div>
        </div>
      )}
    </div>
  );
};
