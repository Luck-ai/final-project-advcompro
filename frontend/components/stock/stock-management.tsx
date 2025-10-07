"use client";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SummaryCard } from "@/components/ui/summary-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductTable } from "./product-table";
import { CategoryTable } from "./category-table";
import { SupplierTable } from "./supplier-table";
import { AddProductDialog } from "./add-product-dialog";
import { EditProductDialog } from "./edit-product-dialog";
import { SupplierForm, CategoryForm } from "./forms";
import { Plus, Search, Package, AlertTriangle, Users, Tag, Upload, List, Grid } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { apiFetch, getProducts as fetchProducts, getCategories as fetchCategories, getSuppliers as fetchSuppliers } from '@/lib/api';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useAppToast } from '@/lib/use-toast';
import { normalizeProduct } from '@/lib/response-mappers';
import { getStockCounts } from '@/lib/stock-utils';
export interface Product {
    id: string;
    name: string;
    sku: string;
    category: string;
    description: string;
    quantity: number;
    price: number;
    lowStockThreshold: number;
    supplier: string;
    lastUpdated: string;
    statusLabel?: string;
    statusVariant?: string;
    isLowStockFlag?: boolean;
}
export function StockManagement() {
    const { push: pushToast } = useAppToast();
    const [products, setProducts] = useState<Product[]>([]);
    const [productLoading, setProductLoading] = useState(true);
    const [productError, setProductError] = useState<string | null>(null);
    const [categories, setCategories] = useState<string[]>([]);
    const [categoriesLoading, setCategoriesLoading] = useState(false);
    const [categoriesError, setCategoriesError] = useState<string | null>(null);
    const [suppliers, setSuppliers] = useState<string[]>([]);
    const [suppliersLoading, setSuppliersLoading] = useState(false);
    const [suppliersError, setSuppliersError] = useState<string | null>(null);
    const [fullCategories, setFullCategories] = useState<{
        id: number;
        name: string;
        description?: string;
    }[]>([]);
    const [fullSuppliers, setFullSuppliers] = useState<{
        id: number;
        name: string;
        email?: string;
        phone?: string;
        address?: string;
    }[]>([]);
    const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'suppliers'>('products');
    const [editingCategory, setEditingCategory] = useState<any | null>(null);
    const [editingSupplier, setEditingSupplier] = useState<any | null>(null);
    const [confirmDeleteCategory, setConfirmDeleteCategory] = useState<{
        id: number;
        name?: string;
    } | null>(null);
    const [confirmDeleteSupplier, setConfirmDeleteSupplier] = useState<{
        id: number;
        name?: string;
    } | null>(null);
    const [confirmCategoryError, setConfirmCategoryError] = useState<string | null>(null);
    const [confirmSupplierError, setConfirmSupplierError] = useState<string | null>(null);
    const [viewCategory, setViewCategory] = useState<any | null>(null);
    const [viewSupplier, setViewSupplier] = useState<any | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [selectedStockStatus, setSelectedStockStatus] = useState<string>('All');
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
    const [isCreateCategoryOpen, setIsCreateCategoryOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [uploadErrors, setUploadErrors] = useState<string[] | null>(null);
  const [uploadSummary, setUploadSummary] = useState<{ sales_created: number; total_rows_processed: number; } | null>(null);
  const [isUploadErrorsOpen, setIsUploadErrorsOpen] = useState(false);
    const loadProducts = useCallback(async () => {
        setProductLoading(true);
        try {
            const raw = await fetchProducts();
            const mapped = Array.isArray(raw) ? raw.map((p: any) => normalizeProduct(p)) : [];
            setProducts(mapped);
            setProductError(null);
        }
        catch (err) {
            console.error('Error loading products', err);
            setProductError(`Failed to load products: ${err instanceof Error ? err.message : String(err)}`);
            setProducts([]);
        }
        finally {
            setProductLoading(false);
        }
    }, []);
    const loadCategories = useCallback(async () => {
        setCategoriesLoading(true);
        try {
            const raw = await fetchCategories();
            const list = Array.isArray(raw) ? raw : [];
            const mapped = list.map((c: any) => ({
                id: Number(typeof c === 'object' && c ? c.id ?? 0 : 0),
                name: typeof c === 'object' && c && typeof c.name === 'string'
                    ? c.name
                    : typeof c === 'string'
                        ? c
                        : '',
                description: typeof c === 'object' && c && typeof c.description === 'string'
                    ? c.description
                    : '',
            }));
            const uniqueNames = Array.from(new Set(mapped.map((c) => c.name).filter(Boolean)));
            setFullCategories(mapped);
            setCategories(uniqueNames);
            setCategoriesError(null);
        }
        catch (err) {
            console.error('Error loading categories', err);
            setFullCategories([]);
            setCategories([]);
            setCategoriesError(`Failed to load categories: ${err instanceof Error ? err.message : String(err)}`);
        }
        finally {
            setCategoriesLoading(false);
        }
    }, []);
    const loadSuppliers = useCallback(async () => {
        setSuppliersLoading(true);
        try {
            const raw = await fetchSuppliers();
            const list = Array.isArray(raw) ? raw : [];
            const mapped = list.map((s: any) => ({
                id: Number(typeof s === 'object' && s ? s.id ?? 0 : 0),
                name: typeof s === 'object' && s && typeof s.name === 'string'
                    ? s.name
                    : typeof s === 'string'
                        ? s
                        : '',
                email: typeof s === 'object' && s && typeof s.email === 'string' ? s.email : '',
                phone: typeof s === 'object' && s && typeof s.phone === 'string' ? s.phone : '',
                address: typeof s === 'object' && s && typeof s.address === 'string' ? s.address : '',
            }));
            const uniqueNames = Array.from(new Set(mapped.map((s) => s.name).filter(Boolean)));
            setFullSuppliers(mapped);
            setSuppliers(uniqueNames);
            setSuppliersError(null);
        }
        catch (err) {
            console.error('Error loading suppliers', err);
            setFullSuppliers([]);
            setSuppliers([]);
            setSuppliersError(`Failed to load suppliers: ${err instanceof Error ? err.message : String(err)}`);
        }
        finally {
            setSuppliersLoading(false);
        }
    }, []);
    const loadData = useCallback(async () => {
        await Promise.all([loadProducts(), loadCategories(), loadSuppliers()]);
    }, [loadProducts, loadCategories, loadSuppliers]);
    useEffect(() => {
        void loadData();
    }, [loadData]);
    const refreshCategoriesAndSuppliers = useCallback(async () => {
        await Promise.all([loadCategories(), loadSuppliers()]);
    }, [loadCategories, loadSuppliers]);
    const stockCounts = getStockCounts(products);
    const outOfStockCount = stockCounts.outOfStock;
    const lowStockCountUsingLogic = stockCounts.lowStock;
    const totalProducts = products.length;
    const totalValue = products.reduce((sum, product) => sum + product.quantity * product.price, 0);

  const formatCurrency = (val: any) => typeof val === 'number' ? val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : val;
    const handleAddProduct = async (newProduct: Omit<Product, "id" | "lastUpdated">) => {
        const tempId = Date.now().toString();
        const optimistic: Product = {
            ...newProduct,
            id: tempId,
            category: newProduct.category || '',
            lastUpdated: new Date().toISOString().split('T')[0],
        };
        setProducts((prev) => [...prev, optimistic]);
        pushToast({ title: 'Success', description: `Product "${newProduct.name}" added successfully`, variant: 'success' });
        void loadData();
    };
    const handleAddSupplier = async (supplier: {
        name: string;
        email?: string;
        phone?: string;
        address?: string;
    }) => {
        try {
            const res = await apiFetch('/suppliers/', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: supplier.name, email: supplier.email, phone: supplier.phone, address: supplier.address }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                console.error("Failed to create supplier", err);
                const message = err?.detail || err?.message || JSON.stringify(err) || `Failed to create supplier (status ${res.status})`;
                pushToast({
                    title: "Error",
                    description: `Failed to create supplier: ${message}`,
                    variant: "error"
                });
                return;
            }
            const created = await res.json();
            pushToast({
                title: "Success",
                description: `Supplier "${supplier.name}" created successfully`,
                variant: "success"
            });
        }
        catch (err) {
            console.error("Error creating supplier", err);
            pushToast({
                title: "Error",
                description: `Error creating supplier: ${String(err ?? 'Unknown error')}`,
                variant: "error"
            });
        }
    };
    const handleCreateCategory = async (category: {
        name: string;
        description?: string;
    }) => {
        try {
            const res = await apiFetch('/categories/', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: category.name, description: category.description }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                console.error("Failed to create category", err);
                const message = err?.detail || err?.message || JSON.stringify(err) || `Failed to create category (status ${res.status})`;
                pushToast({
                    title: "Error",
                    description: `Failed to create category: ${message}`,
                    variant: "error"
                });
                return;
            }
            const created = await res.json();
            pushToast({
                title: "Success",
                description: `Category "${category.name}" created successfully`,
                variant: "success"
            });
        }
        catch (err) {
            console.error("Error creating category", err);
            pushToast({
                title: "Error",
                description: `Error creating category: ${String(err ?? 'Unknown error')}`,
                variant: "error"
            });
        }
    };
    const handleEditProduct = (updatedProduct: Product) => {
        setProducts((prev) => prev.map((p) => (p.id === updatedProduct.id ? { ...updatedProduct, lastUpdated: new Date().toISOString().split("T")[0] } : p)));
        setEditingProduct(null);
        pushToast({
            title: "Success",
            description: `Product "${updatedProduct.name}" updated successfully`,
            variant: "success"
        });
        void loadData();
    };
    const handleDeleteProduct = (id: string) => {
        setPendingDelete({ id, name: undefined });
        setConfirmOpen(true);
    };
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pendingDelete, setPendingDelete] = useState<{
        id: string;
        name?: string;
    } | null>(null);
    const [confirmProductError, setConfirmProductError] = useState<string | null>(null);
    async function performDeleteProduct(id: string) {
        try {
            const url = `/products/${id}`;
            setConfirmProductError(null);
            const res = await apiFetch(url, { method: 'DELETE' });
            if (!res.ok) {
                const text = await res.text().catch(() => '');
                const message = text || 'Failed to delete product';
                console.error('Failed to delete product', { status: res.status, body: text });
                setConfirmProductError(message);
                throw new Error(message);
            }
            setProducts((prev) => prev.filter((p) => p.id !== id));
            pushToast({
                title: "Success",
                description: "Product deleted successfully",
                variant: "success"
            });
        }
        catch (err: any) {
            console.error('Error deleting product', err);
            const message = err?.message ?? String(err ?? 'Error deleting product');
            setConfirmProductError(String(message));
            throw err;
        }
    }
    const handleSaveSupplier = async (s: {
        name: string;
        email?: string;
        phone?: string;
        address?: string;
    }) => {
        try {
            const res = await apiFetch('/suppliers/', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: s.name, email: s.email, phone: s.phone, address: s.address }),
            });
            if (res.ok) {
                const created = await res.json().catch(() => null);
                if (created && created.name) {
                    setSuppliers((prev) => (prev.includes(created.name) ? prev : [...prev, created.name]));
                }
                setIsAddSupplierOpen(false);
                pushToast({
                    title: "Success",
                    description: `Supplier "${s.name}" created successfully`,
                    variant: "success"
                });
            }
            else {
                const err = await res.text().catch(() => '');
                console.error("Failed to create supplier", err);
                pushToast({
                    title: "Error",
                    description: `Failed to create supplier: ${err || `Status ${res.status}`}`,
                    variant: "error"
                });
            }
        }
        catch (err) {
            console.error(err);
            pushToast({
                title: "Error",
                description: `Error creating supplier: ${String(err ?? 'Unknown error')}`,
                variant: "error"
            });
        }
    };
    const handleSaveCategory = async (c: {
        name: string;
        description?: string;
    }) => {
        try {
            const res = await apiFetch('/categories/', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: c.name, description: c.description }),
            });
            if (res.ok) {
                const created = await res.json().catch(() => null);
                if (created && created.name) {
                    setCategories((prev) => (prev.includes(created.name) ? prev : [...prev, created.name]));
                }
                setIsCreateCategoryOpen(false);
                pushToast({
                    title: "Success",
                    description: `Category "${c.name}" created successfully`,
                    variant: "success"
                });
            }
            else {
                const err = await res.text().catch(() => '');
                console.error("Failed to create category", err);
                pushToast({
                    title: "Error",
                    description: `Failed to create category: ${err || `Status ${res.status}`}`,
                    variant: "error"
                });
            }
        }
        catch (err) {
            console.error(err);
            pushToast({
                title: "Error",
                description: `Error creating category: ${String(err ?? 'Unknown error')}`,
                variant: "error"
            });
        }
    };
    return (<div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-extrabold">Stock Management</h1>
              <p className="mt-1 text-sm text-muted-foreground">Manage your inventory and track stock levels</p>
            </div>
            <div className="flex items-center space-x-2">
              <Button onClick={async () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.csv';
            input.onchange = async (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (!file)
                    return;
                const formData = new FormData();
                formData.append('file', file);
                try {
          const res = await apiFetch('/sales/upload', { method: 'POST', body: formData });
          // try to parse JSON body for detailed results/errors
          let parsed: any = null;
          try {
            parsed = await res.json();
          }
          catch (e) {
            // ignore parse error
          }

          if (res.ok) {
            const data = parsed || { message: 'Sales uploaded', sales_created: 0, total_rows_processed: 0, errors: [] };
            await loadData();
            const errors = Array.isArray(data.errors) ? data.errors : [];
            setUploadErrors(errors.length ? errors : null);
            setUploadSummary({ sales_created: Number(data.sales_created || 0), total_rows_processed: Number(data.total_rows_processed || 0) });
            if (errors.length) {
              pushToast({ title: 'Upload completed with errors', description: `${data.sales_created}/${data.total_rows_processed} rows uploaded. ${errors.length} rows rejected. Click to view details.`, variant: 'error' });
              setIsUploadErrorsOpen(true);
            }
            else {
              pushToast({ title: 'Success', description: data.message || 'Sales uploaded', variant: 'success' });
            }
          }
          else {
            // non-OK: try to show helpful info from parsed JSON, otherwise show text
            if (parsed && parsed.errors && Array.isArray(parsed.errors) && parsed.errors.length) {
              setUploadErrors(parsed.errors);
              setUploadSummary({ sales_created: Number(parsed.sales_created || 0), total_rows_processed: Number(parsed.total_rows_processed || 0) });
              pushToast({ title: 'Upload failed with errors', description: `${parsed.errors.length} errors. Click to view details.`, variant: 'error' });
              setIsUploadErrorsOpen(true);
            }
            else {
              const txt = await res.text().catch(() => '');
              pushToast({ title: 'Upload failed', description: txt || `Status ${res.status}`, variant: 'error' });
            }
          }
                }
                catch (err) {
                    console.error('Upload sales error', err);
                    pushToast({ title: 'Error', description: 'Failed to upload sales CSV', variant: 'error' });
                }
            };
            input.click();
        }}>
                <Upload className="h-4 w-4 mr-2"/>
                <span>Upload Sales CSV</span>
              </Button>
            </div>
      </div>

      
      <div className="grid gap-4 md:grid-cols-4">
        <div className="cursor-pointer" onClick={() => { setActiveTab('products'); setSelectedStockStatus('All'); }}>
          <SummaryCard>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center space-x-2">
                <Package className="h-4 w-4 text-muted-foreground"/>
                <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalProducts}</div>
              <p className="text-xs text-muted-foreground">Active inventory items</p>
            </CardContent>
          </SummaryCard>
        </div>

        <div className="cursor-pointer" onClick={() => { setActiveTab('products'); setSelectedStockStatus('Out of Stock'); }}>
          <SummaryCard>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-red-600"/>
                <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-700">{outOfStockCount}</div>
              <p className="text-xs text-muted-foreground">Items below threshold</p>
            </CardContent>
          </SummaryCard>
        </div>

        <div className="cursor-pointer" onClick={() => { setActiveTab('products'); setSelectedStockStatus('Low Stock'); }}>
          <SummaryCard>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600"/>
                <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-700">{lowStockCountUsingLogic}</div>
              <p className="text-xs text-muted-foreground">Items low in stock</p>
            </CardContent>
          </SummaryCard>
        </div>

        <div className="cursor-pointer" onClick={() => { setActiveTab('products'); setSelectedStockStatus('All'); }}>
          <SummaryCard>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center space-x-2">
                <span className="text-xs text-muted-foreground font-semibold">THB</span>
                <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">THB {formatCurrency(totalValue)}</div>
              <p className="text-xs text-muted-foreground">Current inventory value</p>
            </CardContent>
          </SummaryCard>
        </div>
      </div>

      
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle>Inventory</CardTitle>
            <CardDescription>Search and manage your product inventory</CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            {activeTab === 'products' && (<>
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2"/>
                  <span>Add Product</span>
                </Button>
                <Button onClick={async () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.csv';
                input.onchange = async (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (!file)
                        return;
                    const formData = new FormData();
                    formData.append('file', file);
                    try {
                        const res = await apiFetch('/products/upload', { method: 'POST', body: formData });
                        if (res.ok) {
                            await loadData();
                            pushToast({ title: 'Success', description: 'Products uploaded', variant: 'success' });
                        }
                        else {
                            const txt = await res.text().catch(() => '');
                            pushToast({ title: 'Upload failed', description: txt || `Status ${res.status}`, variant: 'error' });
                        }
                    }
                    catch (err) {
                        console.error('Upload products error', err);
                        pushToast({ title: 'Error', description: 'Failed to upload products', variant: 'error' });
                    }
                };
                input.click();
            }}>
                  <Upload className="h-4 w-4 mr-2"/>
                  <span>Upload CSV</span>
                </Button>
              </>)}

            {activeTab === 'categories' && (<>
                <Button onClick={() => setIsCreateCategoryOpen(true)}>
                  <Tag className="h-4 w-4 mr-2"/>
                  <span>Add Category</span>
                </Button>
                <Button onClick={async () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.csv';
                input.onchange = async (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (!file)
                        return;
                    const formData = new FormData();
                    formData.append('file', file);
                    try {
                        const res = await apiFetch('/categories/upload', { method: 'POST', body: formData });
                        if (res.ok) {
                            await refreshCategoriesAndSuppliers();
                            await loadData();
                            pushToast({ title: 'Success', description: 'Categories uploaded', variant: 'success' });
                        }
                        else {
                            const txt = await res.text().catch(() => '');
                            pushToast({ title: 'Upload failed', description: txt || `Status ${res.status}`, variant: 'error' });
                        }
                    }
                    catch (err) {
                        console.error('Upload categories error', err);
                        pushToast({ title: 'Error', description: 'Failed to upload categories', variant: 'error' });
                    }
                };
                input.click();
            }}>
                  <Upload className="h-4 w-4 mr-2"/>
                  <span>Upload CSV</span>
                </Button>
              </>)}

            {activeTab === 'suppliers' && (<>
                <Button onClick={() => setIsAddSupplierOpen(true)}>
                  <Users className="h-4 w-4 mr-2"/>
                  <span>Add Supplier</span>
                </Button>
                <Button onClick={async () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.csv';
                input.onchange = async (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (!file)
                        return;
                    const formData = new FormData();
                    formData.append('file', file);
                    try {
                        const res = await apiFetch('/suppliers/upload', { method: 'POST', body: formData });
                        if (res.ok) {
                            await refreshCategoriesAndSuppliers();
                            await loadData();
                            pushToast({ title: 'Success', description: 'Suppliers uploaded', variant: 'success' });
                        }
                        else {
                            const txt = await res.text().catch(() => '');
                            pushToast({ title: 'Upload failed', description: txt || `Status ${res.status}`, variant: 'error' });
                        }
                    }
                    catch (err) {
                        console.error('Upload suppliers error', err);
                        pushToast({ title: 'Error', description: 'Failed to upload suppliers', variant: 'error' });
                    }
                };
                input.click();
            }}>
                  <Upload className="h-4 w-4 mr-2"/>
                  <span>Upload CSV</span>
                </Button>
              </>)}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-3 mb-4">
              <div className="relative flex-1 min-w-0">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/>
              {/* Make search input blend with surrounding Card: remove prominent white border/shadow but keep accessible focus ring */}
              <Input
                placeholder="Search products, SKU, categories, suppliers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 focus-visible:ring-2 focus-visible:ring-primary/40"
              />
            </div>

            
            <div className="flex items-center space-x-2">
              {activeTab === 'products' && (
                <div className="hidden sm:flex items-center space-x-2">
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Category"/>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Categories</SelectItem>
                      {categories.map(category => (<SelectItem key={category} value={category}>{category}</SelectItem>))}
                    </SelectContent>
                  </Select>

                  <Select value={selectedStockStatus} onValueChange={setSelectedStockStatus}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Stock Status"/>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Status</SelectItem>
                      <SelectItem value="In Stock">In Stock</SelectItem>
                      <SelectItem value="Low Stock">Low Stock</SelectItem>
                      <SelectItem value="Out of Stock">Out of Stock</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex items-center space-x-1">
                {/* Always show the List view button */}
                <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('list')}>
                  <List className="h-4 w-4 mr-2"/> List
                </Button>
                {/* Only show Grid view for products (disable for categories/suppliers) */}
                {activeTab === 'products' && (<Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('grid')}>
                  <Grid className="h-4 w-4 mr-2"/> Grid
                </Button>)}
              </div>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'products' | 'categories' | 'suppliers')}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="products" className="flex items-center gap-2">
                <Package className="h-4 w-4"/>
                Products
              </TabsTrigger>
              <TabsTrigger value="categories" className="flex items-center gap-2">
                <Tag className="h-4 w-4"/>
                Categories
              </TabsTrigger>
              <TabsTrigger value="suppliers" className="flex items-center gap-2">
                <Users className="h-4 w-4"/>
                Suppliers
              </TabsTrigger>
            </TabsList>

                        <TabsContent value="products" className="mt-6">

              <ProductTable products={products} loading={productLoading} error={productError} onEdit={setEditingProduct} onDelete={handleDeleteProduct} searchTerm={searchTerm} selectedCategory={selectedCategory} selectedStockStatus={selectedStockStatus} viewMode={viewMode}/>

            </TabsContent>

  

            <TabsContent value="categories" className="mt-6">

              <CategoryTable categories={fullCategories} products={products} loading={categoriesLoading} error={categoriesError} onEdit={setEditingCategory} onDelete={async (id, name) => {
            setConfirmDeleteCategory({ id: Number(id), name });
        }} onView={setViewCategory} searchTerm={searchTerm}/>

            </TabsContent>



            <TabsContent value="suppliers" className="mt-6">

              <SupplierTable suppliers={fullSuppliers} products={products} loading={suppliersLoading} error={suppliersError} onEdit={setEditingSupplier} onDelete={async (id, name) => {
            setConfirmDeleteSupplier({ id: Number(id), name });
        }} onView={setViewSupplier} searchTerm={searchTerm}/>

            </TabsContent>

    
          </Tabs>
          {editingCategory && (<CategoryForm initial={editingCategory} open={true} onOpenChange={(open) => { if (!open)
            setEditingCategory(null); }} onSave={() => { }} onCancel={() => setEditingCategory(null)} onUpdate={async (updated) => {
                setEditingCategory(null);
                await refreshCategoriesAndSuppliers();
                await loadData();
            }}/>)}

          
          {editingSupplier && (<SupplierForm initial={editingSupplier} open={true} onOpenChange={(open) => { if (!open)
            setEditingSupplier(null); }} onSave={() => { }} onCancel={() => setEditingSupplier(null)} onUpdate={async (updated) => {
                setEditingSupplier(null);
                await refreshCategoriesAndSuppliers();
                await loadData();
            }}/>)}

          
          {confirmDeleteCategory && (<ConfirmDialog open={true} onOpenChange={(open) => { if (!open) {
            setConfirmDeleteCategory(null);
            setConfirmCategoryError(null);
        } }} title={`Delete category "${confirmDeleteCategory.name ?? ''}"?`} description="This will remove the category permanently. Note: Categories that are currently used by products cannot be deleted." error={confirmCategoryError} onConfirm={async () => {
                try {
                    setConfirmCategoryError(null);
                    const res = await apiFetch(`/categories/${confirmDeleteCategory.id}`, { method: 'DELETE' });
                    if (!res.ok) {
                        let errorMessage = `Failed to delete category (status ${res.status})`;
                        try {
                            const errorText = await res.text();
                            if (errorText) {
                                try {
                                    const errorData = JSON.parse(errorText);
                                    errorMessage = errorData?.detail || errorData?.message || errorText;
                                }
                                catch {
                                    errorMessage = errorText;
                                }
                            }
                        }
                        catch {
                        }
                        if (errorMessage.toLowerCase().includes('foreign key') ||
                            errorMessage.toLowerCase().includes('constraint') ||
                            errorMessage.toLowerCase().includes('referenced') ||
                            errorMessage.toLowerCase().includes('used by')) {
                            errorMessage = `Cannot delete category "${confirmDeleteCategory.name}". This category is still being used by one or more products. Please remove or reassign those products first.`;
                        }
                        else if (res.status === 409) {
                            errorMessage = `Cannot delete category "${confirmDeleteCategory.name}". This category is still in use.`;
                        }
                        setConfirmCategoryError(errorMessage);
                        pushToast({
                            title: "Cannot Delete Category",
                            description: errorMessage,
                            variant: "error"
                        });
                        return;
                    }
                    setConfirmDeleteCategory(null);
                    pushToast({
                        title: "Success",
                        description: `Category "${confirmDeleteCategory.name}" deleted successfully`,
                        variant: "success"
                    });
                    await refreshCategoriesAndSuppliers();
                }
                catch (err: any) {
                    const message = err?.message ?? String(err ?? 'Error deleting category');
                    console.error('Category deletion error:', err);
                    setConfirmCategoryError(`Error deleting category: ${message}`);
                }
            }}/>)}

          
          {confirmDeleteSupplier && (<ConfirmDialog open={true} onOpenChange={(open) => { if (!open) {
            setConfirmDeleteSupplier(null);
            setConfirmSupplierError(null);
        } }} title={`Delete supplier "${confirmDeleteSupplier.name ?? ''}"?`} description="This will remove the supplier permanently. Note: Suppliers that are currently used by products cannot be deleted." error={confirmSupplierError} onConfirm={async () => {
                try {
                    setConfirmSupplierError(null);
                    const res = await apiFetch(`/suppliers/${confirmDeleteSupplier.id}`, { method: 'DELETE' });
                    if (!res.ok) {
                        let errorMessage = `Failed to delete supplier (status ${res.status})`;
                        try {
                            const errorText = await res.text();
                            if (errorText) {
                                try {
                                    const errorData = JSON.parse(errorText);
                                    errorMessage = errorData?.detail || errorData?.message || errorText;
                                }
                                catch {
                                    errorMessage = errorText;
                                }
                            }
                        }
                        catch {
                        }
                        if (errorMessage.toLowerCase().includes('foreign key') ||
                            errorMessage.toLowerCase().includes('constraint') ||
                            errorMessage.toLowerCase().includes('referenced') ||
                            errorMessage.toLowerCase().includes('used by')) {
                            errorMessage = `Cannot delete supplier "${confirmDeleteSupplier.name}". This supplier is still being used by one or more products. Please remove or reassign those products first.`;
                        }
                        else if (res.status === 409) {
                            errorMessage = `Cannot delete supplier "${confirmDeleteSupplier.name}". This supplier is still in use.`;
                        }
                        console.error('Supplier deletion failed:', { status: res.status, message: errorMessage });
                        setConfirmSupplierError(errorMessage);
                        pushToast({
                            title: "Cannot Delete Supplier",
                            description: errorMessage,
                            variant: "error"
                        });
                        return;
                    }
                    setConfirmDeleteSupplier(null);
                    pushToast({
                        title: "Success",
                        description: `Supplier "${confirmDeleteSupplier.name}" deleted successfully`,
                        variant: "success"
                    });
                    await refreshCategoriesAndSuppliers();
                }
                catch (err: any) {
                    const message = err?.message ?? String(err ?? 'Error deleting supplier');
                    console.error('Supplier deletion error:', err);
                    setConfirmSupplierError(`Error deleting supplier: ${message}`);
                }
            }}/>)}

          
          {viewCategory && (<Dialog open={true} onOpenChange={(open) => { if (!open)
            setViewCategory(null); }}>
              <DialogContent className="sm:max-w-[520px]">
                  <DialogHeader className="sr-only">
                    <DialogTitle>{viewCategory.name}</DialogTitle>
                    <DialogDescription>{viewCategory.description}</DialogDescription>
                  </DialogHeader>
                  <Card>
                    <CardHeader>
                      <CardTitle>{viewCategory.name}</CardTitle>
                      <CardDescription>{viewCategory.description}</CardDescription>
                    </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">Name</div>
                      <div className="font-medium">{viewCategory.name}</div>
                      <div className="text-sm text-muted-foreground">Description</div>
                      <div className="text-sm">{viewCategory.description ?? '—'}</div>
                    </div>
                  </CardContent>
                </Card>
              </DialogContent>
            </Dialog>)}

          
          {viewSupplier && (<Dialog open={true} onOpenChange={(open) => { if (!open)
            setViewSupplier(null); }}>
              <DialogContent className="sm:max-w-[520px]">
                
                <DialogHeader className="sr-only">
                  <DialogTitle>{viewSupplier.name}</DialogTitle>
                  <DialogDescription>{viewSupplier.email ?? ''}{viewSupplier.phone ? ` · ${viewSupplier.phone}` : ''}</DialogDescription>
                </DialogHeader>
                <Card>
                  <CardHeader>
                    <CardTitle>{viewSupplier.name}</CardTitle>
                    <CardDescription>{viewSupplier.email ?? ''}{viewSupplier.phone ? ` · ${viewSupplier.phone}` : ''}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">Name</div>
                      <div className="font-medium">{viewSupplier.name}</div>
                      <div className="text-sm text-muted-foreground">Email</div>
                      <div className="text-sm">{viewSupplier.email ?? '—'}</div>
                      <div className="text-sm text-muted-foreground">Phone</div>
                      <div className="text-sm">{viewSupplier.phone ?? '—'}</div>
                      <div className="text-sm text-muted-foreground">Address</div>
                      <div className="text-sm">{viewSupplier.address ?? '—'}</div>
                    </div>
                  </CardContent>
                </Card>
              </DialogContent>
            </Dialog>)}
        </CardContent>
      </Card>

      
      <AddProductDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} onAdd={handleAddProduct} suppliers={suppliers} categories={categories} onRefresh={loadData}/>

      {/* Upload errors dialog */}
      <Dialog open={isUploadErrorsOpen} onOpenChange={setIsUploadErrorsOpen}>
        <DialogContent className="sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle>Sales CSV Upload Results</DialogTitle>
            <DialogDescription>{uploadSummary ? `${uploadSummary.sales_created}/${uploadSummary.total_rows_processed} rows uploaded` : 'Upload finished'}</DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {uploadErrors && uploadErrors.length > 0 ? (
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">The following rows were rejected. Each entry shows the error message returned by the server.</div>
                <div className="max-h-72 overflow-auto bg-muted p-2 rounded">
                  <ul className="list-disc pl-5 text-sm">
                    {uploadErrors.map((err, idx) => (<li key={idx}><code className="text-xs">{err}</code></li>))}
                  </ul>
                </div>
              </div>
            ) : (<div className="text-sm">No errors reported.</div>)}
          </div>
        </DialogContent>
      </Dialog>

      
      <SupplierForm open={isAddSupplierOpen} onOpenChange={setIsAddSupplierOpen} onCancel={() => setIsAddSupplierOpen(false)} onSave={(s) => handleSaveSupplier(s)} suppliers={suppliers} onUpdate={async () => {
            await refreshCategoriesAndSuppliers();
            await loadData();
        }}/>

      <CategoryForm open={isCreateCategoryOpen} onOpenChange={setIsCreateCategoryOpen} onCancel={() => setIsCreateCategoryOpen(false)} onSave={(c) => handleSaveCategory(c)} categories={categories} onUpdate={async () => {
            await refreshCategoriesAndSuppliers();
            await loadData();
        }}/>

      {editingProduct && (<EditProductDialog open={!!editingProduct} onOpenChange={() => setEditingProduct(null)} product={editingProduct} onEdit={handleEditProduct}/>)}
      <ConfirmDialog open={confirmOpen} onOpenChange={(v) => {
            setConfirmOpen(v);
            if (!v) {
                setPendingDelete(null);
                setConfirmProductError(null);
            }
        }} title="Delete product" description={pendingDelete && pendingDelete.name ? `Delete '${pendingDelete.name}'? This action cannot be undone.` : "Are you sure you want to delete this product? This action cannot be undone."} error={confirmProductError} confirmLabel="Delete" cancelLabel="Cancel" onConfirm={async () => {
            if (!pendingDelete)
                return;
            await performDeleteProduct(pendingDelete.id);
        }}/>
    </div>);
}
