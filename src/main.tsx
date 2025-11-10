import * as React from 'react'
import 'use-sync-external-store/shim'

if (typeof window !== 'undefined') {
  // Ensure React is globally accessible for legacy shims
  ;(window as any).React = React
}
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import App from './App.tsx'
import { store } from './store'
import './index.css'

// Performance optimization: Use requestIdleCallback for better performance
const renderApp = () => {
  const root = createRoot(document.getElementById("root")!);
  root.render(
    <Provider store={store}>
      <App />
    </Provider>
  );
};

// Use requestIdleCallback if available, otherwise fallback to setTimeout
if ('requestIdleCallback' in window) {
  requestIdleCallback(renderApp);
} else {
  setTimeout(renderApp, 1);
}
