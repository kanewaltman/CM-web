import React, { useEffect } from 'react';
import { WidgetContentOnly } from '@/components/WidgetContentOnly';
import { TopBar } from '@/components/TopBar';
import { Footer } from '@/components/Footer';
import { PageType } from '@/layouts/types';

/**
 * A static Earn page that renders the earn widgets directly without GridStack
 * and without the standard widget containers and headers.
 */
export const EarnPage: React.FC = () => {
  // Log widget rendering for debugging
  useEffect(() => {
    console.log('EarnPage rendering widgets');
  }, []);

  const handlePageChange = (page: PageType) => {
    console.log('EarnPage handling page change to:', page);
    
    // Create and dispatch a custom event for the App component to listen for
    const navigationEvent = new CustomEvent('app-navigation', {
      detail: { page },
      bubbles: true
    });
    document.dispatchEvent(navigationEvent);
    
    // Also update URL without page reload as a fallback
    const url = page === 'dashboard' ? '/' : `/${page}`;
    window.history.pushState({ page, timestamp: Date.now() }, '', url);
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Fixed header */}
      <TopBar currentPage="earn" onPageChange={handlePageChange} />
      
      {/* Scrollable content area that takes remaining height */}
      <main className="flex-1 overflow-auto mt-16">
        <div className="container mx-auto px-4 py-8 mb-0">
          
          {/* Promotional ripple section - matches earn-promo in earnLayout.ts */}
          <section className="mb-12">
            <div className="bg-card rounded-[2rem] shadow-sm overflow-hidden" style={{ height: '520px', position: 'relative' }}>
              <WidgetContentOnly 
                key="earn-promo-widget"
                widgetType="earn" 
                widgetId="earn-promo-static" 
                viewState={{ earnViewMode: 'ripple', useContentOnly: true }}
              />
            </div>
          </section>
          
          {/* Staking cards section - matches earn-assets in earnLayout.ts */}
          <section className="mb-20">
            {/* <h2 className="text-2xl font-semibold mb-4">Staking Opportunities</h2> */}
            {/* No fixed height, let content determine height */}
            <div className="rounded-lg shadow-sm mb-4">
              <WidgetContentOnly 
                key="earn-assets-widget"
                widgetType="earn" 
                widgetId="earn-assets-static" 
                viewState={{ earnViewMode: 'cards', useContentOnly: true }}
                className="w-full"
              />
            </div>
          </section>
          
          {/* Additional information section */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            <div className="bg-card rounded-lg shadow-sm p-6">
              <h3 className="text-xl font-semibold mb-4">How Staking Works</h3>
              <p className="mb-4">
                Staking is the process of actively participating in transaction validation on a 
                proof-of-stake blockchain. When you stake your digital assets, you help secure 
                the network and confirm transactions.
              </p>
              <p>
                In return for locking up your assets and participating in network consensus, 
                you earn rewards distributed by the protocol.
              </p>
            </div>
            
            <div className="bg-card rounded-lg shadow-sm p-6">
              <h3 className="text-xl font-semibold mb-4">Risk Management</h3>
              <p className="mb-4">
                While staking is generally considered lower risk than trading, there are still 
                important factors to consider:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Market volatility can affect the value of your staked assets</li>
                <li>Some protocols have lock-up or unbonding periods</li>
                <li>Technical risks may exist in the underlying protocols</li>
                <li>Rewards can vary over time based on network conditions</li>
              </ul>
            </div>
          </section>
        </div>
        
        {/* Footer spans full width */}
        <Footer />
      </main>
    </div>
  );
}; 