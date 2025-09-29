import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Simplified initialization to avoid timing issues
const root = createRoot(document.getElementById("root")!);
root.render(<App />);
