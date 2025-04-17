import { ChevronDown, Maximize2, MoreHorizontal, Trash2, ListChecks, Plus, Edit, Globe, ListFilter } from '../components/ui-icons';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { useRef, useCallback, memo, useState, useEffect } from 'react';
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

interface WidgetContainerProps {
  children: React.ReactNode;
  title: string;
  headerControls?: React.ReactNode;
  extraControls?: React.ReactNode;
  onRemove?: () => void;
  isMobile?: boolean;
  widgetMenu?: React.ReactNode;
}

// LocalStorage key for saving custom lists
const MARKETS_LISTS_KEY = 'markets-widget-custom-lists';
const ACTIVE_LIST_KEY = 'markets-widget-active-list';

// Interfaces for the lists feature
interface CustomList {
  id: string;
  name: string;
  assets: string[];
}

export const WidgetContainer = memo(function WidgetContainer({ 
  children, 
  title, 
  headerControls, 
  extraControls,
  onRemove,
  isMobile = false,
  widgetMenu
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

  // Load custom lists from localStorage
  useEffect(() => {
    if (isMarketsWidget) {
      try {
        const savedLists = localStorage.getItem(MARKETS_LISTS_KEY);
        const savedActiveList = localStorage.getItem(ACTIVE_LIST_KEY);
        
        if (savedLists) {
          setCustomLists(JSON.parse(savedLists));
        }
        
        if (savedActiveList) {
          setActiveList(JSON.parse(savedActiveList));
        }
      } catch (error) {
        console.error('Error loading custom lists:', error);
      }
    }
  }, [isMarketsWidget]);

  // Save custom lists to localStorage
  const saveCustomLists = useCallback((lists: CustomList[]) => {
    try {
      localStorage.setItem(MARKETS_LISTS_KEY, JSON.stringify(lists));
      setCustomLists(lists);
      
      // Dispatch a custom event that the Markets widget can listen for
      const event = new CustomEvent('markets-lists-updated', {
        detail: { lists },
        bubbles: true
      });
      document.dispatchEvent(event);
    } catch (error) {
      console.error('Error saving custom lists:', error);
    }
  }, []);

  // Save active list to localStorage
  const saveActiveList = useCallback((listId: string | null) => {
    try {
      localStorage.setItem(ACTIVE_LIST_KEY, JSON.stringify(listId));
      setActiveList(listId);
      
      // Dispatch a custom event that the Markets widget can listen for
      const event = new CustomEvent('markets-active-list-changed', {
        detail: { listId, lists: customLists },
        bubbles: true
      });
      document.dispatchEvent(event);
    } catch (error) {
      console.error('Error saving active list:', error);
    }
  }, [customLists]);

  // Handle creating a new list
  const handleCreateList = () => {
    setNewListName('');
  };
  
  // Handle saving a new list
  const handleSaveNewList = () => {
    if (newListName.trim()) {
      const newList: CustomList = {
        id: `list-${Date.now()}`,
        name: newListName.trim(),
        assets: []
      };
      
      const updatedLists = [...customLists, newList];
      setCustomLists(updatedLists);
      
      // Store in localStorage
      localStorage.setItem('markets-widget-custom-lists', JSON.stringify(updatedLists));
      
      // Set as active list
      saveActiveList(newList.id);
      
      // Reset state and close dialog
      setNewListName('');
      
      // Dispatch event
      const event = new CustomEvent('markets-lists-updated', {
        detail: { lists: updatedLists },
        bubbles: true
      });
      document.dispatchEvent(event);
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
  const handleSaveRenamedList = useCallback(() => {
    if (renameListName.trim() === '') return;
    
    const updatedLists = customLists.map(list => 
      list.id === renameListId ? { ...list, name: renameListName.trim() } : list
    );
    
    saveCustomLists(updatedLists);
    
    // Reset and close dialog
    setRenameListId(null);
    setRenameListName('');
    setRenameListDialogOpen(false);
  }, [renameListId, renameListName, customLists, saveCustomLists]);

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
    const widgetId = gridItem?.getAttribute('gs-id') || gridItem?.id;
    
    if (widgetId) {
      console.log('Dispatching widget-remove event for:', widgetId);
      const event = new CustomEvent('widget-remove', {
        detail: { widgetId, id: widgetId },
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
      const activeListName = activeList 
        ? customLists.find(list => list.id === activeList)?.name || 'All Markets'
        : 'All Markets';
        
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
                {list.name} ({list.assets.length})
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
                    {isMarketsWidget && activeList 
                      ? (customLists.find(list => list.id === activeList)?.name || 'Markets') 
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
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={handleExpand}
                title={`Expand widget ${isTauri ? 'to new window' : 'in browser'}`}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
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
                  <DropdownMenuItem onClick={handleRemove} className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2 opacity-50" />
                    <span>Remove Widget</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Content wrapper */}
        <div className="widget-content flex-1 min-h-0 overflow-hidden pt-0 px-1 select-text">
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
  );
}); 