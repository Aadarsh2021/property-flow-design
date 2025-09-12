import { Party } from '@/types';

// Format party display name
export const formatPartyDisplayName = (party: Party): string => {
  const partyName = party.party_name || party.name;
  const companyName = party.companyName;
  
  if (companyName && companyName !== partyName) {
    return `${partyName} (${companyName})`;
  }
  return partyName;
};

// Extract party name from display format
export const extractPartyNameFromDisplay = (displayName: string): string => {
  const match = displayName.match(/^([^(]+)/);
  return match ? match[1].trim() : displayName.trim();
};

// Find party by display name
export const findPartyByDisplayName = (parties: Party[], displayName: string): Party | undefined => {
  const partyName = extractPartyNameFromDisplay(displayName);
  return parties.find(party => 
    (party.party_name || party.name) === partyName
  );
};

// Filter parties by search term
export const filterPartiesBySearch = (
  parties: Party[], 
  searchTerm: string, 
  excludeCurrentParty = false,
  currentPartyName = ''
): Party[] => {
  let availableParties = parties;
  
  if (excludeCurrentParty && currentPartyName) {
    availableParties = parties.filter(party => 
      (party.party_name || party.name) !== currentPartyName
    );
  }
  
  if (!searchTerm.trim()) {
    return availableParties;
  }
  
  const searchLower = searchTerm.toLowerCase();
  
  return availableParties.filter(party => {
    const partyName = (party.party_name || party.name || '').toLowerCase();
    const companyName = (party.companyName || '').toLowerCase();
    
    return partyName.startsWith(searchLower) || 
           partyName.includes(searchLower) ||
           companyName.startsWith(searchLower) || 
           companyName.includes(searchLower);
  }).sort((a, b) => {
    const aName = (a.party_name || a.name || '').toLowerCase();
    const bName = (b.party_name || b.name || '').toLowerCase();
    
    const aStartsWith = aName.startsWith(searchLower);
    const bStartsWith = bName.startsWith(searchLower);
    
    if (aStartsWith && !bStartsWith) return -1;
    if (!aStartsWith && bStartsWith) return 1;
    return aName.localeCompare(bName);
  });
};

// Check if party has commission
export const hasCommission = (party: Party): boolean => {
  return party.mCommission === 'With Commission' && 
         party.rate && 
         parseFloat(party.rate) > 0;
};

// Get commission rate
export const getCommissionRate = (party: Party): number => {
  if (!hasCommission(party)) return 0;
  return parseFloat(party.rate || '0');
};

// Calculate commission amount - Enhanced like old version
export const calculateCommissionAmount = (amount: number, party: Party): number => {
  const rate = getCommissionRate(party);
  if (rate === 0) return 0;
  return (amount * rate) / 100;
};

// Calculate commission amount by party name - Like old version
export const calculateCommissionAmountByName = (amount: number, partyName: string, parties: Party[]): number => {
  const party = parties.find(p => (p.party_name || p.name) === partyName);
  if (!party) return 0;
  return calculateCommissionAmount(amount, party);
};

// Check if party is active
export const isPartyActive = (party: Party): boolean => {
  return party.status === 'Active' || party.status === 'A';
};

// Get party status color
export const getPartyStatusColor = (status: string): string => {
  switch (status) {
    case 'Active':
    case 'A':
      return 'bg-green-100 text-green-800';
    case 'Inactive':
    case 'I':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

// Validate party data
export const validatePartyData = (party: Partial<Party>): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!party.name && !party.party_name) {
    errors.push('Party name is required');
  }

  if (party.mCommission === 'With Commission' && (!party.rate || parseFloat(party.rate || '0') <= 0)) {
    errors.push('Commission rate is required when commission is enabled');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Group parties by company
export const groupPartiesByCompany = (parties: Party[]): Record<string, Party[]> => {
  return parties.reduce((groups, party) => {
    const company = party.companyName || 'Unknown';
    if (!groups[company]) {
      groups[company] = [];
    }
    groups[company].push(party);
    return groups;
  }, {} as Record<string, Party[]>);
};

// Search parties with multiple criteria
export const searchPartiesAdvanced = (
  parties: Party[],
  criteria: {
    searchTerm?: string;
    status?: string;
    hasCommission?: boolean;
    companyName?: string;
  }
): Party[] => {
  return parties.filter(party => {
    // Search term filter
    if (criteria.searchTerm) {
      const searchLower = criteria.searchTerm.toLowerCase();
      const partyName = (party.party_name || party.name || '').toLowerCase();
      const companyName = (party.companyName || '').toLowerCase();
      
      if (!partyName.includes(searchLower) && !companyName.includes(searchLower)) {
        return false;
      }
    }

    // Status filter
    if (criteria.status && party.status !== criteria.status) {
      return false;
    }

    // Commission filter
    if (criteria.hasCommission !== undefined) {
      const hasComm = hasCommission(party);
      if (hasComm !== criteria.hasCommission) {
        return false;
      }
    }

    // Company filter
    if (criteria.companyName && party.companyName !== criteria.companyName) {
      return false;
    }

    return true;
  });
};
