import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type DataSource = 'demo' | 'sample';

interface DataSourceContextType {
  dataSource: DataSource;
  setDataSource: (source: DataSource) => void;
}

const DataSourceContext = createContext<DataSourceContextType | undefined>(undefined);

interface DataSourceProviderProps {
  children: ReactNode;
  defaultDataSource?: DataSource;
}

export function DataSourceProvider({ children, defaultDataSource }: DataSourceProviderProps) {
  const [dataSource, setDataSource] = useState<DataSource>(() => {
    const saved = localStorage.getItem('data-source');
    return (saved === 'demo' || saved === 'sample') ? saved : (defaultDataSource || 'demo');
  });

  useEffect(() => {
    localStorage.setItem('data-source', dataSource);
  }, [dataSource]);

  return (
    <DataSourceContext.Provider value={{ dataSource, setDataSource }}>
      {children}
    </DataSourceContext.Provider>
  );
}

export function useDataSource() {
  const context = useContext(DataSourceContext);
  if (context === undefined) {
    throw new Error('useDataSource must be used within a DataSourceProvider');
  }
  return context;
} 