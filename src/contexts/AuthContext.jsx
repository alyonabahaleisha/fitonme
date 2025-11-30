import { createContext, useContext, useEffect, useState } from 'react';
import { getSession, getUserData, createUser, onAuthStateChange } from '../lib/supabase';
import { identifyUser } from '../services/analytics';

const AuthContext = createContext({
  user: null,
  userData: null,
  loading: true,
  isAuthenticated: false,
  refreshUserData: async () => { },
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

  const refreshUserData = useCallback(async (userId, userEmail, userObject = null) => {
    if (!userId) return;

    try {
      let data = await getUserData(userId);

      // If user doesn't exist in database, create them
      if (!data) {
        console.log('[AUTH] User not found in database, creating new user:', userId);

        // Use passed userObject or fall back to state user
        const currentUser = userObject || user;

        // Determine auth provider from user metadata
        let provider = currentUser?.app_metadata?.provider || 'magic_link';
        // Map 'email' to 'magic_link' to match database constraint
        if (provider === 'email') provider = 'magic_link';

        data = await createUser(userId, userEmail, provider);
      }

      setUserData(data);

      // Identify user in Google Analytics
      if (userId && data) {
        identifyUser(
          userId,
          userEmail,
          data.plan_type,
          data.auth_provider
        );
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  }, [user]);

  useEffect(() => {
    // Check active session on mount
    const initAuth = async () => {
      try {
        const session = await getSession();
        setUser(session?.user ?? null);

        if (session?.user) {
          await refreshUserData(session.user.id, session.user.email);
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

      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        // Pass session.user directly to ensure we have the latest data
        // Also pass the user object itself if needed for metadata
        await refreshUserData(currentUser.id, currentUser.email, currentUser);
      } else {
        setUserData(null);
      }

      setLoading(false);
    });

    // Cleanup subscription
    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [refreshUserData]);

  const value = useMemo(() => ({
    user,
    userData,
    loading,
    isAuthenticated: !!user,
    refreshUserData: () => refreshUserData(user?.id, user?.email),
  }), [user, userData, loading, refreshUserData]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
