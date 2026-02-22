import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Plus, Trash2, ArrowRightLeft, TrendingUp, Users, Target, MousePointer2, Euro } from "lucide-react";
import { toast } from "sonner";

interface CampaignComparatorProps {
    isAdmin: boolean;
    userId: string;
}

const CampaignComparator = ({ isAdmin, userId }: CampaignComparatorProps) => {
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [selectedCampaignIds, setSelectedCampaignIds] = useState<string[]>(["", ""]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadCampaigns();
    }, []);

    const loadCampaigns = async () => {
        try {
            let query = supabase
                .from("campaigns")
                .select(`
          id,
          status,
          reach,
          clicks,
          visits,
          ctr,
          cpm,
          films (
            title
          )
        `);

            if (!isAdmin) {
                query = query.eq("distributor_id", userId);
            }

            const { data, error } = await query;
            if (error) throw error;

            // Filter campaigns that have at least one KPI
            const filtered = data?.filter(c => c.reach || c.clicks || c.visits || c.ctr || c.cpm) || [];
            setCampaigns(filtered);
        } catch (error) {
            console.error("Error loading campaigns for comparator:", error);
            toast.error("Error al cargar campañas");
        } finally {
            setLoading(false);
        }
    };

    const addSelector = () => {
        setSelectedCampaignIds([...selectedCampaignIds, ""]);
    };

    const removeSelector = (index: number) => {
        if (selectedCampaignIds.length <= 2) return;
        const newIds = [...selectedCampaignIds];
        newIds.splice(index, 1);
        setSelectedCampaignIds(newIds);
    };

    const updateSelection = (index: number, id: string) => {
        const newIds = [...selectedCampaignIds];
        newIds[index] = id;
        setSelectedCampaignIds(newIds);
    };

    const selectedCampaignsData = useMemo(() => {
        return selectedCampaignIds
            .map(id => campaigns.find(c => c.id === id))
            .filter(Boolean);
    }, [selectedCampaignIds, campaigns]);

    const chartData = useMemo(() => {
        return selectedCampaignsData.map(c => ({
            name: c.films?.title || "Sin título",
            reach: c.reach || 0,
            clicks: c.clicks || 0,
            visits: c.visits || 0,
            ctr: parseFloat(c.ctr || 0),
            cpm: parseFloat(c.cpm || 0),
        }));
    }, [selectedCampaignsData]);

    if (loading) {
        return <div className="p-8 text-center text-cinema-ivory">Cargando métricas...</div>;
    }

    if (campaigns.length < 2) {
        return (
            <Card className="cinema-card p-8 text-center">
                <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-cinema text-primary mb-2">No hay suficientes campañas</h3>
                <p className="text-cinema-ivory">
                    Necesitas al menos dos campañas con KPIs cargados por un administrador para usar el comparador.
                </p>
            </Card>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in">
            <Card className="cinema-card p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 rounded-full bg-primary/20">
                        <ArrowRightLeft className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-cinema text-primary">Comparador de Campañas</h2>
                        <p className="text-sm text-cinema-ivory">Selecciona las campañas que deseas analizar</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    {selectedCampaignIds.map((id, index) => (
                        <div key={index} className="flex gap-2 items-end">
                            <div className="flex-1 space-y-2">
                                <Label>Campaña {index + 1}</Label>
                                <Select value={id} onValueChange={(val) => updateSelection(index, val)}>
                                    <SelectTrigger className="bg-muted border-border">
                                        <SelectValue placeholder="Seleccionar campaña" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-cinema-black border-border">
                                        {campaigns.map(c => (
                                            <SelectItem
                                                key={c.id}
                                                value={c.id}
                                                disabled={selectedCampaignIds.includes(c.id) && id !== c.id}
                                            >
                                                {c.films?.title}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {selectedCampaignIds.length > 2 && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:bg-destructive/10"
                                    onClick={() => removeSelector(index)}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            )}
                        </div>
                    ))}
                    <div className="flex items-end">
                        <Button
                            variant="outline"
                            className="w-full border-dashed border-primary/50 text-primary hover:bg-primary/5"
                            onClick={addSelector}
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Añadir otra campaña
                        </Button>
                    </div>
                </div>
            </Card>

            {selectedCampaignsData.length >= 2 ? (
                <>
                    {/* Charts Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card className="cinema-card p-6">
                            <div className="flex items-center gap-2 mb-6">
                                <Users className="w-5 h-5 text-primary" />
                                <h3 className="text-lg font-cinema text-primary">Alcance (Reach)</h3>
                            </div>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                        <XAxis dataKey="name" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => value.toLocaleString()} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #c5a044', borderRadius: '8px' }}
                                            itemStyle={{ color: '#c5a044' }}
                                        />
                                        <Bar dataKey="reach" fill="#c5a044" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>

                        <Card className="cinema-card p-6">
                            <div className="flex items-center gap-2 mb-6">
                                <Target className="w-5 h-5 text-primary" />
                                <h3 className="text-lg font-cinema text-primary">CTR (%)</h3>
                            </div>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                        <XAxis dataKey="name" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #c5a044', borderRadius: '8px' }}
                                        />
                                        <Bar dataKey="ctr" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>

                        <Card className="cinema-card p-6">
                            <div className="flex items-center gap-2 mb-6">
                                <MousePointer2 className="w-5 h-5 text-primary" />
                                <h3 className="text-lg font-cinema text-primary">Clicks vs Visitas</h3>
                            </div>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                        <XAxis dataKey="name" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #c5a044', borderRadius: '8px' }}
                                        />
                                        <Legend />
                                        <Bar dataKey="clicks" name="Clicks" fill="#c5a044" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="visits" name="Visitas" fill="#666" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>

                        <Card className="cinema-card p-6">
                            <div className="flex items-center gap-2 mb-6">
                                <Euro className="w-5 h-5 text-primary" />
                                <h3 className="text-lg font-cinema text-primary">CPM (Coste por Mil)</h3>
                            </div>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                        <XAxis dataKey="name" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #c5a044', borderRadius: '8px' }}
                                        />
                                        <Bar dataKey="cpm" fill="#10b981" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    </div>

                    {/* Detailed Table */}
                    <Card className="cinema-card p-6">
                        <h3 className="text-xl font-cinema text-primary mb-6">Detalle Comparativo</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-border">
                                        <th className="pb-4 pt-2 font-medium text-muted-foreground w-1/4">Métrica</th>
                                        {selectedCampaignsData.map(c => (
                                            <th key={c.id} className="pb-4 pt-2 font-cinema text-primary text-center">
                                                {c.films?.title}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/50">
                                    <tr>
                                        <td className="py-4 text-cinema-ivory">Alcance</td>
                                        {selectedCampaignsData.map(c => (
                                            <td key={c.id} className="py-4 text-center text-primary font-bold">
                                                {c.reach?.toLocaleString() || "-"}
                                            </td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td className="py-4 text-cinema-ivory">Clicks</td>
                                        {selectedCampaignsData.map(c => (
                                            <td key={c.id} className="py-4 text-center text-primary font-bold">
                                                {c.clicks?.toLocaleString() || "-"}
                                            </td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td className="py-4 text-cinema-ivory">Visitas</td>
                                        {selectedCampaignsData.map(c => (
                                            <td key={c.id} className="py-4 text-center text-primary font-bold">
                                                {c.visits?.toLocaleString() || "-"}
                                            </td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td className="py-4 text-cinema-ivory">CTR</td>
                                        {selectedCampaignsData.map(c => (
                                            <td key={c.id} className="py-4 text-center text-primary font-bold">
                                                {c.ctr ? `${c.ctr}%` : "-"}
                                            </td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td className="py-4 text-cinema-ivory">CPM</td>
                                        {selectedCampaignsData.map(c => (
                                            <td key={c.id} className="py-4 text-center text-primary font-bold">
                                                {c.cpm ? `${c.cpm}€` : "-"}
                                            </td>
                                        ))}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </>
            ) : (
                <Card className="cinema-card p-12 text-center opacity-50 border-dashed">
                    <ArrowRightLeft className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-cinema-ivory">Selecciona al menos dos campañas para ver la comparativa visual.</p>
                </Card>
            )}
        </div>
    );
};

export default CampaignComparator;
