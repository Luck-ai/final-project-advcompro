"use client";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { cn } from '@/lib/utils';
import { getProductStockStatus, getThreshold, type Product } from '@/lib/stock-utils';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Edit, Trash2, AlertTriangle, Eye, Package, List, Grid, ChevronLeft, ChevronRight } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import React from "react";
export interface TableColumn {
    key: string;
    label: string;
    className?: string;
    render?: (value: any, item: any) => React.ReactNode;
    width?: string | number;
}
export interface TableAction {
    icon: React.ReactNode;
    label: string;
    onClick?: (item: any) => void;
    variant?: "ghost" | "default" | "destructive" | "outline" | "secondary";
    href?: string;
}
export interface UnifiedTableProps {
    data: any[];
    columns: TableColumn[];
    actions?: TableAction[];
    loading?: boolean;
    error?: string | null;
    emptyMessage?: string;
    onDelete?: (id: string, name?: string) => void;
    getItemId?: (item: any) => string;
    getItemName?: (item: any) => string;
    enableCardView?: boolean;
    cardViewConfig?: {
        titleField?: string;
        subtitleField?: string;
        descriptionField?: string;
        priceField?: string;
        quantityField?: string;
        categoryField?: string;
        statusField?: string;
        imageField?: string;
        lowStockThresholdField?: string;
    };
    cardPlaceholderIcon?: React.ReactNode | null;
    cardQuantityIcon?: React.ReactNode | null;
    showPagination?: boolean;
    pageSizeOptions?: number[];
    initialPageSize?: number;
    viewMode?: 'list' | 'grid';
    onViewModeChange?: (mode: 'list' | 'grid') => void;
    onDeleteAll?: () => Promise<void> | void;
    disableInnerScroll?: boolean;
}
export function UnifiedTable({ data, columns, actions = [], loading = false, error = null, emptyMessage = "No items found", onDelete, onDeleteAll, getItemId = (item) => item.id, getItemName = (item) => item.name, enableCardView = false, cardViewConfig = {}, cardPlaceholderIcon = null, cardQuantityIcon = null, showPagination = true, pageSizeOptions = [25, 50, 100], initialPageSize = 25, viewMode: controlledViewMode, onViewModeChange: onViewModeChangeProp, disableInnerScroll = false, }: UnifiedTableProps) {
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pendingDelete, setPendingDelete] = useState<{
        id: string;
        name?: string;
    } | null>(null);
    const [confirmError, setConfirmError] = useState<string | null>(null);
    const [isDeleteAll, setIsDeleteAll] = useState(false);
    const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => controlledViewMode ?? 'list');
    useEffect(() => {
        if (controlledViewMode && controlledViewMode !== viewMode)
            setViewMode(controlledViewMode);
    }, [controlledViewMode]);
    useEffect(() => {
        if (!enableCardView)
            return;
        if (controlledViewMode)
            return;
        const mq = window.matchMedia('(max-width: 768px)');
        const apply = () => setViewMode(mq.matches ? 'grid' : 'list');
        apply();
        mq.addEventListener?.('change', apply);
        return () => mq.removeEventListener?.('change', apply);
    }, [enableCardView, controlledViewMode]);
    const [page, setPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(initialPageSize);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const cloneRef = useRef<HTMLDivElement | null>(null);
    const resizeObserverRef = useRef<ResizeObserver | null>(null);
    const originalTHeadPrevStyleRef = useRef<{
        opacity: string;
        pointerEvents: string;
    } | null>(null);
    const handleDelete = (item: any) => {
        const id = getItemId(item);
        const name = getItemName(item);
        setPendingDelete({ id, name });
        setConfirmOpen(true);
    };
    const handleDeleteAll = () => {
        setPendingDelete(null);
        setIsDeleteAll(true);
        setConfirmOpen(true);
    };
    const performDelete = async () => {
        try {
            setConfirmError(null);
            if (isDeleteAll) {
                if (typeof onDeleteAll === 'function') {
                    await onDeleteAll();
                }
                setConfirmOpen(false);
                setIsDeleteAll(false);
                setPendingDelete(null);
            }
            else {
                if (!pendingDelete || !onDelete)
                    return;
                await onDelete(pendingDelete.id, pendingDelete.name);
                setConfirmOpen(false);
                setPendingDelete(null);
            }
        }
        catch (err: any) {
            const msg = err?.message || 'Error deleting item';
            setConfirmError(msg);
        }
    };
    useEffect(() => {
        setPage(1);
    }, [pageSize, data]);
    const totalItems = data?.length || 0;
    const totalPages = pageSize > 0 ? Math.max(1, Math.ceil(totalItems / pageSize)) : 1;
    useEffect(() => {
        if (page > totalPages)
            setPage(totalPages);
    }, [page, totalPages]);
    const startIndex = (page - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalItems);
    const paginatedData = pageSize > 0 ? data.slice(startIndex, endIndex) : data;
    const renderPaginationControls = (): React.ReactNode => {
        const pages: number[] = [];
        const maxButtons = 5;
        let startPage = Math.max(1, page - Math.floor(maxButtons / 2));
        let endPage = startPage + maxButtons - 1;
        if (endPage > totalPages) {
            endPage = totalPages;
            startPage = Math.max(1, endPage - maxButtons + 1);
        }
        for (let p = startPage; p <= endPage; p++)
            pages.push(p);
        return (<div className="flex items-center justify-between px-4 py-3 border-t bg-transparent">
                <div className="text-sm text-muted-foreground">
          Showing {startIndex + 1} - {endIndex} — page {page} of {totalPages}
        </div>
                <div className="flex items-center space-x-2">
          <Button size="sm" variant="ghost" onClick={() => setPage(1)} disabled={page <= 1}>First</Button>
          <Button size="sm" variant="ghost" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>Prev</Button>
          {pages.map((p) => (<Button key={p} size="sm" variant={p === page ? 'default' : 'ghost'} onClick={() => setPage(p)}>
              {p}
            </Button>))}
          <Button size="sm" variant="ghost" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</Button>
          <Button size="sm" variant="ghost" onClick={() => setPage(totalPages)} disabled={page >= totalPages}>Last</Button>
        </div>
        <div className="flex items-center space-x-2">
          <div className="text-sm text-muted-foreground">Show</div>
          <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="text-sm bg-transparent border rounded px-2 py-1">
            {pageSizeOptions.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
          </select>
          <div className="text-sm text-muted-foreground">/ page</div>
                </div>
                <div className="flex items-center space-x-2">
                    {typeof onDeleteAll === 'function' && totalItems > 0 && (<Button size="sm" variant="destructive" onClick={handleDeleteAll}>
                            Delete all
                        </Button>)}
        </div>
      </div>);
    };
    const renderCardView = () => {
        const { titleField = 'name', subtitleField = 'sku', descriptionField = 'description', priceField = 'price', quantityField = 'quantity', categoryField = 'category', statusField = 'status', imageField = 'image', lowStockThresholdField = 'lowStockThreshold' } = cardViewConfig;
        return (<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 p-4">
        {paginatedData.map((item) => (<Card key={getItemId(item)} className="group relative overflow-hidden bg-gradient-to-br from-background/80 via-background/60 to-background/40 backdrop-blur-md border border-border/50 hover:border-border/80 shadow-lg hover:shadow-xl transition-all duration-300 ease-out transform hover:-translate-y-1 cursor-pointer">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"/>
            <CardContent className="relative space-y-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-lg font-bold leading-tight truncate text-foreground group-hover:text-primary transition-colors duration-300">
                    {item[titleField]}
                  </CardTitle>
                  {item[subtitleField] && (<p className="text-sm text-muted-foreground/80 truncate mt-1 font-medium">
                      {item[subtitleField]}
                    </p>)}
                </div>
                {item[statusField] && (<Badge className={cn('text-xs px-3 py-1.5 rounded-full font-semibold shadow-sm border-0 transition-all duration-200', getStatusColor(item[statusField]))}>
                    <div className="flex items-center gap-1.5">
                      {getStatusIcon(item[statusField])}
                      <span>{item[statusField]}</span>
                    </div>
                  </Badge>)}
              </div>
              {item[descriptionField] && (<div className="relative">
                  <p className="text-sm text-muted-foreground/90 line-clamp-2 leading-relaxed">
                    {item[descriptionField]}
                  </p>
                  <div className="absolute bottom-0 right-0 w-8 h-4 bg-gradient-to-l from-background/80 to-transparent"/>
                </div>)}
              <div className="pt-3 border-t border-border/30 grid grid-cols-2 gap-3">
                                {item[priceField] ? (<div className="bg-gradient-to-r from-green-500/10 to-emerald-500/5 border border-green-500/20 rounded-lg px-3 py-2.5 transition-all duration-200">
                                        <div className="flex items-center gap-2">
                                            <span className="text-green-500 text-xs">THB</span>
                                                                                        <span className="font-bold text-green-600 dark:text-green-400">
                                                                                                {Number(item[priceField]).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                                        </span>
                                        </div>
                                    </div>) : <div />}
                {item[quantityField] !== undefined ? (<div className={cn("rounded-lg px-3 py-2.5 transition-all duration-200 border", getQuantityColorClass(item))}>
                    <div className="flex items-center justify-end gap-2">
                      <Package className={cn("h-4 w-4", getQuantityIconColor(item))}/>
                      <span className={cn("font-bold", getQuantityTextColor(item))}>
                        {item[quantityField]}
                      </span>
                      <span className="text-xs text-muted-foreground font-medium">units</span>
                    </div>
                  </div>) : <div />}
              </div>
              <div className="flex items-center justify-between pt-4">
                <div className="flex items-center gap-2 flex-wrap">
                  {item[categoryField] && (<div className="bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border border-primary/30 rounded-full px-3 py-1.5 transition-all duration-200">
                      <span className="text-xs font-semibold text-primary uppercase tracking-wide">
                        {item[categoryField]}
                      </span>
                    </div>)}
                </div>
                {actions.length > 0 && (<div className="flex items-center gap-1">
                    {actions.map((action, actionIndex) => {
                        const label = action.label?.toLowerCase?.() || '';
                        const colorClass = label === 'view'
                            ? 'text-blue-500 hover:text-blue-600 hover:bg-blue-500/10'
                            : label === 'edit'
                                ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-500/10'
                                : label === 'delete'
                                    ? 'text-red-500 hover:text-red-600 hover:bg-red-500/10'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted';
                        // If an href is provided, use Link so card actions navigate like table actions
                        if (action.href) {
                            return (<Button key={actionIndex} variant={action.variant || 'ghost'} size="sm" className={cn("h-8 w-8 p-0 hover:scale-105 transition-transform duration-150", colorClass)} asChild>
                                          <Link href={action.href.replace(':id', getItemId(item))}>
                                            <span className={cn('inline-flex items-center justify-center w-full h-full')}>{action.icon}</span>
                                          </Link>
                                        </Button>);
                        }

                        return (<button key={actionIndex} onClick={() => {
                                if (action.label === 'Delete' && onDelete) {
                                    handleDelete(item);
                                }
                                else if (action.onClick) {
                                    action.onClick(item);
                                }
                            }} className={cn('p-2.5 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 border border-transparent hover:border-current/20', colorClass)} aria-label={action.label}>
                          {action.icon}
                        </button>);
                    })}
                  </div>)}
              </div>
            </CardContent>
          </Card>))}
      </div>);
    };
    const getQuantityColorClass = (item: any): string => {
        const product: Product = {
            id: getItemId(item),
            quantity: Number(item[cardViewConfig.quantityField || 'quantity'] || 0),
            lowStockThreshold: item[cardViewConfig.lowStockThresholdField || 'lowStockThreshold'],
            low_stock_threshold: item['low_stock_threshold']
        };
        const status = getProductStockStatus(product);
        switch (status.label) {
            case "Out of Stock":
                return 'bg-gradient-to-r from-red-500/10 to-rose-500/5 border border-red-500/20';
            case "Low Stock":
                return 'bg-gradient-to-r from-yellow-500/10 to-orange-500/5 border border-yellow-500/20';
            case "In Stock":
            default:
                return 'bg-gradient-to-r from-blue-500/10 to-indigo-500/5 border border-blue-500/20';
        }
    };
    const getQuantityIconColor = (item: any): string => {
        const product: Product = {
            id: getItemId(item),
            quantity: Number(item[cardViewConfig.quantityField || 'quantity'] || 0),
            lowStockThreshold: item[cardViewConfig.lowStockThresholdField || 'lowStockThreshold'],
            low_stock_threshold: item['low_stock_threshold']
        };
        const status = getProductStockStatus(product);
        switch (status.label) {
            case "Out of Stock":
                return 'text-red-500';
            case "Low Stock":
                return 'text-yellow-500';
            case "In Stock":
            default:
                return 'text-blue-500';
        }
    };
    const getQuantityTextColor = (item: any): string => {
        const product: Product = {
            id: getItemId(item),
            quantity: Number(item[cardViewConfig.quantityField || 'quantity'] || 0),
            lowStockThreshold: item[cardViewConfig.lowStockThresholdField || 'lowStockThreshold'],
            low_stock_threshold: item['low_stock_threshold']
        };
        const status = getProductStockStatus(product);
        switch (status.label) {
            case "Out of Stock":
                return 'text-red-600 dark:text-red-400';
            case "Low Stock":
                return 'text-yellow-600 dark:text-yellow-400';
            case "In Stock":
            default:
                return 'text-blue-600 dark:text-blue-400';
        }
    };
    const getStatusColor = (status: string): string => {
        switch (status?.toLowerCase()) {
            case "in stock":
                return "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-green-500/25";
            case "low stock":
                return "bg-gradient-to-r from-yellow-400 to-yellow-500 text-black shadow-yellow-500/25";
            case "out of stock":
                return "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-red-500/25";
            default:
                return "bg-gradient-to-r from-gray-500 to-slate-500 text-white shadow-gray-500/25";
        }
    };
    const getStatusIcon = (status: string): React.ReactNode => {
        switch (status?.toLowerCase()) {
            case "in stock":
                return <Package className="h-3 w-3"/>;
            case "low stock":
                return <AlertTriangle className="h-3 w-3"/>;
            case "out of stock":
                return <AlertTriangle className="h-3 w-3"/>;
            default:
                return <Package className="h-3 w-3"/>;
        }
    };
    useEffect(() => {
        const container = containerRef.current;
        if (!container)
            return;
        if (viewMode !== 'list') {
            try {
                if (originalTHeadPrevStyleRef.current) {
                    const prev = originalTHeadPrevStyleRef.current;
                    const table = container.querySelector('table') as HTMLTableElement | null;
                    const thead = table?.querySelector('thead') as HTMLElement | null;
                    if (thead) {
                        thead.style.opacity = prev.opacity || '';
                        thead.style.pointerEvents = prev.pointerEvents || '';
                    }
                    originalTHeadPrevStyleRef.current = null;
                }
            }
            catch (e) { }
            if (cloneRef.current) {
                try {
                    cloneRef.current.remove();
                }
                catch (e) { }
                cloneRef.current = null;
            }
            return;
        }
        const table = container.querySelector('table') as HTMLTableElement | null;
        if (!table)
            return;
        if (cloneRef.current) {
            cloneRef.current.remove();
            cloneRef.current = null;
        }
        const thead = table.querySelector('thead');
        if (!thead)
            return;
        const cloneWrapper = document.createElement('div');
        cloneWrapper.style.position = 'absolute';
        cloneWrapper.style.top = '0';
        cloneWrapper.style.left = '0';
        cloneWrapper.style.right = '0';
        cloneWrapper.style.pointerEvents = 'none';
        cloneWrapper.style.zIndex = '60';
        cloneWrapper.className = 'unified-table-clone-header';
        const cloneTable = document.createElement('table');
        cloneTable.className = table.className;
        cloneTable.style.pointerEvents = 'none';
        cloneTable.style.borderCollapse = getComputedStyle(table).borderCollapse || 'separate';
        const theadClone = thead.cloneNode(true) as HTMLElement;
        theadClone.querySelectorAll('button,a,input,select').forEach((el) => (el.setAttribute('tabindex', '-1')));
        cloneTable.appendChild(theadClone);
        cloneWrapper.appendChild(cloneTable);
        container.style.position = container.style.position || 'relative';
        container.appendChild(cloneWrapper);
        cloneRef.current = cloneWrapper;
        const originalTHead = thead as HTMLElement;
        const prevOriginalStyle = {
            opacity: originalTHead.style.opacity,
            pointerEvents: originalTHead.style.pointerEvents,
        };
        originalTHeadPrevStyleRef.current = prevOriginalStyle;
        originalTHead.style.opacity = '0';
        originalTHead.style.pointerEvents = 'none';
        const syncWidths = () => {
            try {
                const origThs = Array.from(thead.querySelectorAll('th'));
                const cloneThs = Array.from(theadClone.querySelectorAll('th'));
                cloneTable.style.width = `${table.getBoundingClientRect().width}px`;
                for (let i = 0; i < cloneThs.length; i++) {
                    const orig = origThs[i] as HTMLElement | undefined;
                    const cl = cloneThs[i] as HTMLElement | undefined;
                    if (orig && cl) {
                        const w = orig.getBoundingClientRect().width;
                        cl.style.boxSizing = 'border-box';
                        cl.style.width = `${w}px`;
                    }
                }
            }
            catch (e) {
            }
        };
        const onScroll = () => {
            if (!cloneRef.current)
                return;
            const scrollLeft = container.scrollLeft;
            cloneRef.current.scrollLeft = scrollLeft;
            cloneRef.current.style.transform = `translateY(${container.scrollTop}px)`;
        };
        const ro = new ResizeObserver(() => syncWidths());
        ro.observe(table);
        ro.observe(container);
        resizeObserverRef.current = ro;
        syncWidths();
        onScroll();
        container.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', syncWidths);
        return () => {
            container.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', syncWidths);
            try {
                if (originalTHeadPrevStyleRef.current) {
                    const prev = originalTHeadPrevStyleRef.current;
                    originalTHead.style.opacity = prev.opacity || '';
                    originalTHead.style.pointerEvents = prev.pointerEvents || '';
                    originalTHeadPrevStyleRef.current = null;
                }
            }
            catch (e) { }
            if (resizeObserverRef.current) {
                try {
                    resizeObserverRef.current.disconnect();
                }
                catch (e) { }
                resizeObserverRef.current = null;
            }
            if (cloneRef.current) {
                try {
                    cloneRef.current.remove();
                }
                catch (e) { }
                cloneRef.current = null;
            }
        };
    }, [data, columns, viewMode]);
    return (<>
      

      {viewMode === 'grid' && enableCardView ? (<div>
          {loading ? (<div className="p-8 text-center text-muted-foreground">Loading...</div>) : error ? (<div className="p-8 text-center text-destructive">Error: {error}</div>) : data.length === 0 ? (<div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4"/>
              <h3 className="text-lg font-semibold mb-2">No items found</h3>
              <p className="text-muted-foreground">{emptyMessage}</p>
            </div>) : (renderCardView())}
          {showPagination && totalItems > 0 && renderPaginationControls()}
        </div>) : (<div className="rounded-lg border border-border/50 bg-background/95 backdrop-blur-sm shadow-sm">
      <div ref={containerRef} className={disableInnerScroll ? 'relative' : 'relative overflow-auto max-h-[900px] hide-scrollbar'}>
            <Table>
              
              <TableHeader className="z-30 bg-muted/60 backdrop-blur-sm border-b border-border/50">
                <TableRow className="border-b hover:bg-muted/10 transition-colors duration-150" style={{ borderColor: 'var(--ui-table-header-border)' }}>
                  {columns.map((column) => (<TableHead key={column.key} className={cn(column.className, 'p-4 text-sm font-semibold text-muted-foreground transition-colors duration-150')} style={column.width ? { width: typeof column.width === 'number' ? `${column.width}px` : column.width } : undefined}>
                      {column.label}
                    </TableHead>))}
                  {actions.length > 0 && (<TableHead className={cn('text-right p-4 text-sm font-semibold text-muted-foreground transition-colors duration-150')} style={{ width: '120px' }}>
                      Actions
                    </TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (<TableRow>
                      <TableCell colSpan={columns.length + (actions.length > 0 ? 1 : 0)} className="text-center p-12 text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>) : error ? (<TableRow>
                      <TableCell colSpan={columns.length + (actions.length > 0 ? 1 : 0)} className="text-center p-12 text-destructive">
                      Error: {error}
                    </TableCell>
                  </TableRow>) : data.length === 0 ? (<TableRow>
                      <TableCell colSpan={columns.length + (actions.length > 0 ? 1 : 0)} className="text-center p-12 text-sm text-muted-foreground">
                      {emptyMessage}
                    </TableCell>
                  </TableRow>) : (paginatedData.map((item, index) => (<TableRow key={getItemId(item)} style={{ height: 65, backgroundColor: 'var(--ui-card-bg)', borderTop: '1px solid var(--ui-card-border)' }} className={cn('group cursor-pointer table-row-hover overflow-hidden rounded-md', 'border border-transparent', 'transition-all duration-200 ease-out')}>
                        {columns.map((column) => {
                    const isProductNameColumn = column.key?.toLowerCase().includes('name') || column.key?.toLowerCase().includes('product') || column.label?.toLowerCase().includes('product');
                    return (<TableCell key={column.key} className={cn(column.className, 'p-4 align-middle transition-colors duration-150')} style={column.width ? { width: typeof column.width === 'number' ? `${column.width}px` : column.width } : undefined}>
                              <div className={cn("min-w-0 flex items-center", isProductNameColumn && "group-hover:text-primary transition-colors duration-300 font-medium")}>
                                {column.render ? column.render(item[column.key], item) : item[column.key]}
                              </div>
                            </TableCell>);
                })}
                            {actions.length > 0 && (<TableCell className="text-right p-4" style={{ width: '120px' }}>
                          <div className="flex items-center justify-end space-x-1 opacity-80 group-hover:opacity-100 transition-opacity duration-150">
                                  {actions.map((action, actionIndex) => {
                        const label = action.label?.toLowerCase?.() || '';
                        const colorClass = label === 'view'
                            ? 'text-blue-500 hover:text-blue-600 hover:bg-blue-500/10 hover-bg-blue border border-transparent hover:border-current/20'
                            : label === 'edit'
                                ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-500/10 hover-bg-amber border border-transparent hover:border-current/20'
                                : label === 'delete'
                                    ? 'text-red-500 hover:text-red-600 hover:bg-red-500/10 hover-bg-red border border-transparent hover:border-current/20'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/10 border border-transparent hover:border-current/20';
                        if (action.href) {
                            return (<Button key={actionIndex} variant={action.variant || 'ghost'} size="sm" className={cn("h-8 w-8 p-0 hover:scale-105 transition-transform duration-150", colorClass)} asChild>
                                          <Link href={action.href.replace(':id', getItemId(item))}>
                                            <span className={cn('inline-flex items-center justify-center w-full h-full')}>{action.icon}</span>
                                          </Link>
                                        </Button>);
                        }
                        return (<Button key={actionIndex} variant={action.variant || 'ghost'} size="sm" className={cn("h-8 w-8 p-0 hover:scale-105 active:scale-95 transition-transform duration-150", colorClass)} onClick={() => {
                                if (action.label === 'Delete' && onDelete) {
                                    handleDelete(item);
                                }
                                else if (action.onClick) {
                                    action.onClick(item);
                                }
                            }}>
                                        <span className="inline-flex items-center justify-center w-full h-full">{action.icon}</span>
                                      </Button>);
                    })}
                          </div>
                        </TableCell>)}
                    </TableRow>)))}
              </TableBody>
            </Table>
          </div>
          {showPagination && totalItems > 0 && renderPaginationControls()}
        </div>)}

      <ConfirmDialog open={confirmOpen} onOpenChange={(open) => {
            setConfirmOpen(open);
            if (!open) {
                setPendingDelete(null);
                setConfirmError(null);
                setIsDeleteAll(false);
            }
        }} title={isDeleteAll ? "Delete all items" : "Delete item"} description={isDeleteAll ? `Delete all ${totalItems} items? This action cannot be undone.` : pendingDelete?.name ? `Delete '${pendingDelete.name}'? This action cannot be undone.` : "Are you sure you want to delete this item? This action cannot be undone."} error={confirmError} confirmLabel={isDeleteAll ? "Delete all" : "Delete"} cancelLabel="Cancel" onConfirm={performDelete}/>
    </>);
}
