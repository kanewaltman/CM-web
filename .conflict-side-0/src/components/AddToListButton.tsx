import React, { useState } from 'react';
import { Button } from './ui/button';
import { ListManager, AssetListDialog } from './MarketsWidgetMenu';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger,
  DropdownMenuLabel
} from './ui/dropdown-menu';
import { Plus } from 'lucide-react';

interface AddToListButtonProps {
  asset: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  label?: string;
}

export const AddToListButton: React.FC<AddToListButtonProps> = ({
  asset,
  variant = 'outline',
  size = 'sm',
  className = '',
  label = 'Add to List'
}) => {
  const [showDialog, setShowDialog] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  // Get the active list and available lists
  const lists = ListManager.getLists();
  const activeListId = ListManager.getActiveListId();
  const activeList = activeListId ? lists.find(list => list.id === activeListId) : null;
  
  // Handle quick add to active list
  const handleAddToActiveList = () => {
    if (activeListId) {
      ListManager.addAssetToList(activeListId, asset);
      setDropdownOpen(false);
    }
  };
  
  // Handle quick remove from active list
  const handleRemoveFromActiveList = () => {
    if (activeListId) {
      ListManager.removeAssetFromList(activeListId, asset);
      setDropdownOpen(false);
    }
  };
  
  // If no lists exist yet, just show dialog directly
  if (lists.length === 0) {
    return (
      <>
        <Button 
          variant={variant} 
          size={size} 
          className={className}
          onClick={() => setShowDialog(true)}
        >
          {label}
        </Button>
        <AssetListDialog 
          open={showDialog}
          onOpenChange={setShowDialog}
          asset={asset}
        />
      </>
    );
  }
  
  // Otherwise, show dropdown with options
  return (
    <>
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button 
            variant={variant} 
            size={size} 
            className={className}
          >
            {label}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>List Options</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {/* Quick add/remove from active list */}
          {activeList && (
            <>
              {activeList.assets.includes(asset) ? (
                <DropdownMenuItem 
                  onClick={handleRemoveFromActiveList}
                  className="text-destructive"
                >
                  Remove from "{activeList.name}"
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={handleAddToActiveList}>
                  Add to "{activeList.name}"
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
            </>
          )}
          
          {/* Show all lists dialog */}
          <DropdownMenuItem onClick={() => {
            setShowDialog(true);
            setDropdownOpen(false);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Manage Lists...
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      <AssetListDialog 
        open={showDialog}
        onOpenChange={setShowDialog}
        asset={asset}
      />
    </>
  );
};
