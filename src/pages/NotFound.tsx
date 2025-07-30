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
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-4">Oops! Page not found</p>
        <a href="/" className="text-blue-500 hover:text-blue-700 underline">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
