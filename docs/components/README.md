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

### [Forms](forms.md)
Form components and related utilities:
- [Trade Form](trade-form.md) - Main trading interface form

## Component Guidelines

1. **Modularity**: Each component should have a single responsibility
2. **Props Interface**: All props should be properly typed using TypeScript
3. **Performance**: Components should be optimized for performance using:
   - Memoization where appropriate
   - Efficient re-rendering strategies
   - Proper state management
4. **Styling**: Components follow our [styling guidelines](../styles/architecture.md)

## Component Structure
Each component documentation includes:
- Purpose and usage
- Props API
- Code examples
- Performance considerations
- Related components 