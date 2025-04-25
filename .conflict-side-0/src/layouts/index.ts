import { PageType, LayoutWidget } from './types';
import { getDashboardLayout } from './dashboardLayout';
import { getSpotLayout } from './spotLayout';
import { getMarginLayout } from './marginLayout';
import { getStakeLayout } from './stakeLayout';
import { getPageFromPath, navigateToPage } from './pageManager';

export * from './types';
export { getDashboardLayout } from './dashboardLayout';
export { getSpotLayout } from './spotLayout';
export { getMarginLayout } from './marginLayout';
export { getStakeLayout } from './stakeLayout';
export { getPageFromPath, navigateToPage } from './pageManager';

/**
 * Returns the appropriate layout configuration based on the current page
 */
export const getLayoutForPage = (
  page: PageType, 
  widgetRegistry: Record<string, any>
): LayoutWidget[] => {
  switch (page) {
    case 'dashboard':
      return getDashboardLayout(widgetRegistry);
    case 'spot':
      return getSpotLayout(widgetRegistry);
    case 'margin':
      return getMarginLayout(widgetRegistry);
    case 'stake':
      return getStakeLayout(widgetRegistry);
    default:
      return getDashboardLayout(widgetRegistry);
  }
}; 