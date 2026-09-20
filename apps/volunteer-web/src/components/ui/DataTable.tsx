import React, { useState } from 'react';
import { Search, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { cn } from './Card';

export interface Column<T> {
  header: string;
  accessorKey: keyof T | string;
  cell?: (row: T) => React.ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  searchable?: boolean;
  searchKey?: keyof T;
  selectable?: boolean;
  onSelectionChange?: (selectedRows: T[]) => void;
  onRowClick?: (row: T) => void;
  className?: string;
  pageSize?: number;
  emptyMessage?: string;
}

export function DataTable<T>({ 
  columns, 
  data, 
  searchable = false, 
  searchKey, 
  selectable = false,
  onSelectionChange,
  onRowClick,
  className,
  pageSize = 10,
  emptyMessage = "No records found."
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  
  // Filtering
  const filteredData = React.useMemo(() => {
    if (!searchTerm || !searchKey) return data;
    return data.filter(item => {
      const val = item[searchKey];
      if (typeof val === 'string') {
        return val.toLowerCase().includes(searchTerm.toLowerCase());
      }
      return false;
    });
  }, [data, searchTerm, searchKey]);

  // Sorting
  const sortedData = React.useMemo(() => {
    if (!sortConfig) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aVal = (a as any)[sortConfig.key];
      const bVal = (b as any)[sortConfig.key];
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortConfig]);

  // Pagination
  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;
  const paginatedData = sortedData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Sorting Handler
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    setCurrentPage(1); // Reset to first page on sort
  };

  // Selection Handlers
  const toggleSelection = (index: number) => {
    const newSelected = new Set(selectedIndices);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedIndices(newSelected);
    if (onSelectionChange) {
      onSelectionChange(Array.from(newSelected).map(idx => sortedData[idx]));
    }
  };

  const toggleAll = () => {
    if (selectedIndices.size === paginatedData.length) {
      setSelectedIndices(new Set());
      if (onSelectionChange) onSelectionChange([]);
    } else {
      const newSelected = new Set(paginatedData.map((_, idx) => (currentPage - 1) * pageSize + idx));
      setSelectedIndices(newSelected);
      if (onSelectionChange) onSelectionChange(Array.from(newSelected).map(idx => sortedData[idx]));
    }
  };

  // Handle page change ensuring valid selection bounds
  const goToPage = (page: number) => {
    setCurrentPage(page);
    setSelectedIndices(new Set()); // Clear selection on page change for simplicity
    if (onSelectionChange) onSelectionChange([]);
  };

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {searchable && (
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input 
            type="text"
            placeholder="Search..." 
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm font-inter text-white placeholder:text-gray-500 focus:outline-none focus:border-white/20 transition-colors"
          />
        </div>
      )}

      <div className="rounded-xl border border-white/10 overflow-hidden bg-white/5 backdrop-blur-md flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#111] border-b border-white/10 text-xs text-gray-400 uppercase font-inter tracking-wider sticky top-0 z-10">
              <tr>
                {selectable && (
                  <th className="px-6 py-4 w-12">
                    <button 
                      onClick={toggleAll}
                      className={cn(
                        "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                        selectedIndices.size > 0 && selectedIndices.size === paginatedData.length 
                          ? "bg-primary border-primary text-white" 
                          : "border-gray-500 hover:border-gray-400 text-transparent"
                      )}
                    >
                      <Check className="w-3 h-3" />
                    </button>
                  </th>
                )}
                {columns.map((col, idx) => (
                  <th 
                    key={idx} 
                    className={cn(
                      "px-6 py-4 font-medium",
                      col.sortable ? "cursor-pointer hover:text-white transition-colors select-none" : ""
                    )}
                    onClick={() => col.sortable && handleSort(col.accessorKey as string)}
                  >
                    <div className="flex items-center gap-2">
                      {col.header}
                      {col.sortable && sortConfig?.key === col.accessorKey && (
                        sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 text-primary" /> : <ChevronDown className="w-4 h-4 text-primary" />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {paginatedData.length > 0 ? (
                paginatedData.map((row, relativeIndex) => {
                  const absoluteIndex = (currentPage - 1) * pageSize + relativeIndex;
                  const isSelected = selectedIndices.has(absoluteIndex);
                  return (
                    <tr 
                      key={absoluteIndex} 
                      onClick={() => onRowClick && onRowClick(row)}
                      className={cn(
                        "transition-colors group",
                        isSelected ? "bg-primary/5" : "hover:bg-white/5",
                        onRowClick ? "cursor-pointer" : ""
                      )}
                    >
                      {selectable && (
                        <td className="px-6 py-4">
                          <button 
                            onClick={() => toggleSelection(absoluteIndex)}
                            className={cn(
                              "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                              isSelected 
                                ? "bg-primary border-primary text-white" 
                                : "border-white/20 group-hover:border-white/40 text-transparent"
                            )}
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        </td>
                      )}
                      {columns.map((col, colIndex) => (
                        <td key={colIndex} className="px-6 py-4 font-inter text-gray-300">
                          {col.cell ? col.cell(row) : (String(col.accessorKey).split('.').reduce((obj, key) => (obj as any)?.[key], row) ?? '-')}
                        </td>
                      ))}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={columns.length + (selectable ? 1 : 0)} className="px-6 py-12 text-center text-gray-500 font-inter">
                    {emptyMessage}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        <div className="px-6 py-4 border-t border-white/10 bg-[#111] flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
          <span className="text-xs text-gray-500 font-inter">
            Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, sortedData.length)} of {sortedData.length} records
          </span>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-inter text-gray-400 min-w-[3rem] text-center">
              {currentPage} / {totalPages}
            </span>
            <button 
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
