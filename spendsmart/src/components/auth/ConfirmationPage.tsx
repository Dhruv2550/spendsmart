// src/components/auth/ConfirmationPage.tsx
import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

interface LocationState {
  email: string;
}

export function ConfirmationPage() {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  
  const { confirmRegistration, resendConfirmationCode } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const email = (location.state as LocationState)?.email || '';

  if (!email) {
    navigate('/signup');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setError('Please enter the confirmation code');
      return;
    }

    setIsLoading(true);
    setError('');

    const result = await confirmRegistration(email, code.trim());
    
    if (result.success) {
      navigate('/login', { 
        state: { 
          message: 'Registration confirmed! Please sign in with your credentials.',
          email: email 
        } 
      });
    } else {
      setError(result.error || 'Confirmation failed');
    }
    
    setIsLoading(false);
  };

  const handleResendCode = async () => {
    setIsResending(true);
    setResendMessage('');
    setError('');

    const result = await resendConfirmationCode(email);
    
    if (result.success) {
      setResendMessage('A new confirmation code has been sent to your email.');
    } else {
      setError(result.error || 'Failed to resend confirmation code');
    }
    
    setIsResending(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
          Confirm your email
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          We sent a confirmation code to{' '}
          <span className="font-medium text-blue-600">{email}</span>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                Confirmation Code
              </label>
              <div className="mt-1">
                <input
                  id="code"
                  name="code"
                  type="text"
                  required
                  placeholder="Enter 6-digit code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                  maxLength={6}
                />
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-800">{error}</div>
              </div>
            )}

            {resendMessage && (
              <div className="rounded-md bg-green-50 p-4">
                <div className="text-sm text-green-800">{resendMessage}</div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading || !code.trim()}
                className="flex w-full justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-200"
              >
                {isLoading ? 'Confirming...' : 'Confirm Email'}
              </button>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={handleResendCode}
                disabled={isResending}
                className="text-sm text-blue-600 hover:text-blue-500 disabled:opacity-50 transition-colors duration-200"
              >
                {isResending ? 'Sending...' : "Didn't receive the code? Resend"}
              </button>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => navigate('/signup')}
                className="text-sm text-gray-600 hover:text-gray-500 transition-colors duration-200"
              >
                Back to Sign Up
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ConfirmationPage;