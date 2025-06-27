
import React, { useState } from 'react';
import TopNavigation from '../components/TopNavigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { useNavigate } from 'react-router-dom';

const PartyLedger = () => {
  const navigate = useNavigate();
  const [selectedParty, setSelectedParty] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedParties, setSelectedParties] = useState<string[]>([]);

  // Mock party data
  const parties = [
    { name: '001-AR RTGS', mondayFinal: 'Yes' },
    { name: '01-KANHA RTGS', mondayFinal: 'Yes' },
    { name: '09-KHILADI RTGS', mondayFinal: 'Yes' },
    { name: '11AA RTGS', mondayFinal: 'Yes' },
    { name: '44WIN RTGS', mondayFinal: 'Yes' },
    { name: '626 SHIVAY RT', mondayFinal: 'Yes' },
    { name: '99-VISHAL RTGS', mondayFinal: 'Yes' },
    { name: 'AA RTGS', mondayFinal: 'Yes' },
    { name: 'AADI RTGS', mondayFinal: 'Yes' },
    { name: 'AB BAJRANG RTGS', mondayFinal: 'Yes' },
    { name: 'ABHI RTGS', mondayFinal: 'Yes' },
    { name: 'AED MANISH', mondayFinal: 'Yes' },
    { name: 'AJ RTGS', mondayFinal: 'Yes' },
    { name: 'AKKI RTGS', mondayFinal: 'Yes' },
    { name: 'ANISH RTGS', mondayFinal: 'Yes' },
    { name: 'ANTH RTGS', mondayFinal: 'Yes' },
    { name: 'AQC', mondayFinal: 'No' },
    { name: 'BABA RTGS', mondayFinal: 'Yes' },
    { name: 'BADSHA RTGS', mondayFinal: 'Yes' },
    { name: 'BB RTGS', mondayFinal: 'Yes' },
    { name: 'BERLIN', mondayFinal: 'Yes' },
    { name: 'BG RTGS', mondayFinal: 'Yes' },
    { name: 'BIG B RTGS', mondayFinal: 'Yes' }
  ];

  const filteredParties = parties.filter(party =>
    party.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePartySelect = (partyName: string) => {
    setSelectedParty(partyName);
    setIsDialogOpen(false);
    navigate(`/account-ledger/${encodeURIComponent(partyName)}`);
  };

  const handleCheckboxChange = (partyName: string, checked: boolean) => {
    if (checked) {
      setSelectedParties(prev => [...prev, partyName]);
    } else {
      setSelectedParties(prev => prev.filter(name => name !== partyName));
    }
  };

  const handleSelectAll = () => {
    if (selectedParties.length === filteredParties.length) {
      setSelectedParties([]);
    } else {
      setSelectedParties(filteredParties.map(party => party.name));
    }
  };

  const handleMondayFinal = () => {
    if (selectedParties.length > 0) {
      console.log('Monday Final for:', selectedParties);
    }
  };

  const handleExit = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNavigation />
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-t-lg">
            <h2 className="text-xl font-semibold">Party A/C. Ledger</h2>
          </div>
          
          <div className="p-6">
            <div className="flex items-center space-x-4 mb-6">
              <label className="text-sm font-medium text-gray-700">Party Name</label>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <input
                    type="text"
                    value={selectedParty}
                    placeholder="001-AR RTGS"
                    readOnly
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer bg-white"
                    onClick={() => setIsDialogOpen(true)}
                  />
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
                  <DialogHeader>
                    <DialogTitle>Select Party</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="Search parties..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="overflow-y-auto max-h-96">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>
                              <Checkbox
                                checked={selectedParties.length === filteredParties.length && filteredParties.length > 0}
                                onCheckedChange={handleSelectAll}
                              />
                            </TableHead>
                            <TableHead>Party Name</TableHead>
                            <TableHead>Monday Final</TableHead>
                            <TableHead>Select</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredParties.map((party, index) => (
                            <TableRow 
                              key={index} 
                              className={party.mondayFinal === 'Yes' ? 'bg-green-50' : 'bg-red-50'}
                            >
                              <TableCell>
                                <Checkbox
                                  checked={selectedParties.includes(party.name)}
                                  onCheckedChange={(checked) => handleCheckboxChange(party.name, checked as boolean)}
                                />
                              </TableCell>
                              <TableCell className="font-medium">{party.name}</TableCell>
                              <TableCell>
                                <span className={`px-2 py-1 rounded text-sm ${
                                  party.mondayFinal === 'Yes' 
                                    ? 'bg-green-200 text-green-800' 
                                    : 'bg-red-200 text-red-800'
                                }`}>
                                  {party.mondayFinal}
                                </span>
                              </TableCell>
                              <TableCell>
                                <input
                                  type="radio"
                                  name="selectedParty"
                                  onChange={() => handlePartySelect(party.name)}
                                  className="cursor-pointer"
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {selectedParties.length > 0 && (
                      <div className="flex justify-between items-center bg-blue-50 p-3 rounded-md">
                        <span className="text-sm font-medium text-blue-700">
                          {selectedParties.length} parties selected
                        </span>
                        <button
                          onClick={handleMondayFinal}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                        >
                          Monday Final
                        </button>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
              
              <button
                onClick={handleExit}
                className="px-6 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors font-medium"
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartyLedger;
