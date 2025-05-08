import React from 'react';
import { WidgetContentOnly } from '@/components/WidgetContentOnly';

/**
 * A static earn page that demonstrates using the WidgetContentOnly component
 * to render widget contents without headers and containers.
 */
export const StaticEarnPage: React.FC = () => {
  return (
    <div className="flex flex-col gap-8 p-6">
      <h1 className="text-2xl font-bold">Earn</h1>
      
      {/* Earn Promotional Section */}
      <section className="w-full h-[400px] bg-card rounded-lg shadow-sm">
        <WidgetContentOnly 
          widgetType="earn" 
          widgetId="earn-promo-static" 
          viewState={{ earnViewMode: 'ripple' }}
        />
      </section>
      
      {/* Earn Cards Section */}
      <section className="w-full h-[500px] bg-card rounded-lg shadow-sm">
        <WidgetContentOnly 
          widgetType="earn" 
          widgetId="earn-assets-static" 
          viewState={{ earnViewMode: 'cards' }}
        />
      </section>
      
      {/* Example of using other widgets on the same page */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="h-[300px] bg-card rounded-lg shadow-sm p-4">
          <h2 className="text-lg font-medium mb-4">Market Overview</h2>
          <div className="h-[calc(100%-2rem)]">
            <WidgetContentOnly 
              widgetType="market" 
              widgetId="market-static" 
            />
          </div>
        </section>
        
        <section className="h-[300px] bg-card rounded-lg shadow-sm p-4">
          <h2 className="text-lg font-medium mb-4">Performance</h2>
          <div className="h-[calc(100%-2rem)]">
            <WidgetContentOnly 
              widgetType="performance" 
              widgetId="performance-static" 
              viewState={{ chartVariant: 'balance' }}
            />
          </div>
        </section>
      </div>
    </div>
  );
}; 