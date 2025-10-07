"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SummaryCard } from "@/components/ui/summary-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays, TrendingUp, TrendingDown, Package } from "lucide-react";
import { InventoryOverview } from "./inventory-overview";
import { SalesAnalytics } from "./sales-analytics";
import { CategoryPerformance } from "./category-performance";
import { SupplierAnalytics } from "./supplier-analytics";
import { getRestockSummary, RestockSummary, getSales, getProducts, filterByTimeRange, getSalesSummary } from "@/lib/api";
export function AnalyticsDashboard() {
  const formatCurrency = (val: any) => typeof val === 'number' ? val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : val;
  // timeRange controls removed per request
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [restockSummary, setRestockSummary] = useState<RestockSummary | null>(null);
    const [totalRevenue, setTotalRevenue] = useState<number | null>(null);
  const [totalOrders, setTotalOrders] = useState<number | null>(null);
  const [topCategory, setTopCategory] = useState<string | null>(null);
  const [inventoryValue, setInventoryValue] = useState<number | null>(null);
    useEffect(() => {
        let mounted = true;
        setLoading(true);
        setError(null);
    async function load() {
            try {
        const [summary, salesRaw, products] = await Promise.all([getRestockSummary(), getSales(), getProducts()]);
                if (!mounted)
                    return;
                setRestockSummary(summary);
        // no client-side timeRange filtering here (controls removed)
        const sales = salesRaw || [];
                // Prefer server-calculated summary (uses sale_price from sales table)
        try {
          const summary = await getSalesSummary();
          if (mounted) {
            setTotalRevenue(Math.round(summary.total_revenue));
            setTotalOrders(summary.total_units);
            setTopCategory(summary.top_category ?? null);
          }
        }
        catch (err) {
          // fallback: compute totals from fetched sales (using sale_price)
          const totalRev = sales.reduce((sum: number, s: any) => sum + ((s.sale_price ?? 0) * (s.quantity ?? 0)), 0);
          const totalUnitsSold = sales.reduce((sum: number, s: any) => sum + (s.quantity ?? 0), 0);
          setTotalRevenue(Math.round(totalRev));
          setTotalOrders(totalUnitsSold);
        }
                const invValue = products.reduce((sum: number, p: any) => sum + (p.price) * p.quantity, 0);
                setInventoryValue(Math.round(invValue));
        // removed low/out-of-stock computation (now handled server-side or in other components)
            }
            catch (err: any) {
                setError(err?.message || 'Failed to load analytics');
            }
            finally {
                setLoading(false);
            }
        }
        load();
        return () => {
            mounted = false;
        };
    }, []);
    const kpis = {
        totalRevenue: loading ? '—' : totalRevenue ?? '—',
        revenueChange: 0,
        totalOrders: loading ? '—' : totalOrders ?? '—',
        ordersChange: 0,
  averageOrderValue: '—',
  aovChange: 0,
        inventoryValue: loading ? '—' : inventoryValue ?? '—',
        inventoryChange: 0,
  lowStockItems: restockSummary ? restockSummary.low_stock_items : '—',
  outOfStockItems: restockSummary ? restockSummary.out_of_stock_items : '—',
  topSellingCategory: topCategory ?? '—',
        worstPerformingCategory: '—',
    };
  return (<div className="space-y-6">
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Comprehensive insights into your inventory performance</p>
        </div>
        {/* time-range controls removed */}
      </div>

      
  <div className="grid gap-4 grid-cols-1 md:grid-cols-4 lg:grid-cols-4">
        <SummaryCard>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <span className="text-xs text-muted-foreground font-semibold">THB</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">THB {formatCurrency(kpis.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground flex items-center">
              <TrendingUp className="h-3 w-3 mr-1 text-green-500"/>+{kpis.revenueChange}% from last period
            </p>
          </CardContent>
        </SummaryCard>

        <SummaryCard>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground"/>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.totalOrders.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground flex items-center">
              <TrendingDown className="h-3 w-3 mr-1 text-red-500"/>
              {kpis.ordersChange}% from last period
            </p>
          </CardContent>
        </SummaryCard>

        

        <SummaryCard>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground"/>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">THB {formatCurrency(kpis.inventoryValue)}</div>
            <p className="text-xs text-muted-foreground flex items-center">
              <TrendingUp className="h-3 w-3 mr-1 text-green-500"/>+{kpis.inventoryChange}% from last period
            </p>
          </CardContent>
        </SummaryCard>
        <SummaryCard>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Category</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500"/>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.topSellingCategory}</div>
            <p className="text-xs text-muted-foreground">Best performing category</p>
          </CardContent>
        </SummaryCard>
      </div>

      
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <InventoryOverview timeRange={'30d'}/>
        </TabsContent>

        <TabsContent value="sales" className="space-y-4">
          <SalesAnalytics timeRange={'30d'}/>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <CategoryPerformance timeRange={'30d'}/>
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-4">
          <SupplierAnalytics timeRange={'30d'}/>
        </TabsContent>
      </Tabs>
    </div>);
}
