"use client";
// UserContext.tsx
import React, { createContext, useContext, ReactNode } from 'react';

interface UserContextType {
  userId: string;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUserContext = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUserContext must be used within a UserContextProvider');
  }
  return context;
};

interface UserContextProviderProps {
  userId: string;
  children: ReactNode;
}

export const UserContextProvider: React.FC<UserContextProviderProps> = ({ userId, children }) => (
  <UserContext.Provider value={{ userId }}>
    {children}
  </UserContext.Provider>
);


// export default UserContext;
export default UserContextProvider