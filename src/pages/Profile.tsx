/**
 * Profile Page
 * 
 * User profile management page where users can view and edit their personal information,
 * company details, and manage their account settings including password changes.
 * 
 * Features:
 * - View and edit personal information
 * - Company name and details management
 * - Password change functionality (for email users)
 * - Password setup (for Google users)
 * - Profile picture management
 * - Account information display
 * - Responsive design
 * 
 * @author Account Ledger Team
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import TopNavigation from '@/components/TopNavigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Mail, 
  Phone, 
  Building2, 
  Lock, 
  Eye, 
  EyeOff, 
  Save, 
  Edit3,
  Camera,
  Shield,
  Calendar,
  CheckCircle
} from 'lucide-react';
import { authAPI } from '@/lib/api';
import { updateUserPassword, updateUserProfile } from '@/lib/firebase';

const Profile = () => {
  const { user, login } = useAuth();
  const { toast } = useToast();
  
  // Form states
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // User information states
  const [formData, setFormData] = useState({
    fullname: '',
    email: '',
    phone: '',
    company_account: '',
    address: '',
    city: '',
    state: '',
    pincode: ''
  });
  
  // Password states
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  
  // Load user data on component mount
  useEffect(() => {
    if (user) {
      setFormData({
        fullname: user.fullname || '',
        email: user.email || '',
        phone: user.phone || '',
        company_account: user.company_account || '',
        address: user.address || '',
        city: user.city || '',
        state: user.state || '',
        pincode: user.pincode || ''
      });
    }
  }, [user]);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  // Handle password input changes
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  // Toggle password visibility
  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  // Save profile changes
  const handleSaveProfile = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await authAPI.updateProfile(formData);
      
      if (response.success) {
        // Update local user data
        const updatedUser = { ...user, ...formData };
        login(user?.token || '', updatedUser);
        
        toast({
          title: "✅ Profile Updated",
          description: "Your profile has been updated successfully",
        });
        
        setIsEditing(false);
      } else {
        setError(response.message || 'Failed to update profile');
      }
    } catch (error: any) {
      console.error('Profile update error:', error);
      setError(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  // Handle password change
  const handlePasswordChangeSubmit = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    
    setPasswordLoading(true);
    setError('');
    
    try {
      if (user?.auth_provider === 'google') {
        // Google user - setup password
        const response = await authAPI.setupPassword({
          password: passwordData.newPassword
        });
        
        if (response.success) {
          toast({
            title: "✅ Password Setup Complete",
            description: "Your password has been set up successfully",
          });
          
          setPasswordData({
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
          });
        } else {
          setError(response.message || 'Failed to setup password');
        }
      } else {
        // Check if user has password set during registration
        const hasPassword = user?.password_hash && user.password_hash !== '';
        
        if (hasPassword) {
          // User has password - require current password
          if (!passwordData.currentPassword) {
            setError('Current password is required');
            setPasswordLoading(false);
            return;
          }
          
          const response = await authAPI.changePassword({
            currentPassword: passwordData.currentPassword,
            newPassword: passwordData.newPassword
          });
          
          if (response.success) {
            toast({
              title: "✅ Password Changed",
              description: "Your password has been changed successfully",
            });
            
            setPasswordData({
              currentPassword: '',
              newPassword: '',
              confirmPassword: ''
            });
          } else {
            setError(response.message || 'Failed to change password');
          }
        } else {
          // User doesn't have password - setup new password
          const response = await authAPI.setupPassword({
            password: passwordData.newPassword
          });
          
          if (response.success) {
            toast({
              title: "✅ Password Setup Complete",
              description: "Your password has been set up successfully",
            });
            
            setPasswordData({
              currentPassword: '',
              newPassword: '',
              confirmPassword: ''
            });
          } else {
            setError(response.message || 'Failed to setup password');
          }
        }
      }
    } catch (error: any) {
      console.error('Password change error:', error);
      setError(error.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Check if user is Google user
  const isGoogleUser = user?.auth_provider === 'google';
  
  // Check if user has password set (for email users)
  const hasPassword = user?.password_hash && user.password_hash !== '';
  
  // Show current password field only for email users who have password set
  const showCurrentPassword = !isGoogleUser && hasPassword;

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNavigation />
      <div className="py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
            <p className="mt-2 text-gray-600">
              Manage your personal information and account settings
            </p>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Profile Information Card */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center space-x-2">
                        <User className="w-5 h-5" />
                        <span>Personal Information</span>
                      </CardTitle>
                      <CardDescription>
                        Update your personal details and company information
                      </CardDescription>
                    </div>
                    <Button
                      variant={isEditing ? "outline" : "default"}
                      onClick={() => setIsEditing(!isEditing)}
                      disabled={loading}
                    >
                      {isEditing ? (
                        <>
                          <Edit3 className="w-4 h-4 mr-2" />
                          Cancel
                        </>
                      ) : (
                        <>
                          <Edit3 className="w-4 h-4 mr-2" />
                          Edit
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  {/* Profile Picture Section */}
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      {user?.profilePicture ? (
                        <img 
                          src={user.profilePicture} 
                          alt={user.fullname || 'User'} 
                          className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg"
                        />
                      ) : (
                        <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center border-4 border-white shadow-lg">
                          <User className="w-8 h-8 text-white" />
                        </div>
                      )}
                      {isEditing && (
                        <button className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 transition-colors">
                          <Camera className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {user?.fullname || 'User'}
                      </h3>
                      <p className="text-gray-600">{user?.email}</p>
                      {isGoogleUser && (
                        <div className="flex items-center space-x-1 mt-1">
                          <Shield className="w-4 h-4 text-green-600" />
                          <span className="text-sm text-green-600">Google Account</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Form Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Full Name */}
                    <div className="space-y-2">
                      <Label htmlFor="fullname" className="text-sm font-medium text-gray-700">
                        Full Name
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          id="fullname"
                          name="fullname"
                          value={formData.fullname}
                          onChange={handleInputChange}
                          disabled={!isEditing}
                          className="pl-10"
                          placeholder="Enter your full name"
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                        Email Address
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          disabled={true} // Email cannot be changed
                          className="pl-10 bg-gray-50"
                          placeholder="Enter your email"
                        />
                      </div>
                      <p className="text-xs text-gray-500">Email cannot be changed</p>
                    </div>

                    {/* Phone */}
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                        Phone Number
                      </Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          id="phone"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          disabled={!isEditing}
                          className="pl-10"
                          placeholder="Enter your phone number"
                        />
                      </div>
                    </div>

                    {/* Company Account */}
                    <div className="space-y-2">
                      <Label htmlFor="company_account" className="text-sm font-medium text-gray-700">
                        Company Name
                      </Label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          id="company_account"
                          name="company_account"
                          value={formData.company_account}
                          onChange={handleInputChange}
                          disabled={!isEditing}
                          className="pl-10"
                          placeholder="Enter your company name"
                        />
                      </div>
                    </div>

                    {/* Address */}
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="address" className="text-sm font-medium text-gray-700">
                        Address
                      </Label>
                      <Input
                        id="address"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        placeholder="Enter your address"
                      />
                    </div>

                    {/* City */}
                    <div className="space-y-2">
                      <Label htmlFor="city" className="text-sm font-medium text-gray-700">
                        City
                      </Label>
                      <Input
                        id="city"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        placeholder="Enter your city"
                      />
                    </div>

                    {/* State */}
                    <div className="space-y-2">
                      <Label htmlFor="state" className="text-sm font-medium text-gray-700">
                        State
                      </Label>
                      <Input
                        id="state"
                        name="state"
                        value={formData.state}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        placeholder="Enter your state"
                      />
                    </div>

                    {/* Pincode */}
                    <div className="space-y-2">
                      <Label htmlFor="pincode" className="text-sm font-medium text-gray-700">
                        Pincode
                      </Label>
                      <Input
                        id="pincode"
                        name="pincode"
                        value={formData.pincode}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        placeholder="Enter your pincode"
                      />
                    </div>
                  </div>

                  {/* Save Button */}
                  {isEditing && (
                    <div className="flex justify-end pt-4">
                      <Button
                        onClick={handleSaveProfile}
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {loading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Save Changes
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Password Management Card */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Lock className="w-5 h-5" />
                    <span>Password Management</span>
                  </CardTitle>
                  <CardDescription>
                    {isGoogleUser 
                      ? "Set up a password for your account" 
                      : hasPassword 
                        ? "Change your account password"
                        : "Set up a password for your account"
                    }
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {showCurrentPassword && (
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword" className="text-sm font-medium text-gray-700">
                        Current Password
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          id="currentPassword"
                          name="currentPassword"
                          type={showPasswords.current ? 'text' : 'password'}
                          value={passwordData.currentPassword}
                          onChange={handlePasswordChange}
                          className="pl-10 pr-10"
                          placeholder="Enter current password"
                        />
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility('current')}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="newPassword" className="text-sm font-medium text-gray-700">
                      {isGoogleUser ? 'New Password' : 'New Password'}
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        id="newPassword"
                        name="newPassword"
                        type={showPasswords.new ? 'text' : 'password'}
                        value={passwordData.newPassword}
                        onChange={handlePasswordChange}
                        className="pl-10 pr-10"
                        placeholder="Enter new password"
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('new')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                      Confirm Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showPasswords.confirm ? 'text' : 'password'}
                        value={passwordData.confirmPassword}
                        onChange={handlePasswordChange}
                        className="pl-10 pr-10"
                        placeholder="Confirm new password"
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('confirm')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    onClick={handlePasswordChangeSubmit}
                    disabled={passwordLoading || !passwordData.newPassword || !passwordData.confirmPassword}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {passwordLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        {isGoogleUser || !hasPassword ? 'Setting up...' : 'Changing...'}
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        {isGoogleUser || !hasPassword ? 'Setup Password' : 'Change Password'}
                      </>
                    )}
                  </Button>

                  {isGoogleUser && (
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                      <div className="flex items-start space-x-2">
                        <Shield className="w-4 h-4 text-blue-600 mt-0.5" />
                        <div className="text-sm text-blue-800">
                          <p className="font-medium">Google Account</p>
                          <p className="text-blue-600">
                            You can set up a password to also login with email and password.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {!isGoogleUser && !hasPassword && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                      <div className="flex items-start space-x-2">
                        <Shield className="w-4 h-4 text-yellow-600 mt-0.5" />
                        <div className="text-sm text-yellow-800">
                          <p className="font-medium">Email Account</p>
                          <p className="text-yellow-600">
                            You haven't set up a password yet. Set one up to secure your account.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Account Information */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Calendar className="w-5 h-5" />
                    <span>Account Information</span>
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Account Type:</span>
                    <span className="text-sm font-medium">
                      {isGoogleUser ? 'Google Account' : 'Email Account'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Member Since:</span>
                    <span className="text-sm font-medium">
                      {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Last Login:</span>
                    <span className="text-sm font-medium">
                      {user?.last_login ? new Date(user.last_login).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Status:</span>
                    <span className="text-sm font-medium text-green-600">Active</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;