import { useState, useCallback, useEffect } from 'react';

// Types
export interface CustomList {
  id: string;
  name: string;
  assets: string[];
}

// LocalStorage keys
const MARKETS_LISTS_KEY = 'markets-widget-custom-lists';
const ACTIVE_LIST_KEY = 'markets-widget-active-list';

export function useMarketsList(widgetId: string) {
  const [customLists, setCustomLists] = useState<CustomList[]>([]);
  const [activeList, setActiveList] = useState<string | null>(null);
  const [activeListName, setActiveListName] = useState<string | null>(null);
  
  // State for list operations
  const [newListName, setNewListName] = useState('');
  const [renameListId, setRenameListId] = useState<string | null>(null);
  const [renameListName, setRenameListName] = useState('');
  const [renameListDialogOpen, setRenameListDialogOpen] = useState(false);
  const [deleteListId, setDeleteListId] = useState<string | null>(null);
  const [deleteListDialogOpen, setDeleteListDialogOpen] = useState(false);

  // Function to update the active list name
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

  // Load custom lists from localStorage
  useEffect(() => {
    try {
      // Get lists from global storage
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
      if (!activeList) {
        const storedActiveList = localStorage.getItem(`${ACTIVE_LIST_KEY}-${widgetId}`);
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
  }, [widgetId, activeList, updateActiveListName]);

  // Save custom lists to localStorage
  const saveCustomLists = useCallback((lists: CustomList[]) => {
    try {
      // Save lists globally
      localStorage.setItem(MARKETS_LISTS_KEY, JSON.stringify(lists));
      setCustomLists(lists);
      
      // Dispatch a custom event that all Markets widgets can listen for
      const event = new CustomEvent('markets-lists-updated', {
        detail: { 
          lists,
          instanceId: 'all' 
        },
        bubbles: true
      });
      document.dispatchEvent(event);
      
      console.log(`[useMarketsList] Widget ${widgetId} saved global lists (${lists.length} lists)`);
    } catch (error) {
      console.error('Error saving custom lists:', error);
    }
  }, [widgetId]);

  // Save active list to localStorage
  const saveActiveList = useCallback((listId: string | null) => {
    try {
      console.log(`[useMarketsList] Setting active list for widget ${widgetId}:`, listId);
      
      // Save active list with instance ID
      localStorage.setItem(`${ACTIVE_LIST_KEY}-${widgetId}`, JSON.stringify(listId));
      setActiveList(listId);
      
      // Update the active list name for the widget title
      updateActiveListName(listId, customLists);
      
      // Dispatch a custom event for this widget instance
      const event = new CustomEvent('markets-active-list-changed', {
        detail: { 
          listId, 
          instanceId: widgetId,
          timestamp: Date.now()
        },
        bubbles: true
      });
      document.dispatchEvent(event);
    } catch (error) {
      console.error('Error saving active list:', error);
    }
  }, [widgetId, customLists, updateActiveListName]);

  // Handle creating a new list
  const handleCreateList = () => {
    setNewListName('');
  };
  
  // Save a new list
  const handleSaveNewList = () => {
    if (newListName.trim()) {
      console.log(`[useMarketsList] Creating new list "${newListName}" for widget ${widgetId}`);
      
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
      localStorage.setItem(`${ACTIVE_LIST_KEY}-${widgetId}`, JSON.stringify(newList.id));
      setActiveList(newList.id);
      
      // Reset state
      setNewListName('');
      
      // Dispatch events
      const listsEvent = new CustomEvent('markets-lists-updated', {
        detail: { 
          lists: updatedLists,
          instanceId: 'all'
        },
        bubbles: true
      });
      document.dispatchEvent(listsEvent);
      
      const activeEvent = new CustomEvent('markets-active-list-changed', {
        detail: { 
          listId: newList.id,
          instanceId: widgetId
        },
        bubbles: true
      });
      document.dispatchEvent(activeEvent);
      
      console.log(`[useMarketsList] New list created and active list set to ${newList.id} for widget ${widgetId}`);
      return true;
    }
    return false;
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

  // Rename a list
  const handleRenameList = useCallback((listId: string) => {
    const currentList = customLists.find(list => list.id === listId);
    if (currentList) {
      setRenameListId(listId);
      setRenameListName(currentList.name);
      setRenameListDialogOpen(true);
    }
  }, [customLists]);
  
  // Save the renamed list
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

  return {
    // State
    customLists,
    activeList,
    activeListName,
    newListName,
    renameListId,
    renameListName,
    renameListDialogOpen,
    deleteListId,
    deleteListDialogOpen,
    
    // Setters
    setNewListName,
    setRenameListDialogOpen,
    setDeleteListDialogOpen,
    setRenameListName,
    
    // Functions
    handleCreateList,
    handleSaveNewList,
    handleDeleteList,
    confirmDeleteList,
    handleRenameList,
    handleSaveRenamedList,
    saveActiveList
  };
} 