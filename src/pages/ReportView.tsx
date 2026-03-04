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

        } catch (error) {
            console.error("Error fetching data:", error);
            toast.error("Error al cargar el informe");
        } finally {
            setLoading(false);
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
                            <CheckCircle2 className={`w-5 h-5 ${status === 'aprobado' ? 'text-green-500' : 'text-primary'}`} />
                            <div>
                                <span className="text-sm uppercase tracking-wider font-bold text-cinema-ivory/60">Estado del Informe:</span>
                                <p className="font-cinema text-xl text-cinema-ivory">
                                    {status === 'borrador' ? 'Borrador' : 'Disponible para Lectura'}
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
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default ReportView;
