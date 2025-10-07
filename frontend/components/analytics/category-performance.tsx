"use client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
// Badge and Progress were used in the detailed view which was removed
import { useEffect, useState } from "react";
import { getCategoryRevenue, getCategories, ProductCategory, Product, getProducts } from "@/lib/api";
import ListItem from "@/components/ui/list-item";
interface CategoryPerformanceProps {
    timeRange: string;
}
export function CategoryPerformance({ timeRange }: CategoryPerformanceProps) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categoryRevenueData, setCategoryRevenueData] = useState<any[]>([]);
    useEffect(() => {
        let mounted = true;
        setLoading(true);
        setError(null);
        async function load() {
            try {
        const [cats, prods, revenueData] = await Promise.all([getCategories(), getProducts(), getCategoryRevenue()]);
        if (!mounted) return;
        setCategories(cats);
        setProducts(prods);
        // revenueData already contains category, revenue, salesUnits, inventory
        setCategoryRevenueData(revenueData.map((r) => ({
          category: r.category,
          revenue: Math.round(r.revenue || 0),
          salesUnits: Math.round(r.salesUnits || 0),
          inventory: Math.round(r.inventory || 0),
        })));
            }
            catch (err: any) {
                setError(err?.message || 'Failed to load category analytics');
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
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle>Revenue by Category</CardTitle>
          <CardDescription>Category performance and growth rates</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{
      revenue: {
        label: "Revenue (THB)",
                color: "hsl(var(--chart-1))",
            },
        }} className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryRevenueData} margin={{ bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3"/>
                <XAxis dataKey="category" interval={0} height={60} angle={-35} textAnchor="end" tick={{ fontSize: 12 }} />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />}/>
                <Bar dataKey="revenue" fill="var(--color-chart-1)"/>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle>Stock Level by Category</CardTitle>
          <CardDescription>Current inventory quantities by category</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{ inventory: { label: 'Inventory', color: 'hsl(var(--chart-1))' } }} className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[...categoryRevenueData].sort((a,b) => b.inventory - a.inventory)} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="4 6" stroke="rgba(99,102,241,0.12)" strokeWidth={1} horizontal={true} vertical={false} />
                <XAxis type="number" />
                <YAxis type="category" dataKey="category" width={160} />
                <ChartTooltip content={<ChartTooltipContent />}/>
                <Bar dataKey="inventory" fill="var(--color-chart-1)" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Top 5 Categories</CardTitle>
          <CardDescription>Highest revenue categories</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...categoryRevenueData].sort((a,b) => b.revenue - a.revenue).slice(0,5).map((c, idx) => (
              <ListItem
                key={c.category}
                index={idx + 1}
                title={c.category}
                subtitle={`${c.salesUnits || 0} units`}
                rightPrimary={`THB ${(c.revenue || 0).toLocaleString()}`}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>);
}
