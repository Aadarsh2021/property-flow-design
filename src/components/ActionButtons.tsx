import React from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { Button } from '@/components/ui/button';
import { RefreshCw, Download, LogOut, Trash2, Printer, CheckCircle, Clock, Edit } from 'lucide-react';

interface ActionButtonsProps {
  onRefresh: () => void;
  onDCReport: () => void;
  onMondayFinal: () => void;
  onOldRecord: () => void;
  showOldRecords: boolean;
  onModify: () => void;
  onDelete: () => void;
  onPrint: () => void;
  onCheckAll: () => void;
  onExit: () => void;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  onRefresh,
  onDCReport,
  onMondayFinal,
  onOldRecord,
  showOldRecords,
  onModify,
  onDelete,
  onPrint,
  onCheckAll,
  onExit
}) => {
  const dispatch = useAppDispatch();
  
  const {
    isActionLoading: actionLoading,
    selectedEntries = []
  } = useAppSelector(state => state.ui);
  
  const {
    data: ledgerData
  } = useAppSelector(state => state.ledger);

  const hasMondayFinal = ledgerData?.mondayFinalData?.latestEntryId;
  const hasSelectedEntries = selectedEntries.length > 0;

  return (
    <div className="flex-1 space-y-3">
      {/* Action Buttons */}
      <div className="space-y-3">
        {/* Refresh All */}
        <Button
          onClick={onRefresh}
          disabled={actionLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          <RefreshCw className={`w-4 h-4 ${actionLoading ? 'animate-spin' : ''}`} />
          <span>Refresh All</span>
        </Button>


        {/* DC Report */}
        <Button
          onClick={onDCReport}
          disabled={actionLoading}
          className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          <Download className="w-4 h-4" />
          <span>DC Report</span>
        </Button>

        {/* Monday Final */}
        <Button
          onClick={onMondayFinal}
          disabled={actionLoading}
          className={`w-full py-2 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 ${
            hasMondayFinal 
              ? 'bg-red-600 hover:bg-red-700 text-white' 
              : 'bg-orange-600 hover:bg-orange-700 text-white'
          }`}
        >
          <CheckCircle className="w-4 h-4" />
          <span>{hasMondayFinal ? 'Delete Monday Final' : 'Create Monday Final'}</span>
        </Button>

        {/* Old Record */}
        <Button
          onClick={onOldRecord}
          disabled={actionLoading}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          <Clock className="w-4 h-4" />
          <span>{showOldRecords ? 'Show Current Records' : 'Show Old Records'}</span>
        </Button>

        {/* Modify */}
        <Button
          onClick={onModify}
          disabled={actionLoading || !hasSelectedEntries}
          className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          <Edit className="w-4 h-4" />
          <span>Modify</span>
        </Button>

        {/* Delete */}
        <Button
          onClick={onDelete}
          disabled={actionLoading || !hasSelectedEntries}
          className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          <Trash2 className="w-4 h-4" />
          <span>Delete Selected</span>
        </Button>

        {/* Print */}
        <Button
          onClick={onPrint}
          disabled={actionLoading}
          className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          <Printer className="w-4 h-4" />
          <span>Print</span>
        </Button>

        {/* Check All */}
        <Button
          onClick={onCheckAll}
          disabled={actionLoading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          <CheckCircle className="w-4 h-4" />
          <span>Check All</span>
        </Button>

        {/* Exit */}
        <Button
          onClick={onExit}
          disabled={actionLoading}
          className="w-full bg-gray-800 hover:bg-gray-900 text-white py-2 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          <LogOut className="w-4 h-4" />
          <span>Exit</span>
        </Button>
      </div>

      {/* Selected Count Display */}
      {hasSelectedEntries && (
        <div className="p-4 border-t border-gray-200 bg-blue-50">
          <p className="text-sm text-blue-800 text-center">
            {selectedEntries.length} item{selectedEntries.length !== 1 ? 's' : ''} selected
          </p>
        </div>
      )}
    </div>
  );
};

export default ActionButtons;
