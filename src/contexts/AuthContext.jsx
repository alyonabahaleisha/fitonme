import { createContext, useContext, useEffect, useState } from 'react';
import { getCurrentUser, getUserData, createUser, onAuthStateChange } from '../lib/supabase';
import { identifyUser } from '../services/analytics';

const AuthContext = createContext({
  user: null,
  userData: null,
  loading: true,
  isAuthenticated: false,
  refreshUserData: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUserData = async (userId, userEmail) => {
    if (!userId) return;

    try {
      let data = await getUserData(userId);

      // If user doesn't exist in database, create them
      if (!data) {
        console.log('[AUTH] User not found in database, creating new user:', userId);
        data = await createUser(userId, userEmail);
      }

      setUserData(data);

      // Identify user in Google Analytics
      if (user && data) {
        identifyUser(
          user.id,
          user.email,
          data.plan_type,
          data.auth_provider
        );
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  };

  useEffect(() => {
    // Check active session on mount
    const initAuth = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);

        if (currentUser) {
          await refreshUserData(currentUser.id, currentUser.email);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth state changes
    const { data: authListener } = onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);

      setUser(session?.user ?? null);

      if (session?.user) {
        await refreshUserData(session.user.id, session.user.email);
      } else {
        setUserData(null);
      }

      setLoading(false);
    });

    // Cleanup subscription
    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const value = {
    user,
    userData,
    loading,
    isAuthenticated: !!user,
    refreshUserData: () => refreshUserData(user?.id, user?.email),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
