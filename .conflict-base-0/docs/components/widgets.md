# Widget Components

This document outlines the implementation guidelines and best practices for widget components in CM-Web. Widgets are modular components that provide specific trading functionality within the dashboard interface.

## Implementation Guidelines

### Widget Structure

All widget components should follow this basic structure:

```tsx
export function ExampleWidget() {
  return (
    <div className={cn(
      "h-full overflow-auto scrollbar-thin rounded-lg p-3",
      "border border-[hsl(var(--color-widget-inset-border))] widget-inset"
    )}>
      {/* Widget content */}
    </div>
  );
}
```

### Key Principles

1. **Content Focus**
   - Widgets should focus solely on their content and functionality
   - Container management is handled at the layout level
   - Never include `WidgetContainer` within the widget component

2. **Consistent Styling**
   - Use the standard widget content classes for consistency
   - Follow the design system for internal component styling
   - Maintain responsive behavior within the widget content

3. **Performance**
   - Implement proper cleanup for subscriptions and side effects
   - Use memoization for expensive calculations
   - Handle resize events efficiently
   - Optimize re-renders

## Available Widgets

### Market Overview
- Displays market data in a tabular format
- Shows price, volume, and change information
- [Documentation](widgets/market-overview.md)

### Order Book
- Visualizes the current order book
- Shows bid and ask orders
- Includes price aggregation
- [Documentation](widgets/order-book.md)

### Trade Form
- Provides the main trading interface
- Supports multiple order types
- Includes order size controls
- [Documentation](widgets/trade-form.md)

### Recent Trades
- Shows recent market trades
- Highlights buy/sell indicators
- Includes time and size information
- [Documentation](widgets/recent-trades.md)

### Trading View Chart
- Displays price chart using TradingView
- Supports multiple timeframes
- Includes technical analysis tools
- [Documentation](widgets/trading-view-chart.md)

## Integration with GridStack

Widgets are integrated into the layout using GridStack. This integration happens at the layout level (typically in `App.tsx`):

```tsx
<div className="grid-stack-item" gs-id="widget-id">
  <WidgetContainer title="Widget Title">
    <WidgetComponent />
  </WidgetContainer>
</div>
```

For more details on GridStack integration, see the [GridStack Integration](../architecture/gridstack-integration.md) documentation.

## Styling Guidelines

1. **Content Container**
   ```tsx
   className={cn(
     "h-full overflow-auto scrollbar-thin rounded-lg p-3",
     "border border-[hsl(var(--color-widget-inset-border))] widget-inset"
   )}
   ```

2. **Scrollable Content**
   ```tsx
   className="flex-1 overflow-auto scrollbar-thin"
   ```

3. **Tables and Lists**
   ```tsx
   className="w-full border-collapse"
   ```

## Best Practices

1. **State Management**
   - Keep widget state isolated
   - Use appropriate hooks for data fetching
   - Implement proper error handling
   - Handle loading states gracefully

2. **Responsive Design**
   - Adapt to container size changes
   - Support both desktop and mobile layouts
   - Handle content overflow appropriately

3. **Error Handling**
   - Display user-friendly error messages
   - Implement fallback UI for error states
   - Log errors appropriately

4. **Testing**
   - Write unit tests for widget logic
   - Include integration tests for data flow
   - Test responsive behavior
   - Verify error handling 