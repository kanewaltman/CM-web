/**
 * MarketsWidgetMenu Component
 * 
 * This component is essential for the three-dot menu functionality in MarketsWidget.
 * It's responsible for rendering the column visibility controls directly in the widget's
 * dropdown menu, allowing users to toggle which columns are displayed in the table.
 * 
 * Key responsibilities:
 * - Safely accesses the table instance from the passed tableRef
 * - Conditionally renders column visibility controls only when a table exists
 * - Maintains proper dropdown menu structure with separators
 * - Encapsulates menu UI logic separate from the main widget
 * 
 * While this functionality could technically be inlined directly in WidgetRenderer.tsx,
 * having it as a separate component offers several advantages:
 * 1. It keeps WidgetRenderer focused on its core responsibility of rendering widgets
 * 2. It solves the challenge of accessing the table instance, which is managed in MarketsWidgetWrapper
 * 3. It follows the same component architecture pattern used throughout the app
 * 4. It improves maintainability by isolating table-related menu functionality
 *
 * This file is part of the widget component family that includes MarketsWidget,
 * MarketsWidgetHeader, and MarketsWidgetWrapper, each handling a specific aspect
 * of the widget's functionality.
 */

import React, { useState, useEffect } from 'react';
import { DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '../ui/dropdown-menu';
import { useReactTable } from '@tanstack/react-table';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { DialogClose } from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils';
import { 
  X,
  ChevronLeft, 
  ChevronRight, 
  FileCog, 
  Bell,
  Settings,
  Columns as ColumnsIcon,
  Plus as PlusIcon,
  Users,
  RefreshCw,
  Download,
  Share2,
  ArrowUpDown,
  ArrowDown,
  Eye,
  Rows3,
  Pin,
  Wallet,
  Zap,
  ChevronsLeftRight,
  MoreVertical 
} from 'lucide-react';

// LocalStorage keys for custom lists
const MARKETS_LISTS_KEY = 'markets-widget-custom-lists';
const ACTIVE_LIST_KEY = 'markets-widget-active-list';

// Interface for custom lists
interface CustomList {
  id: string;
  name: string;
  assets: string[];
}

export const MarketsWidgetMenu: React.FC<{
  tableRef?: React.RefObject<{ getTable: () => ReturnType<typeof useReactTable<any>> | null }>
}> = ({ tableRef }) => {
  return (
    <>
      <DropdownMenuItem onClick={() => {
        if (tableRef?.current) {
          const table = tableRef.current.getTable();
          if (table) {
            table.resetColumnFilters();
            table.resetGlobalFilter();
            table.resetColumnVisibility();
            
            // Refresh the table
            table.setColumnVisibility({...table.getState().columnVisibility});
          }
        }
      }}>
        Reset Filters
      </DropdownMenuItem>
    </>
  );
};

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
  
  // Add asset to list
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
  
  // Remove asset from list
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
}

// Component for Asset management dialog
export const AssetListDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: string;
  instanceId?: string;
}> = ({ open, onOpenChange, asset, instanceId = 'default' }) => {
  const [lists, setLists] = useState<CustomList[]>([]);
  
  // Load lists when dialog opens
  useEffect(() => {
    if (open) {
      setLists(ListManager.getLists(instanceId));
    }
  }, [open, instanceId]);
  
  // Helper function to check if an asset is in a list
  // It checks different possible formats of the same asset
  const isAssetInList = (list: CustomList, assetToCheck: string): boolean => {
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
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add {asset} to List</DialogTitle>
          <DialogDescription>
            Choose a list to add this asset to.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          {lists.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No custom lists available. Create one using the dropdown menu on the widget header.
            </div>
          ) : (
            <div className="space-y-2">
              {lists.map(list => (
                <div key={list.id} className="flex items-center justify-between p-2 border rounded-md">
                  <div>
                    <div className="font-medium">{list.name}</div>
                    <div className="text-xs text-muted-foreground">{list.assets.length} assets</div>
                  </div>
                  {isAssetInList(list, asset) ? (
                    <Button 
                      variant="outline"
                      className="text-destructive border-destructive"
                      onClick={() => {
                        ListManager.removeAssetFromList(list.id, asset, instanceId);
                        setLists(ListManager.getLists(instanceId));
                      }}
                    >
                      Remove
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        ListManager.addAssetToList(list.id, asset, instanceId);
                        setLists(ListManager.getLists(instanceId));
                      }}
                    >
                      Add
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 