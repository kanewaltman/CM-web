/**
 * Index file for MarketWidget components
 * 
 * This file makes importing these components easier by providing a single entry point.
 * Instead of:
 *   import { MarketsWidget } from '@/components/MarketWidget/MarketsWidget';
 * 
 * You can use:
 *   import { MarketsWidget } from '@/components/MarketWidget';
 */
export { default as MarketsWidget } from './MarketsWidget';
export { MarketsWidgetWrapper } from './MarketsWidgetWrapper';
export { MarketsWidgetHeader } from './MarketsWidgetHeader';
export { TableWithAddAssetRow } from './TableWithAddAssetRow';
export { WidgetTab } from './WidgetTab';
export { default as ValueFlash } from './ValueFlash';

// Export market list related functionality
export { MarketsListMenu, RenameListDialog, DeleteListDialog, ListButton } from './MarketLists';
export { useMarketsList } from './useMarketsList';
export type { CustomList } from './useMarketsList';

// Export title component with list functionality
export { MarketsWidgetTitle } from './MarketsWidgetTitle'; 