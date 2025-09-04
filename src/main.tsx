import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Performance optimization: Use requestIdleCallback for better performance
const renderApp = () => {
  const root = createRoot(document.getElementById("root")!);
  root.render(<App />);
};

// Use requestIdleCallback if available, otherwise fallback to setTimeout
if ('requestIdleCallback' in window) {
  requestIdleCallback(renderApp);
} else {
  setTimeout(renderApp, 1);
}
