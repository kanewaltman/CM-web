import { useDataSource } from '@/lib/DataSourceContext';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';

interface DataSourceToggleProps {
  className?: string;
}

export function DataSourceToggle({ className }: DataSourceToggleProps) {
  const { dataSource, setDataSource } = useDataSource();

  return (
    <div className={className}>
      <ToggleGroup
        type="single"
        value={dataSource}
        onValueChange={(value) => {
          if (value) setDataSource(value as 'demo' | 'sample' | 'coingecko');
        }}
        className="border rounded-md"
      >
        <ToggleGroupItem value="demo" aria-label="Demo API" variant="outline">
          Demo API
        </ToggleGroupItem>
        <ToggleGroupItem value="sample" aria-label="Sample Data" variant="outline">
          Sample
        </ToggleGroupItem>
        <ToggleGroupItem value="coingecko" aria-label="CoinGecko" variant="outline">
          CoinGecko
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
} 