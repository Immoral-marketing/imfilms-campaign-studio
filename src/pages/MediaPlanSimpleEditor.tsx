import { useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, ArrowLeft, Send, ExternalLink, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { NavbarAdmin } from "@/components/NavbarAdmin";

const MediaPlanSimpleEditor = () => {
    const { campaignId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [campaign, setCampaign] = useState<any>(null);
    const [url, setUrl] = useState("");

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
            setUrl(campaignData.media_plan_simple_url || "");

        } catch (error) {
            console.error("Error fetching data:", error);
            toast.error("Error al cargar los datos de la campaña");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (isSubmitting = false) => {
        if (isSubmitting && !url) {
            toast.error("Debes ingresar un enlace antes de enviar a revisión");
            return;
        }

        setSaving(true);
        try {
            const updates: any = {
                media_plan_simple_url: url,
            };

            if (isSubmitting) {
                updates.media_plan_simple_status = 'pendiente_aprobacion';
            }

            const { error: updateError } = await supabase
                .from('campaigns')
                .update(updates)
                .eq('id', campaignId);

            if (updateError) throw updateError;

            if (isSubmitting) {
                // Send Email Notification
                if (campaign?.contact_email) {
                    try {
                        await supabase.functions.invoke('send-email', {
                            body: {
                                type: 'media_plan_simple_ready',
                                campaignId: campaignId,
                                campaignTitle: campaign.films?.title || 'Campaña',
                                recipientEmail: campaign.contact_email
                            }
                        });
                    } catch (emailErr) {
                        console.error("Error sending notification email:", emailErr);
                    }
                }

                // Add system notification
                await supabase.from('campaign_messages').insert({
                    campaign_id: campaignId,
                    message: `📅 Plan de Medios listo para revisión: ${campaign?.films?.title || 'Campaña'}`,
                    sender_role: 'system',
                    sender_name: 'Sistema'
                } as any);

                toast.success("Plan enviado para aprobación");
            } else {
                toast.success("Enlace guardado correctamente");
            }

            fetchData();
        } catch (error: any) {
            console.error("Error saving plan:", error);
            toast.error("Error al guardar el plan: " + error.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-cinema-deep flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-cinema-deep">
            <NavbarAdmin />
            <div className="container mx-auto pt-32 pb-12 px-4">
                <div className="mb-8">
                    <Button
                        variant="ghost"
                        className="text-cinema-ivory hover:bg-primary hover:text-black mb-4 transition-colors"
                        onClick={() => navigate('/campaigns')}
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Volver a campañas
                    </Button>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="font-cinema text-5xl text-primary">Plan de Medios</h1>
                            <p className="text-cinema-ivory text-xl">{campaign?.films?.title}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <Button
                                variant="outline"
                                className="border-cinema-yellow text-cinema-yellow hover:bg-cinema-yellow hover:text-black font-bold transition-all duration-300"
                                onClick={() => handleSave(false)}
                                disabled={saving}
                            >
                                <Save className="w-4 h-4 mr-2" />
                                {saving ? 'Guardando...' : 'Guardar borrador'}
                            </Button>
                            <Button
                                className="bg-primary text-black hover:bg-primary/90 font-bold transition-all duration-300"
                                onClick={() => handleSave(true)}
                                disabled={saving}
                            >
                                <Send className="w-4 h-4 mr-2" />
                                {saving ? 'Enviando...' : 'Enviar para aprobación'}
                            </Button>
                        </div>
                    </div>
                </div>

                <Card className="cinema-card p-8 border-cinema-gold/30">
                    <div className="max-w-3xl space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="url" className="text-cinema-ivory text-lg">Enlace al Plan de Medios</Label>
                            <p className="text-sm text-cinema-ivory/60 mb-4">
                                Ingresa el enlace directo (Google Sheets, PDF en la nube, etc.) donde se encuentra el detalle del plan de medios.
                            </p>
                            <div className="flex gap-2">
                                <Input
                                    id="url"
                                    type="url"
                                    placeholder="https://docs.google.com/spreadsheets/d/..."
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    className="bg-cinema-deep/50 border-cinema-gold/30 text-cinema-ivory focus:border-primary"
                                />
                                {url && (
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="shrink-0 border-cinema-gold/30"
                                        onClick={() => window.open(url, '_blank')}
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex gap-3">
                            <div className="shrink-0 text-primary">
                                <ExternalLink className="w-5 h-5 mt-0.5" />
                            </div>
                            <div>
                                <h4 className="font-bold text-primary mb-1">Nota para la Distribuidora</h4>
                                <p className="text-sm text-cinema-ivory/80">
                                    Asegúrate de que el enlace sea accesible para la distribuidora. Al enviar para aprobación, se le notificará vía email y en su panel.
                                </p>
                            </div>
                        </div>
                    </div>
                </Card>

                {campaign?.media_plan_simple_feedback && (
                    <Card className="mt-6 border-red-500/30 bg-red-500/5 p-6">
                        <h4 className="text-red-400 font-bold mb-2 flex items-center gap-2">
                            Sugerencias de la Distribuidora:
                        </h4>
                        <p className="text-cinema-ivory/80 italic">
                            "{campaign.media_plan_simple_feedback}"
                        </p>
                    </Card>
                )}
            </div>
        </div>
    );
};

export default MediaPlanSimpleEditor;
