
import React, { useState, useEffect, useCallback } from 'react';
import TopNavigation from '../components/TopNavigation';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Calendar, CheckCircle, AlertTriangle, Users, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { partyLedgerAPI, mockData } from '../lib/api';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../contexts/AuthContext';
import { Party } from '../types';

const PartyLedger = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthenticated, user } = useAuth();
  const [selectedParty, setSelectedParty] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedParties, setSelectedParties] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [parties, setParties] = useState<Party[]>([]);
  const [showMondayFinalModal, setShowMondayFinalModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Check authentication on component mount
  useEffect(() => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in to access Party Ledger.",
        variant: "destructive"
      });
      navigate('/login');
      return;
    }
  }, [isAuthenticated, user, navigate, toast]);

  const fetchParties = useCallback(async () => {
    setLoading(true);
    try {
      const response = await partyLedgerAPI.getAllParties();
      
      if (response.success) {
        setParties(response.data || []);
      } else {
        // Fallback to mock data if API fails
        const mockParties = mockData.getMockParties() as Party[];
        setParties(mockParties);
        console.warn('Using mock data due to API failure');
      }
    } catch (error) {
      console.error('Error fetching parties:', error);
      // Use mock data as fallback
      const mockParties = mockData.getMockParties() as Party[];
      setParties(mockParties);
      toast({
        title: "Warning",
        description: "Using offline data. Some features may be limited.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Fetch parties on component mount
  useEffect(() => {
    fetchParties();
  }, [fetchParties]);

  const filteredParties = (parties || []).filter(party =>
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

  const handleMondayFinalClick = () => {
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

  const handleMondayFinalConfirm = async () => {
    setActionLoading(true);
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
    } finally {
      setActionLoading(false);
      }
  };

  const handleDeleteClick = () => {
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

  const handleDeleteConfirm = async () => {
    setActionLoading(true);
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
    } finally {
      setActionLoading(false);
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
                    <DialogDescription>
                      Search and select parties to view their account ledger.
                    </DialogDescription>
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
                          <Button
                            onClick={handleMondayFinalClick}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                            size="sm"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Monday Final
                          </Button>
                          <Button
                            onClick={handleDeleteClick}
                            className="bg-red-600 hover:bg-red-700 text-white"
                            size="sm"
                          >
                            <AlertTriangle className="w-4 h-4 mr-2" />
                            Delete Selected
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
              
              <Button
                onClick={handleExit}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                Exit
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Monday Final Confirmation Modal */}
      <AlertDialog open={showMondayFinalModal} onOpenChange={setShowMondayFinalModal}>
        <AlertDialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <AlertDialogHeader className="sticky top-0 bg-white z-10 pb-4">
            <AlertDialogTitle className="flex items-center gap-2 text-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
              Monday Final Confirmation
            </AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
              <Users className="w-4 h-4" />
              <span className="font-medium">{selectedParties.length} parties selected</span>
              <span className="text-gray-400">•</span>
              <span className="text-xs text-gray-500">
                {selectedParties.length === 1 ? 'party' : 'parties'}
              </span>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-2">What will happen?</p>
                  <p className="mb-3">
                    These parties will be marked as <strong>Monday Final</strong> with status "Yes". 
                    This indicates they have been settled for the current period.
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-blue-700">
                    <li>Status will be updated to "Yes"</li>
                    <li>Parties will be marked as settled</li>
                    <li>Action will be logged in the system</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-yellow-800">
                  <p className="font-semibold mb-2">Important Considerations:</p>
                  <ul className="list-disc list-inside space-y-1 text-yellow-700">
                    <li>This will affect financial calculations</li>
                    <li>Parties will be marked as settled</li>
                    <li>Action will be logged in the system</li>
                    <li>This action cannot be easily undone</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <AlertDialogFooter className="sticky bottom-0 bg-white border-t pt-4 mt-6">
            <AlertDialogCancel 
              disabled={actionLoading}
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMondayFinalConfirm}
              disabled={actionLoading}
              className="bg-green-600 hover:bg-green-700 text-white font-medium px-6"
            >
              {actionLoading ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirm Monday Final
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Modal */}
      <AlertDialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <AlertDialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <AlertDialogHeader className="sticky top-0 bg-white z-10 pb-4">
            <AlertDialogTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              Delete Parties Confirmation
            </AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
              <Users className="w-4 h-4" />
              <span className="font-medium">{selectedParties.length} parties selected</span>
              <span className="text-gray-400">•</span>
              <span className="text-xs text-gray-500">
                {selectedParties.length === 1 ? 'party' : 'parties'}
              </span>
            </div>
            
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-red-800">
                  <p className="font-semibold mb-2">What will happen?</p>
                  <p className="mb-3">
                    These parties will be <strong>permanently deleted</strong> from the system. 
                    All associated data and transactions will be removed.
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-red-700">
                    <li>All party data will be permanently removed</li>
                    <li>Associated transactions will be deleted</li>
                    <li>This action cannot be reversed</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-yellow-800">
                  <p className="font-semibold mb-2">Warning:</p>
                  <ul className="list-disc list-inside space-y-1 text-yellow-700">
                    <li>This action cannot be undone</li>
                    <li>All data will be permanently lost</li>
                    <li>No recovery option available</li>
                    <li>Please ensure you have backups if needed</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <AlertDialogFooter className="sticky bottom-0 bg-white border-t pt-4 mt-6">
            <AlertDialogCancel 
              disabled={actionLoading}
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={actionLoading}
              className="bg-red-600 hover:bg-red-700 text-white font-medium px-6"
            >
              {actionLoading ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Delete Permanently
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PartyLedger;
