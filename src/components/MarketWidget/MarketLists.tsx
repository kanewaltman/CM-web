/**
 * Market Lists Management System
 * 
 * This module provides a centralized system for managing custom market lists.
 * It handles:
 * - Creating and managing custom asset lists
 * - Persisting lists to localStorage
 * - Managing active list selection
 * - Cross-component communication via events
 * 
 * The system supports multiple widget instances by tracking instance-specific active lists
 * while maintaining globally shared list definitions.
 */

import React from 'react';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Input } from '../ui/input';
import {
  ListChecks,
  Plus,
  Edit,
  Trash2,
  Check,
  X
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '../ui/dialog';

// LocalStorage keys for custom lists
const MARKETS_LISTS_KEY = 'markets-widget-custom-lists';
const ACTIVE_LIST_KEY = 'markets-widget-active-list';

// Interface for custom lists
export interface CustomList {
  id: string;
  name: string;
  assets: string[];
}

// Additional interfaces for asset formatting
export interface MarketDataAsset {
  baseAsset: string;
  quoteAsset: string;
  [key: string]: any; // Allow for other properties
}

// Event types for TypeScript
declare global {
  interface WindowEventMap {
    'markets-lists-updated': CustomEvent<{ lists: CustomList[], instanceId: string }>;
    'markets-active-list-changed': CustomEvent<{ listId: string | null, instanceId: string, timestamp: number }>;
    'asset-added-to-list': CustomEvent<{ asset: string, listId: string, instanceId: string }>;
    'asset-removed-from-list': CustomEvent<{ asset: string, listId: string, instanceId: string }>;
  }
}

// Utility class for managing lists
export class ListManager {
  // Load custom lists from localStorage
  static getLists(instanceId: string = 'default'): CustomList[] {
    try {
      // Lists are stored globally (without instance ID)
      const savedLists = localStorage.getItem(MARKETS_LISTS_KEY);
      return savedLists ? JSON.parse(savedLists) : [];
    } catch (error) {
      console.error('Error loading custom lists:', error);
      return [];
    }
  }
  
  // Save custom lists to localStorage
  static saveLists(lists: CustomList[], instanceId: string = 'default'): void {
    try {
      // Save lists globally (without instance ID)
      localStorage.setItem(MARKETS_LISTS_KEY, JSON.stringify(lists));
      
      // Dispatch event for other components
      const event = new CustomEvent('markets-lists-updated', {
        detail: { 
          lists,
          instanceId: 'all' // Signal update to all widgets
        },
        bubbles: true
      });
      document.dispatchEvent(event);
    } catch (error) {
      console.error('Error saving custom lists:', error);
    }
  }
  
  // Get active list ID
  static getActiveListId(instanceId: string = 'default'): string | null {
    try {
      // Each widget instance has its own active list
      const key = `${ACTIVE_LIST_KEY}-${instanceId}`;
      const saved = localStorage.getItem(key);
      
      // Debug logging
      console.log(`[ListManager] Getting active list for widget ${instanceId}:`, saved ? JSON.parse(saved) : null);
      
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.error('Error getting active list:', error);
      return null;
    }
  }
  
  // Set active list ID
  static setActiveListId(listId: string | null, instanceId: string = 'default'): void {
    try {
      console.log(`[ListManager] Setting active list for widget ${instanceId}:`, listId);
      
      // Active list is per widget instance
      const key = `${ACTIVE_LIST_KEY}-${instanceId}`;
      localStorage.setItem(key, JSON.stringify(listId));
      
      // Dispatch event for other components - IMPORTANT: This should only affect the specific widget
      const event = new CustomEvent('markets-active-list-changed', {
        detail: { 
          listId,
          instanceId, // Must match the specific instance
          timestamp: Date.now() // Add timestamp to ensure event uniqueness
        },
        bubbles: true
      });
      document.dispatchEvent(event);
    } catch (error) {
      console.error('Error saving active list:', error);
    }
  }
  
  // Format asset string with market data
  static formatAssetWithMarketData(asset: string, marketData: MarketDataAsset[]): string {
    // If already formatted (contains a separator), return as is
    if (asset.includes(':') || asset.includes('/')) {
      return asset;
    }
    
    // Find the market data for this asset
    const marketItem = marketData.find(item => item.baseAsset === asset);
    if (marketItem) {
      return `${marketItem.baseAsset}:${marketItem.quoteAsset}`;
    }
    
    return asset;
  }
  
  // Add asset to list with enhanced formatting
  static addAssetToListWithMarketData(
    listId: string, 
    asset: string, 
    marketData: MarketDataAsset[],
    instanceId: string = 'default',
    onListsUpdated?: (lists: CustomList[]) => void
  ): void {
    // Format the asset
    const formattedAsset = this.formatAssetWithMarketData(asset, marketData);
    
    // Use the base method to add the asset
    this.addAssetToList(listId, formattedAsset, instanceId);
    
    // If a callback was provided, update with the latest lists
    if (onListsUpdated) {
      const updatedLists = this.getLists();
      onListsUpdated(updatedLists);
    }
  }
  
  // Basic add asset to list (already in MarketLists.ts)
  static addAssetToList(listId: string, asset: string, instanceId: string = 'default'): void {
    // Get global lists
    const lists = this.getLists();
    const updatedLists = lists.map(list => {
      if (list.id === listId && !list.assets.includes(asset)) {
        return {
          ...list,
          assets: [...list.assets, asset]
        };
      }
      return list;
    });
    
    // Save globally but notify the widget that made the change
    this.saveLists(updatedLists, instanceId);
    
    // Dispatch custom event instead of showing alert
    const event = new CustomEvent('asset-added-to-list', {
      detail: { 
        asset, 
        listId,
        instanceId
      },
      bubbles: true
    });
    document.dispatchEvent(event);
  }
  
  // Remove asset from list with enhanced handling of different formats
  static removeAssetFromListWithMarketData(
    listId: string, 
    asset: string, 
    marketData: MarketDataAsset[],
    instanceId: string = 'default',
    onListsUpdated?: (lists: CustomList[]) => void,
    activeListId?: string | null,
    onFilteredDataUpdate?: (baseAsset: string, quoteAsset: string) => void
  ): void {
    console.log(`[ListManager] Removing asset "${asset}" from list "${listId}"`);
    
    try {
      // Format the asset
      const formattedAsset = this.formatAssetWithMarketData(asset, marketData);
      
      // Get all lists
      const lists = this.getLists();
      
      // Update lists with more robust asset filtering to handle different formats
      const updatedLists = lists.map(list => {
        if (list.id === listId) {
          return {
            ...list,
            assets: list.assets.filter(a => 
              a !== formattedAsset && 
              a !== asset && 
              a !== formattedAsset.replace(':', '/') && 
              a !== formattedAsset.replace('/', ':')
            )
          };
        }
        return list;
      });
      
      // Save lists to localStorage and dispatch global update event
      this.saveLists(updatedLists, instanceId);
      
      // If a callback was provided, update with the latest lists
      if (onListsUpdated) {
        onListsUpdated(updatedLists);
      }
      
      // If active list is the one being modified, update filtered data immediately
      if (activeListId === listId && onFilteredDataUpdate && (formattedAsset.includes(':') || formattedAsset.includes('/'))) {
        const separator = formattedAsset.includes(':') ? ':' : '/';
        const [baseAsset, quoteAsset] = formattedAsset.split(separator);
        onFilteredDataUpdate(baseAsset, quoteAsset);
      }
    } catch (error) {
      console.error('[ListManager] Error removing asset from list:', error);
    }
  }
  
  // Basic remove asset from list (original implementation)
  static removeAssetFromList(listId: string, asset: string, instanceId: string = 'default'): void {
    // Get global lists
    const lists = this.getLists();
    const updatedLists = lists.map(list => {
      if (list.id === listId) {
        return {
          ...list,
          assets: list.assets.filter(a => a !== asset)
        };
      }
      return list;
    });
    
    // Save globally but notify the widget that made the change
    this.saveLists(updatedLists, instanceId);
    
    // Dispatch custom event instead of showing alert
    const event = new CustomEvent('asset-removed-from-list', {
      detail: { 
        asset, 
        listId,
        instanceId
      },
      bubbles: true
    });
    document.dispatchEvent(event);
  }
  
  // Helper function to check if an asset is in a list
  // It checks different possible formats of the same asset
  static isAssetInList(list: CustomList, assetToCheck: string): boolean {
    if (list.assets.includes(assetToCheck)) return true;
    
    // Check if this is a base asset (without quote) and find any format in the list
    if (!assetToCheck.includes(':') && !assetToCheck.includes('/')) {
      return list.assets.some(listAsset => 
        listAsset.startsWith(`${assetToCheck}:`) || 
        listAsset.startsWith(`${assetToCheck}/`)
      );
    }
    
    // Check if list contains the same asset in different formats
    if (assetToCheck.includes(':')) {
      const [base, quote] = assetToCheck.split(':');
      return list.assets.includes(`${base}/${quote}`) || list.assets.includes(base);
    }
    
    if (assetToCheck.includes('/')) {
      const [base, quote] = assetToCheck.split('/');
      return list.assets.includes(`${base}:${quote}`) || list.assets.includes(base);
    }
    
    return false;
  }
  
  // Create a new custom list
  static createList(name: string, instanceId: string = 'default'): string {
    const lists = this.getLists();
    const newId = `list-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    const newList: CustomList = {
      id: newId,
      name,
      assets: []
    };
    
    this.saveLists([...lists, newList], instanceId);
    return newId;
  }
  
  // Delete a custom list
  static deleteList(listId: string, instanceId: string = 'default'): void {
    const lists = this.getLists();
    const updatedLists = lists.filter(list => list.id !== listId);
    
    // If this was the active list, clear it
    if (this.getActiveListId(instanceId) === listId) {
      this.setActiveListId(null, instanceId);
    }
    
    this.saveLists(updatedLists, instanceId);
  }
  
  // Rename a custom list
  static renameList(listId: string, newName: string, instanceId: string = 'default'): void {
    const lists = this.getLists();
    const updatedLists = lists.map(list => {
      if (list.id === listId) {
        return {
          ...list,
          name: newName
        };
      }
      return list;
    });
    
    this.saveLists(updatedLists, instanceId);
  }
}

// Additional utility functions for formatting asset pairs consistently
export const formatAssetPair = (baseAsset: string, quoteAsset: string, format: 'colon' | 'slash' = 'colon'): string => {
  return format === 'colon' ? `${baseAsset}:${quoteAsset}` : `${baseAsset}/${quoteAsset}`;
};

export const parseAssetPair = (pair: string): { baseAsset: string, quoteAsset: string } | null => {
  if (pair.includes(':')) {
    const [baseAsset, quoteAsset] = pair.split(':');
    return { baseAsset, quoteAsset };
  } else if (pair.includes('/')) {
    const [baseAsset, quoteAsset] = pair.split('/');
    return { baseAsset, quoteAsset };
  }
  return null;
};

// List Menu Component
export interface MarketsListMenuProps {
  customLists: CustomList[];
  activeList: string | null;
  newListName: string;
  onSaveActiveList: (listId: string | null) => void;
  onRenameList: (listId: string) => void;
  onDeleteList: (listId: string) => void;
  onNewListNameChange: (value: string) => void;
  onSaveNewList: () => boolean;
  onCloseMenu: () => void;
}

export const MarketsListMenu: React.FC<MarketsListMenuProps> = ({
  customLists,
  activeList,
  newListName,
  onSaveActiveList,
  onRenameList,
  onDeleteList,
  onNewListNameChange,
  onSaveNewList,
  onCloseMenu
}) => {
  return (
    <>
      <DropdownMenuLabel>Lists</DropdownMenuLabel>
      <DropdownMenuSeparator />
      
      {/* Show All Markets option */}
      <DropdownMenuItem 
        className="flex items-center justify-between"
        onClick={() => {
          onSaveActiveList(null);
          onCloseMenu();
        }}
      >
        <span>All Markets</span>
        {activeList === null && <Check className="h-4 w-4 ml-2" />}
      </DropdownMenuItem>
      
      <DropdownMenuSeparator />
      
      {/* Custom Lists */}
      {customLists.length > 0 && (
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs opacity-70">Custom Lists</DropdownMenuLabel>
          {customLists.map(list => (
            <DropdownMenuItem
              key={list.id}
              className="flex items-center justify-between group"
              onClick={() => {
                onSaveActiveList(list.id);
                onCloseMenu();
              }}
            >
              <span>{list.name}</span>
              <div className="flex items-center">
                {activeList === list.id && <Check className="h-4 w-4 mr-2" />}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRenameList(list.id);
                  }}
                >
                  <Edit className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteList(list.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      )}
      
      <DropdownMenuSeparator />
      
      {/* Create New List */}
      <div className="p-2">
        <div className="flex items-center gap-2">
          <Input
            placeholder="New list name..."
            value={newListName}
            onChange={(e) => onNewListNameChange(e.target.value)}
            className="h-8 text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const success = onSaveNewList();
                if (success) onCloseMenu();
              }
            }}
          />
          <Button 
            size="sm" 
            className="h-8 px-3"
            onClick={() => {
              const success = onSaveNewList();
              if (success) onCloseMenu();
            }}
            disabled={!newListName.trim()}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
      </div>
    </>
  );
};

// Rename List Dialog
export interface RenameListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listName: string;
  onListNameChange: (value: string) => void;
  onSave: () => void;
}

export const RenameListDialog: React.FC<RenameListDialogProps> = ({
  open,
  onOpenChange,
  listName,
  onListNameChange,
  onSave
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Rename List</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <Input
            value={listName}
            onChange={(e) => onListNameChange(e.target.value)}
            placeholder="List name"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onSave();
              }
            }}
          />
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button 
            onClick={onSave}
            disabled={!listName.trim()}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Delete List Dialog
export interface DeleteListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export const DeleteListDialog: React.FC<DeleteListDialogProps> = ({
  open,
  onOpenChange,
  onConfirm
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Delete List</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <p>Are you sure you want to delete this list? This action cannot be undone.</p>
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button 
            variant="destructive"
            onClick={onConfirm}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Component for the list button that appears next to the widget title
export interface ListButtonProps {
  widgetId: string;
  activeList: string | null;
  activeListName: string | null;
  customLists: CustomList[];
  onActiveListChange: (listId: string | null) => void;
}

export const ListButton: React.FC<ListButtonProps> = ({
  widgetId,
  activeList,
  activeListName,
  customLists,
  onActiveListChange
}) => {
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const [newListName, setNewListName] = React.useState('');
  const [renameListName, setRenameListName] = React.useState('');
  const [renameListDialogOpen, setRenameListDialogOpen] = React.useState(false);
  const [renameListId, setRenameListId] = React.useState<string | null>(null);
  const [deleteListDialogOpen, setDeleteListDialogOpen] = React.useState(false);
  const [deleteListId, setDeleteListId] = React.useState<string | null>(null);

  const handleSaveNewList = () => {
    if (newListName.trim()) {
      const newList: CustomList = {
        id: `list-${Date.now()}`,
        name: newListName.trim(),
        assets: []
      };
      
      const updatedLists = [...customLists, newList];
      ListManager.saveLists(updatedLists, widgetId);
      ListManager.setActiveListId(newList.id, widgetId);
      setNewListName('');
      return true;
    }
    return false;
  };

  const handleRenameList = (listId: string) => {
    const list = customLists.find(l => l.id === listId);
    if (list) {
      setRenameListId(listId);
      setRenameListName(list.name);
      setRenameListDialogOpen(true);
    }
  };

  const handleSaveRenamedList = () => {
    if (!renameListId || !renameListName.trim()) return;
    
    const updatedLists = customLists.map(list => {
      if (list.id === renameListId) {
        return { ...list, name: renameListName.trim() };
      }
      return list;
    });
    
    ListManager.saveLists(updatedLists, widgetId);
    setRenameListDialogOpen(false);
  };

  const handleDeleteList = (listId: string) => {
    setDeleteListId(listId);
    setDeleteListDialogOpen(true);
  };

  const confirmDeleteList = () => {
    if (!deleteListId) return;
    
    const updatedLists = customLists.filter(list => list.id !== deleteListId);
    ListManager.saveLists(updatedLists, widgetId);
    
    if (activeList === deleteListId) {
      ListManager.setActiveListId(null, widgetId);
    }
    
    setDeleteListDialogOpen(false);
  };

  return (
    <>
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 ml-1 px-2 py-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center"
          >
            <ListChecks className="h-3.5 w-3.5 opacity-70 mr-1" />
            <span className="text-xs">Lists</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <MarketsListMenu
            customLists={customLists}
            activeList={activeList}
            newListName={newListName}
            onSaveActiveList={onActiveListChange}
            onRenameList={handleRenameList}
            onDeleteList={handleDeleteList}
            onNewListNameChange={setNewListName}
            onSaveNewList={handleSaveNewList}
            onCloseMenu={() => setDropdownOpen(false)}
          />
        </DropdownMenuContent>
      </DropdownMenu>

      <RenameListDialog
        open={renameListDialogOpen}
        onOpenChange={setRenameListDialogOpen}
        listName={renameListName}
        onListNameChange={setRenameListName}
        onSave={handleSaveRenamedList}
      />

      <DeleteListDialog
        open={deleteListDialogOpen}
        onOpenChange={setDeleteListDialogOpen}
        onConfirm={confirmDeleteList}
      />
    </>
  );
}; 