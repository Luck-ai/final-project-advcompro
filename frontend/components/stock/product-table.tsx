"use client";
import { useMemo } from "react";
import { Eye, Edit, Trash2, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { UnifiedTable, TableColumn, TableAction } from "./unified-table";
import { deleteAllProducts } from '@/lib/api';
import { useAppToast } from '@/lib/use-toast';
import type { Product } from "./stock-management";
import { getStockStatus } from "@/lib/stock-utils";
interface ProductTableProps {
    products?: Product[];
    loading?: boolean;
    error?: string | null;
    onEdit?: (product: Product) => void;
    onDelete?: (id: string, name?: string) => void;
    searchTerm?: string;
    selectedCategory?: string;
    selectedStockStatus?: string;
    viewMode?: 'list' | 'grid';
}
export function ProductTable({ products, loading: loadingProp, error: errorProp, onEdit, onDelete, searchTerm = "", selectedCategory, selectedStockStatus, viewMode, }: ProductTableProps) {
    const { push } = useAppToast();
    const activeCategory = selectedCategory ?? 'All';
    const activeStockStatus = selectedStockStatus ?? 'All';
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const filteredProducts = useMemo(() => {
        const sourceProducts = products ?? [];
        if (normalizedSearch === '' &&
            activeCategory === 'All' &&
            activeStockStatus === 'All') {
            return sourceProducts;
        }
        return sourceProducts.filter((product) => {
            const matchesSearch = normalizedSearch === '' ||
                product.name.toLowerCase().includes(normalizedSearch) ||
                product.sku.toLowerCase().includes(normalizedSearch) ||
                product.category.toLowerCase().includes(normalizedSearch) ||
                product.supplier.toLowerCase().includes(normalizedSearch);
            if (!matchesSearch) {
                return false;
            }
            const matchesCategory = activeCategory === 'All' || product.category === activeCategory;
            if (!matchesCategory) {
                return false;
            }
            if (activeStockStatus === 'All') {
                return true;
            }
            const serverLabel = (product as any).statusLabel as string | undefined;
            const computed = getStockStatus(product.quantity, product.lowStockThreshold);
            const currentStatus = serverLabel ?? computed.label;
            return currentStatus === activeStockStatus;
        });
    }, [activeCategory, activeStockStatus, normalizedSearch, products]);
    const columns: TableColumn[] = [
        {
            key: 'name',
            label: 'Product',
            className: 'font-medium',
            width: '26%',
        },
        {
            key: 'sku',
            label: 'SKU',
            className: 'font-mono text-sm',
            width: '12%',
        },
        {
            key: 'category',
            label: 'Category',
            width: '14%',
        },
        {
            key: 'quantity',
            label: 'Quantity',
            width: '12%',
            render: (_, product) => {
                const serverLabel = (product as any).statusLabel as string | undefined;
                const serverIsLow = (product as any).isLowStockFlag as boolean | undefined;
                const computed = getStockStatus(product.quantity, product.lowStockThreshold);
                const isOutOfStockFlagForUI = computed.label === 'Out of Stock';
                const isLowStockFlagForUI = typeof serverIsLow === 'boolean' ? serverIsLow : computed.label === 'Low Stock';
                return (<div className="flex items-center space-x-2">
            <div className="flex flex-col">
              <div className="flex items-center space-x-2">
                <span className={isOutOfStockFlagForUI
                        ? 'text-red-700 font-semibold'
                        : isLowStockFlagForUI
                            ? 'text-yellow-700 font-semibold'
                            : ''}>
                  {product.quantity}
                </span>
                {(isLowStockFlagForUI || isOutOfStockFlagForUI) && (<AlertTriangle className={isOutOfStockFlagForUI
                            ? 'h-4 w-4 text-red-600'
                            : 'h-4 w-4 text-yellow-600'}/>)}
              </div>
              <span className="text-xs text-muted-foreground">
                Low: {product.lowStockThreshold}
              </span>
            </div>
          </div>);
            },
        },
                {
                        key: 'price',
                        label: 'Price',
                        width: '10%',
                        render: (_, product) => (<div className="flex items-center space-x-1">
                    <span className="text-muted-foreground text-xs">THB</span>
                    <span>{Number(product.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>),
                },
        {
            key: 'status',
            label: 'Status',
            width: '12%',
            render: (_, product) => {
                const serverLabel = (product as any).statusLabel as string | undefined;
                const serverVariant = (product as any).statusVariant as string | undefined;
                const computed = getStockStatus(product.quantity, product.lowStockThreshold);
                const label = serverLabel ?? computed.label;
                const variant = (serverVariant as 'destructive' | 'secondary' | 'default') ?? computed.variant;
                // If label indicates Low Stock, apply yellow styling to match quantity
                if (label === 'Low Stock') {
                    return (<Badge variant="warning">{label}</Badge>);
                }
                return <Badge variant={variant}>{label}</Badge>;
            },
        },
        {
            key: 'supplier',
            label: 'Supplier',
            width: '12%',
        },
    ];
    const actions: TableAction[] = [
        {
            icon: <Eye className="h-4 w-4"/>,
            label: 'View',
            onClick: (product) => {
                // navigate to product details when product id available
                try {
                    const id = (product as any)?.id;
                    if (id && typeof window !== 'undefined') {
                        window.location.href = `/dashboard/products/${id}`;
                    }
                }
                catch (_) { }
            },
            href: '/dashboard/products/:id',
        },
        {
            icon: <Edit className="h-4 w-4"/>,
            label: 'Edit',
            onClick: (product) => onEdit?.(product),
        },
        {
            icon: <Trash2 className="h-4 w-4"/>,
            label: 'Delete',
            onClick: (product) => onDelete?.(product?.id, product?.name),
        },
    ];
    const handleDelete = async (id: string, name?: string) => {
        if (onDelete) {
            await onDelete(id, name);
        }
    };

    const handleDeleteAll = async () => {
        try {
            await deleteAllProducts();
            push({ title: 'All products deleted', description: 'All products were removed.', variant: 'success' });
            // reload to refresh parent data
            if (typeof window !== 'undefined' && typeof window.location?.reload === 'function') {
                window.location.reload();
            }
        }
        catch (err: any) {
            push({ title: 'Delete failed', description: err?.message || 'Failed to delete all products', variant: 'error' });
        }
    };
    return (<div className="space-y-4">
    <UnifiedTable data={filteredProducts} columns={columns} actions={actions} loading={Boolean(loadingProp)} error={errorProp ?? null} emptyMessage="No products found" onDelete={handleDelete} onDeleteAll={handleDeleteAll} getItemId={(item) => item.id} getItemName={(item) => item.name} enableCardView={true} cardViewConfig={{
            titleField: 'name',
            subtitleField: 'sku',
            descriptionField: 'description',
            priceField: 'price',
            quantityField: 'quantity',
            categoryField: 'category',
            statusField: 'statusLabel',
            lowStockThresholdField: 'lowStockThreshold',
        }} viewMode={viewMode} onViewModeChange={() => { }}/>
    </div>);
}
