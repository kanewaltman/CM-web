import { ChevronDown, Maximize2, MoreHorizontal, Trash2, ListChecks, Plus, Edit, Globe, ListFilter } from '../components/ui-icons';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { useRef, useCallback, memo, useState, useEffect, useState, useEffect } from 'react';
import { createPopoutWindow } from '../utils/windowManager';
import { isTauri } from '../utils/platform';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from './ui/dropdown-menu';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './ui/alert-dialog';

interface CustomList {
  id: string;
  name: string;
  assets: string[];
}
import { Dialog, DialogContent } from './ui/dialog';
import { 
  getWidgetIdFromHash, 
  markHashHandled, 
  isHashHandled, 
  isSameBaseWidget, 
  isProcessingEvent, 
  openWidgetDialog, 
  closeWidgetDialog,
  hasOpenDialogs
} from '@/lib/widgetDialogService';

interface WidgetContainerProps {
  children: React.ReactNode;
  title: string;
  headerControls?: React.ReactNode;
  extraControls?: React.ReactNode;
  onRemove?: () => void;
  isMobile?: boolean;
  widgetMenu?: React.ReactNode;
  widgetId?: string;
  titleClickHandler?: (e: React.MouseEvent) => void;
  widgetId?: string; // Optional for backward compatibility, but needed for dialog functionality
}

// Track which dialogs are currently open to prevent duplicates
const openDialogs = new Set<string>();

// Track which events have been handled to prevent duplicates
const handledEvents = new Set<string>();

// LocalStorage key for saving custom lists
const MARKETS_LISTS_KEY = 'markets-widget-custom-lists';
const ACTIVE_LIST_KEY = 'markets-widget-active-list';

