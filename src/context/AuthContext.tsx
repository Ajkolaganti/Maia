import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { 
  User,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { supabase } from '../config/supabase';
import { useNavigate, useLocation } from 'react-router-dom';

interface UserData {
  id: string;
  email: string;
  role: 'employer' | 'employee';
  first_name: string;
  last_name: string;
  organization_id?: string;
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const fetchUserData = useCallback(async (uid: string) => {
    console.log('🔍 Fetching user data from Supabase for UID:', uid);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', uid)
        .single();

      if (error) {
        console.error('❌ Error fetching user data:', error);
        return null;
      }

      console.log('✅ Successfully fetched user data:', data);
      return data as UserData;
    } catch (error) {
      console.error('❌ Exception in fetchUserData:', error);
      return null;
    }
  }, []);

  // Handle auth state changes
  useEffect(() => {
    console.log('🔄 Setting up auth listener');
    let mounted = true;
    setLoading(true);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('🔥 Firebase auth state changed:', firebaseUser?.uid);
      
      if (!mounted) return;

      try {
        if (firebaseUser) {
          setUser(firebaseUser);
          const supabaseData = await fetchUserData(firebaseUser.uid);
          
          if (supabaseData) {
            setUserData(supabaseData);
          } else {
            setUser(null);
            setUserData(null);
          }
        } else {
          setUser(null);
          setUserData(null);
        }
      } catch (error) {
        console.error('❌ Error in auth state change:', error);
        setUser(null);
        setUserData(null);
      } finally {
        if (mounted) {
          setLoading(false);
          setInitialized(true);
        }
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [fetchUserData]);

  // Handle navigation based on auth state
  useEffect(() => {
    if (!initialized || loading) return;

    const currentPath = location.pathname;
    console.log('🚦 Auth state check:', { currentPath, userData, loading });

    if (userData) {
      const targetPath = `/${userData.role}/dashboard`;
      if (currentPath === '/login' || currentPath === '/') {
        console.log('🚀 Redirecting authenticated user to:', targetPath);
        navigate(targetPath, { replace: true });
      }
    } else if (!loading && !currentPath.includes('login') && !currentPath.includes('register')) {
      console.log('🚀 Redirecting unauthenticated user to login');
      navigate('/login', { replace: true });
    }
  }, [userData, loading, initialized, location.pathname, navigate]);

  const login = async (email: string, password: string) => {
    console.log('🔑 Login attempt for:', email);
    try {
      setLoading(true);
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      console.log('✅ Firebase authentication successful');

      const userData = await fetchUserData(user.uid);
      if (!userData) throw new Error('User data not found');

      setUserData(userData);
    } catch (error) {
      console.error('❌ Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    console.log('🚪 Logout initiated');
    try {
      setLoading(true);
      await signOut(auth);
      setUser(null);
      setUserData(null);
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('❌ Logout error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    userData,
    loading,
    login,
    logout
  };

  if (!initialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};