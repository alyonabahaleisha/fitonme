import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing');
  const [error, setError] = useState('');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the auth code from URL
        console.log('[AuthCallback] Starting auth callback handling...');
        const { data, error } = await supabase.auth.getSession();
        console.log('[AuthCallback] getSession result:', { data, error });

        if (error) throw error;

        if (data.session) {
          console.log('[AuthCallback] Session found, redirecting...');
          setStatus('success');

          // Wait a moment to show success message
          setTimeout(() => {
            // Redirect to try-on page
            navigate('/try-on');
          }, 1500);
        } else {
          console.error('[AuthCallback] No session found in data');
          throw new Error('No session found');
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        setError(err.message || 'Authentication failed');
        setStatus('error');

        // Redirect to home after showing error
        setTimeout(() => {
          navigate('/');
        }, 3000);
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center px-4">
      <div className="text-center">
        {status === 'processing' && (
          <>
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white shadow-lg mb-6">
              <Sparkles className="w-10 h-10 text-accent animate-pulse" />
            </div>
            <h1 className="text-3xl font-display font-bold text-gray-900 mb-2">
              Signing you in...
            </h1>
            <p className="text-gray-600">
              Please wait while we complete your authentication
            </p>
            <div className="flex gap-2 justify-center mt-4">
              <div className="w-3 h-3 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-3 h-3 bg-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-3 h-3 bg-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-6">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-display font-bold text-gray-900 mb-2">
              Welcome back!
            </h1>
            <p className="text-gray-600">
              Redirecting you to your virtual closet...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100 mb-6">
              <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-3xl font-display font-bold text-gray-900 mb-2">
              Authentication Failed
            </h1>
            <p className="text-gray-600 mb-4">
              {error || 'Something went wrong during sign in'}
            </p>
            <p className="text-sm text-gray-500">
              Redirecting you back to home...
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;
