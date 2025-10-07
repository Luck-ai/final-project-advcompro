"use client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { useEffect, useState } from "react";
import { getSuppliers, getPurchaseOrders, Supplier, PurchaseOrder, filterByTimeRange } from "@/lib/api";
import ListItem from "@/components/ui/list-item";
interface SupplierAnalyticsProps {
    timeRange: string;
}
export function SupplierAnalytics({ timeRange }: SupplierAnalyticsProps) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
  const [ordersData, setOrdersData] = useState<{
    supplier: string;
    orders: number;
    value: number;
  }[]>([]);
  const [topSkusBySupplier, setTopSkusBySupplier] = useState<Record<string, { sku: string; name?: string; qty: number; value: number; }[]>>({});
  const [mostReorderedSkus, setMostReorderedSkus] = useState<{ sku: string; name?: string; reorderCount: number; totalQty: number }[]>([]);
  const [mostUsedSuppliers, setMostUsedSuppliers] = useState<{ supplier: string; orders: number; completed: number }[]>([]);
    useEffect(() => {
        let mounted = true;
        setLoading(true);
        setError(null);
        async function load() {
            try {
                const [suppliers, ordersRaw] = await Promise.all([getSuppliers(), getPurchaseOrders()]);
                if (!mounted)
                    return;
                const supMap = new Map<number, string>();
                suppliers.forEach((s: any) => supMap.set(s.id, s.name));
                const agg = new Map<number | string, {
                    supplier: string;
                    orders: number;
                    value: number;
                    completed: number;
                }>();
                suppliers.forEach((s: any) => agg.set(s.id, { supplier: s.name, orders: 0, value: 0, completed: 0 }));
                const orders = filterByTimeRange(ordersRaw || [], timeRange, 'order_date');
        orders.forEach((o: any) => {
          const sid = o.supplier_id ?? 'unknown';
          const name = supMap.get(o.supplier_id) || 'Unknown';
          const entry = agg.get(sid) || { supplier: name, orders: 0, value: 0, completed: 0 };
          entry.orders += 1;
          // product.price is stored as a numeric price (dollars), so multiply directly
          const productPrice = Number(o.product?.price ?? 0);
          entry.value += productPrice * (o.quantity_ordered || 0);
          if (o.status === 'completed')
            entry.completed += 1;
          agg.set(sid, entry);
        });
        const ordersArr = Array.from(agg.values()).map((v) => ({ supplier: v.supplier, orders: v.orders, value: Number((v.value || 0).toFixed(2)) }));
                setOrdersData(ordersArr);
                // Build top SKUs per supplier (by qty)
                // Build SKU-level aggregations across all suppliers to support "most reordered" insights
                const skuGlobalAgg = new Map<string, { sku: string; name?: string; reorderCount: number; totalQty: number }>();
                const supplierOrderAgg = new Map<number | string, { supplier: string; orders: number; completed: number }>();

                (ordersRaw || []).forEach((o: any) => {
                  const sid = o.supplier_id ?? 'unknown';
                  const sku = o.product?.sku ?? String(o.product_id ?? 'unknown');
                  const name = o.product?.name || o.product?.title || undefined;
                  const qty = Number(o.quantity_ordered ?? o.quantity ?? 0);

                  // supplier-level counts
                  if (!supplierOrderAgg.has(sid)) supplierOrderAgg.set(sid, { supplier: supMap.get(Number(sid as any)) || (sid === 'unknown' ? 'Unknown' : String(sid)), orders: 0, completed: 0 });
                  const sEntry = supplierOrderAgg.get(sid)!;
                  sEntry.orders += 1;
                  if (o.status === 'completed') sEntry.completed += 1;
                  supplierOrderAgg.set(sid, sEntry);

                  // sku-level reorder counts: consider each distinct purchase order line as a reorder event
                  const cur = skuGlobalAgg.get(sku) || { sku, name, reorderCount: 0, totalQty: 0 };
                  cur.reorderCount += 1;
                  cur.totalQty += qty;
                  skuGlobalAgg.set(sku, cur);
                });

                // pick top 5 most reordered SKUs by reorderCount then totalQty as tiebreaker
                const topSkus = Array.from(skuGlobalAgg.values()).sort((a, b) => {
                  if (b.reorderCount !== a.reorderCount) return b.reorderCount - a.reorderCount;
                  return b.totalQty - a.totalQty;
                }).slice(0, 5).map(s => ({ sku: s.sku, name: s.name, reorderCount: s.reorderCount, totalQty: s.totalQty }));

                // pick top 5 suppliers by orders
                const topSuppliers = Array.from(supplierOrderAgg.values()).sort((a, b) => b.orders - a.orders).slice(0, 5);

                setMostReorderedSkus(topSkus);
                setMostUsedSuppliers(topSuppliers);
                // clear per-supplier card (we're replacing it with the global insights)
                setTopSkusBySupplier({});
        // performance scorecard removed — only keep ordersData aggregation
            }
            catch (err: any) {
                setError(err?.message || 'Failed to load supplier analytics');
            }
            finally {
                setLoading(false);
            }
        }
        load();
        return () => {
            mounted = false;
        };
    }, [timeRange]);
    return (<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Supplier Order Volume</CardTitle>
          <CardDescription>Number of orders placed with each supplier</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{
            orders: {
                label: 'Orders',
                color: 'hsl(var(--chart-1))',
            },
        }} className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ordersData}>
                <CartesianGrid strokeDasharray="3 3"/>
                <XAxis dataKey="supplier" interval={0} tick={{ fontSize: 12 }} angle={-30} textAnchor="end" height={60} />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />}/>
                <Bar dataKey="orders" fill="var(--color-chart-1)"/>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Supplier Order Value</CardTitle>
          <CardDescription>Total value of orders by supplier</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{
            value: {
                label: 'Order Value (THB)',
                color: 'hsl(var(--chart-2))',
            },
        }} className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ordersData}>
                <CartesianGrid strokeDasharray="3 3"/>
                <XAxis dataKey="supplier" interval={0} tick={{ fontSize: 12 }} angle={-30} textAnchor="end" height={60} />
                <YAxis tickFormatter={(v) => `THB ${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                <ChartTooltip content={<ChartTooltipContent formatter={(val: any) => `THB ${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />}/>
                <Bar dataKey="value" fill="var(--color-chart-2)"/>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Global reorder insights: most reordered SKUs and most used suppliers (side-by-side, Top Products UI) */}
      <div className="md:col-span-2 grid gap-4 grid-cols-1 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Most Reordered SKUs</CardTitle>
            <CardDescription>SKUs with the highest number of reorder events</CardDescription>
          </CardHeader>
          <CardContent>
            {mostReorderedSkus.length === 0 ? (
              <div className="text-sm text-muted-foreground">No reorder data available</div>
            ) : (
              <div className="space-y-3">
                {mostReorderedSkus.map((s, idx) => (
                  <ListItem
                    key={s.sku}
                    index={idx + 1}
                    title={s.name ?? s.sku}
                    subtitle={`SKU: ${s.sku}`}
                    rightPrimary={`${s.reorderCount} orders`}
                    rightSecondary={`Total: ${s.totalQty.toLocaleString()} pcs`}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Most Frequently Used Suppliers</CardTitle>
            <CardDescription>Suppliers with the most purchase orders</CardDescription>
          </CardHeader>
          <CardContent>
            {mostUsedSuppliers.length === 0 ? (
              <div className="text-sm text-muted-foreground">No supplier order data available</div>
            ) : (
              <div className="space-y-3">
                {mostUsedSuppliers.map((s, idx) => (
                  <ListItem
                    key={s.supplier}
                    index={idx + 1}
                    title={s.supplier}
                    subtitle={`${s.orders} orders`}
                    rightPrimary={`${s.orders} orders`}
                    rightSecondary={`Completed: ${s.completed}`}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>);
}
