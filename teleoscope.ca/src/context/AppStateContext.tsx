import { createContext, useContext, ReactNode } from 'react';
import { AppState, useGetDataQuery } from '@/services/app';

const AppStateContext = createContext<AppState | undefined>(undefined);

export const AppStateProvider = ({ workspace_id, children }: { workspace_id: string, children: ReactNode }) => {
    const { data: appState, error, isLoading } = useGetDataQuery(workspace_id);

    if (isLoading) {
        return <div>Loading...</div>;
    }
    
    if (error) {
        return <div>Error loading AppState</div>;
    }
    
    return (
        <AppStateContext.Provider value={{ appState }}>
            {children}
        </AppStateContext.Provider>
    );
};

export const useAppState = () => {
    const context = useContext(AppStateContext);
    if (context === undefined) {
        throw new Error('useAppState must be used within an AppStateProvider');
    }
    return context;
};
