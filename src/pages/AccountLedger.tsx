
import React, { useState } from 'react';
import TopNavigation from '../components/TopNavigation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { useParams, useNavigate } from 'react-router-dom';

const AccountLedger = () => {
  const { partyName } = useParams<{ partyName: string }>();
  const navigate = useNavigate();
  const [newEntry, setNewEntry] = useState({
    partyName: '',
    amount: '',
    remarks: ''
  });

  // Mock ledger data
  const [ledgerEntries, setLedgerEntries] = useState([
    {
      id: 1,
      date: '27/06/2025',
      remarks: 'Monday Final 27/06/2025',
      tnsType: 'Monday S...',
      credit: 0,
      debit: 0,
      balance: 0,
      chk: false,
      ti: '12'
    },
    {
      id: 2,
      date: '27/06/2025',
      remarks: 'VW-AM RTGS (5455)',
      tnsType: 'CR',
      credit: 100000,
      debit: 0,
      balance: 100000,
      chk: false,
      ti: '3:'
    },
    {
      id: 3,
      date: '27/06/2025',
      remarks: 'COMMISSION',
      tnsType: 'DR',
      credit: 0,
      debit: -3000,
      balance: 97000,
      chk: false,
      ti: '3:'
    },
    {
      id: 4,
      date: '27/06/2025',
      remarks: 'AQC',
      tnsType: 'DR',
      credit: 0,
      debit: -97000,
      balance: 0,
      chk: true,
      ti: '3:'
    }
  ]);

  const [closingBalance, setClosingBalance] = useState(0);

  const handleCheckboxChange = (id: number, checked: boolean) => {
    setLedgerEntries(prevEntries =>
      prevEntries.map(entry =>
        entry.id === id ? { ...entry, chk: checked } : entry
      )
    );
  };

  const handleCheckAll = () => {
    const allChecked = ledgerEntries.every(entry => entry.chk);
    setLedgerEntries(prevEntries =>
      prevEntries.map(entry => ({ ...entry, chk: !allChecked }))
    );
  };

  const handleAddEntry = () => {
    if (newEntry.partyName && newEntry.amount && newEntry.remarks) {
      const amount = parseFloat(newEntry.amount);
      const lastBalance = ledgerEntries.length > 0 ? ledgerEntries[ledgerEntries.length - 1].balance : 0;
      
      const newLedgerEntry = {
        id: ledgerEntries.length + 1,
        date: new Date().toLocaleDateString('en-GB'),
        remarks: newEntry.remarks,
        tnsType: amount > 0 ? 'CR' : 'DR',
        credit: amount > 0 ? amount : 0,
        debit: amount < 0 ? amount : 0,
        balance: lastBalance + amount,
        chk: false,
        ti: '3:'
      };

      setLedgerEntries([...ledgerEntries, newLedgerEntry]);
      setClosingBalance(newLedgerEntry.balance);
      setNewEntry({ partyName: '', amount: '', remarks: '' });
    }
  };

  const handleRefreshAll = () => {
    console.log('Refreshing all data...');
  };

  const handleExit = () => {
    navigate('/party-ledger');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNavigation />
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-t-lg flex justify-between items-center">
            <h2 className="text-xl font-semibold">Account Ledger</h2>
            <button
              onClick={handleRefreshAll}
              className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors font-medium"
            >
              Refresh All
            </button>
          </div>
          
          <div className="flex">
            {/* Left Container - Main Data */}
            <div className="flex-1 p-6">
              {/* Party Info Header */}
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium text-gray-700">Party Name</span>
                  <span className="font-semibold text-lg">{decodeURIComponent(partyName || '001-AR RTGS')}</span>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium text-gray-700">Closing Balance :</span>
                  <span className="font-bold text-lg text-blue-600">{closingBalance}</span>
                </div>
              </div>

              {/* Ledger Table */}
              <div className="overflow-x-auto mb-6">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-blue-50">
                      <TableHead className="font-semibold">Date</TableHead>
                      <TableHead className="font-semibold">Remarks</TableHead>
                      <TableHead className="font-semibold">Tns Type</TableHead>
                      <TableHead className="font-semibold text-right">Credit</TableHead>
                      <TableHead className="font-semibold text-right">Debit</TableHead>
                      <TableHead className="font-semibold text-right">Balance</TableHead>
                      <TableHead className="font-semibold text-center">Chk</TableHead>
                      <TableHead className="font-semibold">Ti</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ledgerEntries.map((entry) => (
                      <TableRow key={entry.id} className={entry.chk ? 'bg-blue-100' : ''}>
                        <TableCell>{entry.date}</TableCell>
                        <TableCell className={entry.remarks === 'AQC' ? 'bg-blue-200 font-semibold' : ''}>
                          {entry.remarks}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-sm ${
                            entry.tnsType === 'CR' ? 'bg-green-100 text-green-800' : 
                            entry.tnsType === 'DR' ? 'bg-red-100 text-red-800' : 
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {entry.tnsType}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">{entry.credit || ''}</TableCell>
                        <TableCell className="text-right">{entry.debit || ''}</TableCell>
                        <TableCell className="text-right font-semibold">{entry.balance}</TableCell>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={entry.chk}
                            onCheckedChange={(checked) => handleCheckboxChange(entry.id, checked as boolean)}
                          />
                        </TableCell>
                        <TableCell>{entry.ti}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Entry Form */}
              <div className="border-t pt-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Party Name</label>
                    <input
                      type="text"
                      value={newEntry.partyName}
                      onChange={(e) => setNewEntry({...newEntry, partyName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter party name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                    <input
                      type="number"
                      value={newEntry.amount}
                      onChange={(e) => setNewEntry({...newEntry, amount: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter amount"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                    <input
                      type="text"
                      value={newEntry.remarks}
                      onChange={(e) => setNewEntry({...newEntry, remarks: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter remarks"
                    />
                  </div>
                  <div>
                    <button
                      onClick={handleAddEntry}
                      className="w-full px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium"
                    >
                      OK
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Sidebar - Action Buttons */}
            <div className="w-48 bg-gray-50 border-l border-gray-200 p-4">
              <div className="flex flex-col space-y-2">
                <button className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors font-medium text-sm">
                  DC Report
                </button>
                <button className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors font-medium text-sm">
                  Monday Final
                </button>
                <button className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors font-medium text-sm">
                  Old Record
                </button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium text-sm">
                  Modify
                </button>
                <button className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-medium text-sm">
                  Delete
                </button>
                <button className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors font-medium text-sm">
                  Print
                </button>
                <button
                  onClick={handleCheckAll}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors font-medium text-sm"
                >
                  Check All
                </button>
                <button
                  onClick={handleExit}
                  className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors font-medium text-sm"
                >
                  Exit
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountLedger;
