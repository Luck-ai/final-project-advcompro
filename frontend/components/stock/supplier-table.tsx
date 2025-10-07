"use client";
import { useMemo } from "react";
import { Eye, Edit, Trash2, Mail, Phone, MapPin, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { UnifiedTable, TableColumn, TableAction } from "./unified-table";
import { deleteAllSuppliers } from '@/lib/api';
import { useAppToast } from '@/lib/use-toast';
import type { Product } from "./stock-management";
export interface Supplier {
    id: number;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    productCount?: number;
}
interface SupplierTableProps {
    suppliers?: Supplier[];
    products?: Product[];
    loading?: boolean;
    error?: string | null;
    onEdit?: (supplier: Supplier) => void;
    onDelete?: (id: string, name?: string) => void;
    onView?: (supplier: Supplier) => void;
    searchTerm?: string;
}
export function SupplierTable({ suppliers, products, loading, error, onEdit, onDelete, onView, searchTerm = "", }: SupplierTableProps) {
    const { push } = useAppToast();
    const displaySuppliers = useMemo(() => {
        const source = suppliers ?? [];
        const counts = new Map<string, number>();
        (products ?? []).forEach((product: Product) => {
            const key = product.supplier?.toLowerCase();
            if (!key)
                return;
            counts.set(key, (counts.get(key) ?? 0) + 1);
        });
        return source.map((supplier) => {
            const key = supplier.name?.toLowerCase() ?? "";
            return {
                ...supplier,
                productCount: counts.get(key) ?? supplier.productCount ?? 0,
            };
        });
    }, [products, suppliers]);
    const filteredSuppliers = useMemo(() => {
        const search = searchTerm.trim().toLowerCase();
        if (!search)
            return displaySuppliers;
        return displaySuppliers.filter((supplier) => {
            const matchesName = supplier.name?.toLowerCase().includes(search);
            const matchesEmail = supplier.email?.toLowerCase().includes(search);
            const matchesPhone = supplier.phone?.toLowerCase().includes(search);
            const matchesAddress = supplier.address?.toLowerCase().includes(search);
            return Boolean(matchesName || matchesEmail || matchesPhone || matchesAddress);
        });
    }, [displaySuppliers, searchTerm]);
    const columns: TableColumn[] = [
        {
            key: 'name',
            label: 'Supplier Name',
            className: 'font-medium',
        },
        {
            key: 'contact',
            label: 'Contact Information',
            render: (_, supplier) => (<div className="space-y-1">
          {supplier.email && (<div className="flex items-center space-x-2 text-sm">
              <Mail className="h-3 w-3 text-muted-foreground"/>
              <span>{supplier.email}</span>
            </div>)}
          {supplier.phone && (<div className="flex items-center space-x-2 text-sm">
              <Phone className="h-3 w-3 text-muted-foreground"/>
              <span>{supplier.phone}</span>
            </div>)}
          {!supplier.email && !supplier.phone && (<span className="text-sm text-muted-foreground">-</span>)}
        </div>),
        },
        {
            key: 'address',
            label: 'Address',
            className: 'text-sm text-muted-foreground max-w-[200px]',
            render: (_, supplier) => (<div className="flex items-start space-x-2">
          {supplier.address ? (<>
              <MapPin className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0"/>
              <span className="truncate">{supplier.address}</span>
            </>) : (<span>-</span>)}
        </div>),
        },
        {
            key: 'productCount',
            label: 'Products Supplied',
            render: (_, supplier) => (<div className="flex items-center space-x-2">
          <Package className="h-4 w-4 text-muted-foreground"/>
          <span>{supplier.productCount ?? 0} items</span>
        </div>),
        },
        {
            key: 'status',
            label: 'Status',
            render: (_, supplier) => {
                const count = supplier.productCount ?? 0;
                return (<Badge variant={count > 0 ? 'default' : 'secondary'}>
            {count > 0 ? 'Active' : 'Inactive'}
          </Badge>);
            },
        },
    ];
    const actions: TableAction[] = [
        {
            icon: <Eye className="h-4 w-4"/>,
            label: 'View',
            onClick: (supplier) => onView?.(supplier),
        },
        {
            icon: <Edit className="h-4 w-4"/>,
            label: 'Edit',
            onClick: (supplier) => onEdit?.(supplier),
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
            await deleteAllSuppliers();
            push({ title: 'All suppliers deleted', description: 'All suppliers were removed.', variant: 'success' });
            window.location.reload();
        }
        catch (err: any) {
            push({ title: 'Delete failed', description: err?.message || 'Failed to delete all suppliers', variant: 'error' });
        }
    };
    return (<div>
      <UnifiedTable data={filteredSuppliers} columns={columns} actions={actions} loading={Boolean(loading)} error={error ?? null} emptyMessage="No suppliers found" onDelete={handleDelete} onDeleteAll={handleDeleteAll} getItemId={(item) => String(item.id)} getItemName={(item) => item.name} enableCardView={false} cardViewConfig={{
            titleField: 'name',
            subtitleField: 'email',
            descriptionField: 'address',
            categoryField: 'phone',
        }}/>
    </div>);
}
