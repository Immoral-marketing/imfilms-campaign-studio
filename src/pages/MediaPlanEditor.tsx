import { useParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LayoutGrid, List, Users, Save, ArrowLeft, Plus, Trash2, Copy, ArrowRight, Eye, FileEdit, Send, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import MediaPlanPreview from "@/components/MediaPlanPreview";
import { NavbarAdmin } from "@/components/NavbarAdmin";

const MediaPlanEditor = () => {
    const { campaignId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [campaign, setCampaign] = useState<any>(null);

    // States for the 3 tabs
    const [phases, setPhases] = useState<any[]>([]);
    const [items, setItems] = useState<any[]>([]);
    const [audiences, setAudiences] = useState<any[]>([]);

    // Tracking deletions
    const [deletedPhases, setDeletedPhases] = useState<string[]>([]);
    const [deletedItems, setDeletedItems] = useState<string[]>([]);
    const [deletedAudiences, setDeletedAudiences] = useState<string[]>([]);

    const [showPreview, setShowPreview] = useState(false);

    useEffect(() => {
        if (campaignId) {
            fetchData();
        }
    }, [campaignId]);

    const fetchData = async () => {
        try {
            const { data: campaignData, error: campaignError } = await supabase
                .from('campaigns')
                .select(`
          *,
          films (title)
        `)
                .eq('id', campaignId)
                .single();

            if (campaignError) throw campaignError;
            setCampaign(campaignData);

            // Fetch Plan Data
            const [phasesRes, itemsRes, audiencesRes] = await Promise.all([
                supabase.from('media_plan_phases').select('*').eq('campaign_id', campaignId).order('created_at', { ascending: true }),
                supabase.from('media_plan_items').select('*').eq('campaign_id', campaignId).order('created_at', { ascending: true }),
                supabase.from('media_plan_audiences').select('*').eq('campaign_id', campaignId).order('created_at', { ascending: true })
            ]);

            if (phasesRes.error) throw phasesRes.error;
            if (itemsRes.error) throw itemsRes.error;
            if (audiencesRes.error) throw audiencesRes.error;

            setPhases(phasesRes.data || []);
            setItems(itemsRes.data || []);
            setAudiences(audiencesRes.data || []);

        } catch (error) {
            console.error("Error fetching data:", error);
            toast.error("Error al cargar los datos");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (isSubmitting = false) => {
        setSaving(true);
        try {
            // ... deletion logic ...
            if (deletedPhases.length > 0) {
                const { error: dpe } = await supabase.from('media_plan_phases').delete().in('id', deletedPhases);
                if (dpe) throw dpe;
            }
            if (deletedItems.length > 0) {
                const { error: die } = await supabase.from('media_plan_items').delete().in('id', deletedItems);
                if (die) throw die;
            }
            if (deletedAudiences.length > 0) {
                const { error: dae } = await supabase.from('media_plan_audiences').delete().in('id', deletedAudiences);
                if (dae) throw dae;
            }

            // Upsert logic for phases
            const phasesToSave = phases.map(p => ({
                id: p.id,
                campaign_id: campaignId,
                name: p.name,
                start_date: p.start_date,
                end_date: p.end_date,
                objective: p.objective,
                kpis: p.kpis,
                budget_percentage: p.budget_percentage
            }));

            const { error: phasesError } = await supabase
                .from('media_plan_phases')
                .upsert(phasesToSave);

            if (phasesError) throw phasesError;

            // Upsert for items
            const itemsToSave = items.map(i => ({
                id: i.id,
                campaign_id: campaignId,
                phase_id: i.phase_id,
                support: i.support,
                segmentation: i.segmentation,
                section: i.section,
                format: i.format,
                location: i.location,
                start_date: i.start_date,
                end_date: i.end_date,
                investment: i.investment,
                soi_percentage: i.soi_percentage
            }));

            const { error: itemsError } = await supabase
                .from('media_plan_items')
                .upsert(itemsToSave);

            if (itemsError) throw itemsError;

            // Upsert for audiences
            const audiencesToSave = audiences.map(a => ({
                id: a.id,
                campaign_id: campaignId,
                name: a.name,
                segmentation: a.segmentation
            }));

            const { error: audiencesError } = await supabase
                .from('media_plan_audiences')
                .upsert(audiencesToSave);

            if (audiencesError) throw audiencesError;

            // If submitting for approval, update campaign status
            if (isSubmitting) {
                const { error: campaignStatusError } = await supabase
                    .from('campaigns')
                    .update({ media_plan_status: 'pendiente_aprobacion' })
                    .eq('id', campaignId);

                if (campaignStatusError) throw campaignStatusError;

                // Send Email Notification
                if (campaign?.contact_email) {
                    try {
                        await supabase.functions.invoke('send-email', {
                            body: {
                                type: 'media_plan_ready',
                                campaignId: campaignId,
                                campaignTitle: campaign.films?.title || 'Campaña',
                                recipientEmail: campaign.contact_email
                            }
                        });
                    } catch (emailErr) {
                        console.error("Error sending notification email:", emailErr);
                        // Don't throw, just log. We don't want to block the success of the save.
                    }
                }

                // Add system notification
                await supabase.from('campaign_messages').insert({
                    campaign_id: campaignId,
                    message: `📅 Plan de Medios (BETA) listo para revisión: ${campaign?.films?.title || 'Campaña'}`,
                    sender_role: 'system',
                    sender_name: 'Sistema'
                } as any);

                toast.success("Plan enviado para aprobación");
            } else {
                toast.success("Plan de medios (BETA) guardado correctamente");
            }

            // Clear deletion trackers on success
            setDeletedPhases([]);
            setDeletedItems([]);
            setDeletedAudiences([]);

            fetchData();
        } catch (error: any) {
            console.error("Error saving plan:", error);
            toast.error("Error al guardar el plan: " + error.message);
        } finally {
            setSaving(false);
        }
    };

    const addPhase = () => {
        setPhases([...phases, {
            id: crypto.randomUUID(),
            name: `Fase ${phases.length + 1}`,
            start_date: "",
            end_date: "",
            objective: [""],
            kpis: [""],
            budget_percentage: 0
        }]);
    };

    const updatePhase = (index: number, field: string, value: any) => {
        const newPhases = [...phases];
        newPhases[index] = { ...newPhases[index], [field]: value };
        setPhases(newPhases);
    };

    const removePhase = (index: number) => {
        const phaseToRemove = phases[index];
        if (phaseToRemove.id) {
            setDeletedPhases([...deletedPhases, phaseToRemove.id]);
            // Also mark items of this phase as deleted
            const itemsInPhase = items.filter(i => i.phase_id === phaseToRemove.id);
            setDeletedItems([...deletedItems, ...itemsInPhase.map(i => i.id).filter(Boolean)]);
        }
        setPhases(phases.filter((_, i) => i !== index));
    };

    const addListItem = (phaseIdx: number, field: 'objective' | 'kpis') => {
        const newPhases = [...phases];
        const currentList = Array.isArray(newPhases[phaseIdx][field]) ? newPhases[phaseIdx][field] : [];
        newPhases[phaseIdx][field] = [...currentList, ""];
        setPhases(newPhases);
    };

    const updateListItem = (phaseIdx: number, field: 'objective' | 'kpis', itemIdx: number, value: string) => {
        const newPhases = [...phases];
        newPhases[phaseIdx][field][itemIdx] = value;
        setPhases(newPhases);
    };

    const removeListItem = (phaseIdx: number, field: 'objective' | 'kpis', itemIdx: number) => {
        const newPhases = [...phases];
        newPhases[phaseIdx][field] = newPhases[phaseIdx][field].filter((_: any, i: number) => i !== itemIdx);
        setPhases(newPhases);
    };

    const addPlanItem = (phaseId: string | null = null) => {
        setItems([...items, {
            id: crypto.randomUUID(),
            phase_id: phaseId,
            support: "",
            segmentation: "",
            section: "",
            format: "",
            location: "",
            start_date: "",
            end_date: "",
            investment: 0,
            soi_percentage: 0
        }]);
    };

    const duplicatePlanItem = (index: number) => {
        const itemToClone = items[index];
        const newItem = {
            ...itemToClone,
            id: crypto.randomUUID(),
            created_at: undefined,
            updated_at: undefined
        };
        setItems([...items, newItem]);
        toast.info("Línea duplicada. Puedes cambiar su fase para moverla.");
    };

    const duplicateToNextPhase = (index: number) => {
        const itemToClone = items[index];
        const currentPhaseIdx = phases.findIndex(p => p.id === itemToClone.phase_id);

        if (currentPhaseIdx === -1) {
            toast.error("Esta línea no tiene una fase asignada");
            return;
        }

        if (currentPhaseIdx === phases.length - 1) {
            toast.warning("No hay una fase posterior a la actual");
            return;
        }

        const nextPhase = phases[currentPhaseIdx + 1];
        const newItem = {
            ...itemToClone,
            id: crypto.randomUUID(),
            phase_id: nextPhase.id,
            created_at: undefined,
            updated_at: undefined
        };
        setItems([...items, newItem]);
        toast.success(`Línea duplicada y enviada a ${nextPhase.name}`);
    };

    const addAudience = () => {
        setAudiences([...audiences, {
            id: crypto.randomUUID(),
            name: "",
            segmentation: ""
        }]);
    };

    const updatePlanItem = (index: number, field: string, value: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    const removePlanItem = (index: number) => {
        const itemToRemove = items[index];
        if (itemToRemove.id) {
            setDeletedItems([...deletedItems, itemToRemove.id]);
        }
        setItems(items.filter((_, i) => i !== index));
    };

    return (
        <div className="min-h-screen bg-background pt-24 pb-12 px-6">
            <NavbarAdmin />
            <div className="max-w-7xl mx-auto space-y-8">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <Button
                            variant="ghost"
                            onClick={() => navigate("/campaigns")}
                            className="pl-0 text-muted-foreground hover:text-cinema-yellow transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Volver a campañas
                        </Button>
                        <h1 className="font-cinema text-5xl text-primary">Plan de Medios (BETA)</h1>
                        <p className="text-cinema-ivory text-xl">{campaign?.films?.title}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {campaign?.media_plan_status && (
                            <div className={`px-4 py-2 rounded-full font-cinema text-lg border ${campaign.media_plan_status === 'aprobado' ? 'bg-green-500/10 border-green-500 text-green-500' :
                                campaign.media_plan_status === 'pendiente_aprobacion' ? 'bg-yellow-500/10 border-yellow-500 text-yellow-500' :
                                    campaign.media_plan_status === 'rechazado' ? 'bg-red-500/10 border-red-500 text-red-500' :
                                        'bg-muted border-border text-muted-foreground'
                                }`}>
                                {campaign.media_plan_status === 'borrador' ? 'BORRADOR' :
                                    campaign.media_plan_status === 'pendiente_aprobacion' ? 'PENDIENTE' :
                                        campaign.media_plan_status === 'aprobado' ? 'APROBADO' : 'RECHAZADO'}
                            </div>
                        )}
                        <Button
                            onClick={() => handleSave(false)}
                            disabled={saving}
                            variant="outline"
                            className="border-cinema-yellow text-cinema-yellow hover:bg-cinema-yellow hover:text-black transition-colors"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            {saving ? "Guardando..." : "Guardar borrador"}
                        </Button>
                        <Button
                            onClick={() => handleSave(true)}
                            disabled={saving}
                            className="bg-cinema-yellow text-black hover:bg-cinema-yellow/90 font-bold transition-colors"
                        >
                            <Send className="w-4 h-4 mr-2" />
                            {saving ? "Enviando..." : "Enviar a Distribuidora"}
                        </Button>
                    </div>
                </div>

                {campaign?.media_plan_status === 'rechazado' && campaign?.media_plan_feedback && (
                    <Card className="p-4 border-l-4 border-l-red-500 bg-red-500/5 mb-8">
                        <div className="flex gap-3">
                            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                            <div>
                                <h4 className="font-cinema text-red-500 text-lg uppercase">Sugerencias de la distribuidora</h4>
                                <p className="text-cinema-ivory/80 whitespace-pre-wrap">{campaign.media_plan_feedback}</p>
                            </div>
                        </div>
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

                        <div className="ml-auto pr-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="border-cinema-yellow text-cinema-yellow hover:bg-cinema-yellow hover:text-black transition-colors"
                                onClick={() => setShowPreview(!showPreview)}
                            >
                                {showPreview ? (
                                    <>
                                        <FileEdit className="w-4 h-4 mr-2" />
                                        Volver al Editor
                                    </>
                                ) : (
                                    <>
                                        <Eye className="w-4 h-4 mr-2" />
                                        Vista de distribuidora
                                    </>
                                )}
                            </Button>
                        </div>
                    </TabsList>

                    {showPreview ? (
                        <div className="mt-8">
                            <MediaPlanPreview
                                phases={phases}
                                items={items}
                                audiences={audiences}
                            />
                        </div>
                    ) : (
                        <>
                            <TabsContent value="strategy" className="space-y-4">
                                <Card className="cinema-card p-6">
                                    <div className="flex items-center justify-between mb-6">
                                        <h2 className="font-cinema text-2xl text-primary">Estrategia por fases</h2>
                                        <Button
                                            onClick={addPhase}
                                            variant="outline"
                                            size="sm"
                                            className="border-cinema-yellow text-cinema-yellow hover:bg-cinema-yellow hover:text-black transition-colors"
                                        >
                                            <Plus className="w-4 h-4 mr-2" />
                                            Añadir Fase
                                        </Button>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="border-b border-border/50 text-xs font-teko uppercase tracking-wider text-muted-foreground">
                                                    <th className="pb-3 px-2">Fase</th>
                                                    <th className="pb-3 px-2">Fecha Inicio</th>
                                                    <th className="pb-3 px-2">Fecha Fin</th>
                                                    <th className="pb-3 px-2">Objetivo</th>
                                                    <th className="pb-3 px-2">KPI</th>
                                                    <th className="pb-3 px-2 w-24">Presupuesto %</th>
                                                    <th className="pb-3 px-2 w-10"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border/30">
                                                {phases.map((phase, idx) => (
                                                    <tr key={idx} className="group">
                                                        <td className="py-3 px-2">
                                                            <input
                                                                className="bg-muted border border-border rounded px-2 py-1 w-full text-sm"
                                                                value={phase.name}
                                                                onChange={(e) => updatePhase(idx, 'name', e.target.value)}
                                                            />
                                                        </td>
                                                        <td className="py-3 px-2">
                                                            <input
                                                                type="date"
                                                                className="bg-muted border border-border rounded px-2 py-1 w-full text-sm"
                                                                value={phase.start_date || ""}
                                                                onChange={(e) => updatePhase(idx, 'start_date', e.target.value)}
                                                            />
                                                        </td>
                                                        <td className="py-3 px-2">
                                                            <input
                                                                type="date"
                                                                className="bg-muted border border-border rounded px-2 py-1 w-full text-sm"
                                                                value={phase.end_date || ""}
                                                                onChange={(e) => updatePhase(idx, 'end_date', e.target.value)}
                                                            />
                                                        </td>
                                                        <td className="py-3 px-2">
                                                            <div className="space-y-2">
                                                                {(Array.isArray(phase.objective) ? phase.objective : [phase.objective || ""]).map((obj: string, oIdx: number) => (
                                                                    <div key={oIdx} className="flex gap-1 group/item">
                                                                        <input
                                                                            className="bg-muted border border-border rounded px-2 py-1 w-full text-sm"
                                                                            value={obj}
                                                                            onChange={(e) => updateListItem(idx, 'objective', oIdx, e.target.value)}
                                                                        />
                                                                        <button
                                                                            onClick={() => removeListItem(idx, 'objective', oIdx)}
                                                                            className="text-muted-foreground hover:text-red-500 opacity-0 group-hover/item:opacity-100 transition-opacity"
                                                                        >
                                                                            <Trash2 className="w-3 h-3" />
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => addListItem(idx, 'objective')}
                                                                    className="h-7 px-2 text-[10px] text-cinema-yellow hover:bg-cinema-yellow hover:text-black transition-colors"
                                                                >
                                                                    <Plus className="w-3 h-3 mr-1" />
                                                                    Añadir Objetivo
                                                                </Button>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-2">
                                                            <div className="space-y-2">
                                                                {(Array.isArray(phase.kpis) ? phase.kpis : [phase.kpis || ""]).map((kpi: string, kIdx: number) => (
                                                                    <div key={kIdx} className="flex gap-1 group/item">
                                                                        <input
                                                                            className="bg-muted border border-border rounded px-2 py-1 w-full text-sm"
                                                                            value={kpi}
                                                                            onChange={(e) => updateListItem(idx, 'kpis', kIdx, e.target.value)}
                                                                        />
                                                                        <button
                                                                            onClick={() => removeListItem(idx, 'kpis', kIdx)}
                                                                            className="text-muted-foreground hover:text-red-500 opacity-0 group-hover/item:opacity-100 transition-opacity"
                                                                        >
                                                                            <Trash2 className="w-3 h-3" />
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => addListItem(idx, 'kpis')}
                                                                    className="h-7 px-2 text-[10px] text-cinema-yellow hover:bg-cinema-yellow hover:text-black transition-colors"
                                                                >
                                                                    <Plus className="w-3 h-3 mr-1" />
                                                                    Añadir KPI
                                                                </Button>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-2">
                                                            <div className="flex items-center gap-1">
                                                                <input
                                                                    type="number"
                                                                    className="bg-muted border border-border rounded px-2 py-1 w-full text-sm"
                                                                    value={phase.budget_percentage || 0}
                                                                    onChange={(e) => updatePhase(idx, 'budget_percentage', parseFloat(e.target.value))}
                                                                />
                                                                <span className="text-muted-foreground">%</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-2">
                                                            <button
                                                                onClick={() => removePhase(idx)}
                                                                className="text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {phases.length === 0 && (
                                                    <tr>
                                                        <td colSpan={7} className="py-12 text-center text-muted-foreground italic">
                                                            No hay fases definidas. Haz clic en "Añadir Fase" para comenzar.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </Card>
                            </TabsContent >

                            <TabsContent value="plan" className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h2 className="font-cinema text-3xl text-primary">Plan de medios (BETA) detallado</h2>
                                </div>

                                {phases.map((phase, pIdx) => (
                                    <Card key={phase.id || pIdx} className="cinema-card p-6 border-l-4 border-l-cinema-gold">
                                        <div className="flex items-center justify-between mb-6">
                                            <div className="flex items-center gap-3">
                                                <h3 className="font-cinema text-2xl text-cinema-gold uppercase tracking-wider">{phase.name}</h3>
                                            </div>
                                            <Button
                                                onClick={() => addPlanItem(phase.id)}
                                                variant="outline"
                                                size="sm"
                                                className="border-cinema-yellow text-cinema-yellow hover:bg-cinema-yellow hover:text-black transition-colors"
                                            >
                                                <Plus className="w-4 h-4 mr-2" />
                                                Añadir Línea a {phase.name}
                                            </Button>
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
                                                        <th className="pb-3 px-2">Inicio</th>
                                                        <th className="pb-3 px-2">Fin</th>
                                                        <th className="pb-3 px-2">Inversión</th>
                                                        <th className="pb-3 px-2 w-16">SOI %</th>
                                                        <th className="pb-3 px-2 w-16 text-center">Acciones</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border/30">
                                                    {items.filter(item => item.phase_id === phase.id).map((item, itemIdx) => {
                                                        // Find real index in items array to update correctly
                                                        const realIdx = items.indexOf(item);
                                                        return (
                                                            <tr key={itemIdx} className="group">
                                                                <td className="py-3 px-2">
                                                                    <input
                                                                        className="bg-muted border border-border rounded px-2 py-1 w-full text-sm"
                                                                        value={item.support || ""}
                                                                        onChange={(e) => updatePlanItem(realIdx, 'support', e.target.value)}
                                                                    />
                                                                </td>
                                                                <td className="py-3 px-2">
                                                                    <input
                                                                        className="bg-muted border border-border rounded px-2 py-1 w-full text-sm"
                                                                        value={item.segmentation || ""}
                                                                        onChange={(e) => updatePlanItem(realIdx, 'segmentation', e.target.value)}
                                                                    />
                                                                </td>
                                                                <td className="py-3 px-2">
                                                                    <input
                                                                        className="bg-muted border border-border rounded px-2 py-1 w-full text-sm"
                                                                        value={item.section || ""}
                                                                        onChange={(e) => updatePlanItem(realIdx, 'section', e.target.value)}
                                                                    />
                                                                </td>
                                                                <td className="py-3 px-2">
                                                                    <input
                                                                        className="bg-muted border border-border rounded px-2 py-1 w-full text-sm"
                                                                        value={item.format || ""}
                                                                        onChange={(e) => updatePlanItem(realIdx, 'format', e.target.value)}
                                                                    />
                                                                </td>
                                                                <td className="py-3 px-2">
                                                                    <input
                                                                        className="bg-muted border border-border rounded px-2 py-1 w-full text-sm"
                                                                        value={item.location || ""}
                                                                        onChange={(e) => updatePlanItem(realIdx, 'location', e.target.value)}
                                                                    />
                                                                </td>
                                                                <td className="py-3 px-2">
                                                                    <input
                                                                        type="date"
                                                                        className="bg-muted border border-border rounded px-2 py-1 w-full text-sm"
                                                                        value={item.start_date || ""}
                                                                        onChange={(e) => updatePlanItem(realIdx, 'start_date', e.target.value)}
                                                                    />
                                                                </td>
                                                                <td className="py-3 px-2">
                                                                    <input
                                                                        type="date"
                                                                        className="bg-muted border border-border rounded px-2 py-1 w-full text-sm"
                                                                        value={item.end_date || ""}
                                                                        onChange={(e) => updatePlanItem(realIdx, 'end_date', e.target.value)}
                                                                    />
                                                                </td>
                                                                <td className="py-3 px-2">
                                                                    <input
                                                                        type="number"
                                                                        className="bg-muted border border-border rounded px-2 py-1 w-full text-sm"
                                                                        value={item.investment || 0}
                                                                        onChange={(e) => updatePlanItem(realIdx, 'investment', parseFloat(e.target.value))}
                                                                    />
                                                                </td>
                                                                <td className="py-3 px-2">
                                                                    <input
                                                                        type="number"
                                                                        className="bg-muted border border-border rounded px-2 py-1 w-full text-sm"
                                                                        value={item.soi_percentage || 0}
                                                                        onChange={(e) => updatePlanItem(realIdx, 'soi_percentage', parseFloat(e.target.value))}
                                                                    />
                                                                </td>
                                                                <td className="py-3 px-2 text-center">
                                                                    <div className="flex items-center justify-center gap-1">
                                                                        <button
                                                                            onClick={() => duplicatePlanItem(realIdx)}
                                                                            className="text-muted-foreground hover:text-cinema-yellow transition-colors"
                                                                            title="Duplicar línea"
                                                                        >
                                                                            <Copy className="w-4 h-4" />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => duplicateToNextPhase(realIdx)}
                                                                            className="text-muted-foreground hover:text-cinema-yellow transition-colors"
                                                                            title="Duplicar a siguiente fase"
                                                                        >
                                                                            <ArrowRight className="w-4 h-4" />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => removePlanItem(realIdx)}
                                                                            className="text-muted-foreground hover:text-red-500 transition-colors"
                                                                            title="Eliminar línea"
                                                                        >
                                                                            <Trash2 className="w-4 h-4" />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                    {items.filter(item => item.phase_id === phase.id).length === 0 && (
                                                        <tr>
                                                            <td colSpan={10} className="py-8 text-center text-muted-foreground italic">
                                                                No hay líneas asignadas a esta fase.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </Card>
                                ))}

                                {phases.length === 0 && (
                                    <Card className="cinema-card p-12 text-center text-muted-foreground">
                                        <List className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                        <p>Debes definir al menos una fase en la pestaña "Estrategia por fases" para poder agregar líneas al plan.</p>
                                    </Card>
                                )}
                            </TabsContent>

                            <TabsContent value="audiences" className="space-y-4">
                                <Card className="cinema-card p-6">
                                    <div className="flex items-center justify-between mb-6">
                                        <h2 className="font-cinema text-2xl text-primary">Segmentación de audiencias</h2>
                                        <Button
                                            onClick={addAudience}
                                            variant="outline"
                                            size="sm"
                                            className="border-cinema-yellow text-cinema-yellow hover:bg-cinema-yellow hover:text-black transition-colors"
                                        >
                                            <Plus className="w-4 h-4 mr-2" />
                                            Añadir Audiencia
                                        </Button>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="border-b border-border/50 text-xs font-teko uppercase tracking-wider text-muted-foreground">
                                                    <th className="pb-3 px-2">Audiencia</th>
                                                    <th className="pb-3 px-2">Segmentación</th>
                                                    <th className="pb-3 px-2 w-10"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border/30">
                                                {audiences.map((aud, idx) => (
                                                    <tr key={idx} className="group">
                                                        <td className="py-3 px-2">
                                                            <input
                                                                className="bg-muted border border-border rounded px-2 py-1 w-full text-sm"
                                                                value={aud.name || ""}
                                                                onChange={(e) => {
                                                                    const newAuds = [...audiences];
                                                                    newAuds[idx].name = e.target.value;
                                                                    setAudiences(newAuds);
                                                                }}
                                                                placeholder="Ej: Fans de acción"
                                                            />
                                                        </td>
                                                        <td className="py-3 px-2">
                                                            <textarea
                                                                className="bg-muted border border-border rounded px-2 py-1 w-full text-sm min-h-[40px]"
                                                                value={aud.segmentation || ""}
                                                                onChange={(e) => {
                                                                    const newAuds = [...audiences];
                                                                    newAuds[idx].segmentation = e.target.value;
                                                                    setAudiences(newAuds);
                                                                }}
                                                                placeholder="Detalles técnicos de la segmentación..."
                                                            />
                                                        </td>
                                                        <td className="py-3 px-2 text-center">
                                                            <button
                                                                onClick={() => {
                                                                    const audToRemove = audiences[idx];
                                                                    if (audToRemove.id) {
                                                                        setDeletedAudiences([...deletedAudiences, audToRemove.id]);
                                                                    }
                                                                    setAudiences(audiences.filter((_, i) => i !== idx));
                                                                }}
                                                                className="text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {audiences.length === 0 && (
                                                    <tr>
                                                        <td colSpan={3} className="py-12 text-center text-muted-foreground italic">
                                                            No hay audiencias definidas. Haz clic en "Añadir Audiencia" para comenzar.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </Card>
                            </TabsContent>
                        </>
                    )}
                </Tabs>
            </div>
        </div>
    );
};

export default MediaPlanEditor;
