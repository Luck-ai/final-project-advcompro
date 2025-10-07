"use client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Line, LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Area, AreaChart } from "recharts";
import { useEffect, useState } from "react";
import { getProducts, getSales, getInventoryTrend, Product, filterByTimeRange, getTopProducts, getPurchaseOrders } from "@/lib/api";
import ListItem from "@/components/ui/list-item";
import { useRouter } from "next/navigation";
interface InventoryOverviewProps {
    timeRange: string;
}
const defaultTrend = [{ date: "Now", totalValue: 0, totalItems: 0, turnoverRate: 0 }];
export function InventoryOverview({ timeRange }: InventoryOverviewProps) {
  const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    // stockLevelData removed; using inventoryTrendData based on real products/sales
    const [inventoryTrendData, setInventoryTrendData] = useState<any[]>(defaultTrend);
  const [topProducts, setTopProducts] = useState<Array<{ name: string; sales: number; revenue: number }>>([]);
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  useEffect(() => {
        let mounted = true;
        setLoading(true);
        setError(null);
        async function load() {
            try {
        // prefer server-side monthly inventory trend
    const months = 6;
    const [p, trend] = await Promise.all([getProducts(), getInventoryTrend(months)]);
    // load top products and pending orders
    try {
      const [tops, orders] = await Promise.all([getTopProducts(5), getPurchaseOrders('pending')]);
      if (mounted) {
        setTopProducts(tops || []);
        setPendingOrders((orders || []).slice(0, 5));
      }
    }
    catch (e) {
      // ignore individual list errors
    }
        if (!mounted) return;
        setProducts(p);
        // transform trend to chart-friendly format
        const chartData = trend.map((pt: any) => ({ date: pt.yearMonth, totalValue: Math.round(pt.totalValue), totalItems: pt.totalItems, turnoverRate: pt.turnoverRate }));
        setInventoryTrendData(chartData.length ? chartData : [{ date: 'Now', totalValue: 0, totalItems: 0, turnoverRate: 0 }]);
            }
            catch (err: any) {
                setError(err?.message || 'Failed to load inventory');
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
    return (<div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Inventory Value Trend</CardTitle>
          <CardDescription>Total inventory value and item count over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{
      totalValue: {
        label: "Total Value (THB)",
                color: "hsl(var(--chart-1))",
            },
            totalItems: {
                label: "Total Items",
                color: "hsl(var(--chart-2))",
            },
        }} className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={inventoryTrendData}>
                <CartesianGrid strokeDasharray="3 3"/>
                <XAxis dataKey="date"/>
                <YAxis yAxisId="left"/>
                <YAxis yAxisId="right" orientation="right"/>
                <ChartTooltip content={<ChartTooltipContent />}/>
                <Area yAxisId="left" type="monotone" dataKey="totalValue" stroke="var(--color-chart-1)" fill="var(--color-chart-1)" fillOpacity={0.3}/>
                <Line yAxisId="right" type="monotone" dataKey="totalItems" stroke="var(--color-chart-2)" strokeWidth={2}/>
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

  {/* Stock Levels by Category Card Removed */}

      <Card>
        <CardHeader>
          <CardTitle>Inventory Turnover Rate</CardTitle>
          <CardDescription>How quickly inventory is sold and replaced</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{
            turnoverRate: {
                label: "Turnover Rate",
                color: "hsl(var(--chart-3))",
            },
        }} className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={inventoryTrendData}>
                <CartesianGrid strokeDasharray="3 3"/>
                <XAxis dataKey="date"/>
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />}/>
                <Line type="monotone" dataKey="turnoverRate" stroke="var(--color-chart-3)" strokeWidth={3}/>
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
      {/* Lists row */}
      <div className="md:col-span-2 grid gap-4 grid-cols-1 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Products</CardTitle>
            <CardDescription>Best-selling products</CardDescription>
          </CardHeader>
          <CardContent>
            {topProducts.length === 0 ? (
              <div className="text-sm text-muted-foreground">No sales yet</div>
            ) : (
              <div className="space-y-3">
                {topProducts.slice(0, 5).map((p, idx) => (
                  <ListItem
                    key={p.name}
                    leading={<div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"><span className="text-sm font-semibold text-primary">{idx + 1}</span></div>}
                    title={p.name}
                    subtitle={`${(p.sales || 0).toLocaleString()} units sold`}
                    rightPrimary={`THB ${(Math.round(p.revenue) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    rightSecondary="revenue"
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending Orders</CardTitle>
            <CardDescription>Recent pending purchase orders</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingOrders.length === 0 ? (<div className="text-sm text-muted-foreground">No pending orders</div>) : (
              <div className="space-y-2">
                {pendingOrders.map((o: any, idx) => (
                  <ListItem
                    key={o.id}
                    index={idx + 1}
                    title={`Order #${o.id} — ${o.supplier?.name ?? 'No supplier'}`}
                    rightPrimary={`${o.quantity_ordered ?? 0} items`}
                    onClick={() => router.push(`/dashboard/restock`)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>);
}
