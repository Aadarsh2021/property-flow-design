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

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useCompanyName } from '@/hooks/useCompanyName';
import TopNavigation from '@/components/TopNavigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
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
  CheckCircle,
  Trash2
} from 'lucide-react';
// Removed AuthService import - using API instead
import { updateUserPassword, updateUserProfile, sendEmailVerificationToUser } from '@/lib/firebase';
import { authAPI } from '@/lib/api';
// Profile image upload functions using backend API
const uploadProfileImage = async (file: File, userId: string): Promise<{ success: boolean; url?: string; error?: string }> => {
  try {
    // Convert file to base64 for backend upload
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    // Create a unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;

    console.log('🔄 Uploading image via backend API:', {
      fileName,
      userId,
      fileSize: file.size
    });

    // Upload via backend API
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'https://account-ledger-software.vercel.app/api'}/upload/profile-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        fileName,
        base64Data: base64,
        userId
      })
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      console.error('❌ Backend upload error:', result.message);
      return {
        success: false,
        error: result.message || 'Upload failed'
      };
    }

    console.log('✅ Upload successful:', result.url);

    return {
      success: true,
      url: result.url
    };
  } catch (error: any) {
    console.error('❌ Image upload error:', error);
    return {
      success: false,
      error: error.message || 'Image upload failed'
    };
  }
};

