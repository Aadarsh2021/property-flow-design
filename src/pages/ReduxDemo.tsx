import React from 'react';
import { ReduxExample } from '../components/redux-examples/ReduxExample';
import { ReduxDevTools } from '../components/redux-examples/ReduxDevTools';
import TopNavigation from '../components/TopNavigation';

const ReduxDemo: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <TopNavigation />
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Redux Integration Demo</h1>
          <p className="text-gray-600 mt-2">
            This page demonstrates the Redux setup and how to use it in your React components.
          </p>
        </div>
        
        <ReduxExample />
      </div>
      
      {/* Redux DevTools for development */}
      <ReduxDevTools />
    </div>
  );
};

export default ReduxDemo;
