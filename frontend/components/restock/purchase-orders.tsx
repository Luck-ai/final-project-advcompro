"use client";
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UnifiedTable, type TableColumn } from "@/components/stock/unified-table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, Clock, AlertCircle, Package, Loader2, RefreshCw, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useRouter } from 'next/navigation';
import { getPurchaseOrders, updatePurchaseOrder, updatePurchaseOrdersByGroup, type PurchaseOrder } from "@/lib/api";
// Rating dialog and inputs removed
import { useAppToast } from "@/lib/use-toast";
export function PurchaseOrders() {
    const [orders, setOrders] = useState<PurchaseOrder[]>([]);
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>("all");
  // Rating state removed
    const { push } = useAppToast();
    const router = useRouter();
    useEffect(() => {
        loadOrders();
    }, [statusFilter]);
    const loadOrders = async () => {
        try {
            setLoading(true);
            const filterStatus = statusFilter === "all" ? undefined : statusFilter;
            const data = await getPurchaseOrders(filterStatus);
            setOrders(data);
        }
        catch (error) {
            console.error('Failed to load purchase orders:', error);
            push({ title: "Error", description: "Failed to load purchase orders", variant: "error" });
        }
        finally {
            setLoading(false);
        }
    };
    const formatDate = (d?: string | null) => {
        if (!d)
            return '';
        try {
            const dt = new Date(d);
            if (isNaN(dt.getTime()))
                return d;
            return dt.toLocaleDateString();
        }
        catch (e) {
            return d;
        }
    };
    const buildGroups = (ordersList: typeof orders) => {
        const map = new Map<string, any>();
        if (process.env.NODE_ENV !== 'production')
            console.debug('[PurchaseOrders] buildGroups input count', ordersList.length);
        for (const o of ordersList) {
            const rawGroup = (o as any).group_id ?? (o as any).groupId ?? null;
            const key = rawGroup || `individual-${o.id}`;
            if (process.env.NODE_ENV !== 'production')
                console.debug('[PurchaseOrders] order', o.id, 'groupKey', key, 'rawGroup', rawGroup);
            const entry = map.get(key) || {
                key,
                ids: [] as number[],
                items: [] as any[],
                totalQuantity: 0,
                totalValue: 0,
                order_date: o.order_date,
                status: 'pending',
                supplier: o.supplier,
                statuses: new Set<string>(),
                isGrouped: !!rawGroup
            };
            entry.ids.push(o.id);
            entry.items.push(o);
            entry.totalQuantity += (o.quantity_ordered ?? 0);
            entry.statuses.add(o.status || 'pending');
            const unitPrice = (o.product?.price ?? 0) || 0;
            entry.totalValue += unitPrice * (o.quantity_ordered ?? 0);
            if (!entry.order_date && o.order_date)
                entry.order_date = o.order_date;
            map.set(key, entry);
        }
        const arr = Array.from(map.values());
        arr.forEach(group => {
            const statuses = Array.from(group.statuses);
            if (statuses.length === 1) {
                group.status = statuses[0];
            }
            else if (statuses.includes('pending')) {
                group.status = 'pending';
            }
            else if (statuses.includes('completed')) {
                group.status = 'completed';
            }
            else {
                group.status = 'cancelled';
            }
            delete group.statuses;
        });
        arr.sort((a, b) => {
            const da = a.order_date ? new Date(a.order_date).getTime() : 0;
            const db = b.order_date ? new Date(b.order_date).getTime() : 0;
            return db - da;
        });
        return arr;
    };
    const getStatusBadge = (status?: string) => {
        const s = (status || '').toLowerCase();
        if (s === 'completed')
            return <Badge className="text-xs px-2 py-1 inline-flex items-center"><CheckCircle className="h-3 w-3 mr-1"/> Completed</Badge>;
        if (s === 'pending')
            return <Badge className="text-xs px-2 py-1 inline-flex items-center"><Clock className="h-3 w-3 mr-1"/> Pending</Badge>;
        if (s === 'cancelled' || s === 'canceled')
            return <Badge className="text-xs px-2 py-1 inline-flex items-center"><AlertCircle className="h-3 w-3 mr-1"/> Cancelled</Badge>;
        return <Badge className="text-xs px-2 py-1 inline-flex items-center">{status}</Badge>;
    };
  // Rating handlers removed
    const handleStatusUpdate = async (id: number, status: string) => {
        try {
            await updatePurchaseOrder(id, { status });
            setOrders((prev) => prev.map(o => o.id === id ? { ...o, status } : o));
            push({ title: 'Success', description: `Order ${id} marked ${status}` });
        }
        catch (err) {
            console.error('Failed to update status', err);
            push({ title: 'Error', description: 'Failed to update order status', variant: 'error' });
        }
    };
    const handleGroupStatusUpdate = async (groupKey: string, isGrouped: boolean, orderIds: number[], status: string) => {
        try {
            if (isGrouped && groupKey && !groupKey.startsWith('individual-')) {
                await updatePurchaseOrdersByGroup(groupKey, { status });
                setOrders((prev) => prev.map(o => orderIds.includes(o.id) ? { ...o, status } : o));
                push({ title: 'Success', description: `Group orders marked ${status}` });
            }
            else {
                await Promise.all(orderIds.map(id => updatePurchaseOrder(id, { status })));
                setOrders((prev) => prev.map(o => orderIds.includes(o.id) ? { ...o, status } : o));
                push({ title: 'Success', description: `Orders marked ${status}` });
            }
        }
        catch (err) {
            console.error('Failed to update group status', err);
            push({ title: 'Error', description: 'Failed to update order status', variant: 'error' });
        }
    };
    if (loading) {
        return (<Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin"/>
          <span className="ml-2">Loading order history...</span>
        </CardContent>
      </Card>);
    }
    if (orders.length === 0) {
        return (<Card>
        <CardHeader>
          <CardTitle>Order History</CardTitle>
          <CardDescription>Your purchase order history will appear here</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8 text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-4 opacity-50"/>
          <p className="text-lg font-medium">No order history found</p>
          <p className="text-sm">Once you create purchase orders, they will appear here</p>
        </CardContent>
      </Card>);
    }
    const groups = buildGroups(orders);
    const handleRowClick = (g: any) => {
        if (!g || g.__child)
            return;
        if (g.isGrouped) {
            setExpandedGroups(prev => ({ ...prev, [g.key]: !prev[g.key] }));
            return;
        }
        const first = g.items?.[0];
        const productId = first?.product?.id;
        if (productId) {
            router.push(`/dashboard/products/${productId}`);
        }
        else {
            router.push(`/dashboard/purchase-orders/${g.ids?.[0] ?? ''}`);
        }
    };
    const wrapClickable = (row: any, content: React.ReactNode) => {
        if (!row || row.__child)
            return content;
        return (<div onClick={() => handleRowClick(row)} className="w-full h-full">
        {content}
      </div>);
    };
    const rowsForTable: any[] = [];
    for (const g of groups) {
        rowsForTable.push(g);
        if (expandedGroups[g.key]) {
            for (const item of g.items) {
                rowsForTable.push({
                    __child: true,
                    key: `child-${g.key}-${item.id}`,
                    parentKey: g.key,
                    item,
                    totalQuantity: item.quantity_ordered ?? 0,
                    totalValue: ((item.product?.price ?? 0) * (item.quantity_ordered ?? 0)),
                    order_date: item.order_date ?? g.order_date,
                    status: item.status ?? g.status,
                });
            }
        }
    }
    const columns: TableColumn[] = [
        { key: 'orderId', label: 'Order ID', width: 160, render: (_v, row) => {
                if (row && row.__child) {
                    return null;
                }
                const g = row;
                const content = (<div className="space-y-1">
          {g.isGrouped ? (<div>
              <div className="font-semibold text-primary flex items-center gap-1">
                <Package className="h-3 w-3"/>
                Group #{g.key.substring(0, 8)}
              </div>
              <div className="text-xs text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded">
                {g.ids.length} orders
              </div>
            </div>) : (<div className="font-medium text-foreground">#{g.ids[0]}</div>)}
        </div>);
                return wrapClickable(g, content);
            } },
        { key: 'products', label: 'Product(s)', render: (_v, row) => {
                if (row && row.__child) {
                    const item = row.item;
                    return (<div className="min-w-0">
            <Link href={`/dashboard/products/${item.product?.id ?? ''}`} onClick={(e) => e.stopPropagation()} className="font-medium text-foreground hover:text-primary transition-colors block truncate group-hover:underline">
              {item.product ? item.product.name : `Product #${item.product_id}`}
            </Link>
            {item.product?.sku && (<div className="text-xs text-muted-foreground font-mono bg-muted/30 px-1 py-0.5 rounded inline-block mt-1">{item.product.sku}</div>)}
          </div>);
                }
                const g = row;
                const first = g.items[0];
                const itemCount = g.items.length;
                const supplierName = first?.supplier?.name || (itemCount > 1 ? 'Multiple' : 'No Supplier');
                const orderDate = formatDate(g.order_date);
                const content = (<div className="w-full">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              {itemCount === 1 ? (<div className="space-y-1">
                  <div className="font-medium text-foreground leading-tight">
                    {first?.product ? (<Link href={`/dashboard/products/${first.product.id}`} onClick={(e) => e.stopPropagation()} className="hover:text-primary hover:underline transition-colors">
                        {first.product.name}
                      </Link>) : (<span className="text-muted-foreground">Unknown Product</span>)}
                  </div>
                  {((first?.product) as any)?.sku && (<div className="text-xs text-muted-foreground font-mono bg-muted/30 px-1.5 py-0.5 rounded inline-block">
                      {((first?.product) as any).sku}
                    </div>)}
                </div>) : (<div className="space-y-1">
                  <div className="font-medium text-foreground flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary"/>
                    <span>{itemCount} Products</span>
                  </div>
                  <div className="text-xs text-muted-foreground">Total: {g.totalQuantity} items</div>
                </div>)}
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right space-y-1">
                <div className="text-xs text-muted-foreground font-medium">{supplierName}</div>
                <div className="text-xs text-muted-foreground">{orderDate}</div>
              </div>

            </div>
          </div>
        </div>);
                return wrapClickable(g, content);
            } },
        { key: 'supplier', label: 'Supplier', width: 180, render: (_v, row) => {
                if (row && row.__child) {
                    const item = row.item;
                    return (<div className={`font-medium ${!item.supplier ? 'text-muted-foreground' : 'text-foreground'}`}>{item.supplier?.name ?? 'No Supplier'}</div>);
                }
                if (row && !row.__child) {
                    const g = row;
                    const supplierName = g.items[0].supplier?.name || (g.items.length > 1 ? 'Multiple' : 'No Supplier');
                    const isMultiple = g.items.length > 1 && !g.items.every((item: any) => item.supplier?.id === g.items[0].supplier?.id);
                    return (wrapClickable(g, <div className="space-y-1">
            <div className={`font-medium ${supplierName === 'No Supplier' ? 'text-muted-foreground' : 'text-foreground'}`}>{supplierName}</div>
            {isMultiple && (<div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/20 px-1.5 py-0.5 rounded">Mixed suppliers</div>)}
          </div>));
                }
                return null;
            } },
        { key: 'quantity', label: 'Quantity', width: 120, render: (_v, row) => {
                if (row && row.__child) {
                    const item = row.item;
                    return (<div className="text-right font-semibold">{(item.quantity_ordered ?? 0).toLocaleString()}</div>);
                }
                const g = row;
                return wrapClickable(g, (<div className="text-right space-y-1">
          <div className="font-semibold text-foreground">{g.totalQuantity.toLocaleString()}</div>
          {g.items.length > 1 && (<div className="text-xs text-muted-foreground">{g.items.length} items</div>)}
        </div>));
            } },
        { key: 'value', label: 'Total Value', width: 140, render: (_v, row) => {
                if (row && row.__child) {
                    const item = row.item;
                    const val = (((item.product?.price ?? 0)) * (item.quantity_ordered ?? 0));
                    return (<div className="text-right font-semibold">THB {val.toFixed(2)}</div>);
                }
                const g = row;
                return wrapClickable(g, (<div className="text-right space-y-1">
          <div className="font-semibold text-foreground">THB {g.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          {g.items.length > 1 && (<div className="text-xs text-muted-foreground">Avg: THB {(g.totalValue / g.items.length).toFixed(2)}</div>)}
        </div>));
            } },
        { key: 'date', label: 'Order Date', width: 140, render: (_v, row) => { if (row && row.__child)
                return formatDate(row.order_date ?? row.item?.order_date); return formatDate(row.order_date); } },
        { key: 'status', label: 'Status', width: 120, render: (_v, row) => {
                const s = row && row.__child ? (row.item?.status ?? row.status) : (row?.status);
                const status = (s || '').toLowerCase();
                if (status === 'completed') {
                    return <div title="Completed" aria-label="Completed" className="text-green-600"><CheckCircle className="h-4 w-4"/></div>;
                }
                if (status === 'pending') {
                    return <div title="Pending" aria-label="Pending" className="text-amber-600"><Clock className="h-4 w-4 animate-pulse"/></div>;
                }
                if (status === 'cancelled' || status === 'canceled') {
                    return <div title="Cancelled" aria-label="Cancelled" className="text-red-600"><AlertCircle className="h-4 w-4"/></div>;
                }
                return <div className="text-muted-foreground">-</div>;
            } },
        { key: 'actions', label: 'Actions', width: 300, render: (_v, row) => {
                if (row && row.__child)
                    return null;
                const g = row;
                return (<div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 ml-auto">
            {g.status === "pending" && (<>
                <Button size="sm" variant="default" className="h-8 w-8 p-0 rounded-md bg-green-600 hover:bg-green-700 text-white" onClick={(e) => { e.stopPropagation(); handleGroupStatusUpdate(g.key, g.isGrouped, g.ids, 'completed'); }} aria-label="Mark completed">
                  <CheckCircle className="h-4 w-4"/>
                </Button>
                <Button size="sm" variant="destructive" className="h-8 w-8 p-0 rounded-md" onClick={(e) => { e.stopPropagation(); handleGroupStatusUpdate(g.key, g.isGrouped, g.ids, 'cancelled'); }} aria-label="Cancel order">
                  <AlertCircle className="h-4 w-4"/>
                </Button>
              </>)}
            {g.status === 'completed' && null}
          </div>
        </div>);
            } },
    ];
    return (<div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              
              {/* Rating UI removed */}

              <CardTitle>Purchase Order History</CardTitle>
              <CardDescription>View and manage your purchase orders</CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by status"/>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={loadOrders}>
                <RefreshCw className="h-4 w-4 mr-2"/>
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <UnifiedTable data={rowsForTable} columns={columns} showPagination={false} getItemId={(r) => r.key}/>
        </CardContent>
      </Card>
    </div>);
}
