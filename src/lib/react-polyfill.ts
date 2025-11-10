/**
 * React Polyfill for Icon Components
 * Fixes forwardRef issues in production builds
 */

import React from 'react';
import useSyncExternalStoreShim from './useSyncExternalStoreShim';

// CRITICAL: Ensure React is available globally before any components load
if (typeof window !== 'undefined') {
  // Override any existing React with the real one
  (window as any).React = React;
  (globalThis as any).React = React;
  
  // Force override all React methods (in case they were stubbed)
  Object.assign((window as any).React, {
    forwardRef: React.forwardRef,
    createElement: React.createElement,
    memo: React.memo,
    Component: React.Component,
    PureComponent: React.PureComponent,
    createContext: React.createContext,
    useState: React.useState,
    useEffect: React.useEffect,
    useContext: React.useContext,
    useReducer: React.useReducer,
    useCallback: React.useCallback,
    useMemo: React.useMemo,
    useRef: React.useRef,
    useLayoutEffect: React.useLayoutEffect,
    useImperativeHandle: React.useImperativeHandle,
    Fragment: React.Fragment,
    StrictMode: React.StrictMode,
    Suspense: React.Suspense,
  });
  
  // Also ensure globalThis has the same
  (globalThis as any).React = (window as any).React;
  
  // Log for debugging
  console.log('🔧 React polyfill loaded with overrides:', {
    hasReact: !!(window as any).React,
    hasForwardRef: !!(window as any).React?.forwardRef,
    hasCreateContext: !!(window as any).React?.createContext,
    reactKeys: Object.keys((window as any).React || {}),
    timestamp: new Date().toISOString()
  });
}

if (typeof React.useSyncExternalStore !== 'function') {
  (React as any).useSyncExternalStore = useSyncExternalStoreShim;
}

// Export React for modules that might need it
export default React;
export const { forwardRef, createElement, memo, Component, PureComponent } = React;
