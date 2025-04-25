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
import { ListManager, CustomList } from './MarketLists';
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
                  {ListManager.isAssetInList(list, asset) ? (
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
          <Button 
            variant="outline" 
            onClick={() => {
              const listName = prompt('Enter a name for your new list:');
              if (listName?.trim()) {
                const newListId = ListManager.createList(listName, instanceId);
                // Add the asset to the new list
                ListManager.addAssetToList(newListId, asset, instanceId);
                // Refresh the list
                setLists(ListManager.getLists(instanceId));
              }
            }}
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            Create New List
          </Button>
          <DialogClose asChild>
            <Button>Done</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 