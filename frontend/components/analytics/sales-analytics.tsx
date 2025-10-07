"use client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Line, LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { useEffect, useState } from "react";
import { getSales, getProducts, filterByTimeRange, getCategories, parseTimeRange } from "@/lib/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
interface SalesAnalyticsProps {
    timeRange: string;
}
export function SalesAnalytics({ timeRange }: SalesAnalyticsProps) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
  // topProducts removed from this view (moved to other UI)
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [granularity, setGranularity] = useState<'weekly' | 'monthly'>('monthly');
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  useEffect(() => {
        let mounted = true;
        setLoading(true);
        setError(null);
        async function load() {
            try {
        const [salesRaw, products, cats] = await Promise.all([getSales(), getProducts(), getCategories()]);
        if (mounted) {
          setCategories((cats || []).map((c: any) => ({ id: c.id, name: c.name })));
        }
                if (!mounted)
                    return;
                // Robust filtering by time range: try multiple possible date fields and fall back to all sales
                const since = parseTimeRange(timeRange);
                const salesAll = salesRaw || [];
        const sales = since
                    ? salesAll.filter((it: any) => {
                        const raw = it?.sale_date || it?.date || it?.saleDate || it?.created_at || it?.timestamp;
                        if (!raw) return false;
                        const d = new Date(raw);
                        if (!isNaN(d.getTime())) return d >= since;
                        // try parsing as numeric timestamp
                        const num = Number(raw);
                        if (!isNaN(num)) return new Date(num) >= since;
                        return false;
                      })
                    : salesAll;
  const productMap = new Map<number, any>();
        products.forEach((p) => productMap.set(p.id, p));

        // Filter sales by selected category if any
        const filteredSales = sales.filter((s: any) => {
          if (selectedCategory === 'all') return true;
          const p = productMap.get(s.product_id);
          return p?.category_id === Number(selectedCategory);
        });

                // Build monthly aggregation for revenue and orders
                const buildMonthly = (salesList: any[]) => {
                  const monthly: Record<string, { month: string; revenue: number; orders: number }> = {};
                  salesList.forEach((sale: any) => {
                    const date = new Date(sale.sale_date || Date.now());
                    let key: string;
                    if (granularity === 'weekly') {
                      // Calculate week number
                      const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
                      const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
                      const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
                      key = `${date.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
                    } else {
                      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                    }
                    const price = Number(sale.sale_price ?? productMap.get(sale.product_id)?.price ?? 0);
                    const qty = sale.quantity ?? 0;
                    if (!monthly[key]) monthly[key] = { month: key, revenue: 0, orders: 0 };
                    monthly[key].revenue += price * qty;
                    monthly[key].orders += qty;
                  });
                  return Object.values(monthly).sort((a, b) => a.month.localeCompare(b.month));
                };

                let monthsArr = buildMonthly(filteredSales);
                // Fallback: if no data in selected time range but there are sales overall, show all-time data
                if ((!monthsArr || monthsArr.length === 0) && salesAll.length > 0) {
                  const salesForCategory = salesAll.filter((s: any) => {
                    if (selectedCategory === 'all') return true;
                    const p = productMap.get(s.product_id);
                    return p?.category_id === Number(selectedCategory);
                  });
                  monthsArr = buildMonthly(salesForCategory);
                }
                setMonthlyData(monthsArr);

                // Debug logs
                console.debug('sales-all-count', salesAll.length);
                console.debug('filtered-sales-count', filteredSales.length);
                console.debug('months-count', monthsArr.length, monthsArr);

  // top products aggregation removed from this effect
            }
            catch (err: any) {
                setError(err?.message || 'Failed to load sales data');
            }
            finally {
                setLoading(false);
            }
        }
        load();
        return () => {
            mounted = false;
        };
  }, [timeRange, selectedCategory, granularity]);
  

  const formatMonthLabel = (monthKey: string) => {
    try {
      if (granularity === 'weekly') {
        // monthKey format: YYYY-W##
        const match = monthKey.match(/^(\d{4})-W(\d+)$/);
        if (match) {
          return `Week ${Number(match[2])}, ${match[1]}`;
        }
        return monthKey;
      } else {
        const [y, m] = monthKey.split('-').map((v) => Number(v));
        const d = new Date(y, (m || 1) - 1, 1);
        return d.toLocaleString(undefined, { month: 'short', year: 'numeric' });
      }
    }
    catch (e) {
      return monthKey;
    }
  };

  // KPI calculations derived from monthlyData (used for top KPI row)
  const totalRevenue = monthlyData.reduce((s, m) => s + (Number(m.revenue) || 0), 0);
  const totalOrders = monthlyData.reduce((s, m) => s + (Number(m.orders) || 0), 0);
  const avgMonthlyRevenue = monthlyData.length > 0 ? totalRevenue / monthlyData.length : 0;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  let monthlyCagr = 0;
  let cagrAvailable = false;
  if (monthlyData.length >= 2) {
    const firstNonZeroIndex = monthlyData.findIndex((m: any) => Number(m.revenue) > 0);
    let lastNonZeroIndex = -1;
    for (let i = monthlyData.length - 1; i >= 0; i--) {
      if (Number(monthlyData[i].revenue) > 0) {
        lastNonZeroIndex = i;
        break;
      }
    }
    if (firstNonZeroIndex >= 0 && lastNonZeroIndex > firstNonZeroIndex) {
      const start = Number(monthlyData[firstNonZeroIndex].revenue);
      const end = Number(monthlyData[lastNonZeroIndex].revenue);
      const periods = lastNonZeroIndex - firstNonZeroIndex; // number of intervals
      if (start > 0 && end > 0 && periods > 0) {
        monthlyCagr = Math.pow(end / start, 1 / periods) - 1;
        cagrAvailable = Number.isFinite(monthlyCagr);
      }
    }
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (<div className="space-y-6 w-full">

          {/* KPI row (show when data present and not loading) */}
          {!loading && monthlyData.length > 0 && (
            <div className="px-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent>
                    <div className="text-xs text-muted-foreground">Total Revenue</div>
                    <div className="text-2xl font-bold">THB {Math.round(totalRevenue).toLocaleString()}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent>
                    <div className="text-xs text-muted-foreground">Avg Monthly Revenue</div>
                    <div className="text-2xl font-bold">THB {Math.round(avgMonthlyRevenue).toLocaleString()}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent>
                    <div className="text-xs text-muted-foreground">Monthly CAGR</div>
                    <div className={`text-2xl font-bold ${monthlyCagr >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>{cagrAvailable ? `${(monthlyCagr * 100).toFixed(1)}%` : 'N/A'}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent>
                    <div className="text-xs text-muted-foreground">Avg Order Value</div>
                    <div className="text-2xl font-bold">THB {Math.round(avgOrderValue).toLocaleString()}</div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center h-[420px]">
              <div className="text-sm text-muted-foreground">Loading chart data...</div>
            </div>
          ) : monthlyData.length === 0 ? (
            <div className="flex items-center justify-center h-[420px] border border-dashed rounded-lg">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">No sales data available</p>
                <p className="text-xs text-muted-foreground mt-1">Try selecting a different category or time range</p>
              </div>
            </div>
          ) : (
            <>
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-2xl">Sales Revenue Trend</CardTitle>
                    <CardDescription className="mt-1">Track your {granularity === 'weekly' ? 'weekly' : 'monthly'} revenue performance</CardDescription>
                    
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={granularity} onValueChange={(v) => setGranularity(v as 'weekly' | 'monthly')} disabled={loading}>
                      <SelectTrigger className="w-32 border-input">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={selectedCategory} onValueChange={(v) => setSelectedCategory(v)} disabled={loading}>
                      <SelectTrigger className="w-48 border-input">
                        <SelectValue placeholder="Filter by category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map((c) => (<SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <ChartContainer config={{
                  revenue: {
                    label: 'Revenue (THB)',
                    color: 'hsl(var(--chart-1))',
                  },
                  orders: {
                    label: 'Orders',
                    color: 'hsl(var(--chart-2))',
                  },
                }} className="h-[420px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="4 6" stroke="rgba(99,102,241,0.12)" strokeWidth={1} />
                      <XAxis 
                        dataKey="month" 
                        tickFormatter={formatMonthLabel}
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickFormatter={(value) => `THB ${value.toLocaleString()}`}
                      />
                      <ChartTooltip 
                        content={<ChartTooltipContent />}
                        cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }}
                      />
                      <Line 
                        dataKey="revenue" 
                        type="monotone" 
                        stroke="var(--color-chart-1)" 
                        strokeWidth={3} 
                        dot={{ r: 4, fill: 'var(--color-chart-1)', strokeWidth: 2, stroke: 'hsl(var(--background))' }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
            {/* Units sold trend chart */}
            <div className="mt-6">
              <Card className="border-border shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Units Sold Trend</CardTitle>
                      <CardDescription className="mt-1">Number of units sold ({granularity === 'weekly' ? 'weekly' : 'monthly'})</CardDescription>
                    </div>
                    <div />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <ChartContainer config={{ orders: { label: 'Units', color: 'hsl(var(--chart-2))' } }} className="h-[260px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="4 6" stroke="rgba(99,102,241,0.06)" strokeWidth={1} />
                        <XAxis dataKey="month" tickFormatter={formatMonthLabel} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `${v}`} />
                        <ChartTooltip content={<ChartTooltipContent />} cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }} />
                        <Line dataKey="orders" type="monotone" stroke="var(--color-chart-2)" strokeWidth={3} dot={{ r: 3, fill: 'var(--color-chart-2)', strokeWidth: 1 }} activeDot={{ r: 5 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
            </>
          )}
            
    </div>);
}
