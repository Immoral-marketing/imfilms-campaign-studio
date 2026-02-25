import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { formatDateShort } from "@/utils/dateUtils";
import logoImfilms from "@/assets/logo-imfilms.png";
import { z } from "zod";
import { Film, Calendar, DollarSign, Plus, LogOut, BarChart, TrendingUp, Activity, Sparkles, Users, Building2, UserPlus, Shield, Eye, EyeOff, Trash2, StickyNote, ChevronDown, Bell, LayoutGrid } from "lucide-react";
import GlobalHelpButton from "@/components/GlobalHelpButton";
import OnboardingTour from "@/components/OnboardingTour";
import { useOnboarding } from "@/hooks/useOnboarding";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminDistributors from "./AdminDistributors";
import CampaignComparator from "@/components/CampaignComparator";
import CampaignNotesModal from "@/components/CampaignNotesModal";
import CampaignLabels from "@/components/CampaignLabels";

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
  const [sortOrder, setSortOrder] = useState<"creation_date" | "pending_changes" | "premiere_soon" | "incomplete" | "missing_materials">("creation_date");

  const { showOnboarding, completeOnboarding, skipOnboarding } = useOnboarding();

  // Admin Invite State
  const [showInviteAdmin, setShowInviteAdmin] = useState(false);
  const [inviteAdminEmail, setInviteAdminEmail] = useState("");
  const [invitingAdmin, setInvitingAdmin] = useState(false);

  // Forgot Password State
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Notes Modal State
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [selectedCampaignForNotes, setSelectedCampaignForNotes] = useState<any>(null);
  const [pendingNotesCounts, setPendingNotesCounts] = useState<Record<string, number>>({});

  // KPI Modal State
  const [showKPIModal, setShowKPIModal] = useState(false);
  const [selectedCampaignForKPI, setSelectedCampaignForKPI] = useState<any>(null);
  const [kpiData, setKPIData] = useState({
    reach: "",
    clicks: "",
    visits: "",
    ctr: "",
    cpm: ""
  });

  // Report Modal State
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedCampaignForReport, setSelectedCampaignForReport] = useState<any>(null);
  const [reportLink, setReportLink] = useState("");

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
          updated_at,
          films (
            title,
            genre,
            target_audience_text,
            target_audience_urls,
            target_audience_files,
            country,
            secondary_genre,
            main_goals
          ),
          distributors (
            company_name
          ),
          campaign_assets (
            count
          ),
          film_edit_proposals (
            proposed_data,
            created_at,
            status
          ),
          reach,
          clicks,
          visits,
          ctr,
          cpm,
          report_link,
          media_plan_phases (
            count
          )
        `);

      // If not admin, filter by distributor_id (userId)
      if (!isUserAdmin) {
        query = query.eq("distributor_id", userId);
      }

      const { data: campaignsData, error: campaignsError } = await query.order("created_at", { ascending: false });

      if (campaignsError) throw campaignsError;

      // Helper to compare values
      const hasChanged = (original: any, proposed: any) => {
        if (Array.isArray(original) && Array.isArray(proposed)) {
          return JSON.stringify(original.sort()) !== JSON.stringify(proposed.sort());
        }
        // Handle null/undefined vs empty string
        const normOrig = original === null || original === undefined ? '' : original;
        const normProp = proposed === null || proposed === undefined ? '' : proposed;
        return normOrig != normProp;
      };

      // Process campaigns to add recent_changes_list and pending_changes_list
      const processedCampaigns = (campaignsData || []).map(campaign => {
        // Find recent approved proposals (last 24h)
        const recentProposals = campaign.film_edit_proposals?.filter((p: any) => {
          const proposalDate = new Date(p.created_at);
          const now = new Date();
          const isRecent = (now.getTime() - proposalDate.getTime()) < 24 * 60 * 60 * 1000;
          return isRecent && p.status === 'approved';
        }) || [];

        // Find pending proposals
        const pendingProposals = campaign.film_edit_proposals?.filter((p: any) =>
          p.status === 'pending'
        ) || [];

        // Collect all changed fields from recent approved proposals
        const recentChanges = new Set<string>();
        recentProposals.forEach((p: any) => {
          if (p.proposed_data) {
            Object.keys(p.proposed_data).forEach(key => recentChanges.add(key));
          }
        });

        // Collect ACTUAL changed fields from pending proposals
        const pendingChanges = new Set<string>();
        pendingProposals.forEach((p: any) => {
          if (p.proposed_data && campaign.films) {
            const proposed = p.proposed_data;
            const current = campaign.films;

            // Check specific fields
            if (hasChanged(current.title, proposed.title)) pendingChanges.add('title');
            if (hasChanged(current.country, proposed.country)) pendingChanges.add('country');
            if (hasChanged(current.genre, proposed.genre)) pendingChanges.add('genre');
            if (hasChanged(current.secondary_genre, proposed.secondary_genre)) pendingChanges.add('secondary_genre');
            if (hasChanged(current.target_audience_text, proposed.target_audience_text)) pendingChanges.add('target_audience_text');
            if (hasChanged(current.main_goals, proposed.main_goals)) pendingChanges.add('main_goals');

            // Platforms check (if platforms exist in proposed)
            if (proposed.platforms) {
              // We assume if platforms are sent, they might be changed. 
              // For now, simpler to just flag it if present, or we'd need to fetch current platforms too.
              // Let's flag it if present in proposal, relying on dialog to only send if valid.
              pendingChanges.add('platforms');
            }
          }
        });

        return {
          ...campaign,
          recent_changes_list: Array.from(recentChanges),
          pending_changes_list: Array.from(pendingChanges)
        };
      });

      setCampaigns(processedCampaigns);

      if (isUserAdmin) {
        await fetchPendingNotesCounts();
      }
    } catch (error: any) {
      console.error("Error loading data:", error);
      toast.error("Error al cargar tus campañas");
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingNotesCounts = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('campaign_notes')
        .select('campaign_id')
        .eq('is_done', false);

      if (error) throw error;

      const counts: Record<string, number> = {};
      data?.forEach((note: any) => {
        counts[note.campaign_id] = (counts[note.campaign_id] || 0) + 1;
      });
      setPendingNotesCounts(counts);
    } catch (error) {
      console.error("Error fetching pending notes counts:", error);
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

  const handleSaveKPIs = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampaignForKPI) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({
          reach: kpiData.reach ? parseInt(kpiData.reach) : null,
          clicks: kpiData.clicks ? parseInt(kpiData.clicks) : null,
          visits: kpiData.visits ? parseInt(kpiData.visits) : null,
          ctr: kpiData.ctr ? parseFloat(kpiData.ctr) : null,
          cpm: kpiData.cpm ? parseFloat(kpiData.cpm) : null,
        })
        .eq('id', selectedCampaignForKPI.id);

      if (error) throw error;

      toast.success("KPIs actualizados correctamente");
      setShowKPIModal(false);
      await loadData(user.id, isAdmin);
    } catch (error: any) {
      console.error("Error saving KPIs:", error);
      toast.error("Error al guardar KPIs");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampaignForReport) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({
          report_link: reportLink
        })
        .eq('id', selectedCampaignForReport.id);

      if (error) throw error;

      toast.success("Informe actualizado correctamente");
      setShowReportModal(false);
      await loadData(user.id, isAdmin);
    } catch (error: any) {
      console.error("Error saving report:", error);
      toast.error("Error al guardar el informe");
    } finally {
      setLoading(false);
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
      filtered = filtered.filter(c => {
        const status = c.status || 'nuevo';
        if (statusFilter === 'borrador') return ['borrador', 'nuevo'].includes(status);
        if (statusFilter === 'en_revision') return ['en_revision', 'revisando'].includes(status);
        if (statusFilter === 'aprobada') return ['aprobada', 'aprobado'].includes(status);
        if (statusFilter === 'rechazada') return ['rechazada', 'rechazado'].includes(status);
        return status === statusFilter;
      });
    }

    // Dynamic Filters Logic
    if (sortOrder === "premiere_soon") {
      const today = new Date();
      const twentyOneDaysFromNow = new Date();
      twentyOneDaysFromNow.setDate(today.getDate() + 21);

      filtered = filtered.filter(c => {
        const premiereDate = new Date(c.premiere_weekend_start);
        return premiereDate >= today && premiereDate <= twentyOneDaysFromNow;
      });
      // Sort by closest date
      filtered.sort((a, b) => new Date(a.premiere_weekend_start).getTime() - new Date(b.premiere_weekend_start).getTime());
    } else if (sortOrder === "incomplete") {
      filtered = filtered.filter(c => {
        // Check for missing compulsory fields like audience (target_audience_text)
        // Checking in both campaign and film object as it might be joined
        // Improve check to handle empty strings
        const audience = c.target_audience_text || c.films?.target_audience_text;
        const hasAudience = audience && audience.trim().length > 0;
        return !hasAudience;
      });
    } else if (sortOrder === "missing_materials") {
      filtered = filtered.filter(c => {
        // Check if campaign_assets count is 0
        // Supabase returns count in an object like [{ count: 0 }] or similar depending on query
        // But here we are using the 'count' option in select, so it should be in campaign_assets[0].count if array
        // OR simply mapped. Let's inspect the data structure in a real scenario, but standard is array of objects.
        const assetsCount = c.campaign_assets?.[0]?.count || 0;
        return assetsCount === 0;
      });
    } else if (sortOrder === "pending_changes") {
      // Filter campaigns that have pending changes
      filtered = filtered.filter(c => c.pending_changes_list && c.pending_changes_list.length > 0);

      // Sort these by updated_at DESC (Most recently modified first)
      filtered.sort((a, b) => {
        const dateA = new Date(a.updated_at || a.created_at).getTime();
        const dateB = new Date(b.updated_at || b.created_at).getTime();
        return dateB - dateA;
      });
    } else {
      // "creation_date" - Default: Sort by created_at DESC (Newest first)
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return filtered;
  }, [campaigns, statusFilter, sortOrder]);

  const getStatusBadge = (status: string) => {
    const styles: any = {
      borrador: "bg-muted text-muted-foreground",
      nuevo: "bg-muted text-muted-foreground",
      en_revision: "bg-blue-500/20 text-blue-400",
      revisando: "bg-blue-500/20 text-blue-400",
      propuesta_lista: "bg-cinema-yellow/20 text-cinema-yellow animate-pulse",
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
      propuesta_lista: "Propuesta Lista",
      aprobada: "Aprobada",
      aprobado: "Aprobada",
      activa: "Activa",
      creativos_en_revision: "Creativos en revisión",
      finalizada: "Finalizada",
      pausada: "Pausada",
      rechazada: "Rechazada",
      rechazado: "Rechazada",
    };
    const variant = styles[status] || styles.nuevo;
    const label = labels[status] || "Borrador";

    return <Badge variant="outline" className={`${variant} border-none font-cinema text-[10px] uppercase tracking-wider`}>{label}</Badge>;
  };

  const getMediaPlanBadge = (campaign: any) => {
    const status = campaign.media_plan_status || 'borrador';
    const phasesCount = campaign.media_plan_phases?.[0]?.count || 0;

    if (phasesCount === 0) {
      return (
        <Badge variant="outline" className="absolute -top-2 -right-2 z-10 bg-zinc-700 text-zinc-300 border-none text-[8px] uppercase font-black px-1.5 py-0.5 leading-none shadow-md">
          Vacío
        </Badge>
      );
    }

    const styles: any = {
      borrador: "bg-blue-600 text-white border-none",
      pendiente_aprobacion: "bg-cinema-yellow text-black border-none animate-pulse",
      aprobado: "bg-green-600 text-white border-none",
      rechazado: "bg-red-600 text-white border-none"
    };

    const labels: any = {
      borrador: "Borrador",
      pendiente_aprobacion: "Pendiente",
      aprobado: "Aprobado",
      rechazado: "Rechazado"
    };

    return (
      <Badge variant="outline" className={`absolute -top-2 -right-2 z-10 ${styles[status] || styles.borrador} text-[8px] uppercase font-black px-1.5 py-0.5 leading-none shadow-sm`}>
        {labels[status] || "Borrador"}
      </Badge>
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
            <div className="flex rounded-md shadow-sm">
              <Button
                onClick={() => navigate("/quick-wizard")}
                className="bg-[#ebc453] text-black hover:bg-[#d0ab40] rounded-r-none border-r border-[#black/20]"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nueva campaña
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    className="bg-[#ebc453] text-black hover:bg-[#d0ab40] rounded-l-none px-2"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-[#1f1f22] border-[#ebc453]/20">
                  <DropdownMenuItem
                    onClick={() => navigate("/quick-wizard")}
                    className="text-[#ebc453] hover:bg-[#ebc453] hover:text-black focus:text-black focus:bg-[#ebc453] cursor-pointer"
                  >
                    Modo rápido
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate("/wizard")}
                    className="text-[#ebc453] hover:bg-[#ebc453] hover:text-black focus:text-black focus:bg-[#ebc453] mt-1 cursor-pointer"
                  >
                    Modo Avanzado
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
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
          <TabsList className="bg-cinema-black border border-border">
            <TabsTrigger value="campaigns" className="data-[state=active]:bg-primary data-[state=active]:text-black">
              <Film className="w-4 h-4 mr-2" />
              Campañas
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="distributors" className="data-[state=active]:bg-primary data-[state=active]:text-black">
                <Building2 className="w-4 h-4 mr-2" />
                Distribuidoras
              </TabsTrigger>
            )}
            <TabsTrigger value="comparative" className="data-[state=active]:bg-primary data-[state=active]:text-black">
              <BarChart className="w-4 h-4 mr-2" />
              Métricas / Comparativas
            </TabsTrigger>
          </TabsList>

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
                    onClick={() => navigate("/quick-wizard")}
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
                    <Label className="text-cinema-ivory text-sm font-semibold">Filtrar por estado:</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[180px] bg-background border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas las campañas</SelectItem>
                        <SelectItem value="borrador">Borradores</SelectItem>
                        <SelectItem value="en_revision">En revisión</SelectItem>
                        <SelectItem value="aprobada">Aprobadas</SelectItem>
                        <SelectItem value="creativos_en_revision">Creativos en revisión</SelectItem>
                        <SelectItem value="activa">Activas</SelectItem>
                        <SelectItem value="finalizada">Finalizadas</SelectItem>
                        <SelectItem value="pausada">Pausadas</SelectItem>
                        <SelectItem value="rechazada">Rechazadas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-4 items-center">
                    <Label className="text-cinema-ivory text-sm font-semibold">Filtros Dinámicos:</Label>
                    <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as any)}>
                      <SelectTrigger className="w-[280px] bg-background border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="creation_date">Fecha de creación</SelectItem>
                        <SelectItem value="pending_changes">Cambios pendiente</SelectItem>
                        <SelectItem value="premiere_soon">Fecha de estreno cercana (&lt; 21 días)</SelectItem>
                        <SelectItem value="incomplete">Campañas incompletas</SelectItem>
                        <SelectItem value="missing_materials">Falta de materiales</SelectItem>
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
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedCampaignForNotes(campaign);
                                      setShowNotesModal(true);
                                    }}
                                    className="text-muted-foreground hover:text-primary transition-colors p-1 relative"
                                    title="Notas internas"
                                  >
                                    <StickyNote className="w-4 h-4" />
                                    {pendingNotesCounts[campaign.id] > 0 && (
                                      <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-background flex items-center justify-center">
                                        {pendingNotesCounts[campaign.id] > 9 ? '9+' : pendingNotesCounts[campaign.id]}
                                      </span>
                                    )}
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteCampaign(campaign.id, campaign.films?.title);
                                    }}
                                    className="text-muted-foreground hover:text-red-500 transition-colors p-1"
                                    title="Eliminar campaña"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
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
                              <CampaignLabels campaign={campaign} />
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
                                  <SelectItem value="propuesta_lista">Propuesta Lista</SelectItem>
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
                              <p className="text-muted-foreground flex items-center gap-1">
                                Inversión publicitaria:
                                {(() => {
                                  const totalFees = (campaign.fixed_fee_amount || 0) + (campaign.variable_fee_amount || 0) + (campaign.setup_fee_amount || 0);
                                  const expectedIntegratedTotal = (campaign.ad_investment_amount || 0) + (campaign.addons_base_amount || 0);
                                  const isIntegrated = Math.abs(expectedIntegratedTotal - campaign.total_estimated_amount) < 5;
                                  return isIntegrated && (
                                    <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded leading-none border border-primary/20">
                                      Fees inc.
                                    </span>
                                  );
                                })()}
                              </p>
                            </div>
                            <p className="text-cinema-yellow font-semibold">
                              {(() => {
                                const totalFees = (campaign.fixed_fee_amount || 0) + (campaign.variable_fee_amount || 0) + (campaign.setup_fee_amount || 0);
                                const expectedIntegratedTotal = (campaign.ad_investment_amount || 0) + (campaign.addons_base_amount || 0);
                                const isIntegrated = Math.abs(expectedIntegratedTotal - campaign.total_estimated_amount) < 5;
                                const netInvestment = isIntegrated ? (campaign.ad_investment_amount - totalFees) : campaign.ad_investment_amount;
                                return netInvestment.toLocaleString("es-ES");
                              })()}€
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

                        {isAdmin && (
                          <div className="pt-3 border-t border-border flex flex-wrap gap-2">
                            {['en_revision', 'revisando'].includes(campaign.status) && (
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/wizard/review/${campaign.id}`);
                                }}
                                className="bg-primary text-primary-foreground hover:bg-secondary"
                                size="sm"
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                Revisar campaña
                              </Button>
                            )}

                            {campaign.pending_changes_list && campaign.pending_changes_list.length > 0 && (
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/campaigns/${campaign.id}?tab=details`);
                                }}
                                className="bg-cinema-yellow text-black hover:bg-cinema-yellow/90 font-bold"
                                size="sm"
                              >
                                <Bell className="w-4 h-4 mr-2" />
                                Revisar cambios
                              </Button>
                            )}

                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCampaignForKPI(campaign);
                                setKPIData({
                                  reach: campaign.reach?.toString() || "",
                                  clicks: campaign.clicks?.toString() || "",
                                  visits: campaign.visits?.toString() || "",
                                  ctr: campaign.ctr?.toString() || "",
                                  cpm: campaign.cpm?.toString() || ""
                                });
                                setShowKPIModal(true);
                              }}
                              variant="outline"
                              className="border-cinema-yellow text-cinema-yellow hover:bg-cinema-yellow hover:text-black transition-colors"
                              size="sm"
                            >
                              <BarChart className="w-4 h-4 mr-2" />
                              Agregar KPIs
                            </Button>

                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCampaignForReport(campaign);
                                setReportLink(campaign.report_link || "");
                                setShowReportModal(true);
                              }}
                              variant="outline"
                              className="border-cinema-yellow text-cinema-yellow hover:bg-cinema-yellow hover:text-black transition-colors"
                              size="sm"
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Agregar informe
                            </Button>

                            <div className="relative inline-block">
                              {getMediaPlanBadge(campaign)}
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/admin/media-plan/${campaign.id}`);
                                }}
                                variant="outline"
                                className="border-cinema-yellow text-cinema-yellow hover:bg-cinema-yellow hover:text-black transition-colors"
                                size="sm"
                              >
                                <LayoutGrid className="w-4 h-4 mr-2" />
                                Agregar plan de medios
                              </Button>
                            </div>
                          </div>
                        )}

                        {!isAdmin && (
                          <div className="pt-3 border-t border-border mt-auto space-y-4">
                            {/* Media Plan Button for Distributor */}
                            {campaign.media_plan_status && campaign.media_plan_status !== 'borrador' && (
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/campaigns/${campaign.id}/media-plan`);
                                }}
                                className={`w-full font-bold ${campaign.media_plan_status === 'pendiente_aprobacion'
                                  ? 'bg-cinema-yellow text-black hover:bg-cinema-yellow/90 animate-pulse'
                                  : 'border-cinema-gold text-cinema-gold hover:bg-cinema-gold/10'
                                  }`}
                                variant={campaign.media_plan_status === 'pendiente_aprobacion' ? 'default' : 'outline'}
                                size="sm"
                              >
                                <LayoutGrid className="w-4 h-4 mr-2" />
                                {campaign.media_plan_status === 'pendiente_aprobacion'
                                  ? 'Revisar Plan de Medios'
                                  : 'Ver Plan de Medios'}
                              </Button>
                            )}

                            {campaign.status === 'finalizada' && (
                              <div className="space-y-4">
                                {(campaign.reach || campaign.clicks || campaign.visits) && (
                                  <div className="grid grid-cols-4 gap-2 py-2 bg-primary/5 rounded-lg border border-primary/10">
                                    {campaign.reach && (
                                      <div className="text-center">
                                        <p className="text-[10px] text-muted-foreground uppercase">Alcance</p>
                                        <p className="text-sm font-cinema text-primary">{campaign.reach.toLocaleString()}</p>
                                      </div>
                                    )}
                                    {campaign.clicks && (
                                      <div className="text-center">
                                        <p className="text-[10px] text-muted-foreground uppercase">Clicks</p>
                                        <p className="text-sm font-cinema text-primary">{campaign.clicks.toLocaleString()}</p>
                                      </div>
                                    )}
                                    {campaign.ctr && (
                                      <div className="text-center">
                                        <p className="text-[10px] text-muted-foreground uppercase">CTR</p>
                                        <p className="text-sm font-cinema text-primary">{campaign.ctr}%</p>
                                      </div>
                                    )}
                                    {campaign.cpm && (
                                      <div className="text-center">
                                        <p className="text-[10px] text-muted-foreground uppercase">CPM</p>
                                        <p className="text-sm font-cinema text-primary">{campaign.cpm}€</p>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {campaign.report_link && (
                                  <Button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      window.open(campaign.report_link, '_blank');
                                    }}
                                    className="w-full bg-primary text-primary-foreground hover:bg-secondary font-bold"
                                    size="sm"
                                  >
                                    <Eye className="w-4 h-4 mr-2" />
                                    Ver Informe Completo
                                  </Button>
                                )}
                              </div>
                            )}

                            {campaign.status === 'propuesta_lista' && (
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/campaigns/${campaign.id}/proposal`);
                                }}
                                className="w-full bg-cinema-yellow text-black hover:bg-cinema-yellow/90 font-bold"
                                size="sm"
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                Ver Propuesta
                              </Button>
                            )}
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

          <TabsContent value="comparative">
            <CampaignComparator isAdmin={isAdmin} userId={user?.id} />
          </TabsContent>
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

      {/* Notes Modal */}
      <CampaignNotesModal
        open={showNotesModal}
        onOpenChange={setShowNotesModal}
        campaignId={selectedCampaignForNotes?.id || null}
        campaignTitle={selectedCampaignForNotes?.films?.title || ""}
        onNotesChange={fetchPendingNotesCounts}
      />

      {/* KPI Modal */}
      {showKPIModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <Card className="cinema-card w-full max-w-md p-6 relative">
            <button
              onClick={() => setShowKPIModal(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-white"
            >
              ✕
            </button>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-primary/20">
                  <BarChart className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-cinema text-2xl text-primary">Agregar KPIs</h3>
                  <p className="text-sm text-cinema-ivory">{selectedCampaignForKPI?.films?.title}</p>
                </div>
              </div>

              <form onSubmit={handleSaveKPIs} className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Alcance (Reach)</Label>
                    <Input
                      type="number"
                      value={kpiData.reach}
                      onChange={(e) => setKPIData({ ...kpiData, reach: e.target.value })}
                      className="bg-muted border-border"
                      placeholder="Ej: 150000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Clicks</Label>
                    <Input
                      type="number"
                      value={kpiData.clicks}
                      onChange={(e) => setKPIData({ ...kpiData, clicks: e.target.value })}
                      className="bg-muted border-border"
                      placeholder="Ej: 5400"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Visitas</Label>
                    <Input
                      type="number"
                      value={kpiData.visits}
                      onChange={(e) => setKPIData({ ...kpiData, visits: e.target.value })}
                      className="bg-muted border-border"
                      placeholder="Ej: 3200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>CTR (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={kpiData.ctr}
                      onChange={(e) => setKPIData({ ...kpiData, ctr: e.target.value })}
                      className="bg-muted border-border"
                      placeholder="Ej: 1.25"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>CPM (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={kpiData.cpm}
                      onChange={(e) => setKPIData({ ...kpiData, cpm: e.target.value })}
                      className="bg-muted border-border"
                      placeholder="Ej: 0.85"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowKPIModal(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="bg-primary text-primary-foreground hover:bg-secondary"
                    disabled={loading}
                  >
                    {loading ? "Guardando..." : "Guardar KPIs"}
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <Card className="cinema-card w-full max-w-md p-6 relative">
            <button
              onClick={() => setShowReportModal(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-white"
            >
              ✕
            </button>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-cinema-yellow/20">
                  <Eye className="w-6 h-6 text-cinema-yellow" />
                </div>
                <div>
                  <h3 className="font-cinema text-2xl text-primary">Agregar Informe</h3>
                  <p className="text-sm text-cinema-ivory">{selectedCampaignForReport?.films?.title}</p>
                </div>
              </div>

              <form onSubmit={handleSaveReport} className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Enlace al informe completo</Label>
                  <Input
                    type="url"
                    value={reportLink}
                    onChange={(e) => setReportLink(e.target.value)}
                    className="bg-muted border-border"
                    placeholder="https://ejemplo.com/informe-campaña"
                    required
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowReportModal(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="bg-cinema-yellow text-black hover:bg-cinema-yellow/90"
                    disabled={loading}
                  >
                    {loading ? "Guardando..." : "Guardar Informe"}
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
