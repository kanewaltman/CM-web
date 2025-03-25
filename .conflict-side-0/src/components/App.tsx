import { useEffect, useState, useCallback, useRef } from 'react';
import {
  checkDirectDialogNavigation,
  handleDirectUrlNavigation,
} from '@/lib/widgetDialogService';

// Early detection of direct dialog navigation
const { isDirectDialogLoad, widgetId } = checkDirectDialogNavigation();
if (isDirectDialogLoad && widgetId) {
  console.log('🔍 Early detection of direct dialog navigation:', { isDirectDialogLoad, widgetId });
}

export function App() {
  // Handle direct URL navigation at app initialization
  useEffect(() => {
    // Only run this once on initial app load
    const timer = setTimeout(() => {
      console.log('🔄 Initializing widget dialog system after delay for direct load');
      // Handle any direct URL navigation with assets
      handleDirectUrlNavigation();
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    // ... existing JSX ...
  );
} 