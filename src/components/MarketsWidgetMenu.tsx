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

import React from 'react';
import { useReactTable } from '@tanstack/react-table';
import { MarketsWidgetColumnVisibility } from './MarketsWidget';
import { DropdownMenuSeparator, DropdownMenuLabel } from './ui/dropdown-menu';

interface MarketsWidgetMenuProps {
  tableRef: React.RefObject<{ getTable: () => ReturnType<typeof useReactTable<any>> | null }>;
}

export const MarketsWidgetMenu: React.FC<MarketsWidgetMenuProps> = ({ tableRef }) => {
  // Safely attempt to get the table instance, which may not exist yet on initial render
  const table = tableRef.current?.getTable() ?? null;
  
  // If no table instance is available, just render a separator to avoid errors
  if (!table) {
    return <DropdownMenuSeparator />;
  }

  // Render column visibility controls directly in the dropdown menu
  return (
    <>
      <MarketsWidgetColumnVisibility table={table} />
      <DropdownMenuSeparator />
    </>
  );
}; 