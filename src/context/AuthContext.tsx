import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase';
import { supabase } from '../config/supabase';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

interface UserData {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'employer' | 'employee';
  organization_id: string;
  client_id?: string;
  phone?: string;
  status: 'active' | 'inactive';
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Function to fetch user data from Supabase
  const fetchUserData = async (userId: string) => {
    try {
      console.log('Fetching user data for ID:', userId);
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Supabase error:', error);
        return null;
      }

      if (!data) {
        console.log('No user data found');
        return null;
      }

      console.log('Fetched user data:', data);
      return data as UserData;
    } catch (error) {
      console.error('Error fetching user data:', error);
      return null;
    }
  };

  useEffect(() => {
    console.log('Setting up auth state listener');
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('Auth state changed:', firebaseUser?.email);
      
      try {
        if (firebaseUser) {
          setUser(firebaseUser);
          
          // Fetch additional user data from Supabase
          const data = await fetchUserData(firebaseUser.uid);
          console.log('Fetched user data:', data);
          
          if (data) {
            setUserData(data);
            // Only navigate if we're not already on the correct route
            const currentPath = window.location.pathname;
            const targetPath = data.role === 'employer' ? '/employer' : '/employee';
            
            if (!currentPath.startsWith(targetPath)) {
              navigate(targetPath);
            }
          } else {
            // If no user data found, log out
            await auth.signOut();
            setUser(null);
            setUserData(null);
            navigate('/login');
            toast.error('User account not found or inactive');
          }
        } else {
          setUser(null);
          setUserData(null);
          if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
            navigate('/login');
          }
        }
      } catch (error) {
        console.error('Error in auth state change:', error);
        toast.error('Authentication error occurred');
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { user: firebaseUser } = await signInWithEmailAndPassword(auth, email, password);
      
      if (firebaseUser) {
        const data = await fetchUserData(firebaseUser.uid);
        if (data) {
          if (data.status === 'inactive') {
            await auth.signOut();
            throw new Error('Your account is inactive. Please contact support.');
          }
          setUserData(data);
          // Navigation will be handled by the auth state change listener
        } else {
          throw new Error('User account not found or inactive');
        }
      }
    } catch (error: any) {
      console.error('Login error:', error);
      let errorMessage = 'Failed to login';
      
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = 'Invalid email or password';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await auth.signOut();
      setUser(null);
      setUserData(null);
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, userData, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};