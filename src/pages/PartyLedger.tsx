
import React, { useState, useEffect } from 'react';
import TopNavigation from '../components/TopNavigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useNavigate } from 'react-router-dom';
import { partyLedgerAPI, mockData } from '../lib/api';
import { useToast } from '../hooks/use-toast';
import { AlertTriangle, CheckCircle, Calendar, Users } from 'lucide-react';

const PartyLedger = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedParty, setSelectedParty] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedParties, setSelectedParties] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [parties, setParties] = useState<any[]>([]);
  
  // Monday Final confirmation modal states
  const [showMondayFinalModal, setShowMondayFinalModal] = useState(false);
  const [mondayFinalLoading, setMondayFinalLoading] = useState(false);
  const [mondayFinalDate, setMondayFinalDate] = useState<string>('');

  // Get current date for Monday Final
  useEffect(() => {
    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-GB'); // DD/MM/YYYY format
    setMondayFinalDate(formattedDate);
  }, []);

  // Fetch parties on component mount
  useEffect(() => {
    fetchParties();
  }, []);

  const fetchParties = async () => {
    setLoading(true);
    try {
      const response = await partyLedgerAPI.getAllParties();
      console.log('API Response:', response);
      
      if (response.success && response.data && response.data.length > 0) {
        setParties(response.data);
        console.log('Parties loaded from API:', response.data.length);
      } else {
        // Fallback to mock data if API returns empty or fails
        console.warn('API returned empty data, using mock data');
        setParties(mockData.getMockParties());
        toast({
          title: "Info",
          description: "No parties found in database. Using sample data for demonstration.",
        });
      }
    } catch (error) {
      console.error('Error fetching parties:', error);
      // Use mock data as fallback
      setParties(mockData.getMockParties());
      toast({
        title: "Warning",
        description: "Unable to connect to server. Using offline data for demonstration.",
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
      setShowMondayFinalModal(true);
    } else {
      toast({
        title: "Warning",
        description: "Please select parties to update Monday Final status.",
        variant: "destructive"
      });
    }
  };

  const confirmMondayFinal = async () => {
    setMondayFinalLoading(true);
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
        setShowMondayFinalModal(false);
        toast({
          title: "Success",
          description: `Monday Final status updated successfully for ${selectedParties.length} parties`,
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
    } finally {
      setMondayFinalLoading(false);
    }
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDelete = async () => {
    if (selectedParties.length > 0) {
      setShowDeleteModal(true);
    } else {
      toast({
        title: "Warning",
        description: "Please select parties to delete.",
        variant: "destructive"
      });
    }
  };

  const confirmDelete = async () => {
    setDeleteLoading(true);
    try {
      const response = await partyLedgerAPI.deleteParties(selectedParties);
      if (response.success) {
        setParties(prevParties => 
          prevParties.filter(party => !selectedParties.includes(party.name))
        );
        setSelectedParties([]);
        setShowDeleteModal(false);
        toast({
          title: "Success",
          description: `${selectedParties.length} parties deleted successfully`,
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
    } finally {
      setDeleteLoading(false);
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
                        <div className="text-center py-8">
                          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                          <p className="text-gray-600">Loading parties...</p>
                        </div>
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
                      
                      {!loading && filteredParties.length === 0 && (
                        <div className="text-center py-8">
                          <div className="text-gray-500 mb-2">
                            {searchTerm ? 'No parties found matching your search.' : 'No parties available.'}
                          </div>
                          {searchTerm && (
                            <button
                              onClick={() => setSearchTerm('')}
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              Clear search
                            </button>
                          )}
                        </div>
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

      {/* Monday Final Confirmation Modal */}
      <Dialog open={showMondayFinalModal} onOpenChange={setShowMondayFinalModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Monday Final Confirmation
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Are you sure you want to mark <strong>{selectedParties.length} parties</strong> as Monday Final?
              </AlertDescription>
            </Alert>

            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-blue-900">Selected Parties:</span>
              </div>
              <div className="max-h-32 overflow-y-auto">
                {selectedParties.map((party, index) => (
                  <div key={index} className="text-sm text-blue-800 py-1">
                    • {party}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-green-50 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  Date: {mondayFinalDate}
                </span>
              </div>
            </div>

            <div className="text-sm text-gray-600">
              This action will update the Monday Final status for all selected parties. 
              This cannot be undone easily.
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowMondayFinalModal(false)}
              disabled={mondayFinalLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmMondayFinal}
              disabled={mondayFinalLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {mondayFinalLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Updating...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirm Monday Final
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Delete Confirmation
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Are you sure you want to delete <strong>{selectedParties.length} parties</strong>? 
                This action cannot be undone.
              </AlertDescription>
            </Alert>

            <div className="bg-red-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-red-600" />
                <span className="font-medium text-red-900">Parties to Delete:</span>
              </div>
              <div className="max-h-32 overflow-y-auto">
                {selectedParties.map((party, index) => (
                  <div key={index} className="text-sm text-red-800 py-1">
                    • {party}
                  </div>
                ))}
              </div>
            </div>

            <div className="text-sm text-gray-600">
              <strong>Warning:</strong> This will permanently remove all selected parties and their associated data.
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
              disabled={deleteLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDelete}
              disabled={deleteLoading}
              variant="destructive"
            >
              {deleteLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Deleting...
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Delete Parties
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PartyLedger;
