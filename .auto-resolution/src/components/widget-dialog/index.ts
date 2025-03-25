/**
 * Widget Dialog System
 * 
 * This system provides a way to expand widgets into fullscreen dialogs with URL support.
 */

// Core components
export { WidgetDialog } from '../WidgetDialog';
export { EnhancedWidgetContainer } from '../EnhancedWidgetContainer';
export { withWidgetDialog } from '../withWidgetDialog';

// Hooks and utilities
export { useWidgetDialog, getWidgetIdFromHash } from '../../lib/widgetDialogService';
export { useWidgetDialogRouter } from '../../hooks/useWidgetDialogRouter'; 