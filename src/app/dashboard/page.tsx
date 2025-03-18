import { DataSourceToggle } from '@/components/DataSourceToggle';

export default function DashboardPage() {
  return (
    <div className="flex flex-col min-h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        
        <DataSourceToggle className="ml-auto mr-4" />
        
        {/* ... existing buttons/controls ... */}
      </div>
      
      {/* ... rest of the component ... */}
    </div>
  );
} 