
import React, { useState } from 'react';
import TopNavigation from '../components/TopNavigation';
import { Checkbox } from '@/components/ui/checkbox';
import { useNavigate } from 'react-router-dom';

const FinalTrialBalance = () => {
  const navigate = useNavigate();
  const [partyName, setPartyName] = useState('');
  const [selectedEntries, setSelectedEntries] = useState<string[]>([]);

  // Mock data for Final Trial Balance
  const trialBalanceData = [
    // Credit entries
    { id: 'anth', name: 'ANTH RTGS', amount: 237923, type: 'credit' },
    { id: 'commission', name: 'COMMISSION', amount: 43219733, type: 'credit' },
    { id: 'daniel', name: 'DANIEL PAYMENT', amount: 426529, type: 'credit' },
    { id: 'gk', name: 'GK RTGS', amount: 174216, type: 'credit' },
    { id: 'madhu', name: 'MADHU', amount: 1575000, type: 'credit' },
    { id: 'om', name: 'OM SAI RTGS', amount: 194000, type: 'credit' },
    { id: 'pawan', name: 'PAWAN PAYMENT', amount: 1984235, type: 'credit' },
    { id: 'pk', name: 'PK PAYMENT', amount: 229412, type: 'credit' },
    { id: 'r83', name: 'R83 RONY', amount: 48500, type: 'credit' },
    { id: 'raja', name: 'RAJA RTGS', amount: 68774, type: 'credit' },
    { id: 'rolex', name: 'ROLEX RTGS', amount: 392650, type: 'credit' },
    { id: 'shi', name: 'SHI RTGS', amount: 19400, type: 'credit' },
    { id: 'summit', name: 'SUMMIT', amount: 553312, type: 'credit' },
    { id: 'teja', name: 'TEJA RTGS', amount: 1920900, type: 'credit' },
    { id: 'xam', name: 'X AM RTGS', amount: 6537, type: 'credit' },
    { id: 'zextra', name: 'Z EXTRA', amount: 3480312, type: 'credit' },
    
    // Debit entries
    { id: 'aed', name: 'AED MANISH', amount: -271465, type: 'debit' },
    { id: 'aqc', name: 'AQC', amount: -12704412, type: 'debit' },
    { id: 'baba', name: 'BABA RTGS', amount: -194000, type: 'debit' },
    { id: 'dan', name: 'DAN RTGS', amount: -51500, type: 'debit' },
    { id: 'devil', name: 'DEVIL RTGS', amount: -321290, type: 'debit' },
    { id: 'draj', name: 'DRAJ INR', amount: -3110990, type: 'debit' },
    { id: 'dubai', name: 'DUBAI RTGS', amount: -1575315, type: 'debit' },
    { id: 'extra', name: 'EXTRA', amount: -716730, type: 'debit' },
    { id: 'honey', name: 'HONEY RTGS', amount: -1640484, type: 'debit' },
    { id: 'hritik', name: 'HRITIK-J RTGS', amount: -145300, type: 'debit' },
    { id: 'inr', name: 'INR PRASANT', amount: -2515629, type: 'debit' },
    { id: 'kanhaiya', name: 'KANHAIYA', amount: -314229, type: 'debit' },
    { id: 'l164', name: 'L164 RONY', amount: -340468, type: 'debit' },
    { id: 'l328', name: 'L328 RONY RTGS', amount: -173872, type: 'debit' },
    { id: 'l412', name: 'L412 HRITIK', amount: -388000, type: 'debit' },
    { id: 'melvin', name: 'MELVIN', amount: -1395352, type: 'debit' },
    { id: 'mumbai', name: 'MUMBAI', amount: -1606580, type: 'debit' },
    { id: 'qjnr', name: 'Q-JNR MAHESH', amount: -1639587, type: 'debit' },
    { id: 'r239', name: 'R239 JSHIK', amount: -267798, type: 'debit' },
    { id: 'rtgs', name: 'RTGS SSN PRN', amount: -97004, type: 'debit' },
    { id: 'rudra', name: 'RUDRA PAYMENT', amount: -2106189, type: 'debit' },
    { id: 'scanner', name: 'SCANNER', amount: -918704, type: 'debit' },
    { id: 'ss', name: 'SS INFO', amount: -6937615, type: 'debit' },
    { id: 'udaipur', name: 'UDAIPUR RJ', amount: -8707104, type: 'debit' },
    { id: 'vaibhav', name: 'VAIBHAV', amount: -210861, type: 'debit' },
    { id: 'vipul', name: 'VIPUL', amount: -4906763, type: 'debit' },
    { id: 'vishal', name: 'VISHAL INR', amount: -849457, type: 'debit' },
    { id: 'vw', name: 'VW-AM RTGS', amount: -180910, type: 'debit' },
    { id: 'withdrawal', name: 'WITHDRAWAL N', amount: -243825, type: 'debit' }
  ];

  const creditEntries = trialBalanceData.filter(entry => entry.type === 'credit');
  const debitEntries = trialBalanceData.filter(entry => entry.type === 'debit');

  const creditTotal = creditEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const debitTotal = debitEntries.reduce((sum, entry) => sum + Math.abs(entry.amount), 0);

  const handleCheckboxChange = (entryId: string, checked: boolean) => {
    if (checked) {
      setSelectedEntries(prev => [...prev, entryId]);
    } else {
      setSelectedEntries(prev => prev.filter(id => id !== entryId));
    }
  };

  const handleSelectAll = (type: 'credit' | 'debit') => {
    const entries = type === 'credit' ? creditEntries : debitEntries;
    const entryIds = entries.map(entry => entry.id);
    const allSelected = entryIds.every(id => selectedEntries.includes(id));

    if (allSelected) {
      setSelectedEntries(prev => prev.filter(id => !entryIds.includes(id)));
    } else {
      setSelectedEntries(prev => [...new Set([...prev, ...entryIds])]);
    }
  };

  const handleShow = () => {
    console.log('Show selected entries:', selectedEntries);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleRefresh = () => {
    setSelectedEntries([]);
    console.log('Data refreshed');
  };

  const handleExit = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNavigation />
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-t-lg">
            <h2 className="text-xl font-semibold">Final Trial Balance</h2>
          </div>
          
          <div className="p-6">
            {/* Controls */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <label className="text-sm font-medium text-gray-700">Party Name</label>
                <input
                  type="text"
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter party name"
                />
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={handleShow}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
                >
                  Show
                </button>
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium"
                >
                  Print
                </button>
                <button
                  onClick={handleRefresh}
                  className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors font-medium"
                >
                  Refresh
                </button>
                <button
                  onClick={handleExit}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-medium"
                >
                  Exit
                </button>
              </div>
            </div>

            {/* Trial Balance Table */}
            <div className="grid grid-cols-4 gap-4">
              {/* Credit Column 1 */}
              <div>
                <div className="bg-blue-100 p-2 font-semibold text-center mb-2 rounded">
                  <div className="flex items-center justify-center space-x-2">
                    <Checkbox
                      checked={creditEntries.slice(0, Math.ceil(creditEntries.length/2)).every(entry => selectedEntries.includes(entry.id))}
                      onCheckedChange={() => handleSelectAll('credit')}
                    />
                    <span>Name</span>
                    <span className="ml-auto">Amount (Cr)</span>
                  </div>
                </div>
                {creditEntries.slice(0, Math.ceil(creditEntries.length/2)).map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-2 border-b border-gray-200">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={selectedEntries.includes(entry.id)}
                        onCheckedChange={(checked) => handleCheckboxChange(entry.id, checked as boolean)}
                      />
                      <span className="text-sm">{entry.name}</span>
                    </div>
                    <span className="text-sm font-medium">{entry.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>

              {/* Credit Column 2 */}
              <div>
                <div className="bg-blue-100 p-2 font-semibold text-center mb-2 rounded">
                  <div className="flex items-center justify-center space-x-2">
                    <span>Name</span>
                    <span className="ml-auto">Amount (Cr)</span>
                  </div>
                </div>
                {creditEntries.slice(Math.ceil(creditEntries.length/2)).map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-2 border-b border-gray-200">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={selectedEntries.includes(entry.id)}
                        onCheckedChange={(checked) => handleCheckboxChange(entry.id, checked as boolean)}
                      />
                      <span className="text-sm">{entry.name}</span>
                    </div>
                    <span className="text-sm font-medium">{entry.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>

              {/* Debit Column 1 */}
              <div>
                <div className="bg-red-100 p-2 font-semibold text-center mb-2 rounded">
                  <div className="flex items-center justify-center space-x-2">
                    <Checkbox
                      checked={debitEntries.slice(0, Math.ceil(debitEntries.length/2)).every(entry => selectedEntries.includes(entry.id))}
                      onCheckedChange={() => handleSelectAll('debit')}
                    />
                    <span>Name</span>
                    <span className="ml-auto">Amount (Dr)</span>
                  </div>
                </div>
                {debitEntries.slice(0, Math.ceil(debitEntries.length/2)).map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-2 border-b border-gray-200">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={selectedEntries.includes(entry.id)}
                        onCheckedChange={(checked) => handleCheckboxChange(entry.id, checked as boolean)}
                      />
                      <span className="text-sm">{entry.name}</span>
                    </div>
                    <span className="text-sm font-medium">{Math.abs(entry.amount).toLocaleString()}</span>
                  </div>
                ))}
              </div>

              {/* Debit Column 2 */}
              <div>
                <div className="bg-red-100 p-2 font-semibold text-center mb-2 rounded">
                  <div className="flex items-center justify-center space-x-2">
                    <span>Name</span>
                    <span className="ml-auto">Amount (Dr)</span>
                  </div>
                </div>
                {debitEntries.slice(Math.ceil(debitEntries.length/2)).map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-2 border-b border-gray-200">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={selectedEntries.includes(entry.id)}
                        onCheckedChange={(checked) => handleCheckboxChange(entry.id, checked as boolean)}
                      />
                      <span className="text-sm">{entry.name}</span>
                    </div>
                    <span className="text-sm font-medium">{Math.abs(entry.amount).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="bg-blue-200 p-4 rounded-lg">
                <div className="text-center font-bold text-lg">
                  Credit / Jama / Dena Total: {creditTotal.toLocaleString()}
                </div>
              </div>
              <div className="bg-red-200 p-4 rounded-lg">
                <div className="text-center font-bold text-lg">
                  Debit / Name / Lena Total: -{debitTotal.toLocaleString()}
                </div>
              </div>
            </div>

            {selectedEntries.length > 0 && (
              <div className="mt-4 bg-yellow-50 border border-yellow-200 p-3 rounded-md">
                <span className="text-sm font-medium text-yellow-800">
                  {selectedEntries.length} entries selected
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinalTrialBalance;
