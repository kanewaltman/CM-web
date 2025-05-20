import React, { useEffect, useState } from 'react';
import { ListButton, CustomList, ListManager } from './MarketLists';
import { ChevronDown } from 'lucide-react';

interface MarketsWidgetTitleProps {
  widgetId: string;
  onClick?: (e: React.MouseEvent) => void;
}

export const MarketsWidgetTitle: React.FC<MarketsWidgetTitleProps> = ({ 
  widgetId,
  onClick
}) => {
  const [customLists, setCustomLists] = useState<CustomList[]>([]);
  const [activeList, setActiveList] = useState<string | null>(null);
  const [activeListName, setActiveListName] = useState<string | null>(null);

  // Load custom lists and active list
  useEffect(() => {
    const lists = ListManager.getLists(widgetId);
    setCustomLists(lists);
    
    const listId = ListManager.getActiveListId(widgetId);
    setActiveList(listId);
    
    if (listId) {
      const list = lists.find(l => l.id === listId);
      setActiveListName(list?.name || null);
    }
    
    // Listen for list changes
    const handleListsUpdated = (event: CustomEvent) => {
      if (event.detail?.instanceId === 'all' || event.detail?.instanceId === widgetId) {
        setCustomLists(event.detail.lists);
      }
    };
    
    const handleActiveListChanged = (event: CustomEvent) => {
      if (event.detail?.instanceId === widgetId) {
        setActiveList(event.detail.listId);
        
        // Update active list name
        const lists = ListManager.getLists(widgetId);
        if (event.detail.listId) {
          const list = lists.find(l => l.id === event.detail.listId);
          setActiveListName(list?.name || null);
        } else {
          setActiveListName(null);
        }
      }
    };
    
    document.addEventListener('markets-lists-updated', handleListsUpdated as EventListener);
    document.addEventListener('markets-active-list-changed', handleActiveListChanged as EventListener);
    
    return () => {
      document.removeEventListener('markets-lists-updated', handleListsUpdated as EventListener);
      document.removeEventListener('markets-active-list-changed', handleActiveListChanged as EventListener);
    };
  }, [widgetId]);

  const handleActiveListChange = (listId: string | null) => {
    ListManager.setActiveListId(listId, widgetId);
  };

  return (
    <div className="flex items-center group">
      <h2 
        className="text-sm font-semibold bg-transparent border-0 p-0 m-0 cursor-pointer hover:text-primary transition-colors text-left"
        onClick={onClick}
        onMouseDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
        style={{
          userSelect: 'none',
          WebkitUserSelect: 'none',
          touchAction: 'none',
          outline: 'none'
        }}
      >
        {activeListName || 'Markets'}
      </h2>
      
      
      <ListButton
        widgetId={widgetId}
        activeList={activeList}
        activeListName={activeListName}
        customLists={customLists}
        onActiveListChange={handleActiveListChange}
      />
    </div>
  );
}; 