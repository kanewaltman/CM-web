import React, { useState, useEffect, useRef, useLayoutEffect, useMemo } from 'react';
import {
  ColumnDef,
  ColumnFiltersState,
  FilterFn,
  flexRender,
  getCoreRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  PaginationState,
  Row,
  SortingState,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table";
import {
  ChevronDownIcon,
  ChevronFirstIcon,
  ChevronLastIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  AlertCircle,
  XCircle,
  Columns3Icon,
  MoreHorizontal,
  FilterIcon,
  ListFilterIcon,
  PlusIcon,
  TrashIcon,
  FileDownIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { RemovableWidgetProps } from '@/types/widgets';
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
} from "@/components/ui/alert-dialog";
import { Badge, SortableBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDataSource } from '@/lib/DataSourceContext';
import { AssetPriceTooltip } from './AssetPriceTooltip';
import { ASSETS, AssetTicker, isAssetTicker } from '@/assets/AssetTicker';
import { useTheme } from 'next-themes';

type Transaction = {
  id: string;
  date: string;
  asset: string;
  type: "Deposit" | "Withdrawal" | "Trade" | "Staking";
  amount: number;
  status: "Completed" | "Pending" | "Failed";
  fee?: number;
};

// Custom filter function for multi-column searching
const multiColumnFilterFn: FilterFn<Transaction> = (row, columnId, filterValue) => {
  const searchableRowContent =
    `${row.original.asset} ${row.original.type} ${row.original.date}`.toLowerCase();
  const searchTerm = (filterValue ?? "").toLowerCase();
  return searchableRowContent.includes(searchTerm);
};

// Asset filter function that supports multi-selection
const assetFilterFn: FilterFn<Transaction> = (
  row,
  columnId,
  filterValue: string[]
) => {
  if (!filterValue?.length) return true;
  const asset = row.getValue(columnId) as string;
  return filterValue.includes(asset);
};

const statusFilterFn: FilterFn<Transaction> = (
  row,
  columnId,
  filterValue: string[]
) => {
  if (!filterValue?.length) return true;
  const status = row.getValue(columnId) as string;
  return filterValue.includes(status);
};

const typeFilterFn: FilterFn<Transaction> = (
  row,
  columnId,
  filterValue: string[]
) => {
  if (!filterValue?.length) return true;
  const type = row.getValue(columnId) as string;
  return filterValue.includes(type);
};

// Sample data for transactions
const SAMPLE_TRANSACTIONS: Transaction[] = [
  {
    id: "txn-1",
    date: "2023-05-15T14:30:00Z",
    asset: "BTC",
    type: "Deposit",
    amount: 0.5,
    status: "Completed",
  },
  {
    id: "txn-2",
    date: "2023-05-14T10:15:00Z",
    asset: "ETH",
    type: "Trade",
    amount: 2.5,
    status: "Completed",
    fee: 0.001
  },
  {
    id: "txn-3",
    date: "2023-05-13T09:45:00Z",
    asset: "USDT",
    type: "Withdrawal",
    amount: 1000,
    status: "Pending",
    fee: 1.5
  },
  {
    id: "txn-4",
    date: "2023-05-12T16:20:00Z",
    asset: "DOT",
    type: "Staking",
    amount: 100,
    status: "Completed",
  },
  {
    id: "txn-5",
    date: "2023-05-11T11:10:00Z",
    asset: "SOL",
    type: "Deposit",
    amount: 20,
    status: "Completed",
  },
  {
    id: "txn-6",
    date: "2023-05-10T15:40:00Z",
    asset: "BTC",
    type: "Withdrawal",
    amount: 0.25,
    status: "Failed",
    fee: 0.0005
  },
  {
    id: "txn-7",
    date: "2023-05-09T13:05:00Z",
    asset: "ETH",
    type: "Staking",
    amount: 5,
    status: "Completed",
  },
  {
    id: "txn-8",
    date: "2023-05-08T09:30:00Z",
    asset: "USDT",
    type: "Trade",
    amount: 500,
    status: "Completed",
    fee: 0.5
  },
  {
    id: "txn-9",
    date: "2023-05-07T14:25:00Z",
    asset: "DOT",
    type: "Deposit",
    amount: 50,
    status: "Pending",
  },
  {
    id: "txn-10",
    date: "2023-05-06T10:50:00Z",
    asset: "SOL",
    type: "Withdrawal",
    amount: 10,
    status: "Completed",
    fee: 0.01
  },
  {
    id: "txn-11",
    date: "2023-05-05T08:15:00Z",
    asset: "BTC",
    type: "Trade",
    amount: 0.1,
    status: "Completed",
    fee: 0.0001
  },
  {
    id: "txn-12",
    date: "2023-05-04T16:45:00Z",
    asset: "ETH",
    type: "Deposit",
    amount: 1,
    status: "Failed",
  }
];

// StyledAssetButton component for consistent styling across all asset buttons
const StyledAssetButton: React.FC<{
  asset: string;
  className?: string;
  inTableCell?: boolean;
  inPopover?: boolean;
}> = ({ asset, className, inTableCell = false, inPopover = false }) => {
  if (!asset || !isAssetTicker(asset)) return <span>{asset}</span>;
  
  const { theme } = useTheme();
  const assetConfig = ASSETS[asset as AssetTicker];
  if (!assetConfig) return <span>{asset}</span>;
  
  const assetColor = theme === 'dark' ? assetConfig.theme.dark : assetConfig.theme.light;
  
  return (
    <AssetPriceTooltip asset={asset as AssetTicker} inTableCell={inTableCell} inPopover={inPopover}>
      <div onClick={(e) => e.stopPropagation()} style={{ display: 'inline-flex' }}>
        <button 
          type="button"
          className={cn("font-jakarta font-bold text-sm rounded-md px-1", className)}
          style={{ 
            color: assetColor,
            backgroundColor: `${assetColor}14`,
            cursor: 'pointer',
            WebkitTouchCallout: 'none',
            WebkitUserSelect: 'text',
            userSelect: 'text'
          }}
          onMouseEnter={(e) => {
            const target = e.currentTarget;
            target.style.backgroundColor = assetColor;
            target.style.color = 'hsl(var(--color-widget-bg))';
          }}
          onMouseLeave={(e) => {
            const target = e.currentTarget;
            target.style.backgroundColor = `${assetColor}14`;
            target.style.color = assetColor;
          }}
          onMouseDown={(e) => {
            if (e.detail > 1) {
              e.preventDefault();
            }
          }}
        >
          {className?.includes('display-symbol') ? asset : assetConfig.name}
        </button>
      </div>
    </AssetPriceTooltip>
  );
};

const columns: ColumnDef<Transaction>[] = [
  {
    header: "Date",
    accessorKey: "date",
    cell: ({ row }) => {
      const date = new Date(row.getValue("date"));
      return (
        <div className="font-medium">
          {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      );
    },
    size: 160,
  },
  {
    header: "Asset",
    accessorKey: "asset",
    cell: ({ row }) => {
      const asset = row.getValue("asset") as string;
      return <StyledAssetButton asset={asset} inTableCell={true} />;
    },
    size: 100,
    filterFn: "asset",
  },
  {
    header: "Type",
    accessorKey: "type",
    cell: ({ row }) => {
      const type = row.getValue("type") as string;
      let variant: any = "default";
      
      switch (type) {
        case "Withdrawal":
          variant = "withdrawalType";
          break;
        case "Deposit":
          variant = "depositType";
          break;
        case "Trade":
          variant = "tradeType";
          break;
        case "Staking":
          variant = "stakingType";
          break;
      }
      
      // Check if this type is in the type filter (regardless of active badge)
      const typeFilter = table.getColumn("type")?.getFilterValue() as string[] | undefined;
      const isActive = typeFilter?.includes(type) || 
                     (activeSortBadge?.column === 'type' && activeSortBadge?.value === type);
      
      return (
        <SortableBadge 
          variant={variant} 
          className="font-medium"
          active={isActive}
          onClick={(e) => handleBadgeSort('type', type, e)}
        >
          {type}
        </SortableBadge>
      );
    },
    size: 120,
    filterFn: typeFilterFn,
  },
  {
    header: "Amount",
    accessorKey: "amount",
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("amount"));
      const asset = row.getValue("asset") as string;
      
      // Format the amount with appropriate decimal places
      const formattedAmount = amount.toLocaleString(undefined, { 
        minimumFractionDigits: 2,
        maximumFractionDigits: 8
      });
      
      return (
        <div className="text-right">
          {formattedAmount} {asset}
        </div>
      );
    },
    size: 150,
  },
  {
    header: "Fee",
    accessorKey: "fee",
    cell: ({ row }) => {
      const fee = row.original.fee;
      const asset = row.getValue("asset") as string;
      
      if (!fee) {
        return <div className="text-right text-muted-foreground">-</div>;
      }
      
      const formattedFee = fee.toLocaleString(undefined, { 
        minimumFractionDigits: 2,
        maximumFractionDigits: 8
      });
      
      return (
        <div className="text-right text-muted-foreground">
          {formattedFee} {asset}
        </div>
      );
    },
    size: 100,
  },
  {
    header: "Status",
    accessorKey: "status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      let variant: any = "default";
      
      switch (status) {
        case "Failed":
          variant = "failedStatus";
          break;
        case "Pending":
          variant = "pendingStatus";
          break;
        case "Completed":
          variant = "completedStatus";
          break;
      }
      
      // Check if this status is in the status filter (regardless of active badge)
      const statusFilter = table.getColumn("status")?.getFilterValue() as string[] | undefined;
      const isActive = statusFilter?.includes(status) || 
                      (activeSortBadge?.column === 'status' && activeSortBadge?.value === status);
      
      return (
        <SortableBadge 
          variant={variant} 
          className="font-medium"
          active={isActive}
          onClick={(e) => handleBadgeSort('status', status, e)}
        >
          {status}
        </SortableBadge>
      );
    },
    size: 100,
    filterFn: statusFilterFn,
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => <RowActions row={row} />,
    size: 60,
    enableHiding: false,
  },
];

