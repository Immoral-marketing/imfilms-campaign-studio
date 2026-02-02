import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { formatDateShort } from "@/utils/dateUtils";
import logoImfilms from "@/assets/logo-imfilms.png";
import { z } from "zod";
import { Film, Calendar, DollarSign, Plus, LogOut, BarChart, TrendingUp, Activity, Sparkles, Users, Building2, UserPlus, Shield, Eye, EyeOff, Trash2 } from "lucide-react";
import GlobalHelpButton from "@/components/GlobalHelpButton";
import OnboardingTour from "@/components/OnboardingTour";
import { useOnboarding } from "@/hooks/useOnboarding";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminDistributors from "./AdminDistributors";

const loginSchema = z.object({
  email: z.string().trim().email("Email inválido"),
  password: z.string().min(1, "La contraseña es obligatoria"),
});

const CampaignsHistory = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [distributor, setDistributor] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const { showOnboarding, completeOnboarding, skipOnboarding } = useOnboarding();

  // Admin Invite State
  const [showInviteAdmin, setShowInviteAdmin] = useState(false);
  const [inviteAdminEmail, setInviteAdminEmail] = useState("");
  const [invitingAdmin, setInvitingAdmin] = useState(false);

  // Forgot Password State
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        setUser(session.user);

        // Check if user is admin
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .eq('role', 'admin')
          .single();

        const isUserAdmin = !!roles;
        setIsAdmin(isUserAdmin);

        await loadData(session.user.id, isUserAdmin);
      }
    } catch (error) {
      console.error("Auth check error:", error);
    }
  };

  const loadData = async (userId: string, isUserAdmin: boolean) => {
    setLoading(true);
    try {
      if (!isUserAdmin) {
        // Load distributor profile for regular users
        const { data: distData, error: distError } = await supabase
          .from("distributors")
          .select("*")
          .eq("id", userId)
          .single();

        if (distError) throw distError;
        setDistributor(distData);
      }

      // Load campaigns query
      let query = supabase
        .from("campaigns")
        .select(`
          *,
          films (
            title,
            genre
          ),
          distributors (
            company_name
          )
        `);

      // If not admin, filter by distributor_id (userId)
      if (!isUserAdmin) {
        query = query.eq("distributor_id", userId);
      }

      const { data: campaignsData, error: campaignsError } = await query.order("created_at", { ascending: false });

      if (campaignsError) throw campaignsError;
      setCampaigns(campaignsData || []);
    } catch (error: any) {
      console.error("Error loading data:", error);
      toast.error("Error al cargar tus campañas");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (campaignId: string, newStatus: string) => {
    if (!isAdmin) return;

    // Save old status for optimistic update rollback
    const oldCampaigns = [...campaigns];

    // Optimistic update
    setCampaigns(prev => prev.map(c =>
      c.id === campaignId ? { ...c, status: newStatus } : c
    ));

    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ status: newStatus })
        .eq('id', campaignId);

      if (error) throw error;
      toast.success("Estado actualizado correctamente");

      // EMAIL NOTIFICATION
      try {
        const campaign = campaigns.find(c => c.id === campaignId);
        if (campaign) {
          console.log("STARTING EMAIL PROCESS FOR STATUS UPDATE...", {
            campaignId,
            newStatus,
            recipient: campaign.contact_email
          });

          const { data: emailData, error: emailError } = await supabase.functions.invoke('send-email', {
            body: {
              type: 'status_update',
              campaignId: campaignId,
              campaignTitle: campaign.films?.title || 'Campaña',
              newStatus: newStatus,
              recipientEmail: campaign.contact_email
            }
          });

          console.log("EMAIL FUNCTION RESPONSE:", emailData, emailError);

          if (emailError) {
            console.error("Email function specific error:", emailError);
          }
        } else {
          console.warn("Campaign not found for email notification");
        }
      } catch (err) {
        console.error("FAILED to invoke email function:", err);
      }

    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Error al actualizar el estado");
      setCampaigns(oldCampaigns); // Rollback
    }
  };

  const handleDeleteCampaign = async (campaignId: string, campaignTitle: string) => {
    if (!isAdmin) return;

    if (!window.confirm(`⚠️ ESTA ACCIÓN ES IR REVERSIBLE\n\n¿Estás seguro de que quieres eliminar la campaña "${campaignTitle}"?\n\nSe borrará todo el historial y no se podrá recuperar.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', campaignId);

      if (error) throw error;

      toast.success("Campaña eliminada correctamente");
      setCampaigns(prev => prev.filter(c => c.id !== campaignId));
    } catch (error: any) {
      console.error("Error deleting campaign:", error);
      toast.error("Error al eliminar la campaña");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const validated = loginSchema.parse(loginData);
      setLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: validated.email,
        password: validated.password,
      });

      if (error) throw error;

      if (data.user) {
        setUser(data.user);
        // Check admin role again on login
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', data.user.id)
          .eq('role', 'admin')
          .single();

        const isUserAdmin = !!roles;
        setIsAdmin(isUserAdmin);

        await loadData(data.user.id, isUserAdmin);
        toast.success("¡Bienvenido de nuevo!");
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(error.message || "Error al iniciar sesión");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginData.email) {
      toast.error("Por favor, introduce tu email");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(loginData.email, {
        redirectTo: (import.meta.env.VITE_SITE_URL || window.location.origin) + "/reset-password",
      });

      if (error) throw error;

      toast.success("Correo de recuperación enviado. Revisa tu bandeja de entrada.");
      setShowForgotPassword(false);
    } catch (error: any) {
      toast.error(error.message || "Error al enviar el correo de recuperación");
    } finally {
      setLoading(false);
    }
  };

  const handleInviteAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteAdminEmail) return;

    setInvitingAdmin(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      const { data, error } = await supabase.functions.invoke('make-admin', {
        body: { email: inviteAdminEmail },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.message || data.error);
      } else {
        toast.success(data.message || "Invitación enviada correctamente");
        setShowInviteAdmin(false);
        setInviteAdminEmail("");
      }

    } catch (error: any) {
      console.error("Error inviting admin:", error);
      toast.error(error.message || "Error al invitar administrador");
    } finally {
      setInvitingAdmin(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setIsAdmin(false);
      setDistributor(null);
      setCampaigns([]);
      toast.success("Sesión cerrada");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Error al cerrar sesión");
    }
  };

  // Calculate KPIs
  const kpis = useMemo(() => {
    const total = campaigns.length;
    const activeCampaigns = campaigns.filter(c =>
      ['nuevo', 'en_revision', 'aprobado'].includes(c.status || 'nuevo')
    ).length;
    const totalInvestment = campaigns.reduce((sum, c) => sum + (c.ad_investment_amount || 0), 0);
    const avgInvestment = total > 0 ? totalInvestment / total : 0;

    return {
      total,
      active: activeCampaigns,
      totalInvestment,
      avgInvestment,
    };
  }, [campaigns]);

  // Filter and sort campaigns
  const filteredCampaigns = useMemo(() => {
    let filtered = [...campaigns];

    if (statusFilter !== "all") {
      filtered = filtered.filter(c => c.status === statusFilter);
    }

    filtered.sort((a, b) => {
      const dateA = new Date(a.premiere_weekend_start).getTime();
      const dateB = new Date(b.premiere_weekend_start).getTime();
      return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
    });

    return filtered;
  }, [campaigns, statusFilter, sortOrder]);

  const getStatusBadge = (status: string) => {
    const styles: any = {
      borrador: "bg-muted text-muted-foreground",
      nuevo: "bg-muted text-muted-foreground",
      en_revision: "bg-blue-500/20 text-blue-400",
      revisando: "bg-blue-500/20 text-blue-400",
      aprobada: "bg-green-500/20 text-green-400",
      aprobado: "bg-green-500/20 text-green-400",
      activa: "bg-green-500/20 text-green-400 animate-pulse",
      creativos_en_revision: "bg-yellow-500/20 text-yellow-400",
      finalizada: "bg-primary/20 text-primary",
      pausada: "bg-muted text-muted-foreground",
      rechazada: "bg-red-500/20 text-red-400",
      rechazado: "bg-red-500/20 text-red-400",
    };
    const labels: any = {
      borrador: "Borrador",
      nuevo: "Borrador",
      en_revision: "En revisión",
      revisando: "En revisión",
      aprobada: "Aprobada",
      aprobado: "Aprobada",
      activa: "Activa",
      creativos_en_revision: "Creativos en revisión",
      finalizada: "Finalizada",
      pausada: "Pausada",
      rechazada: "Rechazada",
      rechazado: "Rechazada",
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status] || styles.borrador}`}>
        {labels[status] || status}
      </span>
    );
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="cinema-card w-full max-w-md p-8 space-y-6">
          <div className="text-center space-y-4">
            <button onClick={() => navigate("/")} className="block mx-auto">
              <img
                src={logoImfilms}
                alt="IMFILMS"
                className="w-48 cursor-pointer hover:opacity-80 transition-opacity"
              />
            </button>
            <h2 className="font-cinema text-3xl text-primary">
              {showForgotPassword ? "Recuperar contraseña" : "Mis Estrenos"}
            </h2>
            <p className="text-muted-foreground">
              {showForgotPassword
                ? "Te enviaremos las instrucciones a tu correo"
                : "Inicia sesión para ver tu historial"
              }
            </p>
          </div>

          <form onSubmit={showForgotPassword ? handleResetPassword : handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-cinema-ivory">Email</Label>
              <Input
                id="email"
                type="email"
                value={loginData.email}
                onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                className="bg-muted border-border text-foreground"
                disabled={loading}
                required
              />
            </div>

            {!showForgotPassword && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-cinema-ivory">Contraseña</Label>
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-xs text-muted-foreground hover:text-primary underline"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    onKeyDown={(e) => e.key === "Enter" && !loading && handleLogin(e as any)}
                    className="bg-muted border-border text-foreground pr-10"
                    disabled={loading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-primary text-primary-foreground hover:bg-secondary"
              disabled={loading}
            >
              {loading
                ? "Procesando..."
                : showForgotPassword
                  ? "Enviar correo de recuperación"
                  : "Iniciar sesión"
              }
            </Button>

            {showForgotPassword && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowForgotPassword(false)}
                className="w-full text-cinema-ivory hover:text-primary mt-2"
              >
                Volver a iniciar sesión
              </Button>
            )}
          </form>

          <div className="text-center">
            <button
              onClick={() => navigate("/")}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              ← Volver al inicio
            </button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="font-cinema text-5xl md:text-6xl text-primary mb-2">
              {isAdmin ? "Panel de Administración" : "Tus Estrenos"}
            </h1>
            {isAdmin ? (
              <p className="text-cinema-ivory text-lg">
                Vista de <span className="text-primary font-semibold">Superusuario</span>
              </p>
            ) : (
              distributor && (
                <p className="text-cinema-ivory text-lg">
                  Hola, <span className="text-primary font-semibold">{distributor.company_name}</span>
                </p>
              )
            )}
            <p className="text-muted-foreground mt-1 text-sm">
              {isAdmin
                ? "Gestión centralizada de todas las campañas y estados."
                : "Aquí tienes el resumen de todo lo que hemos lanzado juntos y de lo que está por venir."
              }
            </p>
          </div>
          <div className="flex gap-3">
            {isAdmin && (
              <Button
                onClick={() => setShowInviteAdmin(true)}
                variant="outline"
                className="border-cinema-yellow text-cinema-yellow hover:bg-cinema-yellow/10"
              >
                <Shield className="w-4 h-4 mr-2 cinema-icon" />
                Invitar Admin
              </Button>
            )}
            <Button
              onClick={() => navigate("/wizard")}
              className="bg-primary text-primary-foreground hover:bg-secondary"
            >
              <Plus className="w-4 h-4 mr-2 cinema-icon" />
              Nueva campaña
            </Button>
            <Button
              onClick={() => navigate("/team")}
              variant="outline"
              className="border-primary text-primary hover:bg-primary/10"
            >
              <Users className="w-4 h-4 mr-2 cinema-icon" />
              Equipo
            </Button>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="border-primary text-primary hover:bg-primary/10"
            >
              <LogOut className="w-4 h-4 mr-2 cinema-icon" />
              Cerrar sesión
            </Button>
          </div>
        </div>

        <Tabs defaultValue="campaigns" className="space-y-6">
          {isAdmin && (
            <TabsList className="bg-muted border border-border">
              <TabsTrigger value="campaigns" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Film className="w-4 h-4 mr-2" />
                Campañas
              </TabsTrigger>
              <TabsTrigger value="distributors" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Building2 className="w-4 h-4 mr-2" />
                Distribuidoras
              </TabsTrigger>
            </TabsList>
          )}

          <TabsContent value="campaigns" className="space-y-8">
            {loading && (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
                <p className="text-muted-foreground mt-4">Cargando tu dashboard...</p>
              </div>
            )}

            {!loading && campaigns.length === 0 && (
              <Card className="cinema-card p-16 text-center space-y-6">
                <div className="flex justify-center">
                  <Sparkles className="w-16 h-16 text-primary cinema-icon-decorative animate-pulse" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-cinema text-3xl text-primary">
                    {isAdmin ? "No hay campañas registradas" : "Todavía no hemos lanzado ningún estreno juntos"}
                  </h3>
                  <p className="text-cinema-ivory max-w-md mx-auto">
                    {isAdmin
                      ? "Esperando a que los usuarios creen nuevas campañas."
                      : "Configura tu primera campaña y empecemos a llenar salas. La magia del cine está a punto de comenzar."
                    }
                  </p>
                </div>
                {!isAdmin && (
                  <Button
                    onClick={() => navigate("/wizard")}
                    size="lg"
                    className="bg-primary text-primary-foreground hover:bg-secondary mt-4"
                  >
                    <Film className="w-5 h-5 mr-2 cinema-icon" />
                    Crear mi primera campaña
                  </Button>
                )}
              </Card>
            )}

            {!loading && campaigns.length > 0 && (
              <>
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Total Campaigns */}
                  <Card className="cinema-card p-6 space-y-3 hover:border-primary/40 transition-colors">
                    <div className="flex items-center justify-between">
                      <Film className="w-8 h-8 text-primary cinema-icon-decorative" />
                      <span className="text-xs text-muted-foreground">Total</span>
                    </div>
                    <div>
                      <p className="text-4xl font-bold text-primary font-cinema">
                        {kpis.total}
                      </p>
                      <p className="text-sm text-cinema-ivory mt-1">
                        {kpis.total === 1 ? "Campaña" : "Campañas"}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground italic">
                      {isAdmin ? "Total global" : "La historia que ya hemos contado juntos"}
                    </p>
                  </Card>

                  {/* Active Campaigns */}
                  <Card className="cinema-card p-6 space-y-3 hover:border-primary/40 transition-colors">
                    <div className="flex items-center justify-between">
                      <Activity className="w-8 h-8 text-blue-400 cinema-icon-decorative" />
                      <span className="text-xs text-muted-foreground">Activas</span>
                    </div>
                    <div>
                      <p className="text-4xl font-bold text-blue-400 font-cinema">
                        {kpis.active}
                      </p>
                      <p className="text-sm text-cinema-ivory mt-1">
                        En marcha
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground italic">
                      {isAdmin ? "Requieren atención" : "Campañas que siguen dando guerra en digital"}
                    </p>
                  </Card>

                  {/* Total Investment */}
                  <Card className="cinema-card p-6 space-y-3 hover:border-primary/40 transition-colors">
                    <div className="flex items-center justify-between">
                      <DollarSign className="w-8 h-8 text-cinema-yellow cinema-icon-decorative" />
                      <span className="text-xs text-muted-foreground">Inversión</span>
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-cinema-yellow font-cinema">
                        {kpis.totalInvestment.toLocaleString("es-ES")}€
                      </p>
                      <p className="text-sm text-cinema-ivory mt-1">
                        Total gestionado
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground italic">
                      {isAdmin ? "Volumen global" : "Euros que ya has invertido con imfilms"}
                    </p>
                  </Card>

                  {/* Average Investment */}
                  <Card className="cinema-card p-6 space-y-3 hover:border-primary/40 transition-colors">
                    <div className="flex items-center justify-between">
                      <TrendingUp className="w-8 h-8 text-green-400 cinema-icon-decorative" />
                      <span className="text-xs text-muted-foreground">Media</span>
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-green-400 font-cinema">
                        {kpis.avgInvestment.toLocaleString("es-ES", { maximumFractionDigits: 0 })}€
                      </p>
                      <p className="text-sm text-cinema-ivory mt-1">
                        Por campaña
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground italic">
                      Inversión promedio por estreno
                    </p>
                  </Card>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-muted/20 p-4 rounded-lg border border-border">
                  <div className="flex gap-4 items-center flex-wrap">
                    <Label className="text-cinema-ivory text-sm font-semibold">Filtrar:</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[180px] bg-background border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas las campañas</SelectItem>
                        <SelectItem value="nuevo">Nuevas</SelectItem>
                        <SelectItem value="en_revision">En revisión</SelectItem>
                        <SelectItem value="aprobado">Aprobadas</SelectItem>
                        <SelectItem value="rechazado">Rechazadas</SelectItem>
                        <SelectItem value="borrador">Borradores</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-4 items-center">
                    <Label className="text-cinema-ivory text-sm font-semibold">Ordenar:</Label>
                    <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as "asc" | "desc")}>
                      <SelectTrigger className="w-[180px] bg-background border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="desc">Más recientes</SelectItem>
                        <SelectItem value="asc">Más antiguas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Campaigns List */}
                <div className="space-y-4">
                  {filteredCampaigns.length === 0 ? (
                    <Card className="cinema-card p-8 text-center">
                      <p className="text-muted-foreground">
                        No hay campañas con los filtros seleccionados
                      </p>
                    </Card>
                  ) : (
                    filteredCampaigns.map((campaign) => (
                      <Card
                        key={campaign.id}
                        className="cinema-card p-6 space-y-4 hover:border-primary/40 transition-all cursor-pointer relative group"
                        onClick={() => navigate(`/campaigns/${campaign.id}`)}
                      >
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                              {isAdmin && (
                                <Building2 className="w-4 h-4 text-cinema-yellow" />
                              )}
                              <h3 className="font-cinema text-2xl text-primary">
                                {campaign.films?.title || "Sin título"}
                              </h3>
                              {isAdmin && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteCampaign(campaign.id, campaign.films?.title);
                                  }}
                                  className="ml-2 text-muted-foreground hover:text-red-500 transition-colors p-1"
                                  title="Eliminar campaña"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                            <div className="flex flex-col gap-1">
                              {isAdmin && campaign.distributors && (
                                <p className="text-sm font-semibold text-cinema-yellow">
                                  {campaign.distributors.company_name}
                                </p>
                              )}
                              <p className="text-sm text-muted-foreground">
                                {campaign.films?.genre}
                              </p>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Creado: {formatDateShort(new Date(campaign.created_at))}
                            </p>
                          </div>

                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="min-w-[140px]"
                          >
                            {isAdmin ? (
                              <Select
                                value={campaign.status}
                                onValueChange={(val) => handleStatusChange(campaign.id, val)}
                              >
                                <SelectTrigger className="h-8 text-xs font-semibold">
                                  <SelectValue>
                                    {getStatusBadge(campaign.status)}
                                  </SelectValue>
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
                              getStatusBadge(campaign.status || "nuevo")
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Calendar className="w-4 h-4 cinema-icon-decorative" />
                              <p className="text-muted-foreground">Estreno:</p>
                            </div>
                            <p className="text-cinema-ivory font-semibold">
                              {formatDateShort(new Date(campaign.premiere_weekend_start))}
                            </p>
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <DollarSign className="w-4 h-4 cinema-icon-decorative" />
                              <p className="text-muted-foreground">Inversión publicitaria:</p>
                            </div>
                            <p className="text-cinema-yellow font-semibold">
                              {campaign.ad_investment_amount.toLocaleString("es-ES")}€
                            </p>
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <BarChart className="w-4 h-4 cinema-icon-decorative" />
                              <p className="text-muted-foreground">Total estimado:</p>
                            </div>
                            <p className="text-primary font-semibold">
                              {campaign.total_estimated_amount.toLocaleString("es-ES")}€
                            </p>
                          </div>
                        </div>

                        {campaign.additional_comments && (
                          <div className="pt-3 border-t border-border">
                            <p className="text-xs text-muted-foreground mb-1">Comentarios:</p>
                            <p className="text-sm text-cinema-ivory italic">{campaign.additional_comments}</p>
                          </div>
                        )}
                      </Card>
                    ))
                  )}
                </div>
              </>
            )}
          </TabsContent>

          {isAdmin && (
            <TabsContent value="distributors">
              <AdminDistributors />
            </TabsContent>
          )}
        </Tabs>

        {/* Onboarding Tour */}
        {user && showOnboarding && !isAdmin && (
          <OnboardingTour
            onComplete={completeOnboarding}
            onSkip={skipOnboarding}
          />
        )}

        {/* Global Help Button */}
        {user && <GlobalHelpButton context={isAdmin ? "admin" : "campañas"} />}
      </div>

      {/* Invite Admin Modal */}
      {showInviteAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <Card className="cinema-card w-full max-w-md p-6 relative">
            <button
              onClick={() => setShowInviteAdmin(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-white"
            >
              ✕
            </button>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-cinema-yellow/20">
                  <Shield className="w-6 h-6 text-cinema-yellow" />
                </div>
                <div>
                  <h3 className="font-cinema text-2xl text-primary">Nuevo Superusuario</h3>
                  <p className="text-sm text-cinema-ivory">Otorgar permisos globales</p>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                Esta acción convertirá al usuario en administrador global, dándole acceso a todas las campañas y configuraciones.
              </p>

              <form onSubmit={handleInviteAdmin} className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Email del usuario</Label>
                  <Input
                    type="email"
                    placeholder="usuario@ejemplo.com"
                    value={inviteAdminEmail}
                    onChange={(e) => setInviteAdminEmail(e.target.value)}
                    className="bg-muted border-border"
                    required
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowInviteAdmin(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="bg-cinema-yellow text-black hover:bg-cinema-yellow/90"
                    disabled={invitingAdmin}
                  >
                    {invitingAdmin ? "Procesando..." : "Confirmar Acceso"}
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        </div>
      )}

    </div>
  );
};

export default CampaignsHistory;
