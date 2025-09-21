import React, { memo, useCallback, useMemo } from 'react';
import { FixedSizeList } from 'react-window';
import { LedgerEntry } from '@/types';
import { Checkbox } from '@/components/ui/checkbox';

interface VirtualizedLedgerTableProps {
  entries: LedgerEntry[];
  showOldRecords: boolean;
  selectedEntries: string[];
  onEntrySelect: (id: string | number, checked: boolean) => void;
  onModifyEntry: (entry: LedgerEntry) => void;
  onDeleteEntry: (entry: LedgerEntry) => void;
  onSelectAll: (checked: boolean) => void;
}

// Memoized row component for virtual scrolling
const VirtualRow = memo(({ 
  index, 
  style, 
  data 
}: { 
  index: number; 
  style: React.CSSProperties; 
  data: {
    entries: LedgerEntry[];
    selectedEntries: string[];
    onEntrySelect: (id: string | number, checked: boolean) => void;
    onModify: (entry: LedgerEntry) => void;
    onDelete: (entry: LedgerEntry) => void;
  };
}) => {
  const { entries, selectedEntries, onEntrySelect, onModify, onDelete } = data;
  const entry = entries[index];
  
  if (!entry) return null;
  
  const entryId = entry.id || entry._id || entry.ti || `entry_${index}`;
  const isSelected = selectedEntries.includes(entryId);
  
  return (
    <div 
      style={style}
      className={`flex items-center border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors duration-150 ${
        isSelected ? 'bg-blue-100' : ''
      } ${entry.is_old_record ? 'bg-gray-50 opacity-75' : ''}`}
      onClick={() => onEntrySelect(entryId, !isSelected)}
    >
      {/* Date */}
      <div className="w-24 px-4 py-3 text-gray-700 text-sm">
        {new Date(entry.date).toLocaleDateString('en-GB')}
      </div>
      
      {/* Remarks */}
      <div className="flex-1 px-4 py-3 text-gray-800 font-medium">
        <div className="flex items-center space-x-2">
          <span className="truncate">{entry.remarks || entry.partyName || entry.party_name || ''}</span>
          {entry.is_old_record && (
            <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full font-medium flex-shrink-0">
              Old Record
            </span>
          )}
        </div>
      </div>
      
      {/* Transaction Type */}
      <div className="w-16 px-4 py-3 text-center">
        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
          entry.tnsType === 'CR' 
            ? 'bg-green-100 text-green-800 border border-green-200' 
            : 'bg-red-100 text-red-800 border border-red-200'
        }`}>
          {entry.tnsType === 'CR' ? 'CR' : 'DR'}
        </span>
      </div>
      
      {/* Credit */}
      <div className="w-24 px-4 py-3 text-center font-medium text-green-600 text-sm">
        {entry.credit || 0}
      </div>
      
      {/* Debit */}
      <div className="w-24 px-4 py-3 text-center font-medium text-red-600 text-sm">
        {entry.debit || 0}
      </div>
      
      {/* Balance */}
      <div className="w-32 px-4 py-3 text-center font-semibold">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          (entry.balance || 0) > 0 
            ? 'bg-green-100 text-green-800' 
            : (entry.balance || 0) < 0 
              ? 'bg-red-100 text-red-800'
              : 'bg-gray-100 text-gray-800'
        }`}>
          ₹{(entry.balance || 0).toLocaleString()}
        </span>
      </div>
      
      {/* Checkbox */}
      <div className="w-12 px-4 py-3 text-center">
        <Checkbox
          checked={isSelected}
          onChange={(e) => onEntrySelect(entryId, e.target.checked)}
          onClick={(e) => e.stopPropagation()}
          className="w-4 h-4"
        />
      </div>
      
      {/* Actions */}
      <div className="w-16 px-4 py-3 text-center text-gray-500 text-xs">
        {/* Action buttons can be added here */}
      </div>
    </div>
  );
});

VirtualRow.displayName = 'VirtualRow';

export const VirtualizedLedgerTable: React.FC<VirtualizedLedgerTableProps> = ({
  entries,
  showOldRecords,
  selectedEntries,
  onEntrySelect,
  onModifyEntry,
  onDeleteEntry,
  onSelectAll
}) => {
  // Filter entries based on showOldRecords
  const currentEntries = useMemo(() => 
    showOldRecords 
      ? entries.filter(entry => entry.is_old_record) 
      : entries.filter(entry => !entry.is_old_record),
    [entries, showOldRecords]
  );

  // Check if all entries are selected
  const allCurrentSelected = useMemo(() => 
    currentEntries.length > 0 && currentEntries.every(entry => 
      selectedEntries.includes(entry.id || entry._id || entry.ti || '')
    ),
    [currentEntries, selectedEntries]
  );

  // Data for virtual list
  const itemData = useMemo(() => ({
    entries: currentEntries,
    selectedEntries,
    onEntrySelect,
    onModify: onModifyEntry,
    onDelete: onDeleteEntry,
  }), [currentEntries, selectedEntries, onEntrySelect, onModifyEntry, onDeleteEntry]);

  // Row height for virtual scrolling
  const ROW_HEIGHT = 60;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 rounded-t-lg">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            {showOldRecords ? 'Old Records' : 'Current Entries'}
          </h3>
          <div className="flex items-center space-x-4">
            <Checkbox
              checked={allCurrentSelected}
              onChange={(e) => onSelectAll(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm text-gray-600">
              Select All ({currentEntries.length} entries)
            </span>
          </div>
        </div>
      </div>

      {/* Table Header */}
      <div className="bg-gray-100 px-6 py-3 border-b border-gray-200">
        <div className="flex items-center text-sm font-medium text-gray-700">
          <div className="w-24">Date</div>
          <div className="flex-1">Remarks</div>
          <div className="w-16">Type</div>
          <div className="w-24">Credit</div>
          <div className="w-24">Debit</div>
          <div className="w-32">Balance</div>
          <div className="w-12">Select</div>
          <div className="w-16">Actions</div>
        </div>
      </div>

      {/* Virtual List */}
      <div className="relative">
        {currentEntries.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            {showOldRecords ? 'No old records found' : 'No current entries found'}
          </div>
        ) : (
          <FixedSizeList
            height={Math.min(600, currentEntries.length * ROW_HEIGHT)} // Max height 600px
            itemCount={currentEntries.length}
            itemSize={ROW_HEIGHT}
            itemData={itemData}
            overscanCount={5} // Render 5 extra items for smooth scrolling
          >
            {VirtualRow}
          </FixedSizeList>
        )}
      </div>

      {/* Summary */}
      {currentEntries.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Total Entries: <span className="font-medium text-blue-600">{currentEntries.length}</span></span>
            <span>Selected: <span className="font-medium text-green-600">{selectedEntries.length}</span></span>
          </div>
        </div>
      )}
    </div>
  );
};
