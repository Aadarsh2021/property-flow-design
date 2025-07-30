/**
 * Utility Functions
 * 
 * Common utility functions used throughout the Property Flow Design application.
 * Provides helper functions for class name management and other utilities.
 * 
 * Features:
 * - Class name merging with clsx
 * - Tailwind CSS class utilities
 * - Common helper functions
 * 
 * @author Account Ledger Team
 * @version 1.0.0
 */

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
