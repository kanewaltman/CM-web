# Widget SVG Export Guide

This guide shows you how to easily export any widget as SVG using the `dom-to-svg` library.

## Quick Start

### 1. Import the utilities
```typescript
import { ExportButton } from '@/components/ExportButton';
import { useWidgetExport } from '@/utils/exportSvg';
```

### 2. Add export button to any widget

#### Method 1: Using a React ref
```tsx
import React, { useRef } from 'react';
import { ExportButton } from '@/components/ExportButton';
import { BalancesWidget } from '@/components/BalancesWidget';

function MyComponent() {
  const widgetRef = useRef<HTMLDivElement>(null);

  return (
    <div>
      <ExportButton 
        target={widgetRef}
        options={{ filename: 'my-widget.svg' }}
      >
        Export Widget
      </ExportButton>
      
      <div ref={widgetRef}>
        <BalancesWidget />
      </div>
    </div>
  );
}
```

#### Method 2: Using CSS selector
```tsx
import { ExportButton } from '@/components/ExportButton';

function MyComponent() {
  return (
    <div>
      <ExportButton 
        target="#my-widget"
        options={{ filename: 'widget.svg' }}
      />
      
      <div id="my-widget">
        <BalancesWidget />
      </div>
    </div>
  );
}
```

#### Method 3: Using the hook directly
```tsx
import { useWidgetExport } from '@/utils/exportSvg';

function MyComponent() {
  const { exportWidget } = useWidgetExport();

  const handleExport = () => {
    exportWidget('#my-widget', {
      filename: 'balances.svg',
      inlineResources: true
    });
  };

  return (
    <div>
      <button onClick={handleExport}>Export Widget</button>
      <div id="my-widget">
        <BalancesWidget />
      </div>
    </div>
  );
}
```

## Advanced Usage

### Higher-Order Component
Make any component exportable:

```tsx
import { withExportButton } from '@/components/ExportableWidget';
import { BalancesWidget } from '@/components/BalancesWidget';

const ExportableBalances = withExportButton(BalancesWidget, {
  filename: 'balances.svg',
  buttonText: 'Download SVG',
});

// Use it
<ExportableBalances />
```

### Custom Export Options

```tsx
<ExportButton 
  target={widgetRef}
  options={{
    filename: 'custom-widget.svg',
    inlineResources: true,  // Include fonts/images in SVG
    formatted: true,        // Pretty-print the SVG
    additionalStyles: `
      .widget { background: white; }
      .chart { border: 1px solid #ccc; }
    `
  }}
  showCopyOption={true}  // Show copy to clipboard button
/>
```

### Export Multiple Widgets

```tsx
function ExportMultipleWidgets() {
  const { exportWidget } = useWidgetExport();

  const exportAll = async () => {
    // Export each widget separately
    await exportWidget('#balances-widget', { filename: 'balances.svg' });
    await exportWidget('#performance-widget', { filename: 'performance.svg' });
    await exportWidget('#transactions-widget', { filename: 'transactions.svg' });
  };

  return (
    <div>
      <button onClick={exportAll}>Export All Widgets</button>
      
      <div id="balances-widget"><BalancesWidget /></div>
      <div id="performance-widget"><PerformanceWidget /></div>
      <div id="transactions-widget"><TransactionsWidget /></div>
    </div>
  );
}
```

### Copy to Clipboard

```tsx
function CopyExample() {
  const { exportAndCopy } = useWidgetExport();

  const handleCopy = async () => {
    try {
      await exportAndCopy('#my-widget');
      alert('SVG copied to clipboard!');
    } catch (error) {
      alert('Failed to copy: ' + error.message);
    }
  };

  return (
    <div>
      <button onClick={handleCopy}>Copy SVG</button>
      <div id="my-widget"><BalancesWidget /></div>
    </div>
  );
}
```

## Available Export Options

```typescript
interface ExportSvgOptions {
  // Whether to inline external resources (fonts, images)
  inlineResources?: boolean;  // default: true
  
  // Whether to format/prettify the SVG output
  formatted?: boolean;        // default: true
  
  // Custom filename for download
  filename?: string;          // default: 'widget.svg'
  
  // Additional styling to apply before export
  additionalStyles?: string;
}
```

## Tips

1. **Add unique IDs or classes** to widgets you want to export
2. **Use refs for React components** for better reliability
3. **Inline resources** for self-contained SVGs that work everywhere
4. **Test exports** with different themes (light/dark mode)
5. **Consider widget size** - very large widgets may take longer to export

## Troubleshooting

- **"Element not found"**: Make sure the selector is correct and the element exists
- **Empty SVG**: The target element might be invisible or have no content
- **Missing styles**: Enable `inlineResources: true` to include external fonts/styles
- **Large file size**: Disable `inlineResources` if you don't need external assets

## Example: Add Export to Existing Widget

If you have an existing widget component, here's the minimal change to add export:

```tsx
// Before
function MyWidget() {
  return (
    <div className="widget">
      {/* widget content */}
    </div>
  );
}

// After - just add a ref and export button
function MyWidget() {
  const widgetRef = useRef<HTMLDivElement>(null);
  
  return (
    <div>
      <ExportButton target={widgetRef} />
      <div ref={widgetRef} className="widget">
        {/* widget content */}
      </div>
    </div>
  );
}
```

That's it! Your widget is now exportable as SVG.