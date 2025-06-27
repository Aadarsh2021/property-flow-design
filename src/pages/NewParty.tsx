
import React, { useState } from 'react';
import TopNavigation from '../components/TopNavigation';

const NewParty = () => {
  const [partyData, setPartyData] = useState({
    srNo: '163',
    partyName: '',
    status: 'R',
    commiSystem: 'take',
    balanceLimit: '',
    mCommission: 'No Commission',
    rate: '',
    // Self LD
    selfLD: {
      m: '', s: '', a: '', t: '', c: ''
    },
    // Agent LD
    agentLD: {
      name: '',
      m: '', s: '', a: '', t: '', c: ''
    },
    // Third Party LD
    thirdPartyLD: {
      name: '',
      m: '', s: '', a: '', t: '', c: ''
    },
    // Commissions
    selfCommission: {
      m: '', s: ''
    },
    agentCommission: {
      m: '', s: ''
    },
    thirdPartyCommission: {
      m: '', s: ''
    }
  });

  const handleSave = () => {
    console.log('Party data saved:', partyData);
    // Here you would save to backend
  };

  const handleClose = () => {
    window.history.back();
  };

  const updateNestedField = (section: string, field: string, value: string) => {
    setPartyData(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev],
        [field]: value
      }
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNavigation />
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-t-lg">
            <h2 className="text-xl font-semibold">New Party</h2>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
              
              {/* Party Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="bg-blue-100 text-blue-800 px-3 py-2 rounded font-medium text-sm mb-4">
                  Party Information
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sr No</label>
                    <input
                      type="text"
                      value={partyData.srNo}
                      onChange={(e) => setPartyData({...partyData, srNo: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Party Name</label>
                    <input
                      type="text"
                      value={partyData.partyName}
                      onChange={(e) => setPartyData({...partyData, partyName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={partyData.status}
                      onChange={(e) => setPartyData({...partyData, status: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="R">R</option>
                      <option value="A">A</option>
                      <option value="I">I</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Commi System</label>
                    <div className="flex space-x-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="commiSystem"
                          value="take"
                          checked={partyData.commiSystem === 'take'}
                          onChange={(e) => setPartyData({...partyData, commiSystem: e.target.value})}
                          className="mr-2"
                        />
                        <span className="text-sm">Take (Lena)</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="commiSystem"
                          value="give"
                          checked={partyData.commiSystem === 'give'}
                          onChange={(e) => setPartyData({...partyData, commiSystem: e.target.value})}
                          className="mr-2"
                        />
                        <span className="text-sm">Give (Dena)</span>
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Balance Limit</label>
                    <input
                      type="text"
                      value={partyData.balanceLimit}
                      onChange={(e) => setPartyData({...partyData, balanceLimit: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Self LD */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="bg-blue-100 text-blue-800 px-3 py-2 rounded font-medium text-sm mb-4">
                  Self LD
                </h3>
                <div className="space-y-3">
                  {['M', 'S', 'A', 'T', 'C'].map((label) => (
                    <div key={label} className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-700 w-4">{label}</span>
                      <input
                        type="text"
                        value={partyData.selfLD[label.toLowerCase() as keyof typeof partyData.selfLD]}
                        onChange={(e) => updateNestedField('selfLD', label.toLowerCase(), e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-red-500 font-medium">%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Agent LD */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="bg-blue-100 text-blue-800 px-3 py-2 rounded font-medium text-sm mb-4">
                  Agent LD
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={partyData.agentLD.name}
                      onChange={(e) => updateNestedField('agentLD', 'name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  {['M', 'S', 'A', 'T', 'C'].map((label) => (
                    <div key={label} className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-700 w-4">{label}</span>
                      <input
                        type="text"
                        value={partyData.agentLD[label.toLowerCase() as keyof typeof partyData.agentLD]}
                        onChange={(e) => updateNestedField('agentLD', label.toLowerCase(), e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-red-500 font-medium">%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Third Party LD */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="bg-blue-100 text-blue-800 px-3 py-2 rounded font-medium text-sm mb-4">
                  ThirdParty LD
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={partyData.thirdPartyLD.name}
                      onChange={(e) => updateNestedField('thirdPartyLD', 'name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  {['M', 'S', 'A', 'T', 'C'].map((label) => (
                    <div key={label} className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-700 w-4">{label}</span>
                      <input
                        type="text"
                        value={partyData.thirdPartyLD[label.toLowerCase() as keyof typeof partyData.thirdPartyLD]}
                        onChange={(e) => updateNestedField('thirdPartyLD', label.toLowerCase(), e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-red-500 font-medium">%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Incentive and Commission Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6 mt-6">
              
              {/* Incentive */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="bg-blue-100 text-blue-800 px-3 py-2 rounded font-medium text-sm mb-4">
                  Incentive
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">M Commission</label>
                    <select
                      value={partyData.mCommission}
                      onChange={(e) => setPartyData({...partyData, mCommission: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option>No Commission</option>
                      <option>Fixed Commission</option>
                      <option>Percentage Commission</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rate</label>
                    <input
                      type="text"
                      value={partyData.rate}
                      onChange={(e) => setParty({...partyData, rate: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Self Commission */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="bg-blue-100 text-blue-800 px-3 py-2 rounded font-medium text-sm mb-4">
                  Self Commission
                </h3>
                <div className="space-y-3">
                  {['M', 'S'].map((label) => (
                    <div key={label} className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-700 w-4">{label}</span>
                      <input
                        type="text"
                        value={partyData.selfCommission[label.toLowerCase() as keyof typeof partyData.selfCommission]}
                        onChange={(e) => updateNestedField('selfCommission', label.toLowerCase(), e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-red-500 font-medium">%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Agent Commission */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="bg-blue-100 text-blue-800 px-3 py-2 rounded font-medium text-sm mb-4">
                  Agent Commission
                </h3>
                <div className="space-y-3">
                  {['M', 'S'].map((label) => (
                    <div key={label} className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-700 w-4">{label}</span>
                      <input
                        type="text"
                        value={partyData.agentCommission[label.toLowerCase() as keyof typeof partyData.agentCommission]}
                        onChange={(e) => updateNestedField('agentCommission', label.toLowerCase(), e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-red-500 font-medium">%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Third Party Commission */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="bg-blue-100 text-blue-800 px-3 py-2 rounded font-medium text-sm mb-4">
                  ThirdParty Commission
                </h3>
                <div className="space-y-3">
                  {['M', 'S'].map((label) => (
                    <div key={label} className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-700 w-4">{label}</span>
                      <input
                        type="text"
                        value={partyData.thirdPartyCommission[label.toLowerCase() as keyof typeof partyData.thirdPartyCommission]}
                        onChange={(e) => updateNestedField('thirdPartyCommission', label.toLowerCase(), e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-red-500 font-medium">%</span>
                    </div>
                  ))}
                </div>
                
                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={handleSave}
                    className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleClose}
                    className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-medium"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewParty;
