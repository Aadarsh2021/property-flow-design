/**
 * Company Party Utilities
 * 
 * Utility functions to identify and handle company parties and commission parties
 * Company parties are automatically created based on user settings
 * Commission parties are automatically created for all users
 * Both should have restricted functionality (no manual edit/add/delete/Monday Final)
 */

/**
 * Check if a party name matches the user's company name
 * @param partyName - The party name to check
 * @param companyName - The user's company name from settings
 * @returns true if the party is a company party
 */
export const isCompanyParty = (partyName: string, companyName: string): boolean => {
  if (!companyName || companyName === 'Company') {
    return false;
  }
  
  return partyName === companyName;
};

/**
 * Check if a party is a Commission party
 * @param partyName - The party name to check
 * @returns true if the party is a Commission party
 */
export const isCommissionParty = (partyName: string): boolean => {
  return partyName.toLowerCase() === 'commission';
};

/**
 * Check if a party is a company party based on party data
 * @param party - The party object
 * @param companyName - The user's company name from settings
 * @returns true if the party is a company party
 */
export const isCompanyPartyFromData = (party: any, companyName: string): boolean => {
  if (!party || !companyName || companyName === 'Company') {
    return false;
  }
  
  // Check by party name
  if (party.partyName && party.partyName === companyName) {
    return true;
  }
  
  // Check by name field (alternative)
  if (party.name && party.name === companyName) {
    return true;
  }
  
  return false;
};

/**
 * Get company party restrictions message
 * @returns Message explaining why company party features are disabled
 */
export const getCompanyPartyRestrictionMessage = (): string => {
  return "Company parties are automatically managed and cannot be manually edited, deleted, or used for Monday Final settlements.";
};

/**
 * Get commission party restrictions message
 * @returns Message explaining why commission party features are disabled
 */
export const getCommissionPartyRestrictionMessage = (): string => {
  return "Commission parties are automatically managed and cannot be manually edited, deleted, or used for Monday Final settlements.";
};

/**
 * Check if Monday Final is allowed for a party
 * @param partyName - The party name to check
 * @param companyName - The user's company name from settings
 * @returns false if it's a company party or commission party, true otherwise
 */
export const isMondayFinalAllowed = (partyName: string, companyName: string): boolean => {
  return !isCompanyParty(partyName, companyName) && !isCommissionParty(partyName);
};

/**
 * Check if party editing is allowed
 * @param partyName - The party name to check
 * @param companyName - The user's company name from settings
 * @returns false if it's a company party or commission party, true otherwise
 */
export const isPartyEditingAllowed = (partyName: string, companyName: string): boolean => {
  return !isCompanyParty(partyName, companyName) && !isCommissionParty(partyName);
};

/**
 * Check if party deletion is allowed
 * @param partyName - The party name to check
 * @param companyName - The user's company name from settings
 * @returns false if it's a company party or commission party, true otherwise
 */
export const isPartyDeletionAllowed = (partyName: string, companyName: string): boolean => {
  return !isCompanyParty(partyName, companyName) && !isCommissionParty(partyName);
};

/**
 * Check if transaction addition is allowed for a party
 * @param partyName - The party name to check
 * @param companyName - The user's company name from settings
 * @returns false if it's a company party or commission party, true otherwise
 */
export const isTransactionAdditionAllowed = (partyName: string, companyName: string): boolean => {
  return !isCompanyParty(partyName, companyName) && !isCommissionParty(partyName);
};
