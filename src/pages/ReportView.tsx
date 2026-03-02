import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, ExternalLink, CheckCircle2, MessageSquare, AlertCircle, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

const ReportView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [campaign, setCampaign] = useState<any>(null);
    const [feedback, setFeedback] = useState("");
    const [showRejectForm, setShowRejectForm] = useState(false);

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
            setFeedback((campaignData as any).report_feedback || "");

        } catch (error) {
            console.error("Error fetching data:", error);
            toast.error("Error al cargar el informe");
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async () => {
        try {
            const { error } = await supabase
                .from('campaigns')
                .update({
                    report_status: 'aprobado',
                    report_feedback: null
                } as any)
                .eq('id', id);

            if (error) throw error;

            // Add system notification
            await supabase.from('campaign_messages').insert({
                campaign_id: id,
                message: "✅ El informe ha sido aprobado por la distribuidora.",
                sender_role: 'system',
                sender_name: 'Sistema'
            } as any);

            // Send Email Notification
            try {
                await supabase.functions.invoke('send-email', {
                    body: {
                        type: 'report_approved',
                        campaignId: id,
                        campaignTitle: campaign?.films?.title || 'Campaña',
                        distributorName: campaign?.distributors?.company_name || 'Distribuidora'
                    }
                });
            } catch (emailErr) {
                console.error("Error sending approval notification:", emailErr);
            }

            toast.success("Informe aprobado");
            fetchData();
        } catch (error) {
            console.error("Error approving report:", error);
            toast.error("Error al aprobar el informe");
        }
    };

    const handleReject = async () => {
        if (!feedback) {
            toast.error("Por favor, ingresa tus sugerencias o motivos del rechazo");
            return;
        }

        try {
            const { error } = await supabase
                .from('campaigns')
                .update({
                    report_status: 'rechazado',
                    report_feedback: feedback
                } as any)
                .eq('id', id);

            if (error) throw error;

            // Add system notification
            await supabase.from('campaign_messages').insert({
                campaign_id: id,
                message: `❌ El informe ha sido rechazado con sugerencias: "${feedback}"`,
                sender_role: 'system',
                sender_name: 'Sistema'
            } as any);

            // Send Email Notification
            try {
                await supabase.functions.invoke('send-email', {
                    body: {
                        type: 'report_rejected',
                        campaignId: id,
                        campaignTitle: campaign?.films?.title || 'Campaña',
                        distributorName: campaign?.distributors?.company_name || 'Distribuidora'
                    }
                });
            } catch (emailErr) {
                console.error("Error sending rejection notification:", emailErr);
            }

            toast.success("Sugerencias enviadas correctamente");
            setShowRejectForm(false);
            fetchData();
        } catch (error) {
            console.error("Error rejecting report:", error);
            toast.error("Error al enviar sugerencias");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-cinema-deep flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const status = (campaign as any)?.report_status;

    return (
        <div className="min-h-screen bg-cinema-deep py-12 px-6">
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <Button
                            variant="ghost"
                            onClick={() => navigate("/campaigns")}
                            className="text-cinema-ivory/60 hover:bg-primary hover:text-black transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Volver a mis estrenos
                        </Button>
                        <h1 className="font-cinema text-5xl text-primary">Informe</h1>
                        <p className="text-cinema-ivory text-xl">{campaign?.films?.title}</p>
                    </div>
                </div>

                <Card className="cinema-card border-cinema-gold/30 overflow-hidden">
                    <div className={`p-6 border-b border-cinema-gold/20 flex items-center justify-between ${status === 'aprobado' ? 'bg-green-500/10' :
                        status === 'rechazado' ? 'bg-red-500/10' :
                            'bg-primary/10'
                        }`}>
                        <div className="flex items-center gap-3">
                            <AlertCircle className={`w-5 h-5 ${status === 'aprobado' ? 'text-green-500' :
                                status === 'rechazado' ? 'text-red-500' :
                                    'text-primary'
                                }`} />
                            <div>
                                <span className="text-sm uppercase tracking-wider font-bold text-cinema-ivory/60">Estado del Informe:</span>
                                <p className="font-cinema text-xl text-cinema-ivory">
                                    {status === 'borrador' && 'Borrador'}
                                    {status === 'pendiente_aprobacion' && 'Pendiente de Revisión'}
                                    {status === 'aprobado' && 'Aprobado'}
                                    {status === 'rechazado' && 'Rechazado con Sugerencias'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 space-y-8">
                        <div>
                            <h3 className="font-cinema text-2xl text-cinema-gold mb-2 uppercase">Informe de Campaña</h3>
                            <p className="text-cinema-ivory/80 mb-6">
                                Haz clic en el botón a continuación para abrir el documento externo con el informe completo de la campaña.
                            </p>

                            {(campaign as any)?.report_url ? (
                                <Button
                                    size="lg"
                                    className="bg-primary text-black hover:bg-primary/90 min-w-[240px] font-bold transition-all duration-300 shadow-lg shadow-primary/20"
                                    onClick={() => window.open((campaign as any).report_url, '_blank')}
                                >
                                    <ExternalLink className="w-5 h-5 mr-3" />
                                    Abrir Informe
                                </Button>
                            ) : (
                                <p className="text-red-400 italic">No se ha proporcionado un enlace para este informe.</p>
                            )}
                        </div>

                        {status === 'pendiente_aprobacion' && !showRejectForm && (
                            <div className="pt-6 border-t border-cinema-gold/20 flex flex-wrap gap-4">
                                <Button
                                    className="bg-green-600 hover:bg-green-700 text-white min-w-[160px] font-bold transition-all"
                                    onClick={handleApprove}
                                >
                                    <CheckCircle2 className="w-5 h-5 mr-2" />
                                    Aprobar Informe
                                </Button>
                                <Button
                                    variant="outline"
                                    className="border-red-500 text-red-500 hover:bg-red-500/10 min-w-[160px] font-bold transition-all"
                                    onClick={() => setShowRejectForm(true)}
                                >
                                    <MessageSquare className="w-5 h-5 mr-2" />
                                    Sugerir Cambios
                                </Button>
                            </div>
                        )}

                        {showRejectForm && (
                            <div className="pt-6 border-t border-cinema-gold/20 space-y-4">
                                <h4 className="text-cinema-gold font-bold uppercase text-sm tracking-widest">Sugerencias o Motivo de Rechazo</h4>
                                <Textarea
                                    placeholder="Escribe aquí tus comentarios para el equipo de administración..."
                                    className="bg-cinema-deep/50 border-cinema-gold/30 text-cinema-ivory min-h-[120px]"
                                    value={feedback}
                                    onChange={(e) => setFeedback(e.target.value)}
                                />
                                <div className="flex gap-3">
                                    <Button
                                        className="bg-red-600 hover:bg-red-700 text-white"
                                        onClick={handleReject}
                                    >
                                        Enviar Sugerencias
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        className="text-cinema-ivory/60"
                                        onClick={() => setShowRejectForm(false)}
                                    >
                                        Cancelar
                                    </Button>
                                </div>
                            </div>
                        )}

                        {status === 'rechazado' && !showRejectForm && (
                            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                                <h4 className="text-red-400 font-bold mb-1 uppercase text-xs">Tus sugerencias enviadas:</h4>
                                <p className="text-cinema-ivory/80 italic text-sm">"{(campaign as any).report_feedback}"</p>
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default ReportView;
