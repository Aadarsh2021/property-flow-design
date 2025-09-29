/**
 * React Global Declaration
 * Fixes forwardRef issues in production builds
 */

declare global {
  interface Window {
    React: typeof import('react');
  }
}

export {};
