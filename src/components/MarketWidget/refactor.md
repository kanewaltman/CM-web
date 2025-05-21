
# Markets Widget State Refactor

This refactor converts the Markets widget to use the standard widget state pattern used by other widgets in the application. The following changes were implemented:

## Core Changes

1. Created a `MarketsWidgetState` class in `src/lib/widgetState.ts` that follows the same pattern as other widget state classes
2. Registered the state in the centralized `widgetStateRegistry`
3. Removed the custom `marketsWidgetRegistry` in favor of the standard widget state pattern
4. Created a React context `TableRefContext` for sharing table references between components
5. Removed reliance on global variables like `window.__marketsWidgetDialogTable`

## Component Updates

### MarketsWidgetWrapper
- Now uses `MarketsWidgetState` from the registry
- Provides `TableRefContext` to child components
- Manages state synchronization via the subscription pattern

### MarketsWidgetHeader
- Uses the widget state via registry lookup
- Gets table ref from context when not provided directly
- Removed localStorage operations in favor of state from `MarketsWidgetState`

### MarketsWidgetContainer
- Initializes widget state on mount if needed
- Follows same pattern as other widget containers
- Properly connects header and content components

### MarketsWidget
- Uses `forwardRef` and `useImperativeHandle` to expose table reference
- Removed reliance on global window variable for dialog mode

## Benefits

1. **Consistency:** All widgets now follow the same state management pattern
2. **Improved State Management:** Using a class with proper subscription model
3. **Proper Dependency Injection:** Using context instead of globals
4. **Better Type Safety:** Properly typed state and props
5. **Reduced Side Effects:** Eliminated global variable usage
6. **Maintainability:** Consistent patterns are easier to maintain

This refactor ensures that the Markets widget integrates seamlessly with the rest of the application architecture while maintaining all of its functionality.