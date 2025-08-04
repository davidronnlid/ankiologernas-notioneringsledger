import React, { createContext, useContext, useState, ReactNode } from 'react';

interface NotionSyncState {
  isLoading: boolean;
  currentOperation: string;
  progress: {
    current: number;
    total: number;
  };
  messages: string[];
  error?: string;
  isCancelled: boolean;
}

interface NotionSyncContextType extends NotionSyncState {
  startSync: (operation: string, total?: number) => void;
  updateProgress: (current: number, message?: string) => void;
  addMessage: (message: string) => void;
  setError: (error: string) => void;
  finishSync: (finalMessage?: string) => void;
  clearMessages: () => void;
  cancelSync: () => void;
}

const NotionSyncContext = createContext<NotionSyncContextType | undefined>(undefined);

export const useNotionSync = () => {
  const context = useContext(NotionSyncContext);
  if (!context) {
    throw new Error('useNotionSync must be used within a NotionSyncProvider');
  }
  return context;
};

interface NotionSyncProviderProps {
  children: ReactNode;
}

export const NotionSyncProvider: React.FC<NotionSyncProviderProps> = ({ children }) => {
  const [state, setState] = useState<NotionSyncState>({
    isLoading: false,
    currentOperation: '',
    progress: { current: 0, total: 0 },
    messages: [],
    isCancelled: false,
  });

  const startSync = (operation: string, total: number = 0) => {
    setState({
      isLoading: true,
      currentOperation: operation,
      progress: { current: 0, total },
      messages: [`🔄 Starting ${operation}...`],
      error: undefined,
      isCancelled: false,
    });
  };

  const updateProgress = (current: number, message?: string) => {
    setState(prev => ({
      ...prev,
      progress: { ...prev.progress, current },
      messages: message ? [...prev.messages, message] : prev.messages,
    }));
  };

  const addMessage = (message: string) => {
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, message],
    }));
  };

  const setError = (error: string) => {
    setState(prev => ({
      ...prev,
      error,
      messages: [...prev.messages, `❌ ${error}`],
    }));
  };

  const finishSync = (finalMessage?: string) => {
    setState(prev => ({
      ...prev,
      isLoading: false,
      messages: finalMessage ? [...prev.messages, finalMessage] : prev.messages,
    }));
  };

  const clearMessages = () => {
    setState(prev => ({
      ...prev,
      messages: [],
      error: undefined,
    }));
  };

  const cancelSync = () => {
    setState(prev => ({
      ...prev,
      isCancelled: true,
      isLoading: false,
      messages: [...prev.messages, '⚠️ Sync cancelled by user'],
    }));
  };

  const value: NotionSyncContextType = {
    ...state,
    startSync,
    updateProgress,
    addMessage,
    setError,
    finishSync,
    clearMessages,
    cancelSync,
  };

  return (
    <NotionSyncContext.Provider value={value}>
      {children}
    </NotionSyncContext.Provider>
  );
};