// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Amplify } from 'aws-amplify';
import { signUp, signIn, signOut, getCurrentUser, confirmSignUp, resendSignUpCode } from 'aws-amplify/auth';
import { amplifyConfig } from '../config/cognito';

Amplify.configure(amplifyConfig);

interface User {
  email: string;
  given_name: string;
  family_name: string;
  firstName?: string;  // For backward compatibility
  lastName?: string;   // For backward compatibility
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loading: boolean; // Alias for backward compatibility
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, firstName: string, lastName: string) => Promise<{ success: boolean; error?: string; needsConfirmation?: boolean }>;
  confirmRegistration: (email: string, code: string) => Promise<{ success: boolean; error?: string }>;
  resendConfirmationCode: (email: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const currentUser = await getCurrentUser();
      const userAttributes = currentUser.signInDetails?.loginId 
        ? { 
            email: currentUser.signInDetails.loginId,
            given_name: '',
            family_name: '',
            firstName: '', // For backward compatibility
            lastName: ''   // For backward compatibility
          }
        : null;
      
      if (userAttributes) {
        setUser(userAttributes);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.log('No authenticated user found');
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, firstName: string, lastName: string) => {
    console.log('=== SIGNUP DEBUG START ===');
    try {
      // Use email as username for simplicity
      const username = email;
      
      console.log('About to call register with email:', email);
      
      const result = await signUp({
        username,
        password,
        options: {
          userAttributes: {
            email,
            given_name: firstName,
            family_name: lastName,
          },
        },
      });

      console.log('Registration result:', result);
      console.log('Registration isSignUpComplete:', result.isSignUpComplete);
      console.log('Registration nextStep:', result.nextStep);
      
      if (result.nextStep) {
        console.log('Registration nextStep signUpStep:', result.nextStep.signUpStep);
      }

      if (result.nextStep?.signUpStep === 'CONFIRM_SIGN_UP') {
        console.log('Registration requires email confirmation');
        return { 
          success: false, 
          needsConfirmation: true,
          error: 'Please check your email for a confirmation code to complete registration.' 
        };
      }

      if (result.isSignUpComplete) {
        console.log('Registration completed successfully');
        return { success: true };
      }

      return { 
        success: false, 
        error: 'Registration incomplete. Please try again.' 
      };
      
    } catch (error: any) {
      console.error('Registration error:', error);
      return { 
        success: false, 
        error: error.message || 'Registration failed. Please try again.' 
      };
    } finally {
      console.log('=== SIGNUP DEBUG END ===');
    }
  };

  const confirmRegistration = async (email: string, code: string) => {
    try {
      const result = await confirmSignUp({
        username: email,
        confirmationCode: code
      });

      if (result.isSignUpComplete) {
        return { success: true };
      }

      return { 
        success: false, 
        error: 'Confirmation incomplete. Please try again.' 
      };
    } catch (error: any) {
      console.error('Confirmation error:', error);
      return { 
        success: false, 
        error: error.message || 'Confirmation failed. Please check your code and try again.' 
      };
    }
  };

  const resendConfirmationCode = async (email: string) => {
    try {
      await resendSignUpCode({
        username: email
      });
      return { success: true };
    } catch (error: any) {
      console.error('Resend confirmation error:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to resend confirmation code.' 
      };
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const result = await signIn({
        username: email,
        password,
      });

      if (result.isSignedIn) {
        await checkAuthState();
        return { success: true };
      }

      return { 
        success: false, 
        error: 'Login incomplete. Please try again.' 
      };
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Handle specific error cases
      if (error.name === 'UserNotConfirmedException') {
        return { 
          success: false, 
          error: 'Please confirm your email address before signing in. Check your email for the confirmation code.' 
        };
      }
      
      return { 
        success: false, 
        error: error.message || 'Login failed. Please check your credentials.' 
      };
    }
  };

  const logout = async () => {
    try {
      await signOut();
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    loading: isLoading, // Alias for backward compatibility
    login,
    register,
    confirmRegistration,
    resendConfirmationCode,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}