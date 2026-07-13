import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

interface ConfigContextType {
  lists: {
    roomTags: Array<{ id: string, label: string, emoji: string }>;
    moods: string[];
    popularTags: string[];
    meetupCategories: Array<{ id: string, label: string, emoji: string }>;
    badgePresets: string[];
    reportReasons: string[];
    communityReportReasons: string[];
  } | null;
  loading: boolean;
  error: string | null;
  refreshLists: () => Promise<void>;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export const ConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lists, setLists] = useState<ConfigContextType['lists']>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLists = async () => {
    try {
      setLoading(true);
      const data = await api.config.getLists();
      setLists(data);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load static lists config:', err);
      setError(err.message || 'Failed to load config');
      // Set some safe defaults just in case the backend fails
      setLists({
        roomTags: [],
        moods: [],
        popularTags: [],
        meetupCategories: [],
        badgePresets: [],
        reportReasons: [],
        communityReportReasons: []
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLists();
  }, []);

  return (
    <ConfigContext.Provider value={{ lists, loading, error, refreshLists: fetchLists }}>
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (context === undefined) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
};
