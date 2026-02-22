import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, Film, DollarSign, Calendar, Target, CheckCircle2, MessageSquare, Plus } from 'lucide-react';
import { formatDateShort } from '@/utils/dateUtils';
import { Textarea } from '@/components/ui/textarea';
import logoImfilms from '@/assets/logo-imfilms.png';

const ProposalView = () => {
    const { id: campaignId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [campaign, setCampaign] = useState<any>(null);
    const [film, setFilm] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [showSuggestChanges, setShowSuggestChanges] = useState(false);
    const [feedbackNotes, setFeedbackNotes] = useState("");
    const [savingStatus, setSavingStatus] = useState(false);

    useEffect(() => {
        checkAuthAndLoadCampaign();
    }, [campaignId]);

    const checkAuthAndLoadCampaign = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) {
                navigate('/campaigns');
                return;
            }
            setUser(session.user);
            await loadCampaign();
        } catch (error) {
            console.error('Auth error:', error);
            navigate('/campaigns');
        }
    };

    const loadCampaign = async () => {
        if (!campaignId) return;
        setLoading(true);
        try {
            const { data: campaignData, error: campaignError } = await supabase
                .from('campaigns')
                .select(`
          *,
          films (
            id,
            title,
            genre,
            secondary_genre,
            country,
            distributors (
              company_name
            )
          ),
          campaign_platforms (
            platform_name,
            budget_percent
          ),
          campaign_addons (
            addon_type
          )
        `)
                .eq('id', campaignId)
                .single();

            if (campaignError) throw campaignError;
            setCampaign(campaignData);
            setFilm(campaignData.films);
        } catch (error: any) {
            console.error('Error loading campaign:', error);
            toast.error('Error al cargar la campaña');
            navigate('/campaigns');
        } finally {
            setLoading(false);
        }
    };

    const handleApproveProposal = async () => {
        if (!campaignId) return;
        setSavingStatus(true);
        try {
            const { error } = await supabase
                .from('campaigns')
                .update({ status: 'aprobada' })
                .eq('id', campaignId);

            if (error) throw error;

            // Let's also leave a system message
            await supabase.from('campaign_messages').insert({
                campaign_id: campaignId,
                sender_id: user.id,
                sender_role: 'system',
                message: '🟢 La distribuidora ha aprobado la propuesta de campaña.',
            } as any);

            // Notify admins via email
            const distributorName = film.distributors?.company_name || 'La distribuidora';
            await supabase.functions.invoke("send-email", {
                body: {
                    type: "proposal_approved",
                    campaignTitle: film.title,
                    distributorName: distributorName,
                },
            });

            toast.success('¡Propuesta aprobada con éxito!');
            navigate(`/campaigns/${campaignId}`);
        } catch (error: any) {
            console.error('Error approving proposal:', error);
            toast.error('Error al aprobar la propuesta');
        } finally {
            setSavingStatus(false);
        }
    };

    const handleSuggestChangesSubmit = async () => {
        if (!campaignId || !feedbackNotes.trim()) {
            toast.error('Por favor, escribe tus sugerencias');
            return;
        }
        setSavingStatus(true);
        try {
            const { error } = await supabase
                .from('campaigns')
                .update({ status: 'en_revision' })
                .eq('id', campaignId);

            if (error) throw error;

            // Add a system message for notifications tab with the feedback
            await supabase.from('campaign_messages').insert({
                campaign_id: campaignId,
                sender_id: user.id,
                sender_role: 'system',
                message: `🟡 La distribuidora ha sugerido cambios:\n\n${feedbackNotes}`,
            } as any);

            // Notify admins via email
            const distributorName = film.distributors?.company_name || 'La distribuidora';
            await supabase.functions.invoke("send-email", {
                body: {
                    type: "proposal_changes_suggested",
                    campaignTitle: film.title,
                    distributorName: distributorName,
                },
            });

            toast.success('Sugerencias enviadas correctamente. Nuestro equipo las revisará.');
            navigate('/campaigns');
        } catch (error: any) {
            console.error('Error suggesting changes:', error);
            toast.error('Error al enviar las sugerencias');
        } finally {
            setSavingStatus(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                    <p className="text-muted-foreground">Cargando propuesta...</p>
                </div>
            </div>
        );
    }

    if (!campaign || !film) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-6">
                <Card className="cinema-card p-8 text-center space-y-4">
                    <p className="text-muted-foreground">No se encontró la propuesta</p>
                    <Button onClick={() => navigate('/campaigns')}>
                        Volver a Mis Campañas
                    </Button>
                </Card>
            </div>
        );
    }

    // Calculate true ad investment
    const totalFees = (campaign.fixed_fee_amount || 0) + (campaign.variable_fee_amount || 0) + (campaign.setup_fee_amount || 0);
    // Detect if fee mode was 'integrated' (fees included in the input ad investment amount)
    // In integrated mode, totalEstimated = adInvestment + addons. Which means adInvestment includes fees.
    const isIntegratedMode = Math.abs(campaign.total_estimated_amount - (campaign.ad_investment_amount + (campaign.addons_base_amount || 0))) < 1;
    const effectiveAdInvestment = isIntegratedMode ? campaign.ad_investment_amount - totalFees : campaign.ad_investment_amount;

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Header */}
            <header className="border-b border-border/40 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
                <div className="container mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <button onClick={() => navigate('/')} className="hover:opacity-80 transition-opacity">
                            <img src={logoImfilms} alt="IMFILMS" className="h-12" />
                        </button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate('/campaigns')}
                            className="gap-2"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Volver a Mis Campañas
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 container mx-auto px-4 md:px-6 py-8 max-w-4xl space-y-8">

                {/* Title */}
                <div className="text-center space-y-4">
                    <div className="inline-flex items-center justify-center p-3 rounded-full bg-cinema-yellow/10 mb-2">
                        <Film className="h-8 w-8 text-cinema-yellow" />
                    </div>
                    <h1 className="font-cinema text-4xl md:text-5xl text-primary">Propuesta de Campaña</h1>
                    <p className="text-xl text-cinema-ivory">
                        {film.title}
                    </p>
                </div>

                {/* Admin Notes */}
                {campaign.additional_comments && (
                    <Card className="p-6 bg-primary/10 border-primary/30 shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                        <h3 className="flex items-center gap-2 font-cinema text-xl text-primary mb-3">
                            <MessageSquare className="w-5 h-5" />
                            Notas de nuestro equipo
                        </h3>
                        <p className="text-cinema-ivory/90 whitespace-pre-wrap leading-relaxed">
                            {campaign.additional_comments}
                        </p>
                    </Card>
                )}

                {/* Investment Highlights */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="cinema-card p-6 flex flex-col justify-center border-cinema-yellow/30 bg-gradient-to-br from-background to-cinema-yellow/5">
                        <div className="flex items-center gap-3 mb-4">
                            <DollarSign className="h-6 w-6 text-cinema-yellow" />
                            <h3 className="font-cinema text-2xl text-cinema-yellow">Inversión Publicitaria</h3>
                        </div>
                        <p className="text-5xl font-bold text-cinema-ivory">
                            {effectiveAdInvestment.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}€
                        </p>
                        <p className="text-sm text-muted-foreground mt-2">
                            Presupuesto destinado directamente a las plataformas
                        </p>
                    </Card>

                    <Card className="cinema-card p-6 flex flex-col justify-center border-primary/30 bg-gradient-to-br from-background to-primary/5">
                        <div className="flex items-center gap-3 mb-4">
                            <Target className="h-6 w-6 text-primary" />
                            <h3 className="font-cinema text-2xl text-primary">Coste Total Estimado</h3>
                        </div>
                        <p className="text-5xl font-bold text-cinema-ivory">
                            {campaign.total_estimated_amount?.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}€
                        </p>
                        <p className="text-sm text-muted-foreground mt-2">
                            Incluye inversión publicitaria, fees y servicios adicionales
                        </p>
                    </Card>
                </div>

                {/* Platforms Breakdown */}
                {campaign.campaign_platforms && campaign.campaign_platforms.length > 0 && (
                    <Card className="p-6">
                        <h3 className="font-cinema text-xl text-primary border-b border-border/50 pb-2 mb-4">
                            Distribución por Plataformas
                        </h3>
                        <div className="space-y-3">
                            {campaign.campaign_platforms.map((plat: any) => {
                                const amount = (effectiveAdInvestment * plat.budget_percent) / 100;
                                return (
                                    <div key={plat.platform_name} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-card/40 border border-border/50">
                                        <div className="flex items-center gap-2 mb-2 sm:mb-0">
                                            <span className="font-medium text-cinema-ivory">{plat.platform_name}</span>
                                            <span className="text-sm text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded-full">
                                                {plat.budget_percent.toFixed(1)}%
                                            </span>
                                        </div>
                                        <span className="font-semibold text-cinema-yellow">
                                            {amount.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}€
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                )}

                {/* Detailed Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Calendar & Details */}
                    <Card className="p-6 space-y-6">
                        <h3 className="font-cinema text-xl text-primary border-b border-border/50 pb-2 mb-4">
                            Fechas Clave
                        </h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground flex items-center gap-2">
                                    <Calendar className="w-4 h-4" /> Fin recepción de creatividades
                                </span>
                                <span className="font-semibold">{formatDateShort(new Date(campaign.creatives_deadline))}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground flex items-center gap-2">
                                    <Calendar className="w-4 h-4" /> Inicio Pre-campaña
                                </span>
                                <span className="font-semibold">{formatDateShort(new Date(campaign.pre_start_date))}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground flex items-center gap-2">
                                    <Film className="w-4 h-4" /> Estreno (Fin de semana)
                                </span>
                                <span className="font-semibold text-cinema-yellow">
                                    {formatDateShort(new Date(campaign.premiere_weekend_start))}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground flex items-center gap-2">
                                    <Calendar className="w-4 h-4" /> Fin de campaña (Post-estreno)
                                </span>
                                <span className="font-semibold">{formatDateShort(new Date(campaign.pre_end_date))}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4" /> Reporte Final
                                </span>
                                <span className="font-semibold">{formatDateShort(new Date(campaign.final_report_date))}</span>
                            </div>
                        </div>
                    </Card>

                    {/* Breakdown */}
                    <Card className="p-6 space-y-6">
                        <h3 className="font-cinema text-xl text-primary border-b border-border/50 pb-2 mb-4">
                            Desglose de Costes Auxiliares
                        </h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Fee Fijo (Plataformas)</span>
                                <span className="font-semibold">{campaign.fixed_fee_amount?.toLocaleString('es-ES')}€</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Fee Variable (Inversión)</span>
                                <span className="font-semibold">{campaign.variable_fee_amount?.toLocaleString('es-ES')}€</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Setup inicial</span>
                                <span className="font-semibold">{campaign.setup_fee_amount?.toLocaleString('es-ES')}€</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Add-ons seleccionados</span>
                                <span className="font-semibold">{campaign.addons_base_amount?.toLocaleString('es-ES')}€</span>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Actions */}
                <div className="bg-card/50 border border-border p-6 rounded-xl space-y-6 mt-8">
                    <div className="text-center max-w-2xl mx-auto mb-6">
                        <h3 className="font-cinema text-2xl text-cinema-ivory mb-2">¿Estás de acuerdo con la propuesta?</h3>
                        <p className="text-muted-foreground">
                            Puedes aprobar la propuesta para poner en marcha la campaña o sugerirnos cambios si crees que debemos ajustar la inversión o las fechas.
                        </p>
                    </div>

                    {!showSuggestChanges ? (
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Button
                                onClick={handleApproveProposal}
                                className="bg-green-600 hover:bg-green-700 text-white font-bold px-8 h-14 text-lg w-full sm:w-auto"
                                disabled={savingStatus}
                            >
                                <CheckCircle2 className="w-5 h-5 mr-2" />
                                {savingStatus ? 'Aprobando...' : 'Aprobar Propuesta'}
                            </Button>
                            <Button
                                onClick={() => setShowSuggestChanges(true)}
                                variant="outline"
                                className="border-primary/50 text-cinema-ivory hover:bg-primary/10 h-14 text-lg w-full sm:w-auto"
                                disabled={savingStatus}
                            >
                                <MessageSquare className="w-5 h-5 mr-2" />
                                Sugerir Cambios
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-cinema-yellow">Tus sugerencias o comentarios</label>
                                <Textarea
                                    value={feedbackNotes}
                                    onChange={(e) => setFeedbackNotes(e.target.value)}
                                    placeholder="Ej: Me gustaría reducir la inversión a 3000€ y centrarlo más en Tiktok..."
                                    className="min-h-[120px] bg-background resize-none"
                                />
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3 justify-end">
                                <Button
                                    onClick={() => setShowSuggestChanges(false)}
                                    variant="ghost"
                                    disabled={savingStatus}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={handleSuggestChangesSubmit}
                                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
                                    disabled={savingStatus || !feedbackNotes.trim()}
                                >
                                    <MessageSquare className="w-4 h-4 mr-2" />
                                    {savingStatus ? 'Enviando...' : 'Enviar Sugerencias'}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

            </main>
        </div>
    );
};

export default ProposalView;
