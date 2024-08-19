"use client";
import { useSWRF } from '@/lib/swr';
import { User } from '@/lib/types/account';
// UserContext.tsx
import React, { createContext, useContext, ReactNode } from 'react';
import {Accounts} from "@/types/accounts";

interface UserContextType {
  user: User;
  account: Accounts;
}

export const UserContext = createContext<UserContextType>({} as UserContextType);

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

export const UserContextProvider: React.FC<UserContextProviderProps> = ({ userId, children }) => {
  const { data: user, error, isLoading } = useSWRF(`/api/user?email=w@w.com`);
    const { data: account, error: accountError, isLoading: accountIsLoading } = useSWRF(`/api/account`);
    console.log('Account:', account);

  console.log('User:', user);

  if (isLoading || accountIsLoading) {
    return <>Loading...</>;
  }
  
  if (error || accountError) {
    return <>An error occurred: {error.message}</>;
  }

  
 return (
  <UserContext.Provider value={ { user: user, account: account } }>
    {children}
  </UserContext.Provider>
);}


// export default UserContext;
export default UserContextProvider
