/**
 * API Test Component
 * 
 * Simple component to test API connectivity in production
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Loader2, Wifi, WifiOff } from 'lucide-react';

const ApiTest: React.FC = () => {
  const [testResults, setTestResults] = useState<{
    apiReachable: boolean | null;
    firebaseReachable: boolean | null;
    error: string | null;
    loading: boolean;
  }>({
    apiReachable: null,
    firebaseReachable: null,
    error: null,
    loading: false
  });

  const runTests = async () => {
    setTestResults({
      apiReachable: null,
      firebaseReachable: null,
      error: null,
      loading: true
    });

    try {
      // Test API connectivity with multiple endpoints
      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'https://account-ledger-software.vercel.app/api';
      console.log('Testing API URL:', apiUrl);
      
      let apiResponse;
      let apiReachable = false;
      
      // Try multiple endpoints to test API connectivity
      const endpoints = ['/health', '/authentication/login', '/'];
      
      for (const endpoint of endpoints) {
        try {
          console.log(`Testing endpoint: ${apiUrl}${endpoint}`);
          apiResponse = await fetch(`${apiUrl}${endpoint}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            signal: AbortSignal.timeout(5000) // 5 second timeout per endpoint
          });
          
          console.log(`API Response for ${endpoint}:`, apiResponse.status, apiResponse.statusText);
          
          // If we get any response (even 404), the API is reachable
          if (apiResponse.status >= 200 && apiResponse.status < 600) {
            apiReachable = true;
            break;
          }
        } catch (error) {
          console.log(`Failed to reach ${endpoint}:`, error.message);
          continue;
        }
      }

      // Test Firebase connectivity (using current domain to avoid CORS)
      const firebaseUrl = window.location.origin; // Use current domain
      console.log('Testing Firebase URL:', firebaseUrl);
      
      const firebaseResponse = await fetch(firebaseUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      console.log('Firebase Response:', firebaseResponse.status, firebaseResponse.statusText);

      setTestResults({
        apiReachable: apiReachable,
        firebaseReachable: firebaseResponse.ok,
        error: null,
        loading: false
      });

    } catch (error: any) {
      console.error('Test error:', error);
      setTestResults({
        apiReachable: false,
        firebaseReachable: false,
        error: error.message,
        loading: false
      });
    }
  };

  useEffect(() => {
    runTests();
  }, []);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wifi className="h-5 w-5" />
          API Connectivity Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {testResults.loading && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Testing connectivity...</span>
          </div>
        )}

        {!testResults.loading && (
          <>
            {/* API Test Result */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="font-medium">Backend API</span>
              {testResults.apiReachable === null ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-300 rounded-full"></div>
                  <span className="text-sm text-gray-500">Unknown</span>
                </div>
              ) : testResults.apiReachable ? (
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-600">Reachable</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm text-red-600">Unreachable</span>
                </div>
              )}
            </div>

            {/* Firebase Test Result */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="font-medium">Firebase Hosting</span>
              {testResults.firebaseReachable === null ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-300 rounded-full"></div>
                  <span className="text-sm text-gray-500">Unknown</span>
                </div>
              ) : testResults.firebaseReachable ? (
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-600">Reachable</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm text-red-600">Unreachable</span>
                </div>
              )}
            </div>

            {/* Error Display */}
            {testResults.error && (
              <Alert>
                <WifiOff className="h-4 w-4" />
                <AlertDescription>
                  <strong>Error:</strong> {testResults.error}
                </AlertDescription>
              </Alert>
            )}

            {/* Environment Info */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Environment Info:</h4>
              <div className="text-xs space-y-1">
                <div><strong>Mode:</strong> {import.meta.env.MODE}</div>
                <div><strong>Production:</strong> {import.meta.env.PROD ? 'Yes' : 'No'}</div>
                <div><strong>API URL:</strong> {import.meta.env.VITE_API_BASE_URL || 'https://account-ledger-software.vercel.app/api'}</div>
                <div><strong>Firebase Project:</strong> {import.meta.env.VITE_FIREBASE_PROJECT_ID || 'escrow-account-ledger'}</div>
                <div><strong>Current Domain:</strong> {window.location.origin}</div>
              </div>
            </div>

            {/* Backend Status */}
            <div className="p-3 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Backend Status:</h4>
              <div className="text-xs space-y-1">
                <div><strong>Expected Backend:</strong> https://account-ledger-software.vercel.app</div>
                <div><strong>Status:</strong> {testResults.apiReachable ? '✅ Online' : '❌ Offline'}</div>
                {testResults.error && (
                  <div className="text-red-600"><strong>Error:</strong> {testResults.error}</div>
                )}
              </div>
            </div>

            {/* Retry Button */}
            <Button onClick={runTests} className="w-full">
              Run Tests Again
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ApiTest;
