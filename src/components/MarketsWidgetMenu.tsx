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
import { DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from './ui/dropdown-menu';
import { useReactTable } from '@tanstack/react-table';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { DialogClose } from '@radix-ui/react-dialog';

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
        // Export to CSV functionality
        if (tableRef?.current) {
          const table = tableRef.current.getTable();
          if (table) {
            const rows = table.getFilteredRowModel().rows;
            const headers = table.getAllColumns()
              .filter(column => column.getIsVisible())
              .map(column => column.id);
            
            const csvData = rows.map(row => {
              return headers.map(header => {
                const value = row.getValue(header);
                return typeof value === 'string' ? `"${value}"` : value;
              }).join(',');
            });
            
            const csvString = [
              headers.join(','),
              ...csvData
            ].join('\n');
            
            // Create blob and download
            const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', 'markets-data.csv');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
        }
      }}>
        Export to CSV
      </DropdownMenuItem>
      
      <DropdownMenuSeparator />
      
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
  static getLists(): CustomList[] {
    try {
      const savedLists = localStorage.getItem(MARKETS_LISTS_KEY);
      return savedLists ? JSON.parse(savedLists) : [];
    } catch (error) {
      console.error('Error loading custom lists:', error);
      return [];
    }
  }
  
  // Save custom lists to localStorage
  static saveLists(lists: CustomList[]): void {
    try {
      localStorage.setItem(MARKETS_LISTS_KEY, JSON.stringify(lists));
      
      // Dispatch event for other components
      const event = new CustomEvent('markets-lists-updated', {
        detail: { lists },
        bubbles: true
      });
      document.dispatchEvent(event);
    } catch (error) {
      console.error('Error saving custom lists:', error);
    }
  }
  
  // Get active list ID
  static getActiveListId(): string | null {
    try {
      const savedActiveList = localStorage.getItem(ACTIVE_LIST_KEY);
      return savedActiveList ? JSON.parse(savedActiveList) : null;
    } catch (error) {
      console.error('Error loading active list:', error);
      return null;
    }
  }
  
  // Set active list ID
  static setActiveListId(listId: string | null): void {
    try {
      localStorage.setItem(ACTIVE_LIST_KEY, JSON.stringify(listId));
      
      // Dispatch event for other components
      const event = new CustomEvent('markets-active-list-changed', {
        detail: { listId },
        bubbles: true
      });
      document.dispatchEvent(event);
    } catch (error) {
      console.error('Error saving active list:', error);
    }
  }
  
  // Add asset to list
  static addAssetToList(listId: string, asset: string): void {
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
    
    this.saveLists(updatedLists);
    
    // Dispatch custom event instead of showing alert
    const event = new CustomEvent('asset-added-to-list', {
      detail: { asset, listId },
      bubbles: true
    });
    document.dispatchEvent(event);
  }
  
  // Remove asset from list
  static removeAssetFromList(listId: string, asset: string): void {
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
    
    this.saveLists(updatedLists);
    
    // Dispatch custom event instead of showing alert
    const event = new CustomEvent('asset-removed-from-list', {
      detail: { asset, listId },
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
}> = ({ open, onOpenChange, asset }) => {
  const [lists, setLists] = useState<CustomList[]>([]);
  
  // Load lists when dialog opens
  useEffect(() => {
    if (open) {
      setLists(ListManager.getLists());
    }
  }, [open]);
  
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
                  {list.assets.includes(asset) ? (
                    <Button 
                      variant="outline"
                      className="text-destructive border-destructive"
                      onClick={() => {
                        ListManager.removeAssetFromList(list.id, asset);
                        setLists(ListManager.getLists());
                      }}
                    >
                      Remove
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        ListManager.addAssetToList(list.id, asset);
                        setLists(ListManager.getLists());
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