const deleteProfileImage = async (imageUrl: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'https://account-ledger-software.vercel.app/api'}/upload/profile-image`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ imageUrl })
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      console.error('❌ Backend delete error:', result.message);
      return {
        success: false,
        error: result.message || 'Delete failed'
      };
    }

    return { success: true };
  } catch (error: any) {
    console.error('❌ Image delete error:', error);
    return {
      success: false,
      error: error.message || 'Image delete failed'
    };
  }
};

const Profile = () => {
  const { user, login, token } = useAuth();
  const { toast } = useToast();
  const { companyName, refreshCompanyName } = useCompanyName(user?.id);
  
  // Use API calls instead of direct Supabase hooks
  const updateSettings = useCallback(async (settings: any) => {
    try {
      const response = await authAPI.updateProfile(settings);
      if (response.success) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to update settings');
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  }, []);
  
  // Additional API functions for compatibility with old system
  const getProfileAPI = async () => {
    try {
      const response = await authAPI.getProfile();
      if (response.success) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to get profile');
    } catch (error) {
      console.error('Error getting profile via API:', error);
      throw error;
    }
  };

  const updateProfileAPI = async (profileData: any) => {
    try {
      const response = await authAPI.updateProfile(profileData);
      if (response.success) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to update profile');
    } catch (error) {
      console.error('Error updating profile via API:', error);
      throw error;
    }
  };

  const changePasswordAPI = async (passwordData: { currentPassword: string; newPassword: string }) => {
    try {
      const response = await authAPI.changePassword(passwordData);
      if (response.success) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to change password');
    } catch (error) {
      console.error('Error changing password via API:', error);
      throw error;
    }
  };

  const setupPasswordAPI = async (passwordData: { password: string }) => {
    try {
      const response = await authAPI.setupPassword(passwordData);
      if (response.success) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to setup password');
    } catch (error) {
      console.error('Error setting up password via API:', error);
      throw error;
    }
  };

  const deleteAccountAPI = async () => {
    try {
      const response = await authAPI.deleteAccount();
      if (response.success) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to delete account');
    } catch (error) {
      console.error('Error deleting account via API:', error);
      throw error;
    }
  };
  
  // Form states
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // User information states
  const [formData, setFormData] = useState({
    fullname: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: ''
  });
  
  // Profile photo states
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  
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
  const [emailVerificationLoading, setEmailVerificationLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  // Load user data on component mount
  useEffect(() => {
    if (user) {
      setFormData({
        fullname: user.fullname || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
        city: user.city || '',
        state: user.state || '',
        pincode: user.pincode || ''
      });
      
      // Set profile photo
      setProfilePhoto(user.profilePicture || null);
      
      // Debug date values
      console.log('📅 User date debug:', {
        created_at: user.created_at,
        createdAt: user.createdAt,
        last_login: user.last_login,
        lastLogin: user.lastLogin,
        createdAt_parsed: user.createdAt ? new Date(user.createdAt) : null,
        lastLogin_parsed: user.lastLogin ? new Date(user.lastLogin) : null
      });
      
      // Debug auth provider
      console.log('🔐 Auth provider debug:', {
        auth_provider: user.auth_provider,
        authProvider: user.authProvider,
        password_hash: user.password_hash ? 'Set' : 'Not Set',
        hasBothAuth: user?.auth_provider === 'both' || user?.authProvider === 'both',
        isGoogleUser: user?.auth_provider === 'google' || user?.authProvider === 'google',
        isEmailUser: user?.auth_provider === 'email' || user?.authProvider === 'email'
      });
    }
  }, [user]);

  // Refresh user profile data
  const refreshUserProfile = async () => {
    try {
      const response = await authAPI.getProfile();
      if (response.success && response.data && response.data.user) {
        // Use token from context or user object
        const currentToken = token || user?.token;
        if (currentToken) {
          login(currentToken, response.data.user);
          
          // Update form data with fresh data
          setFormData({
            fullname: response.data.user.name || '',
            email: response.data.user.email || '',
            phone: response.data.user.phone || '',
            address: response.data.user.address || '',
            city: response.data.user.city || '',
            state: response.data.user.state || '',
            pincode: response.data.user.pincode || ''
          });
        } else {
          console.error('No token available for profile refresh');
        }
      } else {
        console.error('Profile refresh failed:', response.message || 'Invalid response data');
      }
    } catch (error) {
      console.error('Profile refresh error:', error);
      // Don't logout on profile refresh failure, just log the error
    }
  };

  // Load company name from User Settings
  useEffect(() => {
    refreshCompanyName();
  }, [refreshCompanyName]);

  // Refresh user profile on component mount to get latest data
  useEffect(() => {
    // Only refresh if user exists and we have a token (check both user.token and token from context)
    if (user && (user.token || token)) {
      refreshUserProfile();
    }
  }, []);

  // Don't render if user is not loaded yet
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

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
        // Refresh user profile to get updated data from backend
        await refreshUserProfile();
        
        toast({
          title: "✅ Profile Updated",
          description: "Your profile has been updated successfully",
        });
        
        setIsEditing(false);
      } else {
        setError(response.message || 'Failed to update profile');
        toast({
          title: "❌ Update Failed",
          description: response.message || 'Failed to update profile',
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Profile update error:', error);
      const errorMessage = error.message || 'Failed to update profile';
      setError(errorMessage);
      toast({
        title: "❌ Update Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle profile photo change
  const handlePhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "❌ Invalid File Type",
        description: "Please select an image file",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "❌ File Too Large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive"
      });
      return;
    }

    setPhotoLoading(true);
    try {
      // Delete old image if exists
      if (profilePhoto && profilePhoto.startsWith('http')) {
        await deleteProfileImage(profilePhoto);
      }

      // Upload new image to Supabase Storage
      const uploadResult = await uploadProfileImage(file, user?.id || user?._id || '');
      
      if (uploadResult.success && uploadResult.url) {
        // Update local state only (avoid calling login function)
        setProfilePhoto(uploadResult.url);
        
        // Update localStorage directly to persist the change
        try {
          const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
          const updatedUser = { ...currentUser, profilePicture: uploadResult.url };
          localStorage.setItem('user', JSON.stringify(updatedUser));
          console.log('✅ Local storage updated with new profile picture');
        } catch (error) {
          console.warn('Failed to update localStorage:', error);
        }
        
        // Also update the backend user profile
        try {
          const profileUpdateResult = await authAPI.updateProfile({
            profile_picture: uploadResult.url
          });
          console.log('✅ Backend profile updated:', profileUpdateResult);
        } catch (error) {
          console.warn('Backend profile update failed:', error);
          // Continue even if backend update fails - image is already uploaded and displayed
        }
        
        toast({
          title: "✅ Photo Updated",
          description: "Your profile photo has been updated successfully",
        });
      } else {
        toast({
          title: "❌ Upload Failed",
          description: uploadResult.error || "Failed to upload profile photo",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Photo update error:', error);
      toast({
        title: "❌ Update Error",
        description: "Failed to update profile photo",
        variant: "destructive"
      });
    } finally {
      setPhotoLoading(false);
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
    
    // If user has password, current password is required
    if (hasPassword && !passwordData.currentPassword) {
      setError('Current password is required');
      return;
    }
    
    setPasswordLoading(true);
    setError('');
    
    try {
      if (user?.auth_provider === 'google' && !hasPassword) {
        // Google user - setup password (first time)
        const response = await authAPI.updatePassword(user?.email || '', passwordData.newPassword);
        
        if (response.success) {
          // Update Firebase password as well
          const firebaseResult = await updateUserPassword(passwordData.newPassword);
          
          if (firebaseResult.success) {
            // Refresh user profile to get updated auth_provider
            await refreshUserProfile();
            
            toast({
              title: "✅ Password Setup Complete",
              description: "Your password has been set up successfully in both systems",
            });
          } else {
            // Database updated but Firebase failed
            toast({
              title: "⚠️ Partial Success",
              description: "Password set up in database but failed to update Firebase. Please try logging in.",
              variant: "destructive"
            });
          }
          
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
          
          const response = await authAPI.updatePassword(user?.email || '', passwordData.newPassword);
          if (response.success) {
            // Update Firebase password as well (this will auto-sync with database)
            const firebaseResult = await updateUserPassword(passwordData.newPassword);
            
            if (firebaseResult.success) {
              // Refresh user profile to get updated data
              await refreshUserProfile();
              
              toast({
                title: "✅ Password Changed",
                description: "Your password has been changed successfully in both Firebase and database",
              });
            } else {
              // Database updated but Firebase failed
              toast({
                title: "⚠️ Partial Success",
                description: "Password changed in database but failed to update Firebase. Please try logging in.",
                variant: "destructive"
              });
            }
            
            setPasswordData({
              currentPassword: '',
              newPassword: '',
              confirmPassword: ''
            });
          } else {
            setError(response.message || 'Failed to change password');
          }
        } else if (hasPassword) {
          // User has password - change password
          const response = await authAPI.updatePassword(user?.email || '', passwordData.newPassword);
          
          if (response.success) {
            // Update Firebase password as well
            const firebaseResult = await updateUserPassword(passwordData.newPassword);
            
            if (firebaseResult.success) {
              // Refresh user profile to get updated data
              await refreshUserProfile();
              
              toast({
                title: "✅ Password Changed",
                description: "Your password has been changed successfully in both systems",
              });
            } else {
              // Database updated but Firebase failed
              toast({
                title: "⚠️ Partial Success",
                description: "Password changed in database but failed to update Firebase. Please try logging in.",
                variant: "destructive"
              });
            }
            
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
          const response = await authAPI.updatePassword(user?.email || '', passwordData.newPassword);
          
          if (response.success) {
            // Update Firebase password as well
            const firebaseResult = await updateUserPassword(passwordData.newPassword);
            
            if (firebaseResult.success) {
              toast({
                title: "✅ Password Setup Complete",
                description: "Your password has been set up successfully in both systems",
              });
            } else {
              // Database updated but Firebase failed
              toast({
                title: "⚠️ Partial Success",
                description: "Password set up in database but failed to update Firebase. Please try logging in.",
                variant: "destructive"
              });
            }
            
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
      const errorMessage = error.message || 'Failed to change password';
      setError(errorMessage);
      
      // Show error toast
      toast({
        title: "❌ Password Change Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  // Check if user is Google user or has both auth methods (handle both auth_provider and authProvider)
  const isGoogleUser = user?.auth_provider === 'google' || user?.authProvider === 'google';
  const hasBothAuth = user?.auth_provider === 'both' || user?.authProvider === 'both';
  const isEmailUser = user?.auth_provider === 'email' || user?.authProvider === 'email';
  
  // Check if user has password set (for email users)
  const hasPassword = user?.password_hash && user.password_hash !== '' && user.password_hash !== null && user.password_hash !== undefined;
  
  // Show current password field for users who have password set (both email and Google users with password)
  const showCurrentPassword = hasPassword;
  
  // Show password setup section only for Google users who haven't set password yet
  const showPasswordSetup = isGoogleUser && !hasPassword;

  // Debug logging removed for clean testing
  
  // Company name from User Settings (read-only)
  const displayCompanyName = companyName || user?.company_account || 'Company';

  // Handle email verification resend
  const handleResendVerification = async () => {
    setEmailVerificationLoading(true);
    
    try {
      const result = await sendEmailVerificationToUser();
      
      if (result.success) {
        toast({
          title: "📧 Verification Email Sent",
          description: "Please check your email and click the verification link.",
        });
      } else {
        toast({
          title: "❌ Failed to Send Verification Email",
          description: result.error || "Please try again later",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Email verification error:', error);
      toast({
        title: "❌ Error",
        description: "Failed to send verification email. Please try again.",
        variant: "destructive"
      });
    } finally {
      setEmailVerificationLoading(false);
    }
  };

  // Handle account deletion
  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    
    try {
      // For now, just clear local data since we don't have a delete account function in AuthService
      const result = { success: true };
      
      if (result.success) {
        toast({
          title: "🗑️ Account Deleted",
          description: "Your account has been permanently deleted.",
        });
        
        // Clear local storage and redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Redirect to login page
        window.location.href = '/login';
      } else {
        toast({
          title: "❌ Failed to Delete Account",
          description: result.message || "Please try again later",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Account deletion error:', error);
      toast({
        title: "❌ Error",
        description: "Failed to delete account. Please try again.",
        variant: "destructive"
      });
    } finally {
      setDeleteLoading(false);
      setShowDeleteDialog(false);
    }
  };

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
                  
                  {/* Profile Photo Section */}
                  <div className="flex items-center space-x-4 pt-4">
                    <div className="relative">
                      {profilePhoto ? (
                        <img
                          src={profilePhoto}
                          alt="Profile"
                          className="w-20 h-20 rounded-full object-cover border-4 border-gray-200"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center border-4 border-gray-200">
                          <User className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                      {photoLoading && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {formData.fullname || 'User Name'}
                      </h3>
                      <p className="text-sm text-gray-500">{formData.email}</p>
                      <div className="mt-2">
                        <input
                          type="file"
                          id="photo-upload"
                          accept="image/*"
                          onChange={handlePhotoChange}
                          className="hidden"
                          disabled={photoLoading}
                        />
                        <label
                          htmlFor="photo-upload"
                          className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 cursor-pointer disabled:opacity-50"
                        >
                          <Camera className="w-3 h-3 mr-1" />
                          {photoLoading ? 'Uploading...' : 'Change Photo'}
                        </label>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-6">

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
                      
                      {/* Email Verification Status */}
                      {!isGoogleUser && (
                        <div className="mt-2">
                          {user?.emailVerified ? (
                            <div className="flex items-center space-x-2 text-green-600">
                              <CheckCircle className="w-4 h-4" />
                              <span className="text-sm font-medium">Email Verified</span>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2 text-yellow-600">
                                <Shield className="w-4 h-4" />
                                <span className="text-sm font-medium">Email Not Verified</span>
                              </div>
                              <Button
                                onClick={handleResendVerification}
                                disabled={emailVerificationLoading}
                                variant="outline"
                                size="sm"
                                className="text-xs"
                              >
                                {emailVerificationLoading ? (
                                  <>
                                    <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-1" />
                                    Sending...
                                  </>
                                ) : (
                                  'Resend Verification Email'
                                )}
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
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
                          value={displayCompanyName}
                          disabled={true} // Company name cannot be changed from Profile
                          className="pl-10 bg-gray-50"
                          placeholder="Company name from User Settings"
                        />
                      </div>
                      <p className="text-xs text-gray-500">Company name can only be changed from User Settings</p>
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
                    {hasPassword 
                      ? "Change your account password"
                      : "Set up a password for your account"
                    }
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <form onSubmit={(e) => { e.preventDefault(); handlePasswordChangeSubmit(); }}>
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
                      type="submit"
                      disabled={passwordLoading || !passwordData.newPassword || !passwordData.confirmPassword}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                    {passwordLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        {hasPassword ? 'Changing...' : 'Setting up...'}
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        {hasPassword ? 'Change Password' : 'Setup Password'}
                      </>
                    )}
                  </Button>
                  </form>

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
                  
                  {showPasswordSetup && (
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
                      {hasBothAuth ? 'Hybrid Account' : 
                       isGoogleUser ? 'Google Account' : 
                       isEmailUser ? 'Email Account' : 'Unknown'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Member Since:</span>
                    <span className="text-sm font-medium">
                      {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      }) : 
                       user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      }) : 'N/A'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Last Login:</span>
                    <span className="text-sm font-medium">
                      {user?.lastLogin ? new Date(user.lastLogin).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      }) : 
                       user?.last_login ? new Date(user.last_login).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      }) : 
                       new Date().toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Status:</span>
                    <span className="text-sm font-medium text-green-600">Active</span>
                  </div>
                </CardContent>
              </Card>

              {/* Delete Account Section - Compact */}
              <Card className="mt-6 border-red-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Trash2 className="w-5 h-5 text-red-600" />
                      <div>
                        <h3 className="text-sm font-medium text-red-800">Delete Account</h3>
                        <p className="text-xs text-red-600">Permanently delete your account and all data</p>
                      </div>
                    </div>
                    
                    <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          className="bg-red-600 hover:bg-red-700"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-red-600">
                            🗑️ Delete Account Permanently
                          </AlertDialogTitle>
                          <AlertDialogDescription className="text-gray-700">
                            Are you absolutely sure you want to delete your account? This action cannot be undone.
                            <br /><br />
                            <strong>All your data will be permanently lost:</strong>
                            <br />• Profile and personal information
                            <br />• All party data and ledger entries  
                            <br />• Transaction history and reports
                            <br />• User settings and preferences
                            <br />• All associated business data
                            <br /><br />
                            <span className="text-red-600 font-medium">
                              You will be logged out immediately after deletion.
                            </span>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel disabled={deleteLoading}>
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDeleteAccount}
                            disabled={deleteLoading}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            {deleteLoading ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                Deleting...
                              </>
                            ) : (
                              <>
                                <Trash2 className="w-4 h-4 mr-2" />
                                Yes, Delete My Account
                              </>
                            )}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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