export const TransactionsWidget: React.FC<RemovableWidgetProps> = ({ className, onRemove }) => {
  const [data, setData] = useState<Transaction[]>(SAMPLE_TRANSACTIONS);
  const { dataSource } = useDataSource();
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tableBodyRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<any>(null);
  const [containerHeight, setContainerHeight] = useState<number>(0);
  const [activeSortBadge, setActiveSortBadge] = useState<{ column: string; value: string } | null>(null);

  const [sorting, setSorting] = useState<SortingState>([
    {
      id: "date",
      desc: true,
    },
  ]);

  const handleDeleteRows = () => {
    const selectedRows = table.getSelectedRowModel().rows;
    const updatedData = data.filter(
      (item) => !selectedRows.some((row) => row.original.id === item.id)
    );
    setData(updatedData);
    table.resetRowSelection();
  };

  const handleExportCSV = () => {
    // Determine rows to export (either selected rows or all rows)
    const rowsToExport = table.getSelectedRowModel().rows.length > 0 
      ? table.getSelectedRowModel().rows
      : table.getRowModel().rows;
    
    // Create CSV header based on visible columns
    const visibleColumns = table.getVisibleFlatColumns().filter(col => 
      col.id !== 'actions');
    const header = visibleColumns.map(col => col.id).join(',');
    
    // Create CSV rows
    const csvRows = rowsToExport.map(row => {
      return visibleColumns.map(col => {
        // Handle special cases like date formatting
        if (col.id === 'date') {
          const date = new Date(row.getValue('date'));
          return `"${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}"`;
        }
        // Get raw value for other columns
        return `"${row.getValue(col.id) || ''}"`;
      }).join(',');
    });
    
    // Combine header and rows
    const csvContent = [header, ...csvRows].join('\n');
    
    // Create a blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `transactions_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // If there were selected rows, keep the selection
  };

  // Define badge sort handler
  const handleBadgeSort = (column: string, value: string, e: React.MouseEvent) => {
    // Stop event propagation to prevent row selection
    e.stopPropagation();
    
    // Get current filters
    const currentTypeFilter = table.getColumn("type")?.getFilterValue() as string[] | undefined;
    const currentStatusFilter = table.getColumn("status")?.getFilterValue() as string[] | undefined;
    
    // If same badge is clicked again in the same column, remove just that filter
    if (activeSortBadge?.column === column && activeSortBadge?.value === value) {
      // Clear just this specific column's filter
      table.getColumn(column)?.setFilterValue(undefined);
      
      // If we still have a filter in the other column, keep that active
      if ((column === 'type' && currentStatusFilter?.length) || 
          (column === 'status' && currentTypeFilter?.length)) {
        // Set active badge to the other column that still has a filter
        const otherColumn = column === 'type' ? 'status' : 'type';
        const otherValue = column === 'type' ? currentStatusFilter?.[0] : currentTypeFilter?.[0];
        setActiveSortBadge(otherValue ? { column: otherColumn, value: otherValue } : null);
      } else {
        // No filters left, clear active badge
        setActiveSortBadge(null);
        // Reset sort to default (date desc)
        setSorting([{ id: "date", desc: true }]);
      }
      return;
    }
    
    // Set this column's filter to the selected value
    table.getColumn(column)?.setFilterValue([value]);
    
    // Set the active badge for visual indication
    setActiveSortBadge({ column, value });
    
    // Apply sorting by that column
    setSorting([{ id: column, desc: false }]);
  };

  // Create modified columns with sortable badges
  const sortableColumns: ColumnDef<Transaction>[] = React.useMemo(() => {
    return columns.map(column => {
      // Add sorting functionality to Type column
      if (column.accessorKey === 'type') {
        return {
          ...column,
          cell: ({ row }) => {
            const type = row.getValue("type") as string;
            let variant: any = "default";
            
            switch (type) {
              case "Withdrawal":
                variant = "withdrawalType";
                break;
              case "Deposit":
                variant = "depositType";
                break;
              case "Trade":
                variant = "tradeType";
                break;
              case "Staking":
                variant = "stakingType";
                break;
            }
            
            // Check if this type is in the type filter (regardless of active badge)
            const typeFilter = table.getColumn("type")?.getFilterValue() as string[] | undefined;
            const isActive = typeFilter?.includes(type) || 
                           (activeSortBadge?.column === 'type' && activeSortBadge?.value === type);
            
            return (
              <SortableBadge 
                variant={variant} 
                className="font-medium"
                active={isActive}
                onClick={(e) => handleBadgeSort('type', type, e)}
              >
                {type}
              </SortableBadge>
            );
          }
        };
      }
      
      // Add sorting functionality to Status column
      if (column.accessorKey === 'status') {
        return {
          ...column,
          cell: ({ row }) => {
            const status = row.getValue("status") as string;
            let variant: any = "default";
            
            switch (status) {
              case "Failed":
                variant = "failedStatus";
                break;
              case "Pending":
                variant = "pendingStatus";
                break;
              case "Completed":
                variant = "completedStatus";
                break;
            }
            
            // Check if this status is in the status filter (regardless of active badge)
            const statusFilter = table.getColumn("status")?.getFilterValue() as string[] | undefined;
            const isActive = statusFilter?.includes(status) || 
                            (activeSortBadge?.column === 'status' && activeSortBadge?.value === status);
            
            return (
              <SortableBadge 
                variant={variant} 
                className="font-medium"
                active={isActive}
                onClick={(e) => handleBadgeSort('status', status, e)}
              >
                {status}
              </SortableBadge>
            );
          }
        };
      }
      
      return column;
    });
  }, [activeSortBadge]);

  const table = useReactTable({
    data,
    columns: sortableColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    enableSortingRemoval: false,
    getPaginationRowModel: getPaginationRowModel(),
    onPaginationChange: setPagination,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    state: {
      sorting,
      pagination,
      columnFilters,
      columnVisibility,
    },
    filterFns: {
      multiColumn: multiColumnFilterFn,
      status: statusFilterFn,
      type: typeFilterFn,
      asset: assetFilterFn,
    },
  });
  
  // Store table instance in ref to avoid circular dependencies
  React.useEffect(() => {
    tableRef.current = table;
  }, [table]);

  // Update row count based on available vertical space
  useLayoutEffect(() => {
    const updateRowsPerPage = () => {
      if (!containerRef.current) return;
      
      // Get container dimensions
      const containerRect = containerRef.current.getBoundingClientRect();
      setContainerHeight(containerRect.height);
      
      // More accurate measurements based on the screenshot
      const filtersHeight = 48; // Filters section height
      const paginationHeight = 40; // Pagination controls height
      const headerHeight = 36; // Table header height
      const bufferSpace = 16; // Additional buffer space
      
      // Calculate available space for rows
      const availableHeight = containerRect.height - filtersHeight - paginationHeight - headerHeight - bufferSpace;
      
      // Fixed row height - prevent dynamic expansion
      const rowHeight = 32; // Single table row height
      
      // Calculate how many rows can fit
      let rowsPerPage = Math.max(Math.floor(availableHeight / rowHeight), 5);
      
      // Reduce by 2 rows to ensure better fit
      rowsPerPage = Math.max(rowsPerPage - 2, 5);
      
      // Update pagination if different from current
      if (rowsPerPage !== pagination.pageSize) {
        console.log(`Updating rows per page: ${rowsPerPage} (available height: ${availableHeight}px, container: ${containerRect.height}px)`);
        setPagination(prev => ({
          ...prev,
          pageSize: rowsPerPage
        }));
      }
    };

    // Create both resize and mutation observers
    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(updateRowsPerPage);
    });

    const mutationObserver = new MutationObserver((mutations) => {
      requestAnimationFrame(updateRowsPerPage);
    });

    // Initial update
    updateRowsPerPage();

    // Observe both size changes and attribute changes
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
      
      // Also observe parent elements up to three levels
      let parent = containerRef.current.parentElement;
      for (let i = 0; i < 3; i++) {
        if (parent) {
          resizeObserver.observe(parent);
          parent = parent.parentElement;
        }
      }
      
      // Watch for attribute changes that might affect size
      mutationObserver.observe(containerRef.current, {
        attributes: true,
        attributeFilter: ['style', 'class'],
        subtree: true
      });
    }

    // Setup an interval as a fallback to check for changes
    const intervalCheck = setInterval(updateRowsPerPage, 1000);

    // Cleanup
    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      clearInterval(intervalCheck);
    };
  }, [containerHeight]);

  // Force recalculation when visibility changes
  useEffect(() => {
    // When column visibility changes, recalculate rows
    if (containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      setContainerHeight(containerRect.height);
    }
  }, [columnVisibility]);

  // Get unique status values
  const uniqueStatusValues = React.useMemo(() => {
    const statusColumn = table.getColumn("status");
    if (!statusColumn) return [];
    const values = Array.from(statusColumn.getFacetedUniqueValues().keys());
    return values.sort();
  }, [table.getColumn("status")?.getFacetedUniqueValues()]);

  // Get unique transaction types
  const uniqueTypeValues = React.useMemo(() => {
    const typeColumn = table.getColumn("type");
    if (!typeColumn) return [];
    const values = Array.from(typeColumn.getFacetedUniqueValues().keys());
    return values.sort();
  }, [table.getColumn("type")?.getFacetedUniqueValues()]);

  // Get counts for each status
  const statusCounts = React.useMemo(() => {
    const statusColumn = table.getColumn("status");
    if (!statusColumn) return new Map();
    return statusColumn.getFacetedUniqueValues();
  }, [table.getColumn("status")?.getFacetedUniqueValues()]);

  // Get counts for each type
  const typeCounts = React.useMemo(() => {
    const typeColumn = table.getColumn("type");
    if (!typeColumn) return new Map();
    return typeColumn.getFacetedUniqueValues();
  }, [table.getColumn("type")?.getFacetedUniqueValues()]);

  const selectedStatuses = React.useMemo(() => {
    const filterValue = table.getColumn("status")?.getFilterValue() as string[];
    return filterValue ?? [];
  }, [table.getColumn("status")?.getFilterValue()]);

  const selectedTypes = React.useMemo(() => {
    const filterValue = table.getColumn("type")?.getFilterValue() as string[];
    return filterValue ?? [];
  }, [table.getColumn("type")?.getFilterValue()]);

  const handleStatusChange = (checked: boolean, value: string) => {
    const filterValue = table.getColumn("status")?.getFilterValue() as string[];
    const newFilterValue = filterValue ? [...filterValue] : [];

    if (checked) {
      newFilterValue.push(value);
    } else {
      const index = newFilterValue.indexOf(value);
      if (index > -1) {
        newFilterValue.splice(index, 1);
      }
    }

    table
      .getColumn("status")
      ?.setFilterValue(newFilterValue.length ? newFilterValue : undefined);
  };

  const handleTypeChange = (checked: boolean, value: string) => {
    const filterValue = table.getColumn("type")?.getFilterValue() as string[];
    const newFilterValue = filterValue ? [...filterValue] : [];

    if (checked) {
      newFilterValue.push(value);
    } else {
      const index = newFilterValue.indexOf(value);
      if (index > -1) {
        newFilterValue.splice(index, 1);
      }
    }

    table
      .getColumn("type")
      ?.setFilterValue(newFilterValue.length ? newFilterValue : undefined);
  };

  // Generate unique ID for input label association
  const id = React.useId();

  // Asset search state
  const [assetSearchTerm, setAssetSearchTerm] = useState("");
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [showAssetSuggestions, setShowAssetSuggestions] = useState(false);
  const assetPopoverRef = useRef<HTMLDivElement>(null);
  
  // Handle clicks outside the asset popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showAssetSuggestions && 
        assetPopoverRef.current && 
        !assetPopoverRef.current.contains(event.target as Node) &&
        inputRef.current && 
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowAssetSuggestions(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showAssetSuggestions]);
  
  // Get available assets for suggestions
  const availableAssets = Object.keys(ASSETS).filter(isAssetTicker);
  
  // Filter assets based on search term
  const filteredAssets = useMemo(() => {
    // First filter assets based on search term
    const filtered = availableAssets.filter(asset => 
      asset.toLowerCase().includes(assetSearchTerm.toLowerCase()) || 
      ASSETS[asset as AssetTicker].name.toLowerCase().includes(assetSearchTerm.toLowerCase())
    );
    
    // If there's no search term, sort so selected assets appear first
    if (!assetSearchTerm) {
      return [...filtered].sort((a, b) => {
        const aSelected = selectedAssets.includes(a);
        const bSelected = selectedAssets.includes(b);
        
        if (aSelected && !bSelected) return -1;
        if (!aSelected && bSelected) return 1;
        return 0;
      });
    }
    
    return filtered;
  }, [availableAssets, assetSearchTerm, selectedAssets]);
  
  // Handle asset selection/deselection
  const handleAssetChange = (asset: string) => {
    setSelectedAssets(prev => {
      const isSelected = prev.includes(asset);
      const newSelection = isSelected
        ? prev.filter(a => a !== asset)
        : [...prev, asset];
        
      // Update the table filter
      table.getColumn("asset")?.setFilterValue(newSelection.length ? newSelection : undefined);
      
      return newSelection;
    });
  };
  
  // Handle asset search input change
  const handleAssetSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAssetSearchTerm(value);
    
    // Always show suggestions when typing (if results exist)
    setShowAssetSuggestions(true);
    
    // Ensure input stays focused
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 0);
    
    // If we're clearing the search, make sure we don't lose our selections
    if (value === "" && !showAssetSuggestions) {
      table.getColumn("asset")?.setFilterValue(selectedAssets.length ? selectedAssets : undefined);
    }
  };
  
  // Clear all selected assets
  const clearSelectedAssets = () => {
    setSelectedAssets([]);
    setAssetSearchTerm("");
    table.getColumn("asset")?.setFilterValue(undefined);
    
    // Ensure input maintains focus after clearing
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 0);
  };

  return (
    <div className={cn("w-full h-full flex flex-col", className)} ref={containerRef}>
      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-2 py-2">
        <div className="flex items-center gap-3">
          {/* Filter by asset with suggestions popover */}
          <div className="relative">
            <div className="relative">
              <Input
                id={`${id}-input`}
                ref={inputRef}
                className={cn(
                  "peer min-w-60 ps-9",
                  (Boolean(assetSearchTerm) || selectedAssets.length > 0) && "pe-9"
                )}
                value={assetSearchTerm}
                onChange={handleAssetSearchChange}
                onFocus={() => {
                  // Delay showing suggestions to avoid flicker during focus
                  setTimeout(() => setShowAssetSuggestions(true), 50);
                }}
                onClick={() => {
                  // Auto-focus on click
                  if (inputRef.current) {
                    inputRef.current.focus();
                  }
                  setShowAssetSuggestions(true);
                }}
                placeholder={selectedAssets.length ? `${selectedAssets.length} assets selected` : "Filter by asset..."}
                type="text"
                aria-label="Filter by asset"
              />
              <div className="text-muted-foreground/80 pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 peer-disabled:opacity-50">
                <ListFilterIcon size={16} aria-hidden="true" />
              </div>
              {(Boolean(assetSearchTerm) || selectedAssets.length > 0) && (
                <button
                  className="text-muted-foreground/80 hover:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center rounded-e-md transition-[color,box-shadow] outline-none focus:z-10 focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Clear filter"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearSelectedAssets();
                  }}
                >
                  <XCircle size={16} aria-hidden="true" />
                </button>
              )}
            </div>

            {/* Separate popover that's positioned absolutely under the input */}
            {showAssetSuggestions && filteredAssets.length > 0 && (
              <div
                ref={assetPopoverRef}
                className="absolute top-full left-0 z-50 mt-1 w-60 p-0 overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in fade-in-80"
              >
                <div className="max-h-60 overflow-auto py-1">
                  {filteredAssets.map((asset) => (
                    <div
                      key={asset}
                      className={cn(
                        "flex items-center px-2 py-1.5 hover:bg-muted cursor-pointer",
                        selectedAssets.includes(asset) && "bg-muted/50"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAssetChange(asset);
                        setAssetSearchTerm("");
                        // Keep focus on input
                        if (inputRef.current) {
                          inputRef.current.focus();
                        }
                      }}
                    >
                      <Checkbox 
                        id={`${id}-asset-${asset}`}
                        checked={selectedAssets.includes(asset)}
                        className="mr-2"
                        onCheckedChange={(checked) => {
                          handleAssetChange(asset);
                          // Don't close popover or lose focus
                          if (inputRef.current) {
                            inputRef.current.focus();
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <StyledAssetButton asset={asset} inPopover={true} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Filter by status */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">
                <FilterIcon
                  className="-ms-1 opacity-60"
                  size={16}
                  aria-hidden="true"
                />
                Status
                {selectedStatuses.length > 0 && (
                  <span className="bg-background text-muted-foreground/70 -me-1 inline-flex h-5 max-h-full items-center rounded border px-1 font-[inherit] text-[0.625rem] font-medium">
                    {selectedStatuses.length}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto min-w-36 p-3" align="start">
              <div className="space-y-3">
                <div className="text-muted-foreground text-xs font-medium">
                  Status Filters
                </div>
                <div className="space-y-3">
                  {uniqueStatusValues.map((value, i) => (
                    <div key={value} className="flex items-center gap-2">
                      <Checkbox
                        id={`${id}-status-${i}`}
                        checked={selectedStatuses.includes(value)}
                        onCheckedChange={(checked: boolean) =>
                          handleStatusChange(checked, value)
                        }
                      />
                      <Label
                        htmlFor={`${id}-status-${i}`}
                        className="flex grow justify-between gap-2 font-normal"
                      >
                        <Badge variant={
                          value === "Failed" ? "failedStatus" : 
                          value === "Pending" ? "pendingStatus" : 
                          "completedStatus"
                        } className="font-medium">
                          {value}
                        </Badge>
                        <span className="text-muted-foreground ms-2 text-xs">
                          {statusCounts.get(value)}
                        </span>
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
          
          {/* Filter by transaction type */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">
                <FilterIcon
                  className="-ms-1 opacity-60"
                  size={16}
                  aria-hidden="true"
                />
                Type
                {selectedTypes.length > 0 && (
                  <span className="bg-background text-muted-foreground/70 -me-1 inline-flex h-5 max-h-full items-center rounded border px-1 font-[inherit] text-[0.625rem] font-medium">
                    {selectedTypes.length}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto min-w-36 p-3" align="start">
              <div className="space-y-3">
                <div className="text-muted-foreground text-xs font-medium">
                  Transaction Types
                </div>
                <div className="space-y-3">
                  {uniqueTypeValues.map((value, i) => (
                    <div key={value} className="flex items-center gap-2">
                      <Checkbox
                        id={`${id}-type-${i}`}
                        checked={selectedTypes.includes(value)}
                        onCheckedChange={(checked: boolean) =>
                          handleTypeChange(checked, value)
                        }
                      />
                      <Label
                        htmlFor={`${id}-type-${i}`}
                        className="flex grow justify-between gap-2 font-normal"
                      >
                        <Badge variant={
                          value === "Withdrawal" ? "withdrawalType" : 
                          value === "Deposit" ? "depositType" : 
                          value === "Trade" ? "tradeType" : 
                          "stakingType"
                        } className="font-medium">
                          {value}
                        </Badge>
                        <span className="text-muted-foreground ms-2 text-xs">
                          {typeCounts.get(value)}
                        </span>
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
          
          {/* Toggle columns visibility */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Columns3Icon
                  className="-ms-1 opacity-60"
                  size={16}
                  aria-hidden="true"
                />
                View
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                      onSelect={(event) => event.preventDefault()}
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex items-center gap-3">
          {/* Delete button */}
          {table.getSelectedRowModel().rows.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button className="ml-auto" variant="outline">
                  <TrashIcon
                    className="-ms-1 opacity-60"
                    size={16}
                    aria-hidden="true"
                  />
                  Delete
                  <span className="bg-background text-muted-foreground/70 -me-1 inline-flex h-5 max-h-full items-center rounded border px-1 font-[inherit] text-[0.625rem] font-medium">
                    {table.getSelectedRowModel().rows.length}
                  </span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <div className="flex flex-col gap-2 max-sm:items-center sm:flex-row sm:gap-4">
                  <div
                    className="flex size-9 shrink-0 items-center justify-center rounded-full border"
                    aria-hidden="true"
                  >
                    <AlertCircle className="opacity-80" size={16} />
                  </div>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Are you absolutely sure?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete{" "}
                      {table.getSelectedRowModel().rows.length} selected{" "}
                      {table.getSelectedRowModel().rows.length === 1
                        ? "transaction"
                        : "transactions"}
                      .
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteRows}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {/* Export CSV button */}
          <Button 
            className="ml-auto" 
            variant="outline"
            onClick={handleExportCSV}
          >
            <FileDownIcon
              className="-ms-1 opacity-60"
              size={16}
              aria-hidden="true"
            />
            Export CSV
            {table.getSelectedRowModel().rows.length > 0 && (
              <span className="bg-background text-muted-foreground/70 -me-1 inline-flex h-5 max-h-full items-center rounded border px-1 font-[inherit] text-[0.625rem] font-medium">
                {table.getSelectedRowModel().rows.length}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Table - allow auto height but with min-height for scrolling */}
      <div className="bg-background overflow-auto rounded-md border flex-1" ref={tableBodyRef}>
        <Table className="table-fixed w-full">
          <TableHeader className="sticky top-0 z-10 bg-background">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      key={header.id}
                      style={{ width: `${header.getSize()}px` }}
                      className={cn(
                        "h-11",
                        // Add right alignment to Amount and Fee column headers
                        (header.id === "amount" || header.id === "fee") && "text-right"
                      )}
                    >
                      {header.isPlaceholder ? null : header.column.getCanSort() ? (
                        <div
                          className={cn(
                            "flex h-full cursor-pointer items-center select-none",
                            // For Amount and Fee columns, right align content
                            (header.id === "amount" || header.id === "fee")
                              ? "justify-end" 
                              : "justify-start"
                          )}
                          onClick={header.column.getToggleSortingHandler()}
                          onKeyDown={(e) => {
                            if (
                              header.column.getCanSort() &&
                              (e.key === "Enter" || e.key === " ")
                            ) {
                              e.preventDefault();
                              header.column.getToggleSortingHandler()?.(e);
                            }
                          }}
                          tabIndex={header.column.getCanSort() ? 0 : undefined}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {{
                            asc: (
                              <ChevronUpIcon
                                className="shrink-0 opacity-60 ml-2"
                                size={16}
                                aria-hidden="true"
                              />
                            ),
                            desc: (
                              <ChevronDownIcon
                                className="shrink-0 opacity-60 ml-2"
                                size={16}
                                aria-hidden="true"
                              />
                            ),
                          }[header.column.getIsSorted() as string] ?? null}
                        </div>
                      ) : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={cn(
                    "h-8 cursor-pointer",
                    row.getIsSelected() && "bg-accent"
                  )}
                  onClick={() => row.toggleSelected(!row.getIsSelected())}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="last:py-0">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No transactions found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination - position at bottom */}
      <div className="flex items-center justify-between gap-8 px-2 py-2">
        {/* Results per page - display calculated value instead of dropdown */}
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">
            Displaying {pagination.pageSize} rows per page
          </p>
        </div>
        {/* Page number information */}
        <div className="text-muted-foreground flex grow justify-end text-sm whitespace-nowrap">
          <p
            className="text-muted-foreground text-sm whitespace-nowrap"
            aria-live="polite"
          >
            <span className="text-foreground">
              {table.getState().pagination.pageIndex *
                table.getState().pagination.pageSize +
                1}
              -
              {Math.min(
                Math.max(
                  table.getState().pagination.pageIndex *
                    table.getState().pagination.pageSize +
                    table.getState().pagination.pageSize,
                  0
                ),
                table.getRowCount()
              )}
            </span>{" "}
            of{" "}
            <span className="text-foreground">
              {table.getRowCount().toString()}
            </span>
          </p>
        </div>

        {/* Pagination buttons */}
        <div>
          <Pagination>
            <PaginationContent>
              {/* First page button */}
              <PaginationItem>
                <Button
                  size="icon"
                  variant="outline"
                  className="disabled:pointer-events-none disabled:opacity-50"
                  onClick={() => table.firstPage()}
                  disabled={!table.getCanPreviousPage()}
                  aria-label="Go to first page"
                >
                  <ChevronFirstIcon size={16} aria-hidden="true" />
                </Button>
              </PaginationItem>
              {/* Previous page button */}
              <PaginationItem>
                <Button
                  size="icon"
                  variant="outline"
                  className="disabled:pointer-events-none disabled:opacity-50"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  aria-label="Go to previous page"
                >
                  <ChevronLeftIcon size={16} aria-hidden="true" />
                </Button>
              </PaginationItem>
              {/* Next page button */}
              <PaginationItem>
                <Button
                  size="icon"
                  variant="outline"
                  className="disabled:pointer-events-none disabled:opacity-50"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  aria-label="Go to next page"
                >
                  <ChevronRightIcon size={16} aria-hidden="true" />
                </Button>
              </PaginationItem>
              {/* Last page button */}
              <PaginationItem>
                <Button
                  size="icon"
                  variant="outline"
                  className="disabled:pointer-events-none disabled:opacity-50"
                  onClick={() => table.lastPage()}
                  disabled={!table.getCanNextPage()}
                  aria-label="Go to last page"
                >
                  <ChevronLastIcon size={16} aria-hidden="true" />
                </Button>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>
    </div>
  );
};

function RowActions({ row }: { row: Row<Transaction> }) {
  return (
    <div onClick={(e) => e.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="flex justify-end">
            <Button
              size="icon"
              variant="ghost"
              className="shadow-none"
              aria-label="More actions"
            >
              <MoreHorizontal size={16} aria-hidden="true" />
            </Button>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuItem>
              <span>View details</span>
              <DropdownMenuShortcut>⌘V</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <span>Edit</span>
              <DropdownMenuShortcut>⌘E</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem>
              <span>Export</span>
              <DropdownMenuShortcut>⌘X</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive focus:text-destructive">
            <span>Delete</span>
            <DropdownMenuShortcut>⌘⌫</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
} 