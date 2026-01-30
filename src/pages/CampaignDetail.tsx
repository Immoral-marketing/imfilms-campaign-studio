import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Film, Calendar, DollarSign, Target, MessageSquare, FileText, Edit } from 'lucide-react';
import CampaignTimeline from '@/components/CampaignTimeline';
import CampaignChat from '@/components/CampaignChat';
import CreativeAssets from '@/components/CreativeAssets';
import { formatDateShort, getRelativeTime } from '@/utils/dateUtils';
import EditFilmInfoDialog from '@/components/EditFilmInfoDialog';
import PendingEditBanner from '@/components/PendingEditBanner';
import { usePendingFilmProposal } from '@/hooks/useFilmEditProposals';
import logoImfilms from '@/assets/logo-imfilms.png';

const CampaignDetail = () => {
  const { id: campaignId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("timeline");
  const [campaign, setCampaign] = useState<any>(null);
  const [film, setFilm] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<'admin' | 'distributor'>('distributor');

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
            target_audience_text,
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
      <main className="container mx-auto px-6 py-8 space-y-8">
        {/* Campaign Header */}
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Film className="h-8 w-8 text-primary" />
                <h1 className="font-cinema text-4xl text-foreground">{film.title}</h1>
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
                  <SelectTrigger className="w-[200px] h-auto py-1 border-none bg-transparent">
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

            <Card className="p-4 space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                <p className="text-xs font-semibold">Inversión Publicitaria</p>
              </div>
              <p className="text-lg font-cinema text-foreground">
                {campaign.ad_investment_amount?.toLocaleString('es-ES')}€
              </p>
            </Card>

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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="details">Detalles</TabsTrigger>
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="assets">Creativos</TabsTrigger>
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
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-cinema text-xl text-primary">Información de la Película</h3>
                  <EditFilmInfoDialog
                    film={film}
                    platforms={campaign.campaign_platforms}
                    campaignId={campaign.id}
                    disabled={!!pendingProposal}
                  >
                    <Button variant="outline" size="sm" disabled={!!pendingProposal}>
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                  </EditFilmInfoDialog>
                </div>

                {/* Pending Edit Banner */}
                {pendingProposal && (
                  <div className="mb-4">
                    <PendingEditBanner
                      proposal={pendingProposal}
                      currentFilm={film}
                      currentPlatforms={campaign.campaign_platforms}
                      isAdmin={userRole === 'admin'}
                      onApproved={() => loadCampaign()}
                      onRejected={() => loadCampaign()}
                    />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Título</p>
                    <p className="text-foreground">{film.title}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Género</p>
                    <p className="text-foreground">{film.genre}{film.secondary_genre ? ` / ${film.secondary_genre}` : ''}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">País</p>
                    <p className="text-foreground">{film.country}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Territorio</p>
                    <p className="text-foreground">{campaign.territory || 'España'}</p>
                  </div>
                </div>
              </div>

              {campaign.campaign_platforms && campaign.campaign_platforms.length > 0 && (
                <div>
                  <h3 className="font-cinema text-xl text-primary mb-3">Plataformas y Distribución</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {campaign.campaign_platforms.map((platform: any, index: number) => (
                      <Card key={index} className="p-4 bg-muted/30 border-muted">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-foreground">{platform.platform_name}</span>
                          <span className="text-primary font-bold">
                            {platform.budget_percent ? `${platform.budget_percent}%` : 'N/A'}
                          </span>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {film.target_audience_text && (
                <div>
                  <h3 className="font-cinema text-xl text-primary mb-3">Audiencia Objetivo</h3>
                  <p className="text-foreground whitespace-pre-wrap">{film.target_audience_text}</p>
                </div>
              )}

              {film.main_goals && film.main_goals.length > 0 && (
                <div>
                  <h3 className="font-cinema text-xl text-primary mb-3">Objetivos Principales</h3>
                  <ul className="space-y-2">
                    {film.main_goals.map((goal: string, index: number) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-yellow-400 mt-1">•</span>
                        <span className="text-foreground">{goal}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <h3 className="font-cinema text-xl text-primary mb-3">Fechas Clave</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(() => {
                    const dates = [
                      { label: "Deadline Creativos", date: new Date(campaign.creatives_deadline) },
                      { label: "Pre-campaña (Inicio)", date: new Date(campaign.pre_start_date) },
                      { label: "Estreno", date: new Date(campaign.premiere_weekend_start) },
                      { label: "Reporte final", date: new Date(campaign.final_report_date) },
                    ];

                    return dates.map((item, index) => {
                      const relative = getRelativeTime(item.date);
                      return (
                        <div key={index} className="flex flex-col space-y-1 p-3 bg-muted/20 rounded border border-white/5">
                          <p className="text-sm text-muted-foreground">{item.label}</p>
                          <div className="flex items-center justify-between">
                            <p className="text-foreground font-medium">{formatDateShort(item.date)}</p>
                            <span className={`text-xs px-2 py-1 rounded font-medium ${relative.isPast ? 'bg-red-500/10 text-red-400' : 'bg-primary/20 text-primary'
                              }`}>
                              {relative.text}
                            </span>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              <div>
                <h3 className="font-cinema text-xl text-primary mb-3">Desglose Económico</h3>
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
            <Card className="p-0 overflow-hidden" style={{ height: '600px' }}>
              <CampaignChat campaignId={campaign.id} userRole={userRole} />
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
