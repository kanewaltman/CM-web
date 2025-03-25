import { PageType, LayoutWidget } from './types';
import { getDashboardLayout } from './dashboardLayout';
import { getSpotLayout } from './spotLayout';
import { getMarginLayout } from './marginLayout';
import { getPageFromPath, navigateToPage } from './pageManager';
import { getEarnLayout } from './earnLayout';

export * from './types';
export { getDashboardLayout } from './dashboardLayout';
export { getSpotLayout } from './spotLayout';
export { getMarginLayout } from './marginLayout';
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
      return getDashboardLayout(widgetRegistry) as LayoutWidget[];
    case 'spot':
      return getSpotLayout(widgetRegistry) as LayoutWidget[];
    case 'margin':
      return getMarginLayout(widgetRegistry) as LayoutWidget[];
    case 'earn':
      return getEarnLayout(widgetRegistry) as LayoutWidget[];
    default:
      return getDashboardLayout(widgetRegistry) as LayoutWidget[];
  }
}; 