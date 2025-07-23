
import React, { useState } from 'react';
import TopNavigation from '../components/TopNavigation';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../lib/api';
import { useToast } from '@/hooks/use-toast';

const NewParty = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    srNo: '163',
    partyName: '',
    status: 'R',
    commiSystem: 'Take',
    balanceLimit: '',
    mCommission: 'No Commission',
    rate: '',
    selfLD: { M: '', S: '', A: '', T: '', C: '' },
    agentLD: { name: '', M: '', S: '', A: '', T: '', C: '' },
    thirdPartyLD: { name: '', M: '', S: '', A: '', T: '', C: '' },
    selfCommission: { M: '', S: '' },
    agentCommission: { M: '', S: '' },
    thirdPartyCommission: { M: '', S: '' }
  });

  const handleInputChange = (section: string, field: string, value: string) => {
    if (section === 'basic') {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...prev[section as keyof typeof prev] as any,
          [field]: value
        }
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Prepare data for backend (matching our NewParty model)
      const partyData = {
        srNo: parseInt(formData.srNo) || 0,
        partyName: formData.partyName,
        status: (formData.status === 'R' ? 'active' : 'inactive') as 'active' | 'inactive',
        comiSuite: formData.commiSystem,
        balanceLimit: parseFloat(formData.balanceLimit) || 0
      };

      console.log('Submitting party data:', partyData);

      // Call our backend API
      const response = await apiClient.createParty(partyData);

      console.log('Party created successfully:', response);

      toast({
        title: "Success!",
        description: `Party "${formData.partyName}" created successfully.`,
      });

      // Reset form or navigate back
      setFormData({
        srNo: '163',
        partyName: '',
        status: 'R',
        commiSystem: 'Take',
        balanceLimit: '',
        mCommission: 'No Commission',
        rate: '',
        selfLD: { M: '', S: '', A: '', T: '', C: '' },
        agentLD: { name: '', M: '', S: '', A: '', T: '', C: '' },
        thirdPartyLD: { name: '', M: '', S: '', A: '', T: '', C: '' },
        selfCommission: { M: '', S: '' },
        agentCommission: { M: '', S: '' },
        thirdPartyCommission: { M: '', S: '' }
      });

    } catch (error) {
      console.error('Error creating party:', error);

      toast({
        title: "Error",
        description: "Failed to create party. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleExit = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNavigation />
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-t-lg">
            <h2 className="text-xl font-semibold">New Party</h2>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6">
            <div className="grid grid-cols-2 gap-6 mb-6">
              {/* Row 1: Party Informations and Self LD */}
              <div className="bg-blue-100 border border-gray-300">
                <div className="bg-blue-200 px-4 py-2 border-b border-gray-300">
                  <h3 className="text-sm font-semibold text-gray-800">Party Informations</h3>
                </div>
                <div className="p-4 space-y-4">
                  <div className="flex items-center">
                    <label className="w-24 text-sm font-medium text-gray-700">Sr No</label>
                    <input
                      type="text"
                      value={formData.srNo}
                      onChange={(e) => handleInputChange('basic', 'srNo', e.target.value)}
                      className="flex-1 px-2 py-1 border border-gray-300 text-sm"
                    />
                  </div>
                  <div className="flex items-center">
                    <label className="w-24 text-sm font-medium text-gray-700">Party Name</label>
                    <input
                      type="text"
                      value={formData.partyName}
                      onChange={(e) => handleInputChange('basic', 'partyName', e.target.value)}
                      className="flex-1 px-2 py-1 border border-gray-300 text-sm"
                    />
                  </div>
                  <div className="flex items-center">
                    <label className="w-24 text-sm font-medium text-gray-700">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => handleInputChange('basic', 'status', e.target.value)}
                      className="flex-1 px-2 py-1 border border-gray-300 text-sm"
                    >
                      <option value="R">R</option>
                      <option value="A">A</option>
                    </select>
                  </div>
                  <div className="flex items-center">
                    <label className="w-24 text-sm font-medium text-gray-700">Commi System</label>
                    <div className="flex-1 flex items-center space-x-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="commiSystem"
                          value="Take"
                          checked={formData.commiSystem === 'Take'}
                          onChange={(e) => handleInputChange('basic', 'commiSystem', e.target.value)}
                          className="mr-1"
                        />
                        <span className="text-sm">Take (Lena)</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="commiSystem"
                          value="Give"
                          checked={formData.commiSystem === 'Give'}
                          onChange={(e) => handleInputChange('basic', 'commiSystem', e.target.value)}
                          className="mr-1"
                        />
                        <span className="text-sm">Give (Dena)</span>
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <label className="w-24 text-sm font-medium text-gray-700">Balance Limit</label>
                    <input
                      type="text"
                      value={formData.balanceLimit}
                      onChange={(e) => handleInputChange('basic', 'balanceLimit', e.target.value)}
                      className="flex-1 px-2 py-1 border border-gray-300 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-blue-100 border border-gray-300">
                <div className="bg-blue-200 px-4 py-2 border-b border-gray-300">
                  <h3 className="text-sm font-semibold text-gray-800">Self LD</h3>
                </div>
                <div className="p-4 space-y-3">
                  {['M', 'S', 'A', 'T', 'C'].map((field) => (
                    <div key={field} className="flex items-center">
                      <label className="w-8 text-sm font-medium text-gray-700">{field}</label>
                      <input
                        type="text"
                        value={formData.selfLD[field as keyof typeof formData.selfLD]}
                        onChange={(e) => handleInputChange('selfLD', field, e.target.value)}
                        className="flex-1 px-2 py-1 border border-gray-300 text-sm mr-2"
                      />
                      <span className="text-red-500 text-sm">%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Row 2: Agent LD and ThirdParty LD */}
              <div className="bg-blue-100 border border-gray-300">
                <div className="bg-blue-200 px-4 py-2 border-b border-gray-300">
                  <h3 className="text-sm font-semibold text-gray-800">Agent LD</h3>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-center">
                    <label className="w-8 text-sm font-medium text-gray-700">Name</label>
                    <input
                      type="text"
                      value={formData.agentLD.name}
                      onChange={(e) => handleInputChange('agentLD', 'name', e.target.value)}
                      className="flex-1 px-2 py-1 border border-gray-300 text-sm"
                    />
                  </div>
                  {['M', 'S', 'A', 'T', 'C'].map((field) => (
                    <div key={field} className="flex items-center">
                      <label className="w-8 text-sm font-medium text-gray-700">{field}</label>
                      <input
                        type="text"
                        value={formData.agentLD[field as keyof typeof formData.agentLD]}
                        onChange={(e) => handleInputChange('agentLD', field, e.target.value)}
                        className="flex-1 px-2 py-1 border border-gray-300 text-sm mr-2"
                      />
                      <span className="text-red-500 text-sm">%</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-blue-100 border border-gray-300">
                <div className="bg-blue-200 px-4 py-2 border-b border-gray-300">
                  <h3 className="text-sm font-semibold text-gray-800">ThirdParty LD</h3>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-center">
                    <label className="w-8 text-sm font-medium text-gray-700">Name</label>
                    <input
                      type="text"
                      value={formData.thirdPartyLD.name}
                      onChange={(e) => handleInputChange('thirdPartyLD', 'name', e.target.value)}
                      className="flex-1 px-2 py-1 border border-gray-300 text-sm"
                    />
                  </div>
                  {['M', 'S', 'A', 'T', 'C'].map((field) => (
                    <div key={field} className="flex items-center">
                      <label className="w-8 text-sm font-medium text-gray-700">{field}</label>
                      <input
                        type="text"
                        value={formData.thirdPartyLD[field as keyof typeof formData.thirdPartyLD]}
                        onChange={(e) => handleInputChange('thirdPartyLD', field, e.target.value)}
                        className="flex-1 px-2 py-1 border border-gray-300 text-sm mr-2"
                      />
                      <span className="text-red-500 text-sm">%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Row 3: Incentive and Self Commission */}
              <div className="bg-blue-100 border border-gray-300">
                <div className="bg-blue-200 px-4 py-2 border-b border-gray-300">
                  <h3 className="text-sm font-semibold text-gray-800">Incentive</h3>
                </div>
                <div className="p-4 space-y-4">
                  <div className="flex items-center">
                    <label className="w-24 text-sm font-medium text-gray-700">M Commission</label>
                    <select
                      value={formData.mCommission}
                      onChange={(e) => handleInputChange('basic', 'mCommission', e.target.value)}
                      className="flex-1 px-2 py-1 border border-gray-300 text-sm"
                    >
                      <option value="No Commission">No Commission</option>
                      <option value="With Commission">With Commission</option>
                    </select>
                  </div>
                  <div className="flex items-center">
                    <label className="w-24 text-sm font-medium text-gray-700">Rate</label>
                    <input
                      type="text"
                      value={formData.rate}
                      onChange={(e) => handleInputChange('basic', 'rate', e.target.value)}
                      className="flex-1 px-2 py-1 border border-gray-300 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-blue-100 border border-gray-300">
                <div className="bg-blue-200 px-4 py-2 border-b border-gray-300">
                  <h3 className="text-sm font-semibold text-gray-800">Self Commission</h3>
                </div>
                <div className="p-4 space-y-3">
                  {['M', 'S'].map((field) => (
                    <div key={field} className="flex items-center">
                      <label className="w-8 text-sm font-medium text-gray-700">{field}</label>
                      <input
                        type="text"
                        value={formData.selfCommission[field as keyof typeof formData.selfCommission]}
                        onChange={(e) => handleInputChange('selfCommission', field, e.target.value)}
                        className="flex-1 px-2 py-1 border border-gray-300 text-sm mr-2"
                      />
                      <span className="text-red-500 text-sm">%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Row 4: Agent Commission and ThirdParty Commission */}
              <div className="bg-blue-100 border border-gray-300">
                <div className="bg-blue-200 px-4 py-2 border-b border-gray-300">
                  <h3 className="text-sm font-semibold text-gray-800">Agent Commission</h3>
                </div>
                <div className="p-4 space-y-3">
                  {['M', 'S'].map((field) => (
                    <div key={field} className="flex items-center">
                      <label className="w-8 text-sm font-medium text-gray-700">{field}</label>
                      <input
                        type="text"
                        value={formData.agentCommission[field as keyof typeof formData.agentCommission]}
                        onChange={(e) => handleInputChange('agentCommission', field, e.target.value)}
                        className="flex-1 px-2 py-1 border border-gray-300 text-sm mr-2"
                      />
                      <span className="text-red-500 text-sm">%</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-blue-100 border border-gray-300 relative">
                <div className="bg-blue-200 px-4 py-2 border-b border-gray-300">
                  <h3 className="text-sm font-semibold text-gray-800">ThirdParty Commission</h3>
                </div>
                <div className="p-4 space-y-3">
                  {['M', 'S'].map((field) => (
                    <div key={field} className="flex items-center">
                      <label className="w-8 text-sm font-medium text-gray-700">{field}</label>
                      <input
                        type="text"
                        value={formData.thirdPartyCommission[field as keyof typeof formData.thirdPartyCommission]}
                        onChange={(e) => handleInputChange('thirdPartyCommission', field, e.target.value)}
                        className="flex-1 px-2 py-1 border border-gray-300 text-sm mr-2"
                      />
                      <span className="text-red-500 text-sm">%</span>
                    </div>
                  ))}
                </div>
                
                {/* Action Buttons positioned in bottom right */}
                <div className="absolute bottom-4 right-4 flex space-x-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-gray-500 text-white text-sm rounded hover:bg-gray-600 transition-colors"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={handleExit}
                    className="px-4 py-2 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default NewParty;
