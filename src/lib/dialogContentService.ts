import { create } from 'zustand';

// Define the types for our dialog content state
export interface DialogContentState {
  // The current content ID
  currentContentId: string | null;
  // The widget ID that owns this content stack
  widgetId: string | null;
  // Stack of previous content IDs to support back navigation
  contentHistory: string[];
  // Custom data to pass between content states
  contentData: Record<string, any>;
}

// Define the store actions
interface DialogContentActions {
  // Set the current content and add to history
  pushContent: (widgetId: string, contentId: string, data?: Record<string, any>) => void;
  // Go back to the previous content
  popContent: () => string | null;
  // Clear all history for a widget
  clearHistory: (widgetId?: string) => void;
  // Get content data
  getContentData: () => Record<string, any>;
  // Update content data
  updateContentData: (data: Record<string, any>) => void;
}

// Create the store with initial state
export const useDialogContentStore = create<DialogContentState & DialogContentActions>((set, get) => ({
  currentContentId: null,
  widgetId: null,
  contentHistory: [],
  contentData: {},

  // Push a new content to the stack
  pushContent: (widgetId, contentId, data = {}) => {
    set((state) => {
      const newContentHistory = [...state.contentHistory];
      
      // If we have a current content and it's different than the new one,
      // add it to history before changing
      if (state.currentContentId && state.currentContentId !== contentId) {
        newContentHistory.push(state.currentContentId);
      }
      
      return {
        widgetId,
        currentContentId: contentId,
        contentHistory: newContentHistory,
        contentData: { ...state.contentData, ...data }
      };
    });
  },

  // Pop the last content from history
  popContent: () => {
    const lastContent = get().contentHistory.pop();
    
    if (lastContent) {
      set((state) => ({
        currentContentId: lastContent,
        contentHistory: [...state.contentHistory]
      }));
      return lastContent;
    }
    
    // If no history, clear the current content
    set({ currentContentId: null });
    return null;
  },

  // Clear all history for a widget
  clearHistory: (widgetId) => {
    set((state) => {
      // If widgetId is specified, only clear for that widget
      if (widgetId && state.widgetId !== widgetId) {
        return state;
      }
      
      return {
        currentContentId: null,
        widgetId: null,
        contentHistory: [],
        contentData: {}
      };
    });
  },

  // Get content data
  getContentData: () => {
    return get().contentData;
  },

  // Update content data
  updateContentData: (data) => {
    set((state) => ({
      contentData: { ...state.contentData, ...data }
    }));
  }
}));

// Event-based API for components that don't use hooks
export function pushDialogContent(widgetId: string, contentId: string, data?: Record<string, any>): void {
  // Use a custom event to signal content change request
  const event = new CustomEvent('dialog-content-change', {
    detail: { 
      type: 'push',
      widgetId, 
      contentId,
      data 
    }
  });
  document.dispatchEvent(event);
}

export function popDialogContent(): void {
  // Use a custom event to signal back navigation request
  const event = new CustomEvent('dialog-content-change', {
    detail: { type: 'pop' }
  });
  document.dispatchEvent(event);
}

export function clearDialogContentHistory(widgetId?: string): void {
  // Use a custom event to signal history clear request
  const event = new CustomEvent('dialog-content-change', {
    detail: { 
      type: 'clear',
      widgetId 
    }
  });
  document.dispatchEvent(event);
} 