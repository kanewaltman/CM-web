import React, { useRef } from 'react';
import { ExportButton } from './ExportButton';
import { BalancesWidget } from './BalancesWidget';

/**
 * Example showing how to make any widget exportable
 */
export function ExportableBalancesWidget() {
  const widgetRef = useRef<HTMLDivElement>(null);

  return (
    <div className="space-y-4">
      {/* Export controls */}
      <div className="flex gap-2 justify-end">
        <ExportButton 
          target={widgetRef}
          options={{
            filename: 'balances-widget.svg',
            inlineResources: true,
            formatted: true
          }}
        >
          📊 Export Widget
        </ExportButton>
      </div>

      {/* Widget container with ref */}
      <div 
        ref={widgetRef}
        className="widget-container bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg"
        data-widget-name="balances"
      >
        <BalancesWidget />
      </div>
    </div>
  );
}

/**
 * Higher-order component to make any widget exportable
 */
export function withExportButton<T extends object>(
  WrappedComponent: React.ComponentType<T>,
  exportOptions?: {
    filename?: string;
    buttonText?: string;
    className?: string;
  }
) {
  return function ExportableComponent(props: T) {
    const widgetRef = useRef<HTMLDivElement>(null);

    return (
      <div className="exportable-widget-wrapper">
        <div className="flex justify-end mb-2">
          <ExportButton 
            target={widgetRef}
            options={{
              filename: exportOptions?.filename || 'widget.svg',
              inlineResources: true,
              formatted: true
            }}
            className={exportOptions?.className}
          >
            {exportOptions?.buttonText || '📊 Export'}
          </ExportButton>
        </div>
        
        <div ref={widgetRef} className="widget-export-target">
          <WrappedComponent {...props} />
        </div>
      </div>
    );
  };
}
