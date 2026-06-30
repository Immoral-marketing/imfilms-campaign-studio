import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { toast } from 'sonner';
import { ArrowLeft, Film, Calendar, DollarSign, Target, MessageSquare, FileText, Edit, Save, X, Bell, RefreshCw, CalendarPlus, Trash2, Pencil } from 'lucide-react';
import CampaignTimeline from '@/components/CampaignTimeline';
import CampaignChat from '@/components/CampaignChat';
import CampaignNotifications from '@/components/CampaignNotifications';
import CreativeAssets from '@/components/CreativeAssets';
import { formatDateShort, getRelativeTime } from '@/utils/dateUtils';
import { CampaignInfoEditable } from '@/components/CampaignInfoEditable';
import PendingEditBanner from '@/components/PendingEditBanner';
import { usePendingFilmProposal } from '@/hooks/useFilmEditProposals';
import logoImfilms from '@/assets/logo-imfilms.png';

const CampaignDetail = () => {
  const { id: campaignId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "timeline");
  const [campaign, setCampaign] = useState<any>(null);
  const [film, setFilm] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<'admin' | 'distributor'>('distributor');
  const [isDetailsEditing, setIsDetailsEditing] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [postEstrenoPickerOpen, setPostEstrenoPickerOpen] = useState(false);
  const [savingPostEstreno, setSavingPostEstreno] = useState(false);
  const [editingPreStart, setEditingPreStart] = useState(false);
  const [editingFinalReport, setEditingFinalReport] = useState(false);
  const [savingDate, setSavingDate] = useState(false);
  const [tempPreStart, setTempPreStart] = useState<Date | undefined>(undefined);
  const [tempCampaignEnd, setTempCampaignEnd] = useState<Date | undefined>(undefined);

  // Get pending film edit proposal
  const { data: pendingProposal } = usePendingFilmProposal(film?.id);

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

      // Check if user is admin
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (roleError) console.error("Error checking role:", roleError);

      setUserRole(roleData ? 'admin' : 'distributor');

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
            release_date,
            target_audience_text,
            target_audience_urls,
            target_audience_files,
            main_goals
          ),
          campaign_platforms (
            platform_name,
            budget_percent
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

  const updateCampaignStatus = async (newStatus: string) => {
    if (!campaignId) return;

    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ status: newStatus })
        .eq('id', campaignId);

      if (error) throw error;

      toast.success('Estado actualizado correctamente');
      loadCampaign(); // Reload campaign to get updated status
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast.error('Error al actualizar el estado');
    }
  };

  const recalculateFees = async () => {
    if (!campaign || !campaignId) return;
    setRecalculating(true);
    try {
      // Load current thresholds from DB
      const { data: thresholdsData } = await supabase.from('fee_thresholds').select('*').order('min_investment', { ascending: true });
      const thresholds = thresholdsData && thresholdsData.length > 0 ? thresholdsData : [
        { min_investment: 0, max_investment: 2500, variable_fee_rate: 0, fixed_fee_amount: 500, setup_fee_per_platform: 200, is_variable_fee_enabled: false, is_fixed_fee_enabled: true, is_setup_fee_enabled: true },
        { min_investment: 2501, max_investment: 8000, variable_fee_rate: 0.20, fixed_fee_amount: 0, setup_fee_per_platform: 0, is_variable_fee_enabled: true, is_fixed_fee_enabled: false, is_setup_fee_enabled: false },
        { min_investment: 8001, max_investment: 15000, variable_fee_rate: 0.15, fixed_fee_amount: 0, setup_fee_per_platform: 0, is_variable_fee_enabled: true, is_fixed_fee_enabled: false, is_setup_fee_enabled: false },
        { min_investment: 15001, max_investment: 30000, variable_fee_rate: 0.12, fixed_fee_amount: 0, setup_fee_per_platform: 0, is_variable_fee_enabled: true, is_fixed_fee_enabled: false, is_setup_fee_enabled: false },
        { min_investment: 30001, max_investment: null, variable_fee_rate: 0.08, fixed_fee_amount: 0, setup_fee_per_platform: 0, is_variable_fee_enabled: true, is_fixed_fee_enabled: false, is_setup_fee_enabled: false },
      ];

      const grossBudget = campaign.ad_investment_amount || 0;
      const addons = campaign.addons_base_amount || 0;
      const numPlatforms = (campaign.campaign_platforms || []).length;
      const isIntegrated = Math.abs((grossBudget + addons) - campaign.total_estimated_amount) < 5;

      // Find applicable threshold based on gross budget
      const threshold = thresholds.find((t: any) =>
        grossBudget >= t.min_investment && (t.max_investment === null || grossBudget <= t.max_investment)
      ) || thresholds[thresholds.length - 1];

      const variableRate = threshold.is_variable_fee_enabled ? threshold.variable_fee_rate : 0;
      const fixedFee = threshold.is_fixed_fee_enabled ? threshold.fixed_fee_amount : 0;
      const setupFee = threshold.is_setup_fee_enabled ? Math.max(0, numPlatforms - 1) * threshold.setup_fee_per_platform : 0;
      const variableFee = parseFloat((grossBudget * variableRate).toFixed(2));
      const totalFees = parseFloat((fixedFee + setupFee + variableFee).toFixed(2));
      const totalEstimated = isIntegrated
        ? parseFloat((grossBudget + addons).toFixed(2))
        : parseFloat((grossBudget + totalFees + addons).toFixed(2));

      const { error } = await supabase
        .from('campaigns')
        .update({
          fixed_fee_amount: fixedFee,
          variable_fee_amount: variableFee,
          setup_fee_amount: setupFee,
          total_estimated_amount: totalEstimated,
        })
        .eq('id', campaignId);

      if (error) throw error;

      toast.success(`Fees actualizados: fee variable ${(variableRate * 100).toLocaleString('es-ES')}% → ${variableFee.toLocaleString('es-ES')}€`);
      await loadCampaign();
    } catch (error: any) {
      console.error('Error recalculating fees:', error);
      toast.error('Error al recalcular los fees');
    } finally {
      setRecalculating(false);
    }
  };

  const formatDateForEmail = (d: Date) =>
    d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const savePostEstrenoDate = async (date: Date | undefined) => {
    if (!date || !campaignId) return;
    setSavingPostEstreno(true);
    setPostEstrenoPickerOpen(false);
    try {
      const finalReport = new Date(date);
      finalReport.setDate(finalReport.getDate() + 7);

      const postEstrenoStr = date.toISOString().split('T')[0];
      const finalReportStr = finalReport.toISOString().split('T')[0];

      const { error } = await supabase
        .from('campaigns')
        .update({
          post_estreno_end_date: postEstrenoStr,
          final_report_date: finalReportStr,
        })
        .eq('id', campaignId);

      if (error) throw error;

      const filmTitle = campaign?.films?.title || 'Campaña';

      // System notification
      await supabase.from('campaign_messages').insert({
        campaign_id: campaignId,
        sender_role: 'system',
        sender_name: 'Sistema',
        message: `📅 Campaña post-estreno activada hasta el ${formatDateForEmail(date)}. Nuevo reporte final: ${formatDateForEmail(finalReport)}.`,
      } as any);

      // Email to admins
      supabase.functions.invoke('send-email', {
        body: {
          type: 'post_estreno_updated',
          campaignId,
          campaignTitle: filmTitle,
          postEstrenoDate: formatDateForEmail(date),
          finalReportDate: formatDateForEmail(finalReport),
        },
      }).catch(console.error);

      toast.success('Campaña post-estreno activada');
      await loadCampaign();
    } catch (err: any) {
      console.error(err);
      toast.error('Error al guardar la fecha post-estreno');
    } finally {
      setSavingPostEstreno(false);
    }
  };

  const removePostEstrenoDate = async () => {
    if (!campaignId || !campaign) return;
    setSavingPostEstreno(true);
    try {
      const premiere = new Date(campaign.premiere_weekend_start);
      premiere.setDate(premiere.getDate() + 14);
      const finalReportStr = premiere.toISOString().split('T')[0];

      const { error } = await supabase
        .from('campaigns')
        .update({
          post_estreno_end_date: null,
          final_report_date: finalReportStr,
        })
        .eq('id', campaignId);

      if (error) throw error;

      // System notification
      await supabase.from('campaign_messages').insert({
        campaign_id: campaignId,
        sender_role: 'system',
        sender_name: 'Sistema',
        message: `📅 Campaña post-estreno cancelada. Reporte final restaurado al ${formatDateForEmail(premiere)}.`,
      } as any);

      toast.success('Fecha post-estreno eliminada');
      await loadCampaign();
    } catch (err: any) {
      console.error(err);
      toast.error('Error al eliminar la fecha post-estreno');
    } finally {
      setSavingPostEstreno(false);
    }
  };

  const openCampaignDateEditor = () => {
    setTempPreStart(new Date(campaign!.pre_start_date));
    setTempCampaignEnd(campaign!.post_estreno_end_date ? new Date(campaign!.post_estreno_end_date) : undefined);
    setEditingPreStart(true);
  };

  const saveCampaignDates = async () => {
    if (!tempPreStart || !campaignId) return;
    setSavingDate(true);
    setEditingPreStart(false);
    try {
      const updates: Record<string, string | null> = {
        pre_start_date: tempPreStart.toISOString().split('T')[0],
        post_estreno_end_date: tempCampaignEnd ? tempCampaignEnd.toISOString().split('T')[0] : null,
      };
      const { error } = await supabase.from('campaigns').update(updates).eq('id', campaignId);
      if (error) throw error;
      toast.success('Fechas de campaña actualizadas');
      await loadCampaign();
    } catch (err: any) {
      toast.error('Error al guardar las fechas');
    } finally {
      setSavingDate(false);
    }
  };

  const saveFinalReportDate = async (date: Date | undefined) => {
    if (!date || !campaignId) return;
    setSavingDate(true);
    setEditingFinalReport(false);
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ final_report_date: date.toISOString().split('T')[0] })
        .eq('id', campaignId);
      if (error) throw error;
      toast.success('Fecha de reporte final actualizada');
      await loadCampaign();
    } catch (err: any) {
      toast.error('Error al guardar la fecha');
    } finally {
      setSavingDate(false);
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      borrador: 'Borrador',
      en_revision: 'En Revisión',
      pendiente_creativos: 'Pendiente Creativos',
      aprobada: 'Aprobada',
      activa: 'Activa',
      finalizada: 'Finalizada',
      pausada: 'Pausada',
      rechazada: 'Rechazada',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      borrador: 'text-muted-foreground',
      en_revision: 'text-blue-400',
      pendiente_creativos: 'text-yellow-400',
      aprobada: 'text-green-400',
      activa: 'text-primary',
      finalizada: 'text-purple-400',
      pausada: 'text-orange-400',
      rechazada: 'text-red-400',
    };
    return colors[status] || 'text-foreground';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground">Cargando campaña...</p>
        </div>
      </div>
    );
  }

  if (!campaign || !film) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="cinema-card p-8 text-center space-y-4">
          <p className="text-muted-foreground">No se encontró la campaña</p>
          <Button onClick={() => navigate('/campaigns')}>
            Volver a Mis Campañas
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button onClick={() => navigate('/')} className="hover:opacity-80 transition-opacity shrink-0">
              <img src={logoImfilms} alt="IMFILMS" className="h-12 shrink-0" />
            </button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/campaigns')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Volver a Mis Campañas</span>
            </Button>

            {/* Edit action buttons - appear when editing campaign details */}
            {isDetailsEditing && (
              <div className="flex items-center gap-3 md:ml-auto">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mr-2">
                  <Edit className="h-3.5 w-3.5 text-primary" />
                  <span className="hidden sm:inline">Modo edición</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    document.getElementById('campaign-edit-cancel')?.click();
                  }}
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  form="campaign-edit-form"
                  size="sm"
                  className="bg-primary text-primary-foreground"
                >
                  <Save className="h-4 w-4 mr-1" />
                  {userRole === 'admin' ? 'Guardar Cambios' : 'Guardar Propuesta'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Campaign Header */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Film className="h-8 w-8 text-primary" />
                <h1 className="font-cinema text-2xl sm:text-4xl text-foreground">{film.title}</h1>
              </div>
              <p className="text-muted-foreground">
                {film.genre}{film.secondary_genre ? ` / ${film.secondary_genre}` : ''} • {film.country}
              </p>
            </div>
            <div className="text-right space-y-1">
              <p className="text-sm text-muted-foreground">Estado actual</p>
              {userRole === 'admin' ? (
                <Select
                  value={campaign.status}
                  onValueChange={updateCampaignStatus}
                >
                  <SelectTrigger className="w-full sm:w-[200px] h-auto py-1 border-none bg-transparent">
                    <SelectValue className={`font-cinema text-2xl ${getStatusColor(campaign.status)}`} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="borrador">Borrador</SelectItem>
                    <SelectItem value="en_revision">En revisión</SelectItem>
                    <SelectItem value="aprobada">Aprobada</SelectItem>
                    <SelectItem value="creativos_en_revision">Creativos en revisión</SelectItem>
                    <SelectItem value="activa">Activa</SelectItem>
                    <SelectItem value="finalizada">Finalizada</SelectItem>
                    <SelectItem value="pausada">Pausada</SelectItem>
                    <SelectItem value="rechazada">Rechazada</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p className={`font-cinema text-2xl ${getStatusColor(campaign.status)}`}>
                  {getStatusLabel(campaign.status)}
                </p>
              )}
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4 space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <p className="text-xs font-semibold">Estreno</p>
              </div>
              <p className="text-lg font-cinema text-foreground">
                {formatDateShort(new Date(campaign.premiere_weekend_start))}
              </p>
            </Card>

            {(() => {
              const totalFees = (campaign.fixed_fee_amount || 0) + (campaign.variable_fee_amount || 0) + (campaign.setup_fee_amount || 0);
              const expectedIntegratedTotal = (campaign.ad_investment_amount || 0) + (campaign.addons_base_amount || 0);
              const isIntegrated = Math.abs(expectedIntegratedTotal - campaign.total_estimated_amount) < 5;
              const netInvestment = isIntegrated ? (campaign.ad_investment_amount - totalFees) : campaign.ad_investment_amount;

              return (
                <Card className="p-4 space-y-2 relative overflow-hidden">
                  {isIntegrated && (
                    <div className="absolute top-0 right-0 bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-bl font-medium border-l border-b border-primary/20">
                      Fees incluidos
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    <p className="text-xs font-semibold">Inversión Publicitaria</p>
                  </div>
                  <p className="text-lg font-cinema text-foreground">
                    {netInvestment?.toLocaleString('es-ES')}€
                  </p>
                </Card>
              );
            })()}

            <Card className="p-4 space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Target className="h-4 w-4" />
                <p className="text-xs font-semibold">Coste Total</p>
              </div>
              <p className="text-lg font-cinema text-foreground">
                {campaign.total_estimated_amount?.toLocaleString('es-ES')}€
              </p>
            </Card>

            <Card className="p-4 space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <FileText className="h-4 w-4" />
                <p className="text-xs font-semibold">Deadline Creativos</p>
              </div>
              <p className="text-lg font-cinema text-foreground">
                {formatDateShort(new Date(campaign.creatives_deadline))}
              </p>
            </Card>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
            <TabsTrigger value="timeline" className="text-xs sm:text-sm">Timeline</TabsTrigger>
            <TabsTrigger value="details" className="text-xs sm:text-sm">Detalles</TabsTrigger>
            <TabsTrigger value="chat" className="text-xs sm:text-sm">Chat</TabsTrigger>
            <TabsTrigger value="assets" className="text-xs sm:text-sm">Creativos</TabsTrigger>
          </TabsList>

          {/* Timeline Tab */}
          <TabsContent value="timeline" className="space-y-4">
            <Card className="p-6">
              <h2 className="font-cinema text-2xl mb-6">Estado de tu campaña</h2>
              <CampaignTimeline
                campaignId={campaign.id}
                status={campaign.status}
                createdAt={campaign.created_at}
                creativesDeadline={campaign.creatives_deadline}
                premiereStart={campaign.premiere_weekend_start}
                finalReportDate={campaign.final_report_date}
                onNavigateToCreatives={() => setActiveTab('assets')}
              />
            </Card>
          </TabsContent>


          {/* Details Tab */}
          <TabsContent value="details" className="space-y-4">
            <Card className="p-6 space-y-6">
              <div>
                {/* Pending Edit Banner is now above the editable area */}
                {pendingProposal && (
                  <div className="mb-6">
                    <PendingEditBanner
                      proposal={pendingProposal}
                      currentFilm={film}
                      currentCampaign={campaign}
                      currentPlatforms={campaign.campaign_platforms}
                      isAdmin={userRole === 'admin'}
                      onApproved={() => loadCampaign()}
                      onRejected={() => loadCampaign()}
                    />
                  </div>
                )}

                <CampaignInfoEditable
                  film={film}
                  platforms={campaign.campaign_platforms}
                  campaignId={campaign.id}
                  creativesDeadline={campaign.creatives_deadline}
                  premiereWeekend={campaign.premiere_weekend_start}
                  totalBudget={campaign.ad_investment_amount}
                  feeDetails={{
                    fixed_fee_amount: campaign.fixed_fee_amount,
                    variable_fee_amount: campaign.variable_fee_amount,
                    setup_fee_amount: campaign.setup_fee_amount,
                    addons_base_amount: campaign.addons_base_amount,
                    total_estimated_amount: campaign.total_estimated_amount
                  }}
                  disabled={!!pendingProposal}
                  isAdmin={userRole === 'admin'}
                  onEditingChange={setIsDetailsEditing}
                />
              </div>

              <div>
                <h3 className="font-cinema text-xl text-primary mb-3">Fechas Clave</h3>

                <div className="space-y-4">
                  {/* Row 1: Deadline + Campaña Inicio + Estreno */}
                  <div className={`grid grid-cols-1 gap-4 ${campaign.post_estreno_end_date ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
                    {/* Deadline Creativos — read-only */}
                    {(() => {
                      const date = new Date(campaign.creatives_deadline);
                      const relative = getRelativeTime(date);
                      return (
                        <div className="flex flex-col space-y-1 p-3 bg-muted/20 rounded border border-white/5">
                          <p className="text-sm text-muted-foreground">Deadline Creativos</p>
                          <div className="flex items-center justify-between">
                            <p className="text-foreground font-medium">{formatDateShort(date)}</p>
                            <span className={`text-xs px-2 py-1 rounded font-medium ${relative.isPast ? 'bg-red-500/10 text-red-400' : 'bg-primary/20 text-primary'}`}>{relative.text}</span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Campaña (Inicio) — editable by admin */}
                    {(() => {
                      const date = new Date(campaign.pre_start_date);
                      const relative = getRelativeTime(date);
                      return (
                        <div className="flex flex-col space-y-1 p-3 bg-muted/20 rounded border border-white/5">
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">Campaña (Inicio)</p>
                            {userRole === 'admin' && (
                              <button onClick={openCampaignDateEditor} className="text-muted-foreground hover:text-primary transition-colors" title="Editar fechas de campaña">
                                <Pencil className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-foreground font-medium">{formatDateShort(date)}</p>
                            <span className={`text-xs px-2 py-1 rounded font-medium ${relative.isPast ? 'bg-red-500/10 text-red-400' : 'bg-primary/20 text-primary'}`}>{relative.text}</span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Estreno — read-only */}
                    {(() => {
                      const date = new Date(campaign.premiere_weekend_start);
                      const relative = getRelativeTime(date);
                      return (
                        <div className="flex flex-col space-y-1 p-3 bg-muted/20 rounded border border-white/5">
                          <p className="text-sm text-muted-foreground">Estreno</p>
                          <div className="flex items-center justify-between">
                            <p className="text-foreground font-medium">{formatDateShort(date)}</p>
                            <span className={`text-xs px-2 py-1 rounded font-medium ${relative.isPast ? 'bg-red-500/10 text-red-400' : 'bg-primary/20 text-primary'}`}>{relative.text}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Row 2: post-estreno (if set) + Reporte Final */}
                  <div className={`grid grid-cols-1 gap-4 ${campaign.post_estreno_end_date ? 'md:grid-cols-2' : 'md:grid-cols-1'}`}>
                    {campaign.post_estreno_end_date && (() => {
                      const postDate = new Date(campaign.post_estreno_end_date);
                      const relPost = getRelativeTime(postDate);
                      return (
                        <div className="flex flex-col space-y-1 p-3 rounded border bg-primary/5 border-primary/20">
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">Fecha de finalización</p>
                            {userRole === 'admin' && (
                              <button onClick={removePostEstrenoDate} disabled={savingPostEstreno} className="text-muted-foreground hover:text-red-400 transition-colors" title="Eliminar fecha de finalización">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-foreground font-medium">{formatDateShort(postDate)}</p>
                            <span className={`text-xs px-2 py-1 rounded font-medium ${relPost.isPast ? 'bg-red-500/10 text-red-400' : 'bg-primary/20 text-primary'}`}>{relPost.text}</span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Reporte Final — editable by admin */}
                    {(() => {
                      const repDate = new Date(campaign.final_report_date);
                      const relRep = getRelativeTime(repDate);
                      return (
                        <div className="flex flex-col space-y-1 p-3 bg-muted/20 rounded border border-white/5">
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">Reporte final</p>
                            {userRole === 'admin' && (
                              <Popover open={editingFinalReport} onOpenChange={setEditingFinalReport}>
                                <PopoverTrigger asChild>
                                  <button className="text-muted-foreground hover:text-primary transition-colors" title="Editar fecha">
                                    <Pencil className="h-3 w-3" />
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="end">
                                  <CalendarPicker
                                    mode="single"
                                    defaultMonth={repDate}
                                    selected={repDate}
                                    onSelect={saveFinalReportDate}
                                    disabled={(date) => date < new Date(campaign.premiere_weekend_start)}
                                    initialFocus
                                  />
                                  <p className="text-xs text-muted-foreground text-center pb-3 px-3">Fecha en que se enviará el informe final.</p>
                                </PopoverContent>
                              </Popover>
                            )}
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-foreground font-medium">{formatDateShort(repDate)}</p>
                            <span className={`text-xs px-2 py-1 rounded font-medium ${relRep.isPast ? 'bg-red-500/10 text-red-400' : 'bg-primary/20 text-primary'}`}>{relRep.text}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Admin-only: add/change finalization date */}
                  {userRole === 'admin' && !campaign.post_estreno_end_date && (
                    <Popover open={postEstrenoPickerOpen} onOpenChange={setPostEstrenoPickerOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" disabled={savingPostEstreno} className="w-full min-h-[52px] border-dashed border-primary/30 text-muted-foreground hover:text-primary hover:border-primary/60 hover:bg-primary/5 gap-2">
                          <CalendarPlus className="h-4 w-4" />
                          {savingPostEstreno ? 'Guardando...' : 'Agregar fecha de finalización'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="center">
                        <CalendarPicker
                          mode="single"
                          defaultMonth={new Date(campaign.premiere_weekend_start)}
                          modifiers={{ premiere: new Date(campaign.premiere_weekend_start) }}
                          modifiersClassNames={{ premiere: 'border border-primary/60 text-primary font-bold' }}
                          onSelect={savePostEstrenoDate}
                          disabled={(date) => date < new Date(campaign.premiere_weekend_start)}
                          initialFocus
                        />
                        <p className="text-xs text-muted-foreground text-center pb-3 px-3">
                          Fecha en la que finaliza la campaña.<br />
                          El reporte final se actualizará a 7 días después.
                        </p>
                      </PopoverContent>
                    </Popover>
                  )}

                  {/* Admin inline campaign date editor */}
                  {userRole === 'admin' && editingPreStart && (
                    <div className="border border-dashed border-primary/40 rounded-xl p-4 space-y-4 bg-primary/5">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-primary">Editar fechas de campaña</p>
                        <button onClick={() => setEditingPreStart(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground">Inicio de campaña</p>
                          <CalendarPicker
                            mode="single"
                            selected={tempPreStart}
                            onSelect={setTempPreStart}
                            defaultMonth={tempPreStart}
                            disabled={(date) => date >= new Date(campaign.premiere_weekend_start)}
                            className="rounded-md border border-border bg-background w-full max-w-[320px]"
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">Fin de campaña</p>
                            {tempCampaignEnd && (
                              <button onClick={() => setTempCampaignEnd(undefined)} className="text-xs text-muted-foreground hover:text-foreground underline">× quitar</button>
                            )}
                          </div>
                          <CalendarPicker
                            mode="single"
                            selected={tempCampaignEnd}
                            onSelect={setTempCampaignEnd}
                            defaultMonth={tempCampaignEnd ?? new Date(campaign.premiere_weekend_start)}
                            disabled={(date) => date < new Date(campaign.premiere_weekend_start)}
                            className="rounded-md border border-border bg-background w-full max-w-[320px]"
                          />
                          {!tempCampaignEnd && (
                            <p className="text-xs text-muted-foreground">Sin fecha de fin → termina el fin de semana del estreno.</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" size="sm" onClick={() => setEditingPreStart(false)}>Cancelar</Button>
                        <Button size="sm" onClick={saveCampaignDates} disabled={!tempPreStart || savingDate}>
                          {savingDate ? 'Guardando...' : 'Guardar fechas'}
                        </Button>
                      </div>
                    </div>
                  )}

                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-cinema text-xl text-primary">Desglose Económico</h3>
                  {userRole === 'admin' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={recalculateFees}
                      disabled={recalculating}
                      className="gap-2 text-xs border-primary/40 text-primary hover:bg-primary/10"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${recalculating ? 'animate-spin' : ''}`} />
                      {recalculating ? 'Actualizando...' : 'Actualizar fees'}
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Inversión publicitaria</span>
                    <span className="text-foreground font-semibold">
                      {campaign.ad_investment_amount?.toLocaleString('es-ES')}€
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fee fijo</span>
                    <span className="text-foreground font-semibold">
                      {campaign.fixed_fee_amount?.toLocaleString('es-ES')}€
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fee variable</span>
                    <span className="text-foreground font-semibold">
                      {campaign.variable_fee_amount?.toLocaleString('es-ES')}€
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fee setup</span>
                    <span className="text-foreground font-semibold">
                      {campaign.setup_fee_amount?.toLocaleString('es-ES')}€
                    </span>
                  </div>
                  {campaign.addons_base_amount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Add-ons</span>
                      <span className="text-foreground font-semibold">
                        {campaign.addons_base_amount?.toLocaleString('es-ES')}€
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-border">
                    <span className="text-foreground font-cinema">Total</span>
                    <span className="text-primary font-cinema text-xl">
                      {campaign.total_estimated_amount?.toLocaleString('es-ES')}€
                    </span>
                  </div>
                </div>
              </div>

              {campaign.additional_comments && (
                <div>
                  <h3 className="font-cinema text-xl text-primary mb-3">Comentarios Adicionales</h3>
                  <p className="text-foreground whitespace-pre-wrap">{campaign.additional_comments}</p>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Chat Tab */}
          <TabsContent value="chat" className="space-y-4">
            <Card className="p-0 overflow-hidden flex flex-col" style={{ height: 'min(600px, 80vh)' }}>
              <Tabs defaultValue="conversation" className="flex flex-col h-full border-none">
                <TabsList className="grid w-full grid-cols-2 rounded-none border-b border-border/40 bg-muted/30">
                  <TabsTrigger value="conversation" className="flex items-center gap-2 text-xs sm:text-sm data-[state=active]:bg-background">
                    <MessageSquare className="h-4 w-4" />
                    Conversación
                  </TabsTrigger>
                  <TabsTrigger value="notifications" className="flex items-center gap-2 text-xs sm:text-sm data-[state=active]:bg-background">
                    <Bell className="h-4 w-4" />
                    Notificaciones
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="conversation" className="flex-1 min-h-0 border-none p-0 mt-0 focus-visible:ring-0">
                  <CampaignChat campaignId={campaign.id} userRole={userRole} minimal={true} />
                </TabsContent>
                <TabsContent value="notifications" className="flex-1 min-h-0 border-none p-0 mt-0 focus-visible:ring-0 overflow-y-auto">
                  <CampaignNotifications campaignId={campaign.id} />
                </TabsContent>
              </Tabs>
            </Card>
          </TabsContent>

          {/* Assets Tab */}
          <TabsContent value="assets" className="space-y-4">
            <Card className="p-6">
              <h2 className="font-cinema text-2xl mb-6">Materiales Creativos</h2>
              <CreativeAssets
                campaignId={campaign.id}
                isAdmin={userRole === 'admin'}
                creativesDeadline={campaign.creatives_deadline}
              />
            </Card>
          </TabsContent>
        </Tabs>
      </main >
    </div >
  );
};

export default CampaignDetail;
