import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { LayoutGrid, List, Users, CheckCircle2, XCircle, MessageSquare } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface MediaPlanPreviewProps {
    phases: any[];
    items: any[];
    audiences: any[];
    isDistributorMode?: boolean;
    status?: string;
    onApprove?: () => void;
    onReject?: (feedback: string) => void;
}

const MediaPlanPreview = ({ phases, items, audiences, isDistributorMode, status, onApprove, onReject }: MediaPlanPreviewProps) => {
    const [showRejectForm, setShowRejectForm] = useState(false);
    const [feedback, setFeedback] = useState("");
    const [saving, setSaving] = useState(false);

    const handleReject = async () => {
        if (!feedback.trim() || !onReject) return;
        setSaving(true);
        try {
            await onReject(feedback);
        } finally {
            setSaving(false);
        }
    };

    const handleApprove = async () => {
        if (!onApprove) return;
        setSaving(true);
        try {
            await onApprove();
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            {isDistributorMode && status === 'pendiente_aprobacion' && (
                <Card className="p-6 border-cinema-gold bg-cinema-gold/5 shadow-lg animate-in fade-in slide-in-from-top-4">
                    {!showRejectForm ? (
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                            <div>
                                <h3 className="font-cinema text-2xl text-cinema-gold uppercase">Revisión del Plan de Medios (BETA)</h3>
                                <p className="text-cinema-ivory/80">Por favor, revisa la estrategia y el desglose detallado antes de proceder.</p>
                            </div>
                            <div className="flex items-center gap-4 shrink-0">
                                <Button
                                    onClick={handleApprove}
                                    disabled={saving}
                                    className="bg-green-600 hover:bg-green-700 text-white font-bold px-8 h-12"
                                >
                                    <CheckCircle2 className="w-5 h-5 mr-2" />
                                    {saving ? 'Aprobando...' : 'Aprobar Plan'}
                                </Button>
                                <Button
                                    onClick={() => setShowRejectForm(true)}
                                    disabled={saving}
                                    variant="outline"
                                    className="border-red-500 text-red-500 hover:bg-red-500/10 h-12"
                                >
                                    <XCircle className="w-5 h-5 mr-2" />
                                    Sugerir Cambios
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                            <div className="flex items-center gap-2 text-red-500 mb-2">
                                <MessageSquare className="w-5 h-5" />
                                <h4 className="font-cinema text-xl uppercase">Sugerencias o comentarios</h4>
                            </div>
                            <Textarea
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                                placeholder="Describe los cambios que te gustaría ver en el plan..."
                                className="min-h-[100px] bg-background border-red-500/30 focus-visible:ring-red-500"
                            />
                            <div className="flex justify-end gap-3">
                                <Button variant="ghost" onClick={() => setShowRejectForm(false)} disabled={saving}>
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={handleReject}
                                    disabled={saving || !feedback.trim()}
                                    className="bg-red-600 hover:bg-red-700 text-white"
                                >
                                    {saving ? 'Enviando...' : 'Enviar Sugerencias'}
                                </Button>
                            </div>
                        </div>
                    )}
                </Card>
            )}

            <Tabs defaultValue="strategy" className="w-full">
                <TabsList className="bg-muted w-full justify-start p-1 mb-6">
                    <TabsTrigger value="strategy" className="flex items-center gap-2 px-6">
                        <List className="w-4 h-4" />
                        Estrategia por fases
                    </TabsTrigger>
                    <TabsTrigger value="plan" className="flex items-center gap-2 px-6">
                        <LayoutGrid className="w-4 h-4" />
                        Plan de medios (BETA)
                    </TabsTrigger>
                    <TabsTrigger value="audiences" className="flex items-center gap-2 px-6">
                        <Users className="w-4 h-4" />
                        Audiencias
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="strategy">
                    <Card className="cinema-card p-6">
                        <h2 className="font-cinema text-2xl text-primary mb-6">Estrategia por fases</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-border/50 text-xs font-teko uppercase tracking-wider text-muted-foreground">
                                        <th className="pb-3 px-2">Fase</th>
                                        <th className="pb-3 px-2 text-center">Inicio</th>
                                        <th className="pb-3 px-2 text-center">Fin</th>
                                        <th className="pb-3 px-2">Objetivos</th>
                                        <th className="pb-3 px-2">KPIs</th>
                                        <th className="pb-3 px-2 text-right">Presupuesto</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/30">
                                    {phases.map((phase, idx) => (
                                        <tr key={idx}>
                                            <td className="py-4 px-2 font-bold text-cinema-gold whitespace-nowrap">{phase.name}</td>
                                            <td className="py-4 px-2 text-center text-sm">
                                                {phase.start_date || '?'}
                                            </td>
                                            <td className="py-4 px-2 text-center text-sm">
                                                {phase.end_date || '?'}
                                            </td>
                                            <td className="py-4 px-2 text-sm max-w-xs">
                                                <ul className="list-disc list-inside space-y-1">
                                                    {(Array.isArray(phase.objective) ? phase.objective : [phase.objective]).filter(Boolean).map((obj: string, i: number) => (
                                                        <li key={i}>{obj}</li>
                                                    ))}
                                                </ul>
                                            </td>
                                            <td className="py-4 px-2 text-sm">
                                                <ul className="list-disc list-inside space-y-1">
                                                    {(Array.isArray(phase.kpis) ? phase.kpis : [phase.kpis]).filter(Boolean).map((kpi: string, i: number) => (
                                                        <li key={i}>{kpi}</li>
                                                    ))}
                                                </ul>
                                            </td>
                                            <td className="py-4 px-2 text-right text-cinema-yellow font-cinema text-lg">
                                                {phase.budget_percentage}%
                                            </td>
                                        </tr>
                                    ))}
                                    {phases.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="py-12 text-center text-muted-foreground italic">No hay datos disponibles.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </TabsContent>

                <TabsContent value="plan">
                    <div className="space-y-8">
                        {phases.map((phase, pIdx) => (
                            <Card key={phase.id || pIdx} className="cinema-card p-6 border-l-4 border-l-cinema-gold">
                                <div className="flex items-center gap-3 mb-6">
                                    <h2 className="font-cinema text-3xl text-cinema-gold uppercase tracking-wider">{phase.name}</h2>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-border/50 text-xs font-teko uppercase tracking-wider text-muted-foreground">
                                                <th className="pb-3 px-2">Soporte</th>
                                                <th className="pb-3 px-2">Segmentación</th>
                                                <th className="pb-3 px-2">Sección</th>
                                                <th className="pb-3 px-2">Formato</th>
                                                <th className="pb-3 px-2">Ubicación</th>
                                                <th className="pb-3 px-2 text-center">Inicio</th>
                                                <th className="pb-3 px-2 text-center">Fin</th>
                                                <th className="pb-3 px-2 text-right">Inversión</th>
                                                <th className="pb-3 px-2 text-right">SOI%</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/30">
                                            {items.filter(item => item.phase_id === phase.id).map((item, idx) => (
                                                <tr key={idx}>
                                                    <td className="py-4 px-2 font-bold text-cinema-ivory">{item.support}</td>
                                                    <td className="py-4 px-2 text-sm">{item.segmentation}</td>
                                                    <td className="py-4 px-2 text-sm">{item.section}</td>
                                                    <td className="py-4 px-2 text-sm">{item.format}</td>
                                                    <td className="py-4 px-2 text-sm">{item.location}</td>
                                                    <td className="py-4 px-2 text-center text-xs text-muted-foreground">{item.start_date}</td>
                                                    <td className="py-4 px-2 text-center text-xs text-muted-foreground">{item.end_date}</td>
                                                    <td className="py-4 px-2 text-right text-cinema-gold font-bold whitespace-nowrap">
                                                        {item.investment?.toLocaleString()}€
                                                    </td>
                                                    <td className="py-4 px-2 text-right text-sm">
                                                        {item.soi_percentage}%
                                                    </td>
                                                </tr>
                                            ))}
                                            {items.filter(item => item.phase_id === phase.id).length === 0 && (
                                                <tr>
                                                    <td colSpan={9} className="py-8 text-center text-muted-foreground italic">No hay datos planificados para esta fase.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        ))}

                        {phases.length === 0 && (
                            <Card className="cinema-card p-12 text-center text-muted-foreground italic">
                                No hay fases o plan de medios (BETA) disponible.
                            </Card>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="audiences">
                    <Card className="cinema-card p-6">
                        <h2 className="font-cinema text-2xl text-primary mb-6">Audiencias y Segmentación</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {audiences.map((aud, idx) => (
                                <div key={idx} className="p-4 rounded-lg bg-muted/30 border border-border/50 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-2 opacity-5">
                                        <Users className="w-12 h-12" />
                                    </div>
                                    <h3 className="text-cinema-gold font-cinema text-xl mb-2">{aud.name}</h3>
                                    <p className="text-sm text-cinema-ivory leading-relaxed whitespace-pre-wrap">{aud.segmentation}</p>
                                </div>
                            ))}
                        </div>
                        {audiences.length === 0 && (
                            <div className="py-12 text-center text-muted-foreground italic">No hay datos disponibles.</div>
                        )}
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default MediaPlanPreview;
