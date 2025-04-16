// Type declaration for Tauri window
declare global {
  interface Window {
    __TAURI_INTERNALS__: Record<string, unknown>;
  }
}

// Check if running in Tauri environment
export const isTauri = typeof window !== 'undefined' && 'isTauri' in window;

// Platform detection utilities
export const isWeb = !isTauri;

// Device type detection
export const isMobile = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;
export const isDesktop = !isMobile;

// Combined platform + device type checks
export const isTauriMobile = isTauri && isMobile;
export const isTauriDesktop = isTauri && isDesktop;
export const isWebMobile = isWeb && isMobile;
export const isWebDesktop = isWeb && isDesktop; 