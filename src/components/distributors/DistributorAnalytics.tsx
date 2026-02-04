import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, subDays, startOfYear, startOfMonth, startOfWeek, eachDayOfInterval, eachMonthOfInterval, isSameDay, isSameMonth } from "date-fns";
import { es } from "date-fns/locale";

interface DistributorAnalyticsProps {
    distributorId: string;
}

type TimeRange = "week" | "month" | "year";

const DistributorAnalytics = ({ distributorId }: DistributorAnalyticsProps) => {
    const [data, setData] = useState<any[]>([]);
    const [range, setRange] = useState<TimeRange>("week");
    const [loading, setLoading] = useState(false);
    const [totalAccess, setTotalAccess] = useState(0);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // 1. Get users for this distributor
                const { data: users, error: userError } = await supabase
                    .from("distributor_users")
                    .select("user_id")
                    .eq("distributor_id", distributorId);

                if (userError || !users?.length) {
                    setData([]);
                    setLoading(false);
                    return;
                }

                const userIds = users.map(u => u.user_id);

                // 2. Fetch logs based on range
                let startDate = new Date();

                switch (range) {
                    case "week":
                        startDate = subDays(new Date(), 7);
                        break;
                    case "month":
                        startDate = startOfYear(new Date()); // Show months of current year? Or last 30 days? "Month" usually implies detailed daily view for the month, or monthly view for the year.
                        // Request asks for: "Year, Month, Week, Day" graphs. 
                        // Let's interpret as:
                        // "Week": Daily breakdown for last 7 days
                        // "Month": Daily breakdown for last 30 days
                        // "Year": Monthly breakdown for current year
                        if (range === "month") startDate = subDays(new Date(), 30);
                        if (range === "year") startDate = subDays(new Date(), 365);
                        break;
                    case "year":
                        startDate = startOfYear(new Date());
                        break;
                }

                const { data: logs, error: logError } = await supabase
                    .from("access_logs")
                    .select("created_at")
                    .in("user_id", userIds)
                    .gte("created_at", startDate.toISOString())
                    .order("created_at", { ascending: true });

                if (logError) throw logError;

                // 3. Process data for Chart
                let chartData: any[] = [];
                const logsData = logs || [];
                setTotalAccess(logsData.length);

                if (range === "week" || range === "month") {
                    // Daily breakdown
                    const days = eachDayOfInterval({
                        start: startDate,
                        end: new Date()
                    });

                    chartData = days.map(day => {
                        const count = logsData.filter(log => isSameDay(new Date(log.created_at), day)).length;
                        return {
                            name: format(day, "d MMM", { locale: es }),
                            accesos: count,
                            date: day // keep for sorting/key
                        };
                    });
                } else if (range === "year") {
                    // Monthly breakdown
                    const months = eachMonthOfInterval({
                        start: startDate,
                        end: new Date()
                    });

                    chartData = months.map(month => {
                        const count = logsData.filter(log => isSameMonth(new Date(log.created_at), month)).length;
                        return {
                            name: format(month, "MMM", { locale: es }),
                            accesos: count,
                        };
                    });
                }

                setData(chartData);

            } catch (error) {
                console.error("Error fetching analytics:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [distributorId, range]);

    return (
        <Card className="cinema-card p-6 space-y-4">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="font-cinema text-xl text-primary">Actividad de Acceso</h3>
                    <p className="text-sm text-muted-foreground">{totalAccess} accesos en este periodo</p>
                </div>

                <Select value={range} onValueChange={(v: any) => setRange(v)}>
                    <SelectTrigger className="w-32 bg-muted border-border">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="week">Última Semana</SelectItem>
                        <SelectItem value="month">Último Mes</SelectItem>
                        <SelectItem value="year">Este Año</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="h-[300px] w-full">
                {loading ? (
                    <div className="h-full flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    </div>
                ) : data.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                            <XAxis
                                dataKey="name"
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `${value}`}
                                allowDecimals={false}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333", borderRadius: "8px" }}
                                itemStyle={{ color: "#fff" }}
                                cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                            />
                            <Bar
                                dataKey="accesos"
                                fill="hsl(var(--primary))"
                                radius={[4, 4, 0, 0]}
                                maxBarSize={50}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                        No hay datos de actividad para este periodo
                    </div>
                )}
            </div>
        </Card>
    );
};

export default DistributorAnalytics;
