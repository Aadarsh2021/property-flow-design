
import React, { useState, useEffect, useCallback } from 'react';
import TopNavigation from '../components/TopNavigation';

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

  // Keyboard shortcuts for better UX
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl/Cmd + F to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder="Search parties by name..."]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      }
      
      // Ctrl/Cmd + R to refresh
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        fetchParties();
      }
      
      // Ctrl/Cmd + N to add new party (prevent new browser tab)
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        e.stopPropagation();
        navigate('/new-party');
      }
      
      // Enter to select first party
      if (e.key === 'Enter' && filteredParties.length > 0) {
        e.preventDefault();
        handlePartySelect(filteredParties[0].name);
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [filteredParties, navigate, fetchParties]);

  const handlePartySelect = (partyName: string) => {
    setSelectedParty(partyName);
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
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Main Container */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-t-lg">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold">SHUBH LABH 1011 - [Settlement_Report]</h1>
                <div className="flex items-center space-x-6 mt-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">Party A/C. Ledger</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleExit}
                  className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors font-medium"
                >
                  Exit
                </button>
              </div>
            </div>
          </div>
          
          {/* Search and Filter Section */}
          <div className="bg-gray-50 p-4 border-b border-gray-200">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Search parties by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="flex gap-2">
                <select
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onChange={(e) => {
                    const filter = e.target.value;
                    if (filter === 'all') { setSearchTerm(''); }
                    else if (filter === 'settled') { setSearchTerm('settled'); }
                    else if (filter === 'unsettled') { setSearchTerm('unsettled'); }
                  }}
                >
                  <option value="all">All Parties</option>
                  <option value="settled">Settled Only</option>
                  <option value="unsettled">Unsettled Only</option>
                </select>
                <button
                  onClick={() => setSearchTerm('')}
                  className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-600 mt-3">
              <span>Showing {filteredParties.length} of {parties.length} parties</span>
              {searchTerm && (
                <span className="text-blue-600">
                  Search: "{searchTerm}"
                </span>
              )}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex">
            {/* Left Side - Party Table */}
            <div className="flex-1 p-6">
              {/* Dashboard with Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-600">Total Parties</p>
                      <p className="text-2xl font-bold text-blue-900">{parties.length}</p>
                    </div>
                    <div className="bg-blue-100 p-3 rounded-lg">
                      <Users className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-600">Settled</p>
                      <p className="text-2xl font-bold text-green-900">
                        {filteredParties.filter(party => party.mondayFinal === 'Yes').length}
                      </p>
                    </div>
                    <div className="bg-green-100 p-3 rounded-lg">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-orange-600">Unsettled</p>
                      <p className="text-2xl font-bold text-orange-900">
                        {filteredParties.filter(party => party.mondayFinal === 'No').length}
                      </p>
                    </div>
                    <div className="bg-orange-100 p-3 rounded-lg">
                      <AlertTriangle className="w-6 h-6 text-orange-600" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-600">Selected</p>
                      <p className="text-2xl font-bold text-purple-900">{selectedParties.length}</p>
                    </div>
                    <div className="bg-purple-100 p-3 rounded-lg">
                      <Clock className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Party Table */}
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Party List</h3>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold text-gray-700">Party Name</TableHead>
                        <TableHead className="font-semibold text-gray-700 text-center">Monday Final</TableHead>
                        <TableHead className="font-semibold text-gray-700 text-center">Select</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-8">
                            <div className="flex items-center justify-center space-x-2">
                              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                              <span>Loading parties...</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : filteredParties.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-8">
                            <div className="text-gray-500">
                              <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                              <p className="text-lg font-medium">No parties found</p>
                              <p className="text-sm">Try adjusting your search criteria</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredParties.map((party, index) => (
                          <TableRow 
                            key={party.name} 
                            className="hover:bg-gray-50 cursor-pointer"
                            onClick={() => handlePartySelect(party.name)}
                          >
                            <TableCell className="font-medium">{party.name}</TableCell>
                            <TableCell className="text-center">
                              <Badge 
                                variant={party.mondayFinal === 'Yes' ? 'default' : 'secondary'}
                                className={party.mondayFinal === 'Yes' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}
                              >
                                {party.mondayFinal}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Checkbox
                                checked={selectedParties.includes(party.name)}
                                onCheckedChange={(checked) => 
                                  handleCheckboxChange(party.name, checked as boolean)
                                }
                                onClick={(e) => e.stopPropagation()}
                              />
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>

            {/* Right Sidebar - Action Buttons */}
            <div className="w-80 bg-gray-50 p-6 border-l border-gray-200">
              <div className="space-y-3">
                <Button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    navigate('/new-party');
                  }}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Add New Party
                </Button>
                
                <Button
                  onClick={() => {
                    if (selectedParty) {
                      navigate(`/account-ledger/${encodeURIComponent(selectedParty)}`);
                    }
                  }}
                  disabled={!selectedParty}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                >
                  View Ledger
                </Button>
                
                <Button
                  onClick={handleMondayFinalClick}
                  disabled={actionLoading || selectedParties.length === 0}
                  className="w-full bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                >
                  {actionLoading ? 'Processing...' : 'Monday Final'}
                </Button>
                
                <Button
                  onClick={handleDeleteClick}
                  disabled={selectedParties.length === 0}
                  className="w-full bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
                >
                  Delete Selected
                </Button>
                
                <Button
                  onClick={handleSelectAll}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                >
                  Select All
                </Button>
                
                <Button
                  onClick={handleExit}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                >
                  Exit
                </Button>
              </div>
              
              {/* Keyboard Shortcuts Help */}
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-sm font-medium text-blue-800 mb-2">Keyboard Shortcuts:</div>
                <div className="grid grid-cols-1 gap-1 text-xs text-blue-700">
                  <div>Ctrl+F: Focus Search</div>
                  <div>Ctrl+R: Refresh Data</div>
                  <div>Ctrl+N: Add New Party</div>
                  <div>Enter: Select First Party</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Monday Final Confirmation Modal */}
      <AlertDialog open={showMondayFinalModal} onOpenChange={setShowMondayFinalModal}>
        <AlertDialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <AlertDialogHeader className="flex-shrink-0 pb-4">
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Monday Final Settlement Confirmation
            </AlertDialogTitle>
            <AlertDialogDescription className="sr-only">
              Monday Final settlement confirmation dialog
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 px-1">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-blue-800">Selected Parties</span>
              </div>
              <div className="text-sm text-blue-800">
                <p className="mb-2">You are about to mark <strong>{selectedParties.length}</strong> parties as settled:</p>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {selectedParties.map((partyName, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      <span>{partyName}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-yellow-800">
                  <p className="font-semibold mb-2">⚠️ WARNING: This action will mark parties as settled!</p>
                  <p>This will update the Monday Final status to "Yes" for all selected parties.</p>
                </div>
              </div>
            </div>
          </div>
          <AlertDialogFooter className="flex-shrink-0 border-t pt-4 mt-4 bg-white">
            <AlertDialogCancel disabled={actionLoading}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMondayFinalConfirm}
              disabled={actionLoading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {actionLoading ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirm Settlement
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Modal */}
      <AlertDialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-semibold text-gray-900">Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-700">
              Are you sure you want to delete {selectedParties.length} selected party(ies)? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDeleteModal(false)} disabled={actionLoading}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={actionLoading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {actionLoading ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Delete
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
