import React from 'react';
import { Globe, ListChecks, Edit, Trash2, Plus } from '../../components/ui-icons';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '../ui/dropdown-menu';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '../ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { CustomList } from './useMarketsList';

// Dropdown menu for Markets lists
interface MarketsListMenuProps {
  customLists: CustomList[];
  activeList: string | null;
  newListName: string;
  onSaveActiveList: (listId: string | null) => void;
  onRenameList: (listId: string) => void;
  onDeleteList: (listId: string) => void;
  onNewListNameChange: (value: string) => void;
  onSaveNewList: () => void;
  onCloseMenu: () => void;
}

export function MarketsListMenu({
  customLists,
  activeList,
  newListName,
  onSaveActiveList,
  onRenameList,
  onDeleteList,
  onNewListNameChange,
  onSaveNewList,
  onCloseMenu
}: MarketsListMenuProps) {
  return (
    <>
      {/* All Markets option */}
      <DropdownMenuItem 
        onClick={() => onSaveActiveList(null)}
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
            onClick={() => onSaveActiveList(list.id)}
          >
            <ListChecks className="h-4 w-4 mr-2 opacity-70" />
            {list.name}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onClick={() => onRenameList(list.id)}>
              <Edit className="h-4 w-4 mr-2 opacity-70" />
              Rename List
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onDeleteList(list.id)}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2 opacity-70" />
              Delete List
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      ))}
      
      <DropdownMenuSeparator />
      
      {/* Create new list - inline form */}
      <div className="p-2">
        <div className="flex items-center space-x-2">
          <Input 
            value={newListName} 
            onChange={(e) => onNewListNameChange(e.target.value)}
            placeholder="New list name..."
            className="h-8 text-xs"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newListName.trim() !== '') {
                onSaveNewList();
                onCloseMenu();
              }
            }}
          />
          <Button 
            size="sm" 
            className="h-8 px-2"
            onClick={() => {
              if (newListName.trim() !== '') {
                onSaveNewList();
                onCloseMenu();
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
}

// Dialogs for list operations
interface RenameListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listName: string;
  onListNameChange: (value: string) => void;
  onSave: () => void;
}

export function RenameListDialog({
  open,
  onOpenChange,
  listName,
  onListNameChange,
  onSave
}: RenameListDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
              value={listName} 
              onChange={(e) => onListNameChange(e.target.value)}
              className="col-span-3"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onSave();
                }
              }}
            />
          </div>
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
            disabled={listName.trim() === ''}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface DeleteListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function DeleteListDialog({
  open,
  onOpenChange,
  onConfirm
}: DeleteListDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete this list and remove all assets from it.
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            className="bg-destructive hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
} 