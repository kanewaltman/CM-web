import { PageType } from './types';

/**
 * Helper to parse URL path into a valid page type
 */
export function getPageFromPath(path: string): PageType {
  const pageName = path === '/' ? 'dashboard' : path.slice(1);
  return ['dashboard', 'spot', 'margin', 'stake'].includes(pageName) 
    ? pageName as PageType
    : 'dashboard';
}

/**
 * Updates the browser URL and history when changing pages
 */
export function navigateToPage(page: PageType): void {
  const url = page === 'dashboard' ? '/' : `/${page}`;
  
  // Add to browser history
  window.history.pushState({ 
    page,
    timestamp: Date.now()
  }, '', url);
  
  console.log('🔄 Navigation:', { to: page, url });
} 