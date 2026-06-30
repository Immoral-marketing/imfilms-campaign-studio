import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { formatDateShort } from "@/utils/dateUtils";
import { Shield, LogOut, RefreshCw, Calendar, DollarSign, BarChart, Building2, Film, Eye, PlayCircle, Plus, Pencil, Trash2, X, Check } from "lucide-react";
import AdminDistributors from "./AdminDistributors";
import { NavbarAdmin } from "@/components/NavbarAdmin";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useQueryClient } from "@tanstack/react-query";

// ─── Video management component ─────────────────────────────────────────────
const AdminVideos = () => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', description: '', iframe_url: '', display_order: 0 });
  const [saving, setSaving] = useState(false);

  const { data: videos = [], isLoading } = useQuery({
    queryKey: ['help_videos'],
    queryFn: async () => {
      const { data, error } = await supabase.from('help_videos').select('*').order('display_order');
      if (error) throw error;
      return data;
    },
  });

  const resetForm = () => {
    setForm({ title: '', description: '', iframe_url: '', display_order: 0 });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (video: any) => {
    setForm({ title: video.title, description: video.description || '', iframe_url: video.iframe_url, display_order: video.display_order });
    setEditingId(video.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.iframe_url.trim()) {
      toast.error('Título y código iframe son obligatorios');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        const { error } = await supabase.from('help_videos').update(form).eq('id', editingId);
        if (error) throw error;
        toast.success('Vídeo actualizado');
      } else {
        const { error } = await supabase.from('help_videos').insert(form);
        if (error) throw error;
        toast.success('Vídeo añadido');
      }
      queryClient.invalidateQueries({ queryKey: ['help_videos'] });
      resetForm();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`¿Eliminar el vídeo "${title}"?`)) return;
    const { error } = await supabase.from('help_videos').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Vídeo eliminado');
    queryClient.invalidateQueries({ queryKey: ['help_videos'] });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-cinema text-xl text-foreground">Vídeos del Centro de Ayuda</h3>
        {!showForm && (
          <Button size="sm" onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Añadir vídeo
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="p-5 space-y-4 border-primary/20">
          <h4 className="font-semibold text-foreground">{editingId ? 'Editar vídeo' : 'Nuevo vídeo'}</h4>
          <div className="space-y-3">
            <div>
              <Label>Título *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ej: Cómo crear tu primera campaña" className="mt-1" />
            </div>
            <div>
              <Label>Descripción</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Descripción breve del vídeo" className="mt-1" />
            </div>
            <div>
              <Label>Código iframe *</Label>
              <Textarea
                value={form.iframe_url}
                onChange={e => setForm(f => ({ ...f, iframe_url: e.target.value }))}
                placeholder='<iframe src="https://..." width="100%" ...></iframe>'
                className="mt-1 font-mono text-xs"
                rows={4}
              />
              <p className="text-xs text-muted-foreground mt-1">Pega el código iframe de embed de tu plataforma de vídeo (Vimeo, YouTube, Loom, etc.)</p>
            </div>
            <div>
              <Label>Orden de visualización</Label>
              <Input type="number" value={form.display_order} onChange={e => setForm(f => ({ ...f, display_order: parseInt(e.target.value) || 0 }))} className="mt-1 w-24" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              <Check className="h-4 w-4" />
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
            <Button variant="outline" onClick={resetForm} className="gap-2">
              <X className="h-4 w-4" />
              Cancelar
            </Button>
          </div>
        </Card>
      )}

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Cargando...</p>
      ) : videos.length === 0 ? (
        <Card className="p-8 text-center border-dashed border-border/40">
          <PlayCircle className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">No hay vídeos aún. Añade el primero.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {videos.map((video: any) => (
            <Card key={video.id} className="p-4 flex items-start gap-4 bg-card/50">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">#{video.display_order}</span>
                  <h4 className="font-semibold text-foreground truncate">{video.title}</h4>
                </div>
                {video.description && <p className="text-sm text-muted-foreground mt-0.5">{video.description}</p>}
                <p className="text-xs text-muted-foreground/60 mt-1 truncate font-mono">{video.iframe_url.slice(0, 60)}…</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => handleEdit(video)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="outline" className="h-8 w-8 hover:bg-red-500/10 hover:border-red-500/40 hover:text-red-500" onClick={() => handleDelete(video.id, video.title)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Main Admin component ────────────────────────────────────────────────────
const Admin = () => {
  const navigate = useNavigate();
  const [authenticated, setAuthenticated] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Check if user is already authenticated and is admin
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          // Check if user has admin role
          const { data: roles, error } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", session.user.id)
            .eq("role", "admin")
            .maybeSingle();

          if (error) {
            console.error("Error checking admin role:", error);
            toast.error("Error verificando permisos");
            setCheckingAuth(false);
            return;
          }

          if (roles) {
            setAuthenticated(true);
          } else {
            toast.error("No tienes permisos de administrador");
            navigate("/");
          }
        }
      } catch (error) {
        console.error("Auth check error:", error);
      } finally {
        setCheckingAuth(false);
      }
    };

    checkAuth();
  }, [navigate]);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        // Check if user has admin role
        const { data: roles, error: roleError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id)
          .eq("role", "admin")
          .maybeSingle();

        if (roleError) {
          console.error("Error checking admin role:", roleError);
          throw new Error("Error verificando permisos de administrador");
        }

        if (!roles) {
          await supabase.auth.signOut();
          throw new Error("No tienes permisos de administrador");
        }

        setAuthenticated(true);
        toast.success("Acceso concedido");
      }
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error(error.message || "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setAuthenticated(false);
      setEmail("");
      setPassword("");
      toast.success("Sesión cerrada");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Error al cerrar sesión");
    }
  };

  const loadCampaigns = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("campaigns")
        .select(`
          *,
          films (
            title,
            genre,
            target_audience_text,
            target_audience_urls,
            target_audience_files,
            distributor_name,
            distributors (
              company_name
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (filterStatus !== "all") {
        query = query.eq("status", filterStatus);
      }

      const { data, error } = await query;

      if (error) throw error;

      setCampaigns(data || []);
    } catch (error: any) {
      console.error("Error loading campaigns:", error);
      toast.error("Error al cargar campañas");
    } finally {
      setLoading(false);
    }
  };

  const updateCampaignStatus = async (campaignId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("campaigns")
        .update({ status: newStatus })
        .eq("id", campaignId);

      if (error) throw error;

      toast.success("Estado actualizado");
      loadCampaigns();
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast.error("Error al actualizar estado");
    }
  };

  useEffect(() => {
    if (authenticated) {
      loadCampaigns();
    }
  }, [filterStatus, authenticated]);

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="cinema-card max-w-md w-full p-8 space-y-6">
          <div className="text-center">
            <h1 className="font-cinema text-2xl sm:text-4xl text-primary mb-2">PANEL INTERNO</h1>
            <p className="text-muted-foreground">Acceso solo para equipo imfilms</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-email" className="text-cinema-ivory">Email</Label>
              <Input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-muted border-border text-foreground"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-pass" className="text-cinema-ivory">Contraseña</Label>
              <Input
                id="admin-pass"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !loading && handleLogin()}
                className="bg-muted border-border text-foreground"
                disabled={loading}
              />
            </div>

            <Button
              onClick={handleLogin}
              className="w-full bg-primary text-primary-foreground hover:bg-secondary"
              disabled={loading}
            >
              {loading ? "Verificando..." : "Acceder"}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-24 pb-12 px-6">
      <NavbarAdmin />
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="font-cinema text-2xl sm:text-4xl md:text-5xl text-primary">PANEL DE ADMINISTRACIÓN</h1>
            <p className="text-muted-foreground">Gestión completa de campañas y distribuidoras</p>
          </div>
        </div>

        <Tabs defaultValue="campaigns" className="space-y-6">
          <TabsList className="bg-muted border border-border">
            <TabsTrigger value="campaigns" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Film className="w-4 h-4 mr-2" />
              Campañas
            </TabsTrigger>
            <TabsTrigger value="distributors" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Building2 className="w-4 h-4 mr-2" />
              Distribuidoras
            </TabsTrigger>
            <TabsTrigger value="videos" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <PlayCircle className="w-4 h-4 mr-2" />
              Vídeos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="campaigns" className="space-y-4">
            <div className="space-y-4">
              {campaigns.map((campaign) => (
                <Card key={campaign.id} className="cinema-card p-6 space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start">
                    <div className="space-y-1">
                      <h3 className="font-cinema text-2xl text-primary">
                        {campaign.films?.title || "Sin título"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {campaign.films?.distributor_name} | {campaign.films?.distributors?.company_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Creado: {formatDateShort(new Date(campaign.created_at))}
                      </p>
                    </div>

                    <div className="flex gap-2 items-center">
                      <Select
                        value={campaign.status}
                        onValueChange={(newStatus) => updateCampaignStatus(campaign.id, newStatus)}
                      >
                        <SelectTrigger className="w-full sm:w-48 bg-muted border-border">
                          <SelectValue />
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

                      <div
                        className={`w-3 h-3 rounded-full ${['activa', 'aprobada', 'aprobado'].includes(campaign.status)
                          ? "bg-green-500"
                          : ['en_revision', 'revisando', 'creativos_en_revision'].includes(campaign.status)
                            ? "bg-blue-500"
                            : ['borrador', 'nuevo'].includes(campaign.status)
                              ? "bg-muted-foreground"
                              : "bg-red-500"
                          }`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
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
                          Inversión:
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
                    <div>
                      <p className="text-muted-foreground">Contacto:</p>
                      <p className="text-cinema-ivory">{campaign.contact_name}</p>
                      <p className="text-xs text-muted-foreground">{campaign.contact_email}</p>
                    </div>
                  </div>

                  {campaign.additional_comments && (
                    <div className="pt-3 border-t border-border">
                      <p className="text-xs text-muted-foreground mb-1">Comentarios:</p>
                      <p className="text-sm text-cinema-ivory italic">{campaign.additional_comments}</p>
                    </div>
                  )}

                  <div className="pt-3 border-t border-border flex flex-wrap gap-2">
                    {['en_revision', 'revisando'].includes(campaign.status) && (
                      <Button
                        onClick={() => navigate(`/wizard/review/${campaign.id}`)}
                        className="bg-primary text-primary-foreground hover:bg-secondary"
                        size="sm"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Revisar campaña
                      </Button>
                    )}
                    <Button
                      onClick={() => navigate(`/campaigns/${campaign.id}`)}
                      variant="outline"
                      size="sm"
                      className="border-border text-muted-foreground hover:text-cinema-ivory"
                    >
                      Ver detalle
                    </Button>
                  </div>
                </Card>
              ))}

              {campaigns.length === 0 && !loading && (
                <Card className="cinema-card p-12 text-center">
                  <p className="text-muted-foreground">No hay campañas con los filtros seleccionados</p>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="distributors">
            <AdminDistributors />
          </TabsContent>
          <TabsContent value="videos">
            <AdminVideos />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
