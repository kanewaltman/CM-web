# Components

This section documents the component architecture of CM-Web. Our components are organized into logical categories to maintain a clean and maintainable codebase.

## Component Categories

### [UI Components](ui-components.md)
Core UI components that form the building blocks of our application:
- [Widget Container](ui/widget-container.md) - Flexible container component for dashboard widgets
- [Calendar](ui/calendar.md) - Date selection and display component
- [Chart](ui/chart.md) - Data visualization component

### [Layout Components](layout-components.md)
Components that handle the application's layout and structure:
- [Control Bar](control-bar.md) - Main application control interface
- [Top Bar](top-bar.md) - Application header and navigation

### [Widget Components](widgets.md)
Trading interface widgets that provide core functionality:
- [Market Overview](widgets/market-overview.md) - Market data display
- [Order Book](widgets/order-book.md) - Order book visualization
- [Trade Form](widgets/trade-form.md) - Trading interface
- [Recent Trades](widgets/recent-trades.md) - Trade history display
- [Trading View Chart](widgets/trading-view-chart.md) - Price chart visualization

## Component Guidelines

1. **Modularity**: Each component should have a single responsibility
2. **Props Interface**: All props should be properly typed using TypeScript
3. **Performance**: Components should be optimized for performance using:
   - Memoization where appropriate
   - Efficient re-rendering strategies
   - Proper state management
4. **Styling**: Components follow our [styling guidelines](../styles/architecture.md)

## Widget Implementation Guidelines

1. **Container Separation**
   - Widget components should ONLY implement their content
   - Container wrapping is handled at the layout level
   - Never wrap widget content in `WidgetContainer` within the component itself

2. **Content Structure**
   ```tsx
   // Correct widget component implementation
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

3. **Layout Integration**
   ```tsx
   // Correct layout-level implementation
   <div className="grid-stack-item" gs-id="example">
     <WidgetContainer title="Example Widget">
       <ExampleWidget />
     </WidgetContainer>
   </div>
   ```

## Component Structure
Each component documentation includes:
- Purpose and usage
- Props API
- Code examples
- Performance considerations
- Related components 