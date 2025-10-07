"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UnifiedTable, type TableColumn } from "@/components/stock/unified-table";
import { AlertTriangle, TrendingUp, Package, ShoppingCart, Loader2, RefreshCw } from "lucide-react";
import { getProducts, createPurchaseOrder, createPurchaseOrdersBatch, getSuppliers, type Product, type Supplier } from "@/lib/api";
import { useAppToast } from "@/lib/use-toast";
import { isOutOfStock, isLowStock, getThreshold } from "@/lib/stock-utils";
interface ReorderSuggestion {
    id: string;
    product: string;
    sku: string;
    currentStock: number;
    threshold: number;
    suggestedQuantity: number;
    supplier: string;
    priority: "critical" | "high" | "medium";
    reason: string;
    leadTime: number;
    productId: number;
    supplierId: number | null;
}
interface AutoReorderSuggestionsProps {
    onOrderCreated?: () => void;
}
export function AutoReorderSuggestions({ onOrderCreated }: AutoReorderSuggestionsProps = {}) {
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [selectAll, setSelectAll] = useState(false);
    const [suggestions, setSuggestions] = useState<ReorderSuggestion[]>([]);
    const [outCount, setOutCount] = useState<number>(0);
    const [lowCount, setLowCount] = useState<number>(0);
    const [quantities, setQuantities] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [notifyByEmail, setNotifyByEmail] = useState(false);
    const { push } = useAppToast();
    useEffect(() => {
        loadSuggestions();
    }, []);
    const loadSuggestions = async () => {
        try {
            setLoading(true);
            const [products, suppliers] = await Promise.all([
                getProducts(),
                getSuppliers()
            ]);
            const outOfStockProducts = products.filter(isOutOfStock);
            const lowStockProducts = products.filter(p => !isOutOfStock(p) && isLowStock(p));
            const allProducts = [...outOfStockProducts, ...lowStockProducts];
            const uniqueProducts = allProducts.filter((product, index, self) => index === self.findIndex(p => p.id === product.id));
            const suggestions: ReorderSuggestion[] = uniqueProducts.map(product => {
                const supplier = suppliers.find(s => s.id === product.supplier_id);
                const isOut = isOutOfStock(product);
                const priority: "critical" | "high" | "medium" = isOut ? "critical" : "high";
                const reason = isOut ? "Out of stock" : "Below threshold";
                const threshold = getThreshold(product);
                const suggestedQuantity = Math.max((threshold * 3) - product.quantity, 20);
                return {
                    id: product.id.toString(),
                    product: product.name,
                    sku: product.sku || "",
                    currentStock: product.quantity,
                    threshold: threshold,
                    suggestedQuantity,
                    supplier: supplier?.name || "No Supplier",
                    priority,
                    reason,
                    leadTime: 7,
                    productId: product.id,
                    supplierId: product.supplier_id
                };
            });
            suggestions.sort((a, b) => {
                if (a.priority === "critical" && b.priority !== "critical")
                    return -1;
                if (b.priority === "critical" && a.priority !== "critical")
                    return 1;
                return a.currentStock - b.currentStock;
            });
            setSuggestions(suggestions);
            const initialQuantities: Record<string, number> = {};
            suggestions.forEach(suggestion => {
                initialQuantities[suggestion.id] = suggestion.suggestedQuantity;
            });
            setQuantities(initialQuantities);
            const outRowsCount = suggestions.filter(s => s.reason === 'Out of stock').length;
            const lowRowsCount = suggestions.filter(s => s.reason === 'Below threshold').length;
            setOutCount(outRowsCount);
            setLowCount(lowRowsCount);
        }
        catch (error) {
            console.error('Failed to load suggestions:', error);
            push({
                title: "Error",
                description: "Failed to load reorder suggestions",
                variant: "error",
            });
        }
        finally {
            setLoading(false);
        }
    };
    const handleSelectAll = (checked: boolean) => {
        setSelectAll(checked);
        if (checked) {
            setSelectedItems(suggestions.map((s) => s.id));
        }
        else {
            setSelectedItems([]);
        }
    };
    const handleSelectItem = (id: string, checked: boolean) => {
        if (checked) {
            setSelectedItems([...selectedItems, id]);
        }
        else {
            setSelectedItems(selectedItems.filter((item) => item !== id));
            setSelectAll(false);
        }
    };
    const updateQuantity = (suggestionId: string, quantity: number) => {
        setQuantities(prev => ({
            ...prev,
            [suggestionId]: Math.max(1, quantity)
        }));
    };
    const createPurchaseOrders = async () => {
        if (selectedItems.length === 0)
            return;
        try {
            setCreating(true);
            const selectedSuggestions = suggestions.filter(s => selectedItems.includes(s.id));
            if (selectedSuggestions.length > 1) {
                const batchPayload = selectedSuggestions.map(suggestion => ({
                    product_id: suggestion.productId,
                    supplier_id: suggestion.supplierId,
                    quantity_ordered: quantities[suggestion.id] || suggestion.suggestedQuantity,
                    status: "pending",
                    notes: `Auto-generated order: ${suggestion.reason}`,
                    notify_by_email: notifyByEmail
                }));
                await createPurchaseOrdersBatch(batchPayload);
            }
            else {
                await Promise.all(selectedSuggestions.map(suggestion => createPurchaseOrder({
                    product_id: suggestion.productId,
                    supplier_id: suggestion.supplierId,
                    quantity_ordered: quantities[suggestion.id] || suggestion.suggestedQuantity,
                    status: "pending",
                    notes: `Auto-generated order: ${suggestion.reason}`,
                    notify_by_email: notifyByEmail
                })));
            }
            push({
                title: "Success",
                description: `Created ${selectedSuggestions.length} purchase orders`,
                variant: "success",
            });
            setSelectedItems([]);
            setSelectAll(false);
            onOrderCreated?.();
        }
        catch (error) {
            console.error('Failed to create purchase orders:', error);
            push({
                title: "Error",
                description: "Failed to create purchase orders",
                variant: "error",
            });
        }
        finally {
            setCreating(false);
        }
    };
    const createSingleOrder = async (suggestion: ReorderSuggestion) => {
        try {
            await createPurchaseOrder({
                product_id: suggestion.productId,
                supplier_id: suggestion.supplierId,
                quantity_ordered: quantities[suggestion.id] || suggestion.suggestedQuantity,
                status: "pending",
                notes: `Single order: ${suggestion.reason}`,
                notify_by_email: notifyByEmail
            });
            push({
                title: "Success",
                description: `Created order for ${suggestion.product}`,
                variant: "success",
            });
            onOrderCreated?.();
        }
        catch (error) {
            console.error('Failed to create purchase order:', error);
            push({
                title: "Error",
                description: "Failed to create purchase order",
                variant: "error",
            });
        }
    };
    const getPriorityBadge = (priority: string) => {
        switch (priority) {
            case "critical":
                return <Badge variant="destructive">Critical</Badge>;
            case "high":
                return <Badge variant="secondary">High</Badge>;
            case "medium":
                return <Badge variant="outline">Medium</Badge>;
            default:
                return <Badge variant="default">Low</Badge>;
        }
    };
    const getReasonIcon = (reason: string) => {
        switch (reason) {
            case "Out of stock":
                return <AlertTriangle className="h-4 w-4 text-red-500"/>;
            case "Below threshold":
                return <Package className="h-4 w-4 text-yellow-500"/>;
            case "Trending up":
                return <TrendingUp className="h-4 w-4 text-blue-500"/>;
            default:
                return <Package className="h-4 w-4 text-gray-500"/>;
        }
    };
    return (<div className="space-y-4">
      
      <Card>
        <CardHeader className="flex items-start justify-between">
          <div>
            <CardTitle>Automatic Reorder Suggestions</CardTitle>
          </div>
          <div className="flex items-center space-x-4 mt-1">
            
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (<div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin"/>
              <span className="ml-2">Loading suggestions...</span>
            </div>) : suggestions.length === 0 ? (<div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50"/>
              <p>No reorder suggestions at this time</p>
              <p className="text-sm">All products are adequately stocked</p>
            </div>) : (<div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Checkbox checked={selectAll} onCheckedChange={handleSelectAll}/>
                  <span className="text-sm">Select All ({suggestions.length} items)</span>
                  {selectedItems.length > 0 && <Badge variant="outline">{selectedItems.length} selected</Badge>}
                </div>
                <div className="flex items-center space-x-2">
                  <Button onClick={loadSuggestions} variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2"/>
                    Refresh
                  </Button>
                  <Button onClick={createPurchaseOrders} disabled={selectedItems.length === 0 || creating}>
                    {creating ? (<Loader2 className="h-4 w-4 mr-2 animate-spin"/>) : (<ShoppingCart className="h-4 w-4 mr-2"/>)}
                    Create Purchase Orders
                  </Button>
                  <div className="flex items-center space-x-3 px-2">
                    <span className="text-sm">Notify by email</span>
                    <Switch checked={notifyByEmail} onCheckedChange={(v) => setNotifyByEmail(!!v)}/>
                  </div>
                </div>
              </div>

              
              <div className="overflow-hidden rounded-md border">
                <UnifiedTable data={suggestions} loading={loading} showPagination={false} getItemId={(i) => i.id} getItemName={(i) => i.product} columns={(() => {
                const cols: TableColumn[] = [
                    {
                        key: 'select',
                        label: '',
                        width: 48,
                        render: (_v, item) => (<Checkbox checked={selectedItems.includes(item.id)} onCheckedChange={(checked) => handleSelectItem(item.id, !!checked)}/>)
                    },
                    {
                        key: 'product',
                        label: 'Product',
                        render: (_v, item) => (<div className="flex items-center space-x-2">
                            {getReasonIcon(item.reason)}
                            <div>
                              <p className="font-medium">{item.product}</p>
                              <p className="text-sm text-muted-foreground">{item.sku}</p>
                            </div>
                          </div>)
                    },
                    {
                        key: 'currentStock',
                        label: 'Current Stock',
                        width: 120,
                        render: (_v, item) => (<div className="text-center">
                            <span className={item.reason === 'Out of stock' ? 'text-red-600 font-bold' : item.reason === 'Below threshold' ? 'text-yellow-600 font-medium' : ''}>
                              {item.currentStock}
                            </span>
                            <p className="text-xs text-muted-foreground">/ {item.threshold}</p>
                          </div>)
                    },
                    // Suggested Qty column removed per request
                    {
                        key: 'orderQty',
                        label: 'Order Qty',
                        width: 120,
                        render: (_v, item) => (<Input type="number" min={1} value={quantities[item.id] || item.suggestedQuantity} onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)} className="w-20"/>)
                    },
                    { key: 'supplier', label: 'Supplier', render: (_v, item) => item.supplier },
                    { key: 'priority', label: 'Priority', width: 120, render: (_v, item) => getPriorityBadge(item.priority) },
                                        {
                                                key: 'actions',
                                                label: 'Actions',
                                                width: 180,
                                                render: (_v, item) => (<div className="flex items-center space-x-2">
                                                        <Button size="sm" onClick={() => createSingleOrder(item)}>Order</Button>
                                                    </div>)
                                        }
                ];
                return cols;
            })()}/>
              </div>
            </div>)}
        </CardContent>
      </Card>

      
    </div>);
}
