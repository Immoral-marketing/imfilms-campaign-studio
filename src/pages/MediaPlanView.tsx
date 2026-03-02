import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import MediaPlanPreview from "@/components/MediaPlanPreview";

const MediaPlanView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [campaign, setCampaign] = useState<any>(null);
    const [phases, setPhases] = useState<any[]>([]);
    const [items, setItems] = useState<any[]>([]);
    const [audiences, setAudiences] = useState<any[]>([]);

    useEffect(() => {
        if (id) {
            fetchData();
        }
    }, [id]);

    const fetchData = async () => {
        try {
            const { data: campaignData, error: campaignError } = await supabase
                .from('campaigns')
                .select(`
          *,
          films (title),
          distributors (company_name)
        `)
                .eq('id', id)
                .single();

            if (campaignError) throw campaignError;
            setCampaign(campaignData);

            const [phasesRes, itemsRes, audiencesRes] = await Promise.all([
                supabase.from('media_plan_phases').select('*').eq('campaign_id', id).order('created_at', { ascending: true }),
                supabase.from('media_plan_items').select('*').eq('campaign_id', id).order('created_at', { ascending: true }),
                supabase.from('media_plan_audiences').select('*').eq('campaign_id', id).order('created_at', { ascending: true })
            ]);

            setPhases(phasesRes.data || []);
            setItems(itemsRes.data || []);
            setAudiences(audiencesRes.data || []);

        } catch (error) {
            console.error("Error fetching data:", error);
            toast.error("Error al cargar el plan de medios (BETA)");
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async () => {
        try {
            const { error } = await supabase
                .from('campaigns')
                .update({ media_plan_status: 'aprobado', media_plan_feedback: null })
                .eq('id', id);

            if (error) throw error;

            // Add system notification
            await supabase.from('campaign_messages').insert({
                campaign_id: id,
                message: "✅ El plan de medios (BETA) ha sido aprobado por la distribuidora.",
                sender_role: 'system',
                sender_name: 'Sistema'
            } as any);

            // Send Email Notification
            try {
                await supabase.functions.invoke('send-email', {
                    body: {
                        type: 'media_plan_approved',
                        campaignId: id,
                        campaignTitle: campaign?.films?.title || 'Campaña',
                        distributorName: campaign?.distributors?.company_name || 'Distribuidora'
                    }
                });
            } catch (emailErr) {
                console.error("Error sending approval notification:", emailErr);
            }

            toast.success("Plan de medios (BETA) aprobado");
            fetchData();
        } catch (error) {
            console.error("Error approving plan:", error);
            toast.error("Error al aprobar el plan");
        }
    };

    const handleReject = async (feedback: string) => {
        try {
            const { error } = await supabase
                .from('campaigns')
                .update({
                    media_plan_status: 'rechazado',
                    media_plan_feedback: feedback
                })
                .eq('id', id);

            if (error) throw error;

            // Add system notification
            await supabase.from('campaign_messages').insert({
                campaign_id: id,
                message: `❌ El plan de medios (BETA) ha sido rechazado con sugerencias: "${feedback}"`,
                sender_role: 'system',
                sender_name: 'Sistema'
            } as any);

            // Send Email Notification
            try {
                await supabase.functions.invoke('send-email', {
                    body: {
                        type: 'media_plan_rejected',
                        campaignId: id,
                        campaignTitle: campaign?.films?.title || 'Campaña',
                        distributorName: campaign?.distributors?.company_name || 'Distribuidora'
                    }
                });
            } catch (emailErr) {
                console.error("Error sending rejection notification:", emailErr);
            }

            toast.success("Sugerencias enviadas correctamente");
            fetchData();
        } catch (error) {
            console.error("Error rejecting plan:", error);
            toast.error("Error al enviar sugerencias");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-pulse font-cinema text-3xl text-primary">Cargando Plan...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background py-12 px-6">
            <div className="max-w-7xl mx-auto space-y-8">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <Button
                            variant="ghost"
                            onClick={() => navigate("/campaigns")}
                            className="pl-0 text-muted-foreground hover:text-primary"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Volver a mis estrenos
                        </Button>
                        <h1 className="font-cinema text-5xl text-primary">Plan de Medios (BETA)</h1>
                        <p className="text-cinema-ivory text-xl">{campaign?.films?.title}</p>
                    </div>
                </div>

                <MediaPlanPreview
                    phases={phases}
                    items={items}
                    audiences={audiences}
                    isDistributorMode={true}
                    status={campaign?.media_plan_status}
                    onApprove={handleApprove}
                    onReject={handleReject}
                />
            </div>
        </div>
    );
};

export default MediaPlanView;
