import { elementToSVG, inlineResources } from 'dom-to-svg';

export interface ExportSvgOptions {
  /** Whether to inline external resources (fonts, images) */
  inlineResources?: boolean;
  /** Whether to format/prettify the SVG output */
  formatted?: boolean;
  /** Custom filename for download */
  filename?: string;
  /** Additional styling to apply before export */
  additionalStyles?: string;
}

/**
 * Simple XML formatter for SVG strings
 */
function formatXML(xml: string): string {
  try {
    // Simple formatting - add line breaks and indentation
    let formatted = xml;
    
    // Add line breaks after tags
    formatted = formatted.replace(/></g, '>\n<');
    
    // Add indentation
    const lines = formatted.split('\n');
    let indent = 0;
    const indentStr = '  ';
    
    const formattedLines = lines.map(line => {
      const trimmed = line.trim();
      if (!trimmed) return '';
      
      // Decrease indent for closing tags
      if (trimmed.startsWith('</')) {
        indent = Math.max(0, indent - 1);
      }
      
      const indentedLine = indentStr.repeat(indent) + trimmed;
      
      // Increase indent for opening tags (but not self-closing tags)
      if (trimmed.startsWith('<') && !trimmed.startsWith('</') && !trimmed.endsWith('/>')) {
        indent++;
      }
      
      return indentedLine;
    });
    
    return formattedLines.join('\n');
  } catch (error) {
    // If formatting fails, return original
    return xml;
  }
}

/**
 * Exports any DOM element as SVG
 */
export async function exportElementAsSvg(
  element: HTMLElement, 
  options: ExportSvgOptions = {}
): Promise<string> {
  const {
    inlineResources: shouldInlineResources = true,
    formatted = true,
    additionalStyles
  } = options;

  // Apply additional styles if provided
  let styleElement: HTMLStyleElement | null = null;
  if (additionalStyles) {
    styleElement = document.createElement('style');
    styleElement.textContent = additionalStyles;
    document.head.appendChild(styleElement);
  }

  try {
    // Convert element to SVG
    const svgDocument = elementToSVG(element);
    
    // Inline external resources if requested
    if (shouldInlineResources) {
      await inlineResources(svgDocument.documentElement);
    }
    
    // Get SVG string
    let svgString = new XMLSerializer().serializeToString(svgDocument);
    
    // Format if requested
    if (formatted) {
      svgString = formatXML(svgString);
    }
    
    return svgString;
  } finally {
    // Clean up additional styles
    if (styleElement && styleElement.parentNode) {
      styleElement.parentNode.removeChild(styleElement);
    }
  }
}

/**
 * Exports a widget by selector and automatically downloads it
 */
export async function exportWidgetAsSvg(
  selector: string, 
  options: ExportSvgOptions = {}
): Promise<void> {
  const element = document.querySelector(selector) as HTMLElement;
  
  if (!element) {
    throw new Error(`Element with selector "${selector}" not found`);
  }
  
  const svgString = await exportElementAsSvg(element, options);
  downloadSvg(svgString, options.filename || 'widget.svg');
}

/**
 * Exports a widget by React ref and automatically downloads it
 */
export async function exportWidgetByRef(
  ref: React.RefObject<HTMLElement>, 
  options: ExportSvgOptions = {}
): Promise<void> {
  if (!ref.current) {
    throw new Error('Ref is not attached to any element');
  }
  
  const svgString = await exportElementAsSvg(ref.current, options);
  downloadSvg(svgString, options.filename || 'widget.svg');
}

/**
 * Downloads SVG string as a file
 */
export function downloadSvg(svgString: string, filename: string = 'export.svg'): void {
  const blob = new Blob([svgString], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Copies SVG string to clipboard
 */
export async function copySvgToClipboard(svgString: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(svgString);
  } catch (err) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = svgString;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  }
}

/**
 * Hook for easy widget export in React components
 */
export function useWidgetExport() {
  const exportWidget = async (
    element: HTMLElement | React.RefObject<HTMLElement> | string,
    options: ExportSvgOptions = {}
  ) => {
    try {
      if (typeof element === 'string') {
        await exportWidgetAsSvg(element, options);
      } else if ('current' in element) {
        await exportWidgetByRef(element as React.RefObject<HTMLElement>, options);
      } else {
        const svgString = await exportElementAsSvg(element as HTMLElement, options);
        downloadSvg(svgString, options.filename || 'widget.svg');
      }
    } catch (error) {
      console.error('Failed to export widget:', error);
      throw error;
    }
  };

  const exportAndCopy = async (
    element: HTMLElement | React.RefObject<HTMLElement> | string,
    options: ExportSvgOptions = {}
  ) => {
    try {
      let svgString: string;
      
      if (typeof element === 'string') {
        const domElement = document.querySelector(element) as HTMLElement;
        if (!domElement) throw new Error(`Element with selector "${element}" not found`);
        svgString = await exportElementAsSvg(domElement, options);
      } else if ('current' in element) {
        if (!element.current) throw new Error('Ref is not attached to any element');
        svgString = await exportElementAsSvg(element.current, options);
      } else {
        svgString = await exportElementAsSvg(element, options);
      }
      
      await copySvgToClipboard(svgString);
      return svgString;
    } catch (error) {
      console.error('Failed to export and copy widget:', error);
      throw error;
    }
  };

  return { exportWidget, exportAndCopy };
}