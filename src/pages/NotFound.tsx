import React from "react";
import { useLocation } from "react-router-dom";
/**
 * 404 Not Found Page
 * 
 * Displays a user-friendly error page when users navigate to non-existent routes
 * in the Property Flow Design application.
 * 
 * Features:
 * - Clear error message
 * - Navigation back to home
 * - Professional error page design
 * - Helpful suggestions for users
 * 
 * @author Account Ledger Team
 * @version 1.0.0
 */

import { useEffect } from "react";
import { Link } from "react-router-dom";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        {/* Logo */}
        <div className="mb-8">
          <Link to="/" className="flex items-center justify-center space-x-3 hover:opacity-80 transition-opacity">
            <img 
              src="/image.png" 
              alt="Escrow Ledger Logo" 
              className="w-12 h-12 object-contain"
            />
            <span className="text-2xl font-bold text-gray-900">Escrow Ledger</span>
          </Link>
        </div>
        
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-4">Oops! Page not found</p>
        <Link to="/" className="text-blue-500 hover:text-blue-700 underline">
          Return to Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
