import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { ArrowLeft, Film, Calendar, DollarSign, Target, MessageSquare, FileText, Edit } from 'lucide-react';
import CampaignTimeline from '@/components/CampaignTimeline';
import CampaignChat from '@/components/CampaignChat';
import CreativeAssets from '@/components/CreativeAssets';
import EditFilmInfoDialog from '@/components/EditFilmInfoDialog';
import PendingEditBanner from '@/components/PendingEditBanner';
import ProposalReviewPanel from '@/components/ProposalReviewPanel';
import { usePendingFilmProposal } from '@/hooks/useFilmEditProposals';
import { formatDateShort } from '@/utils/dateUtils';
import logoImfilms from '@/assets/logo-imfilms.png';

const CampaignDetail = () => {
  const { id: campaignId } = useParams<{ id: string }>();
  const navigate = useNavigate();
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
            country,
            target_audience_text,
            main_goals
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
                {film.genre} • {film.country}
              </p>
            </div>
            <div className="text-right space-y-1">
              <p className="text-sm text-muted-foreground">Estado actual</p>
              <p className={`font-cinema text-2xl ${getStatusColor(campaign.status)}`}>
                {getStatusLabel(campaign.status)}
              </p>
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
        <Tabs defaultValue="timeline" className="space-y-6">
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
                status={campaign.status}
                createdAt={campaign.created_at}
                creativesDeadline={campaign.creatives_deadline}
                premiereStart={campaign.premiere_weekend_start}
                finalReportDate={campaign.final_report_date}
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
                    <PendingEditBanner proposal={pendingProposal} currentFilm={film} />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Título</p>
                    <p className="text-foreground">{film.title}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Género</p>
                    <p className="text-foreground">{film.genre}</p>
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Deadline Creativos</p>
                    <p className="text-foreground">{formatDateShort(new Date(campaign.creatives_deadline))}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pre-campaña</p>
                    <p className="text-foreground">
                      {formatDateShort(new Date(campaign.pre_start_date))} - {formatDateShort(new Date(campaign.pre_end_date))}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Fin de semana de estreno</p>
                    <p className="text-foreground">
                      {formatDateShort(new Date(campaign.premiere_weekend_start))} - {formatDateShort(new Date(campaign.premiere_weekend_end))}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Reporte final</p>
                    <p className="text-foreground">{formatDateShort(new Date(campaign.final_report_date))}</p>
                  </div>
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

            {/* Admin Review Panel */}
            {userRole === 'admin' && pendingProposal && (
              <ProposalReviewPanel
                proposal={pendingProposal}
                currentFilm={film}
                onApproved={() => loadCampaign()}
                onRejected={() => loadCampaign()}
              />
            )}
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
      </main>
    </div>
  );
};

export default CampaignDetail;
