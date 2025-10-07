"use client";
import { useMemo } from "react";
import { Eye, Edit, Trash2, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { UnifiedTable, TableColumn, TableAction } from "./unified-table";
import { deleteAllCategories } from '@/lib/api';
import { useAppToast } from '@/lib/use-toast';
import type { Product } from "./stock-management";
export interface Category {
    id: number;
    name: string;
    description?: string;
    productCount?: number;
}
interface CategoryTableProps {
    categories?: Category[];
    products?: Product[];
    loading?: boolean;
    error?: string | null;
    onEdit?: (category: Category) => void;
    onDelete?: (id: string, name?: string) => void;
    onView?: (category: Category) => void;
    searchTerm?: string;
}
export function CategoryTable({ categories, products, loading, error, onEdit, onDelete, onView, searchTerm = "", }: CategoryTableProps) {
    const { push } = useAppToast();
    const displayCategories = useMemo(() => {
        const source = categories ?? [];
        const counts = new Map<string, number>();
        (products ?? []).forEach((product: Product) => {
            const key = product.category?.toLowerCase();
            if (!key)
                return;
            counts.set(key, (counts.get(key) ?? 0) + 1);
        });
        return source.map((category) => {
            const key = category.name?.toLowerCase() ?? "";
            return {
                ...category,
                productCount: counts.get(key) ?? 0,
            };
        });
    }, [categories, products]);
    const filteredCategories = useMemo(() => {
        const search = searchTerm.trim().toLowerCase();
        if (!search)
            return displayCategories;
        return displayCategories.filter((category) => {
            const name = category.name?.toLowerCase() ?? "";
            const description = category.description?.toLowerCase() ?? "";
            return name.includes(search) || description.includes(search);
        });
    }, [displayCategories, searchTerm]);
    const columns: TableColumn[] = [
        {
            key: 'name',
            label: 'Category Name',
            className: 'font-medium',
        },
        {
            key: 'description',
            label: 'Description',
            className: 'text-sm text-muted-foreground',
            render: (value) => value || '-',
        },
        {
            key: 'productCount',
            label: 'Products',
            render: (_, category) => (<div className="flex items-center space-x-2">
          <Package className="h-4 w-4 text-muted-foreground"/>
          <span>{category.productCount ?? 0} items</span>
        </div>),
        },
        {
            key: 'status',
            label: 'Status',
            render: (_, category) => {
                const count = category.productCount ?? 0;
                return (<Badge variant={count > 0 ? 'default' : 'secondary'}>
            {count > 0 ? 'Active' : 'Unused'}
          </Badge>);
            },
        },
    ];
    const actions: TableAction[] = [
        {
            icon: <Eye className="h-4 w-4"/>,
            label: 'View',
            onClick: (category) => onView?.(category),
        },
        {
            icon: <Edit className="h-4 w-4"/>,
            label: 'Edit',
            onClick: (category) => onEdit?.(category),
        },
        {
            icon: <Trash2 className="h-4 w-4"/>,
            label: 'Delete',
            onClick: () => { },
        },
    ];
    const handleDelete = async (id: string, name?: string) => {
        if (onDelete) {
            await onDelete(id, name);
        }
    };

    const handleDeleteAll = async () => {
        try {
            await deleteAllCategories();
            push({ title: 'All categories deleted', description: 'All categories were removed.', variant: 'success' });
            window.location.reload();
        }
        catch (err: any) {
            push({ title: 'Delete failed', description: err?.message || 'Failed to delete all categories', variant: 'error' });
        }
    };
    return (<div>
      <UnifiedTable data={filteredCategories} columns={columns} actions={actions} loading={Boolean(loading)} error={error ?? null} emptyMessage="No categories found" onDelete={handleDelete} onDeleteAll={handleDeleteAll} getItemId={(item) => String(item.id)} getItemName={(item) => item.name} enableCardView={false} cardViewConfig={{
            titleField: 'name',
            descriptionField: 'description',
        }}/>
    </div>);
}
