import React, { useEffect } from 'react';
import { WidgetContainer } from './WidgetContainer';
import { WidgetDialog } from './WidgetDialog';
import { useWidgetDialog } from '@/lib/widgetDialogService';

interface EnhancedWidgetContainerProps {
  children: React.ReactNode;
  title: string;
  headerControls?: React.ReactNode;
  extraControls?: React.ReactNode;
  onRemove?: () => void;
  isMobile?: boolean;
  widgetId: string;
}

export function EnhancedWidgetContainer({
  children,
  title,
  headerControls,
  extraControls,
  onRemove,
  isMobile,
  widgetId
}: EnhancedWidgetContainerProps) {
  const { isOpen, setIsOpen } = useWidgetDialog(widgetId);

  // Handler for title click to open dialog
  const handleTitleClick = (e: React.MouseEvent) => {
    // Prevent click from triggering drag behavior
    e.stopPropagation();
    setIsOpen(true);
  };

  // Listen for open-widget-dialog event
  useEffect(() => {
    const handleOpenDialog = (e: CustomEvent) => {
      if (e.detail?.widgetId === widgetId) {
        setIsOpen(true);
      }
    };

    const handleCloseDialogs = () => {
      setIsOpen(false);
    };

    // TypeScript needs type assertion for CustomEvent
    document.addEventListener('open-widget-dialog', handleOpenDialog as EventListener);
    document.addEventListener('close-widget-dialogs', handleCloseDialogs);

    return () => {
      document.removeEventListener('open-widget-dialog', handleOpenDialog as EventListener);
      document.removeEventListener('close-widget-dialogs', handleCloseDialogs);
    };
  }, [widgetId, setIsOpen]);

  // Wrap the original title with a clickable element
  const enhancedTitle = (
    <div 
      className="cursor-pointer hover:text-primary transition-colors" 
      onClick={handleTitleClick}
    >
      {title}
    </div>
  );

  return (
    <>
      <WidgetContainer
        title={title}
        headerControls={headerControls}
        extraControls={extraControls}
        onRemove={onRemove}
        isMobile={isMobile}
        titleClickHandler={handleTitleClick}
      >
        {children}
      </WidgetContainer>

      <WidgetDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        title={title}
        headerControls={headerControls}
        widgetId={widgetId}
      >
        {children}
      </WidgetDialog>
    </>
  );
} 