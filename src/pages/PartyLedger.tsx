
import React, { useState, useEffect } from 'react';
import TopNavigation from '../components/TopNavigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { useNavigate } from 'react-router-dom';
import { partyLedgerAPI, mockData } from '../lib/api';
import { useToast } from '../hooks/use-toast';

const PartyLedger = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedParty, setSelectedParty] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedParties, setSelectedParties] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [parties, setParties] = useState<any[]>([]);

  // Fetch parties on component mount
  useEffect(() => {
    fetchParties();
  }, []);

  const fetchParties = async () => {
    setLoading(true);
    try {
      const response = await partyLedgerAPI.getAllParties();
      if (response.success) {
        setParties(response.data);
      } else {
        // Fallback to mock data if API fails
        setParties(mockData.getMockParties());
        console.warn('Using mock data due to API failure');
      }
    } catch (error) {
      console.error('Error fetching parties:', error);
      // Use mock data as fallback
      setParties(mockData.getMockParties());
      toast({
        title: "Warning",
        description: "Using offline data. Some features may be limited.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

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

  const handleMondayFinal = async () => {
    if (selectedParties.length > 0) {
      try {
        const response = await partyLedgerAPI.updateMondayFinal(selectedParties);
        if (response.success) {
          // Update local state
      setParties(prevParties => 
        prevParties.map(party => 
          selectedParties.includes(party.name) 
            ? { ...party, mondayFinal: 'Yes' }
            : party
        )
      );
      setSelectedParties([]);
          toast({
            title: "Success",
            description: "Monday Final status updated successfully",
          });
        } else {
          toast({
            title: "Error",
            description: response.message || "Failed to update Monday Final status",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('Error updating Monday Final:', error);
        toast({
          title: "Error",
          description: "Failed to update Monday Final status",
          variant: "destructive"
        });
      }
    } else {
      toast({
        title: "Warning",
        description: "Please select parties to update Monday Final status.",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async () => {
    if (selectedParties.length > 0) {
      const confirmDelete = window.confirm(`Are you sure you want to delete ${selectedParties.length} selected parties?`);
      if (confirmDelete) {
        try {
          const response = await partyLedgerAPI.deleteParties(selectedParties);
          if (response.success) {
        setParties(prevParties => 
          prevParties.filter(party => !selectedParties.includes(party.name))
        );
        setSelectedParties([]);
            toast({
              title: "Success",
              description: "Parties deleted successfully",
            });
          } else {
            toast({
              title: "Error",
              description: response.message || "Failed to delete parties",
              variant: "destructive"
            });
          }
        } catch (error) {
          console.error('Error deleting parties:', error);
          toast({
            title: "Error",
            description: "Failed to delete parties",
            variant: "destructive"
          });
        }
      }
    } else {
      toast({
        title: "Warning",
        description: "Please select parties to delete.",
        variant: "destructive"
      });
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
                      {loading ? (
                        <div className="text-center py-4">Loading parties...</div>
                      ) : (
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
                              key={party.name || `party-${index}`} 
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
                      )}
                    </div>
                    {selectedParties.length > 0 && (
                      <div className="flex justify-between items-center bg-blue-50 p-3 rounded-md">
                        <span className="text-sm font-medium text-blue-700">
                          {selectedParties.length} parties selected
                        </span>
                        <div className="flex space-x-2">
                          <button
                            onClick={handleMondayFinal}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                          >
                            Monday Final
                          </button>
                          <button
                            onClick={handleDelete}
                            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
                          >
                            Delete Selected
                          </button>
                        </div>
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