export const WidgetContainer = memo(function WidgetContainer({ 
  children, 
  title, 
  headerControls, 
  extraControls,
  onRemove,
  isMobile = false,
  widgetMenu,
  widgetId: externalWidgetId
}: WidgetContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [titleMenuOpen, setTitleMenuOpen] = useState(false);
  const [customLists, setCustomLists] = useState<CustomList[]>([]);
  const [activeList, setActiveList] = useState<string | null>(null);
  const isMarketsWidget = title === "Markets";
  
  // State for handling custom lists
  const [newListName, setNewListName] = useState('');
  const [renameListId, setRenameListId] = useState<string | null>(null);
  const [renameListName, setRenameListName] = useState('');
  const [renameListDialogOpen, setRenameListDialogOpen] = useState(false);

  // State for delete dialog
  const [deleteListId, setDeleteListId] = useState<string | null>(null);
  const [deleteListDialogOpen, setDeleteListDialogOpen] = useState(false);
  
  // Get the widget ID for proper instance tracking - set default immediately
  const widgetId = useRef<string>(externalWidgetId || `widget-${Date.now()}-${Math.floor(Math.random() * 1000)}`);
  // Track whether we've found the DOM ID
  const [foundDomId, setFoundDomId] = useState(false);

  // Add state to properly track the active list name for display in the title
  const [activeListName, setActiveListName] = useState<string | null>(null);
  
  // Function to update the active list name whenever active list changes
  const updateActiveListName = useCallback((listId: string | null, lists: CustomList[]) => {
    if (!listId) {
      setActiveListName(null);
      return;
    }
    
    const list = lists.find(list => list.id === listId);
    if (list) {
      setActiveListName(list.name);
    } else {
      setActiveListName(null);
    }
  }, []);

  // When the component mounts, try to get a better ID from the DOM
  useEffect(() => {
    if (!externalWidgetId && isMarketsWidget && containerRef.current) {
      const findAndSetId = () => {
        const gridItem = containerRef.current?.closest('.grid-stack-item');
        const domId = gridItem?.getAttribute('gs-id') || gridItem?.id;
        if (domId) {
          widgetId.current = domId;
          console.log(`[WidgetContainer] Widget ID updated to:`, widgetId.current);
          setFoundDomId(true);
          
          // Check if there's a stored active list for this widget
          try {
            const storedActiveList = localStorage.getItem(`${ACTIVE_LIST_KEY}-${domId}`);
            if (storedActiveList) {
              const listId = JSON.parse(storedActiveList);
              console.log(`[WidgetContainer] Found stored active list for widget ${domId}:`, listId);
              setActiveList(listId);
            }
          } catch (err) {
            console.error('Error loading active list for widget:', err);
          }
        }
      };
      
      // Try immediately
      findAndSetId();
      
      // And also after a short delay to ensure the DOM is fully ready
      const timerId = setTimeout(findAndSetId, 100);
      
      return () => clearTimeout(timerId);
    }
  }, [isMarketsWidget, externalWidgetId]);

  // Load custom lists from localStorage
  useEffect(() => {
    if (isMarketsWidget) {
      try {
        // Get lists from global storage (without instance ID)
        const savedLists = localStorage.getItem(MARKETS_LISTS_KEY);
        
        if (savedLists) {
          const parsedLists = JSON.parse(savedLists);
          setCustomLists(parsedLists);
          
          // If we already have an active list ID from earlier effect, update name
          if (activeList) {
            updateActiveListName(activeList, parsedLists);
          }
        }
        
        // Check for active list if not loaded yet
        if (!activeList && widgetId.current) {
          const storedActiveList = localStorage.getItem(`${ACTIVE_LIST_KEY}-${widgetId.current}`);
          if (storedActiveList) {
            const listId = JSON.parse(storedActiveList);
            setActiveList(listId);
            
            // If we have lists loaded, update the active list name
            if (savedLists) {
              updateActiveListName(listId, JSON.parse(savedLists));
            }
          }
        }
      } catch (error) {
        console.error('Error loading custom lists:', error);
      }
    }
  }, [isMarketsWidget, activeList, updateActiveListName]);

  // Save custom lists to localStorage
  const saveCustomLists = useCallback((lists: CustomList[]) => {
    try {
      // Save lists globally (without instance ID)
      localStorage.setItem(MARKETS_LISTS_KEY, JSON.stringify(lists));
      setCustomLists(lists);
      
      // Dispatch a custom event that all Markets widgets can listen for
      const event = new CustomEvent('markets-lists-updated', {
        detail: { 
          lists,
          // Pass the current widget instance ID so widgets know who made the change
          instanceId: 'all' // Always signal all widgets about list structure changes
        },
        bubbles: true
      });
      document.dispatchEvent(event);
      
      console.log(`[WidgetContainer] Widget ${widgetId.current} saved global lists (${lists.length} lists)`);
    } catch (error) {
      console.error('Error saving custom lists:', error);
    }
  }, []);

  // Save active list to localStorage
  const saveActiveList = useCallback((listId: string | null) => {
    try {
      // Each widget must have its own id to work correctly
      const instanceId = widgetId.current;
      
      console.log(`[WidgetContainer] Setting active list for widget ${instanceId}:`, listId);
      
      // Save active list with instance ID (selection is per-widget)
      localStorage.setItem(`${ACTIVE_LIST_KEY}-${instanceId}`, JSON.stringify(listId));
      setActiveList(listId);
      
      // Update the active list name for the widget title
      updateActiveListName(listId, customLists);
      
      // Dispatch a custom event that the Markets widget can listen for
      // Make sure this event only targets this specific widget instance
      const event = new CustomEvent('markets-active-list-changed', {
        detail: { 
          listId, 
          instanceId, // Must be this specific instance ID
          timestamp: Date.now() // Add timestamp to make the event unique
        },
        bubbles: true
      });
      document.dispatchEvent(event);
    } catch (error) {
      console.error('Error saving active list:', error);
    }
  }, [customLists, updateActiveListName]);

  // Handle creating a new list
  const handleCreateList = () => {
    setNewListName('');
  };
  
  // Handle saving a new list
  const handleSaveNewList = () => {
    if (newListName.trim()) {
      const instanceId = widgetId.current;
      console.log(`[WidgetContainer] Creating new list "${newListName}" for widget ${instanceId}`);
      
      const newList: CustomList = {
        id: `list-${Date.now()}`,
        name: newListName.trim(),
        assets: []
      };
      
      const updatedLists = [...customLists, newList];
      
      // Store lists globally
      localStorage.setItem(MARKETS_LISTS_KEY, JSON.stringify(updatedLists));
      setCustomLists(updatedLists);
      
      // Store active list with instance ID
      localStorage.setItem(`${ACTIVE_LIST_KEY}-${instanceId}`, JSON.stringify(newList.id));
      setActiveList(newList.id);
      
      // Reset state
      setNewListName('');
      
      // Dispatch events with proper instance ID
      const listsEvent = new CustomEvent('markets-lists-updated', {
        detail: { 
          lists: updatedLists,
          instanceId: 'all' // Notify all widgets about the new list
        },
        bubbles: true
      });
      document.dispatchEvent(listsEvent);
      
      const activeEvent = new CustomEvent('markets-active-list-changed', {
        detail: { 
          listId: newList.id,
          instanceId // Only this specific widget should switch to this list
        },
        bubbles: true
      });
      document.dispatchEvent(activeEvent);
      
      console.log(`[WidgetContainer] New list created and active list set to ${newList.id} for widget ${instanceId}`);
    }
  };

  // Delete a list
  const handleDeleteList = useCallback((listId: string) => {
    setDeleteListId(listId);
    setDeleteListDialogOpen(true);
  }, []);

  // Confirm list deletion
  const confirmDeleteList = useCallback(() => {
    if (!deleteListId) return;
    
    const updatedLists = customLists.filter(list => list.id !== deleteListId);
    saveCustomLists(updatedLists);
    
    // If we're deleting the active list, set to null (all markets)
    if (activeList === deleteListId) {
      saveActiveList(null);
    }
    
    // Reset state and close dialog
    setDeleteListId(null);
    setDeleteListDialogOpen(false);
  }, [customLists, activeList, deleteListId, saveCustomLists, saveActiveList]);

  // Rename a list - improved version with Dialog
  const handleRenameList = useCallback((listId: string) => {
    const currentList = customLists.find(list => list.id === listId);
    if (currentList) {
      setRenameListId(listId);
      setRenameListName(currentList.name);
      setRenameListDialogOpen(true);
    }
  }, [customLists]);
  
  // Handle saving the renamed list
  const handleSaveRenamedList = () => {
    if (!renameListId || renameListName.trim() === '') return;
    
    const updatedLists = customLists.map(list => {
      if (list.id === renameListId) {
        return { ...list, name: renameListName.trim() };
      }
      return list;
    });
    
    saveCustomLists(updatedLists);
    
    // If this is the currently active list, update the display name
    if (activeList === renameListId) {
      setActiveListName(renameListName.trim());
    }
    
    setRenameListDialogOpen(false);
    setRenameListId(null);
    setRenameListName('');
  };
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Determine widgetId from DOM if not provided
  useEffect(() => {
    if (!widgetId && containerRef.current) {
      const gridItem = containerRef.current?.closest('.grid-stack-item');
      const domWidgetId = gridItem?.getAttribute('gs-id') || gridItem?.id;
      if (domWidgetId) {
        console.log('Found widget ID from DOM:', domWidgetId);
        // We can't update props, but we can store it in a ref for use
        (containerRef as any).current.widgetId = domWidgetId;
      }
    }
  }, [widgetId]);

  // Set up dialog from URL when component mounts or hash changes
  useEffect(() => {
    // Use provided widgetId or try to get from DOM
    const effectiveWidgetId = widgetId || ((containerRef as any).current?.widgetId as string);
    if (!effectiveWidgetId) return; // Skip if no widgetId can be found

    // Keep track of dialog open state locally to prevent duplicate opens
    let isAlreadyOpened = false;

    const checkHash = () => {
      const widgetIdFromHash = getWidgetIdFromHash();
      
      // Only proceed if this widget matches the hash (using base ID comparison)
      if (widgetIdFromHash && isSameBaseWidget(widgetIdFromHash, effectiveWidgetId)) {
        // First check if hash has already been handled globally
        if (!isHashHandled()) {
          // Try to claim handling for this hash
          if (markHashHandled(effectiveWidgetId)) {
            console.log('📍 Opening widget dialog from URL hash:', effectiveWidgetId);
            isAlreadyOpened = true;
            
            // Use centralized function to open dialog
            setIsDialogOpen(true);
            openDialogs.add(effectiveWidgetId);
          } else {
            console.log('⏭️ Skipping hash check - already handled by another widget:', effectiveWidgetId);
          }
        } else if (!isAlreadyOpened) {
          console.log('⏭️ Hash already handled globally for:', effectiveWidgetId);
        }
      }
    };

    // Check on mount
    checkHash();

    // Create a named handler for hash changes so we can properly remove it
    const handleHashChange = (e: HashChangeEvent) => {
      console.log('🔄 Hash change in WidgetContainer:', { 
        oldURL: e.oldURL, 
        newURL: e.newURL, 
        widgetId: effectiveWidgetId
      });
      
      // If this appears to be a fresh navigation to the same URL (paste and enter),
      // reset the dialog state to allow it to open
      if (e.oldURL === e.newURL && e.newURL.includes(`widget=${getWidgetIdFromHash()}`)) {
        console.log('🔄 Detected navigation to same widget URL, attempting to reopen');
      }
      
      // Always recheck the hash when it changes
      checkHash();
    };

    // Handle hash change for browser navigation
    window.addEventListener('hashchange', handleHashChange);

    // Handle custom dialog open event for widgets
    const handleOpenDialog = (e: CustomEvent) => {
      const requestedWidgetId = e.detail?.widgetId;
      if (!requestedWidgetId) return;
      
      // Get the unique event ID if provided in the event
      const eventId = typeof e.detail?.eventId === 'string' ? e.detail.eventId : null;
      
      // Check if this event has already been handled by any container
      if (eventId && handledEvents.has(eventId)) {
        console.log('⏭️ Event already handled by another widget container:', eventId);
        return;
      }

      // Check for exact match only flag - require exact ID match, not just base ID match
      const exactMatchOnly = e.detail?.exactMatchOnly === true;
      
      // For exactMatchOnly events, we need a perfect match on IDs
      if (exactMatchOnly && requestedWidgetId !== effectiveWidgetId) {
        console.log('⏭️ Skipping - exact match required but IDs differ:', { 
          requested: requestedWidgetId, 
          thisWidget: effectiveWidgetId 
        });
        return;
      }
      
      // For direct load events with exactMatchOnly false, check if the base IDs match
      if (!exactMatchOnly && e.detail?.directLoad && requestedWidgetId !== effectiveWidgetId) {
        if (isSameBaseWidget(requestedWidgetId, effectiveWidgetId)) {
          // These are different instances of the same widget type
          // For direct loads, still require exact match to prevent multi-dialog issues
          console.log('⏭️ Skipping - different instance of same widget type:', { 
            requested: requestedWidgetId, 
            thisWidget: effectiveWidgetId 
          });
          return;
        } else if (!isSameBaseWidget(requestedWidgetId, effectiveWidgetId)) {
          // Base IDs don't match at all
          return;
        }
      }
      
      // For non-direct-load and non-exactMatchOnly events, check if base widget IDs match
      if (!exactMatchOnly && !e.detail?.directLoad && !isSameBaseWidget(requestedWidgetId, effectiveWidgetId)) {
        return; // Base IDs don't match, so skip
      }
      
      // From this point on, all checks have passed, so this widget should handle the event
      const isManualNavigation = !!e.detail?.isManualNavigation;
        
      console.log('📍 Opening widget dialog from event:', { 
        widgetId: effectiveWidgetId, 
        requestedId: requestedWidgetId,
        isDirectLoad: e.detail?.directLoad === true,
        isManualNavigation,
        alreadyOpen: isDialogOpen,
        eventId: eventId || 'none',
        exactMatchOnly
      });
      
      // Mark this event as handled if it has an ID
      if (eventId) {
        handledEvents.add(eventId);
        
        // Cleanup - limit set size to prevent memory issues
        if (handledEvents.size > 20) {
          const oldestEvent = handledEvents.values().next().value;
          if (oldestEvent) handledEvents.delete(oldestEvent);
        }
      }
      
      // If this is a title click event for a specific widget ID, only open it if it exactly matches this widget
      if (eventId && eventId.startsWith('title-click-') && requestedWidgetId !== effectiveWidgetId) {
        console.log('⏭️ Skipping event for another specific widget:', { requestedId: requestedWidgetId, thisId: effectiveWidgetId });
        return;
      }
      
      // Skip if already open, unless this is a manual navigation
      if (isDialogOpen && !isManualNavigation) {
        console.log('📍 Dialog already open, skipping redundant open');
        return;
      }
      
      // For manual navigation, force refresh the dialog state
      if (isManualNavigation && isDialogOpen) {
        console.log('🔄 Forcing dialog refresh for manual navigation');
        // Remove from tracking first
        openDialogs.delete(effectiveWidgetId);
        // Then add back
        openDialogs.add(effectiveWidgetId);
      } else {
        // Check if another dialog with the same ID is already open
        if (openDialogs.has(effectiveWidgetId)) {
          console.log('⚠️ Dialog already open for this widget ID:', effectiveWidgetId);
          return;
        }
        
        isAlreadyOpened = true;
        
        // Track this dialog as open
        openDialogs.add(effectiveWidgetId);
      }
      
      // Update local state
      setIsDialogOpen(true);
      
      // Mark the container that has the dialog open with a specific class
      if (containerRef.current) {
        containerRef.current.classList.add('widget-dialog-open');
      }
      
      // Add a class to the body as well
      document.body.classList.add('widget-dialog-open');
    };

    const handleCloseDialogs = () => {
      if (isDialogOpen) {
        isAlreadyOpened = false;
        openDialogs.delete(effectiveWidgetId);
        setIsDialogOpen(false);
        
        // Remove the class when dialog closes
        if (containerRef.current) {
          containerRef.current.classList.remove('widget-dialog-open');
        }
        
        // Remove the class from body if no other dialogs are open
        if (!hasOpenDialogs()) {
          document.body.classList.remove('widget-dialog-open');
        }
      }
    };

    // Register event listeners
    document.addEventListener('open-widget-dialog', handleOpenDialog as EventListener);
    document.addEventListener('close-widget-dialogs', handleCloseDialogs);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      document.removeEventListener('open-widget-dialog', handleOpenDialog as EventListener);
      document.removeEventListener('close-widget-dialogs', handleCloseDialogs);
      
      // Clean up when component unmounts
      if (isDialogOpen) {
        openDialogs.delete(effectiveWidgetId);
      }
    };
  }, [widgetId, isDialogOpen]);

  // Handle dialog opening/closing via Dialog component's onOpenChange
  const handleDialogOpenChange = (open: boolean) => {
    // Use provided widgetId or try to get from DOM
    const effectiveWidgetId = widgetId || ((containerRef as any).current?.widgetId as string);
    
    if (open && !isDialogOpen) {
      // Generate a unique event ID to prevent duplicate handling
      const eventId = `dialog-ui-${effectiveWidgetId}-${Date.now()}`;
      
      // Mark this event as already handled by this container
      handledEvents.add(eventId);
      
      // Temporarily modify the document.dispatchEvent to add our event ID
      const originalDispatchEvent = document.dispatchEvent;
      document.dispatchEvent = function(event: Event) {
        if (event.type === 'open-widget-dialog') {
          // Add our event ID to the detail
          (event as CustomEvent).detail.eventId = eventId;
        }
        return originalDispatchEvent.call(document, event);
      };
      
      // Opening dialog - use centralized function to update URL
      openWidgetDialog(effectiveWidgetId);
      
      // Restore the original dispatchEvent
      document.dispatchEvent = originalDispatchEvent;
      
      // Update classes for visual state
      if (containerRef.current) {
        containerRef.current.classList.add('widget-dialog-open');
      }
      document.body.classList.add('widget-dialog-open');
      
      // Update local state
      setIsDialogOpen(true);
      openDialogs.add(effectiveWidgetId);
    } 
    else if (!open && isDialogOpen) {
      // Closing dialog - use centralized function
      closeWidgetDialog(effectiveWidgetId);
      
      // Update classes
      if (containerRef.current) {
        containerRef.current.classList.remove('widget-dialog-open');
      }
      
      // Only remove body class if this is the last dialog
      if (!hasOpenDialogs()) {
        document.body.classList.remove('widget-dialog-open');
      }
      
      // Update local state
      setIsDialogOpen(false);
      openDialogs.delete(effectiveWidgetId);
    }
  };

  // Handle title click to open dialog
  const handleTitleClick = (e: React.MouseEvent) => {
    // Prevent propagation to stop the drag behavior
    e.stopPropagation();
    e.preventDefault();
    
    // Try to get widgetId from DOM if not provided in props
    const effectiveWidgetId = widgetId || ((containerRef as any).current?.widgetId as string);
    const gridItem = containerRef.current?.closest('.grid-stack-item');
    const domWidgetId = gridItem?.getAttribute('gs-id') || gridItem?.id;
    
    console.log('Title clicked:', { 
      widgetId: effectiveWidgetId || domWidgetId, 
      title, 
      hasCustomHandler: !!titleClickHandler,
      domId: domWidgetId,
      element: gridItem
    });

    if (titleClickHandler) {
      titleClickHandler(e);
      return;
    }
    
    if (effectiveWidgetId || domWidgetId) {
      // Use DOM-derived widgetId if prop isn't available
      const finalWidgetId = effectiveWidgetId || domWidgetId || '';
      if (domWidgetId && !effectiveWidgetId) {
        console.log('Using DOM-derived widget ID:', domWidgetId);
        (containerRef as any).current.widgetId = domWidgetId;
      }
      
      // Generate a unique event ID to prevent duplicate handling
      const eventId = `title-click-${finalWidgetId}-${Date.now()}`;
      
      // Update local state directly first
      setIsDialogOpen(true);
      openDialogs.add(finalWidgetId);
      
      // Mark this event as already handled by this container
      handledEvents.add(eventId);
      
      // Update classes
      if (containerRef.current) {
        containerRef.current.classList.add('widget-dialog-open');
      }
      document.body.classList.add('widget-dialog-open');
      
      // Use the centralized function to open dialog - this handles URL updates
      // We temporarily modify the document.dispatchEvent to add our event ID
      const originalDispatchEvent = document.dispatchEvent;
      document.dispatchEvent = function(event: Event) {
        if (event.type === 'open-widget-dialog') {
          // Add our event ID to the detail
          (event as CustomEvent).detail.eventId = eventId;
        }
        return originalDispatchEvent.call(document, event);
      };
      
      // Call the centralized function which will update the URL and dispatch the event
      openWidgetDialog(finalWidgetId, 'container');
      
      // Restore the original dispatchEvent
      document.dispatchEvent = originalDispatchEvent;
    } else {
      console.log('No widget ID or custom handler available');
    }
  };

  const handleExpand = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      // Get the current content of the widget
      const contentElement = containerRef.current.querySelector('.widget-content');
      if (!contentElement) return;

      const content = contentElement.innerHTML;
      
      // Create a styled HTML document for the popup
      const popoutContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>${title}</title>
            <style>
              :root {
                color-scheme: light dark;
              }
              body {
                margin: 0;
                padding: 16px;
                background: var(--background, white);
                color: var(--foreground, black);
                font-family: system-ui, -apple-system, sans-serif;
              }
              .widget-content {
                height: 100%;
                overflow: auto;
                background: var(--background);
                color: var(--foreground);
                border-radius: 8px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                padding: 1rem;
              }
              @media (prefers-color-scheme: dark) {
                body {
                  background: rgb(9, 9, 11);
                  color: rgb(250, 250, 250);
                }
              }
            </style>
          </head>
          <body>
            <div class="widget-content">${content}</div>
          </body>
        </html>
      `;

      const window = await createPopoutWindow({
        title,
        width: 600,
        height: 400,
        content: popoutContent,
      });

    } catch (error) {
      console.error('Failed to create popout window:', error);
    }
  }, [title]);

  const handleRemove = () => {
    console.log('Remove button clicked for widget:', title, 'onRemove function:', !!onRemove);
    
    // First try the onRemove prop if provided
    if (onRemove) {
      const result = onRemove();
      console.log('onRemove function result:', result);
    }
    
    // Always dispatch the widget-remove event as a backup
    // Find the closest grid-stack-item to get the widget ID
    const gridItem = containerRef.current?.closest('.grid-stack-item');
    const elementWidgetId = gridItem?.getAttribute('gs-id') || gridItem?.id || widgetId;
    
    if (elementWidgetId) {
      console.log('Dispatching widget-remove event for:', elementWidgetId);
      const event = new CustomEvent('widget-remove', {
        detail: { widgetId: elementWidgetId, id: elementWidgetId },
        bubbles: true,
        cancelable: true
      });
      document.dispatchEvent(event);
    } else {
      console.warn('Could not find widget ID for removal');
      // Try to find any ID attribute on parent elements
      const parentWithId = containerRef.current?.closest('[id]');
      if (parentWithId) {
        const fallbackId = parentWithId.id;
        console.log('Using fallback widget ID for removal:', fallbackId);
        const event = new CustomEvent('widget-remove', {
          detail: { widgetId: fallbackId, id: fallbackId },
          bubbles: true,
          cancelable: true
        });
        document.dispatchEvent(event);
      }
    }
  };

  // Render dropdown content based on widget type
  const renderTitleDropdownContent = () => {
    if (isMarketsWidget) {
      return (
        <>
          {/* All Markets option */}
          <DropdownMenuItem 
            onClick={() => saveActiveList(null)}
            className={activeList === null ? "bg-accent" : ""}
          >
            <Globe className="h-4 w-4 mr-2 opacity-70" />
            All Markets
          </DropdownMenuItem>
          
          {/* Custom lists */}
          {customLists.map(list => (
            <DropdownMenuSub key={list.id}>
              <DropdownMenuSubTrigger 
                className={activeList === list.id ? "bg-accent" : ""}
                onClick={() => saveActiveList(list.id)}
              >
                <ListChecks className="h-4 w-4 mr-2 opacity-70" />
                {list.name}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => handleRenameList(list.id)}>
                  <Edit className="h-4 w-4 mr-2 opacity-70" />
                  Rename List
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleDeleteList(list.id)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2 opacity-70" />
                  Delete List
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          ))}
          
          <DropdownMenuSeparator />
          
          {/* Create new list - inline form instead of modal */}
          <div className="p-2">
            <div className="flex items-center space-x-2">
              <Input 
                value={newListName} 
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="New list name..."
                className="h-8 text-xs"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newListName.trim() !== '') {
                    handleSaveNewList();
                    setTitleMenuOpen(false);
                  }
                }}
              />
              <Button 
                size="sm" 
                className="h-8 px-2"
                onClick={() => {
                  if (newListName.trim() !== '') {
                    handleSaveNewList();
                    setTitleMenuOpen(false);
                  }
                }}
                disabled={newListName.trim() === ''}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      );
    } else {
      // Default dropdown content for non-Markets widgets
      return (
        <>
          <DropdownMenuLabel>{title} Options</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleExpand}>
            <Maximize2 className="h-4 w-4 mr-2 opacity-70" />
            Expand Widget
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleRemove} className="text-destructive">
            <Trash2 className="h-4 w-4 mr-2 opacity-70" />
            Remove Widget
          </DropdownMenuItem>
        </>
      );
    }
  };

  // Determine effective widget ID for dialog rendering
  const effectiveWidgetId = widgetId || ((containerRef as any).current?.widgetId as string);

  return (
    <div ref={containerRef} className="grid-stack-item-content">
      <div className="widget-inner-container flex flex-col h-full">
        {/* Header */}
        <div className={cn(
          "widget-header flex items-center justify-between px-4 py-2 select-none flex-shrink-0",
          !isMobile && "cursor-move" // Only show move cursor on desktop
        )}>
          <div className="flex items-center space-x-2">
            <DropdownMenu open={titleMenuOpen} onOpenChange={setTitleMenuOpen}>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center cursor-pointer group">
                  <h2 key={title} className="text-sm font-semibold group-hover:text-primary">
                    {isMarketsWidget && activeList && activeListName 
                      ? activeListName
                      : title}
                  </h2>
                  <Button variant="ghost" size="icon" className="h-4 w-4 p-0 ml-1 hover:bg-transparent">
                    <ChevronDown className="h-4 w-4 opacity-50 group-hover:opacity-100" />
                  </Button>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {renderTitleDropdownContent()}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <div className="flex items-center space-x-1">
            {extraControls}
            {headerControls}
            <div className="flex items-center space-x-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {widgetMenu && (
                    <>
                      {widgetMenu}
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem onClick={handleExpand} title={`Expand widget ${isTauri ? 'to new window' : 'in browser'}`}>
                    <Maximize2 className="h-4 w-4 mr-2 opacity-50" />
                    <span>Popout</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleRemove} className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2 opacity-50" />
                    <span>Remove</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

          {/* Content wrapper */}
          <div className="widget-content flex-1 min-h-0 overflow-hidden pt-0 px-1 pb-1 select-text">
            {children}
          </div>
        </div>
      
      {/* Rename List Dialog */}
      <Dialog open={renameListDialogOpen} onOpenChange={setRenameListDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Rename List</DialogTitle>
            <DialogDescription>
              Enter a new name for your list.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="rename-list" className="text-right">
                List Name
              </Label>
              <Input 
                id="rename-list" 
                value={renameListName} 
                onChange={(e) => setRenameListName(e.target.value)}
                className="col-span-3"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveRenamedList();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setRenameListDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveRenamedList}
              disabled={renameListName.trim() === ''}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete List Dialog */}
      <AlertDialog open={deleteListDialogOpen} onOpenChange={setDeleteListDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this list and remove all assets from it.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteListId(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteList}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>

      {/* Widget Dialog - render only if we have an effective widget ID */}
      {(effectiveWidgetId || ((containerRef as any).current?.widgetId)) && (
        <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogContent className="DialogContent w-[var(--max-widget-width,1200px)] max-w-[95vw] h-[90vh] max-h-[90vh] p-0 overflow-hidden">
            <div className="flex flex-col h-full overflow-hidden">
              {/* Dialog Header */}
              <div className="widget-header flex items-center justify-between px-4 py-2 select-none flex-shrink-0">
                <div className="flex items-center space-x-2">
                  <h2 key={title} className="text-sm font-semibold">{title}</h2>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </div>
                
                <div className="flex items-center space-x-1">
                  {headerControls}
                </div>
              </div>

              {/* Dialog Content wrapper */}
              <div className="widget-content flex-1 min-h-0 overflow-auto pt-0 px-1 pb-1 select-text">
                {children}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}); 