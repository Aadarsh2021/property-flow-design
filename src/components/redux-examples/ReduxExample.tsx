import React from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { authSlice, ledgerSlice, partiesSlice, uiSlice } from '../../store/slices';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

export const ReduxExample: React.FC = () => {
  const dispatch = useAppDispatch();
  
  // Using typed selectors
  const user = useAppSelector(state => state.auth.user);
  const isAuthenticated = useAppSelector(state => state.auth.isAuthenticated);
  const selectedPartyName = useAppSelector(state => state.ledger.selectedPartyName);
  const availableParties = useAppSelector(state => state.parties.availableParties);
  const isLoading = useAppSelector(state => state.ui.isLoading);
  const toasts = useAppSelector(state => state.ui.toasts);

  const handleLogin = () => {
    // Simulate user login
    dispatch(authSlice.actions.setUser({
      uid: '123',
      email: 'user@example.com',
      displayName: 'John Doe',
      isAdmin: false,
      isApproved: true,
    }));
    dispatch(authSlice.actions.setCompanyName('Test Company'));
  };

  const handleLogout = () => {
    dispatch(authSlice.actions.logout());
  };

  const handleSelectParty = (partyName: string) => {
    dispatch(ledgerSlice.actions.setSelectedPartyName(partyName));
  };

  const handleShowToast = () => {
    dispatch(uiSlice.actions.addToast({
      title: 'Redux Toast',
      description: 'This toast was created using Redux!',
      type: 'success',
    }));
  };

  const handleToggleLoading = () => {
    dispatch(uiSlice.actions.setLoading(!isLoading));
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Redux Integration Example</CardTitle>
          <CardDescription>
            This component demonstrates how to use Redux in your React application.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Auth Section */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Authentication</h3>
            <div className="flex gap-2">
              <Button onClick={handleLogin} disabled={isAuthenticated}>
                Login
              </Button>
              <Button onClick={handleLogout} disabled={!isAuthenticated} variant="outline">
                Logout
              </Button>
            </div>
            {isAuthenticated && user && (
              <div className="p-3 bg-green-50 border border-green-200 rounded">
                <p><strong>User:</strong> {user.displayName}</p>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Company:</strong> {user.companyName}</p>
              </div>
            )}
          </div>

          {/* Party Selection Section */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Party Selection</h3>
            <p><strong>Selected Party:</strong> {selectedPartyName || 'None'}</p>
            <div className="flex gap-2">
              <Button 
                onClick={() => handleSelectParty('Commission')} 
                variant="outline"
                size="sm"
              >
                Select Commission
              </Button>
              <Button 
                onClick={() => handleSelectParty('Rahul')} 
                variant="outline"
                size="sm"
              >
                Select Rahul
              </Button>
            </div>
          </div>

          {/* UI Controls Section */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">UI Controls</h3>
            <div className="flex gap-2">
              <Button onClick={handleShowToast} variant="outline">
                Show Toast
              </Button>
              <Button onClick={handleToggleLoading} variant="outline">
                {isLoading ? 'Stop' : 'Start'} Loading
              </Button>
            </div>
            {isLoading && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                <p>Loading state is active...</p>
              </div>
            )}
          </div>

          {/* Toast Notifications */}
          {toasts.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Active Toasts</h3>
              <div className="space-y-2">
                {toasts.map(toast => (
                  <div key={toast.id} className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <p><strong>{toast.title}</strong></p>
                    {toast.description && <p>{toast.description}</p>}
                    <p className="text-sm text-gray-500">Type: {toast.type}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* State Summary */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Current State Summary</h3>
            <div className="p-3 bg-gray-50 border border-gray-200 rounded text-sm">
              <p><strong>Parties Count:</strong> {availableParties.length}</p>
              <p><strong>Is Authenticated:</strong> {isAuthenticated ? 'Yes' : 'No'}</p>
              <p><strong>Is Loading:</strong> {isLoading ? 'Yes' : 'No'}</p>
              <p><strong>Active Toasts:</strong> {toasts.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
