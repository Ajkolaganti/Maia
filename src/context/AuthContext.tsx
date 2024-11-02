import React, { createContext, useContext, useState } from 'react';

interface AuthContextType {
  userType: 'employer' | 'employee' | null;
  setUserType: (type: 'employer' | 'employee' | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [userType, setUserType] = useState<'employer' | 'employee' | null>(null);

  return (
    <AuthContext.Provider value={{ userType, setUserType }}>
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