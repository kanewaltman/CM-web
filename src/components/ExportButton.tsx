import React from 'react';
import { useWidgetExport, ExportSvgOptions } from '../utils/exportSvg';

interface ExportButtonProps {
  /** The target element to export - can be a CSS selector, ref, or HTMLElement */
  target: string | React.RefObject<HTMLElement> | HTMLElement;
  /** Export options */
  options?: ExportSvgOptions;
  /** Button text */
  children?: React.ReactNode;
  /** Button className */
  className?: string;
  /** Whether to show copy option */
  showCopyOption?: boolean;
}

export function ExportButton({ 
  target, 
  options = {}, 
  children = 'Export as SVG', 
  className = '',
  showCopyOption = true
}: ExportButtonProps) {
  const { exportWidget, exportAndCopy } = useWidgetExport();

  const handleExport = async () => {
    try {
      await exportWidget(target, options);
    } catch (error) {
      alert('Failed to export widget: ' + (error as Error).message);
    }
  };

  const handleCopy = async () => {
    try {
      await exportAndCopy(target, options);
      alert('SVG copied to clipboard!');
    } catch (error) {
      alert('Failed to copy SVG: ' + (error as Error).message);
    }
  };

  if (showCopyOption) {
    return (
      <div className={`export-button-group ${className}`}>
        <button 
          onClick={handleExport}
          className="px-3 py-1 bg-blue-500 text-white rounded-l hover:bg-blue-600 transition-colors"
        >
          {children}
        </button>
        <button 
          onClick={handleCopy}
          className="px-3 py-1 bg-blue-400 text-white rounded-r hover:bg-blue-500 transition-colors border-l border-blue-300"
          title="Copy SVG to clipboard"
        >
          📋
        </button>
      </div>
    );
  }

  return (
    <button 
      onClick={handleExport}
      className={`px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors ${className}`}
    >
      {children}
    </button>
  );
}

/**
 * Hook to add export functionality to any widget
 */
export function useWidgetExportButton(options: ExportSvgOptions = {}) {
  const { exportWidget, exportAndCopy } = useWidgetExport();

  const ExportButtonComponent = ({ 
    target, 
    children = 'Export SVG',
    className = '',
    showCopyOption = true
  }: Omit<ExportButtonProps, 'options'>) => (
    <ExportButton 
      target={target} 
      options={options} 
      children={children}
      className={className}
      showCopyOption={showCopyOption}
    />
  );

  return {
    ExportButton: ExportButtonComponent,
    exportWidget: (target: string | React.RefObject<HTMLElement> | HTMLElement) => 
      exportWidget(target, options),
    exportAndCopy: (target: string | React.RefObject<HTMLElement> | HTMLElement) => 
      exportAndCopy(target, options)
  };
}
