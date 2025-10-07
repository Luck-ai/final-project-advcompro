export function normalizeProduct(p: any) {
    return {
        id: String(p.id ?? ""),
        name: p.name ?? "",
        sku: p.sku ?? "",
        category: p.category?.name ?? p.category ?? "",
        description: p.description ?? "",
        quantity: Number(p.quantity ?? 0),
        price: Number(p.price ?? 0),
        lowStockThreshold: Number(p.low_stock_threshold ?? p.lowStockThreshold ?? 0),
        statusLabel: p.status ?? p.quantity_warning_label ?? undefined,
        statusVariant: p.quantity_warning_variant ?? undefined,
        isLowStockFlag: typeof p.is_low_stock === 'boolean' ? p.is_low_stock : undefined,
        supplier: p.supplier?.name ?? p.supplier ?? "",
        lastUpdated: p.last_updated ?? p.lastUpdated ?? "",
    };
}
