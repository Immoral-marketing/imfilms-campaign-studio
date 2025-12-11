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
import { Shield, LogOut, RefreshCw, Calendar, DollarSign, BarChart, Building2, Film } from "lucide-react";
import AdminDistributors from "./AdminDistributors";

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
            <h1 className="font-cinema text-4xl text-primary mb-2">PANEL INTERNO</h1>
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
    <div className="min-h-screen bg-background py-12 px-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="font-cinema text-5xl text-primary">PANEL DE ADMINISTRACIÓN</h1>
            <p className="text-muted-foreground">Gestión completa de campañas y distribuidoras</p>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="border-primary text-primary hover:bg-primary/10"
          >
            <LogOut className="w-4 h-4 mr-2 cinema-icon" />
            Cerrar sesión
          </Button>
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
          </TabsList>

          <TabsContent value="campaigns" className="space-y-4">
            <div className="space-y-4">
          {campaigns.map((campaign) => (
            <Card key={campaign.id} className="cinema-card p-6 space-y-4">
              <div className="flex justify-between items-start">
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
                    <SelectTrigger className="w-40 bg-muted border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nuevo">Nuevo</SelectItem>
                      <SelectItem value="revisando">Revisando</SelectItem>
                      <SelectItem value="aprobado">Aprobado</SelectItem>
                      <SelectItem value="rechazado">Rechazado</SelectItem>
                    </SelectContent>
                  </Select>

                  <div
                    className={`w-3 h-3 rounded-full ${
                      campaign.status === "nuevo"
                        ? "bg-primary"
                        : campaign.status === "revisando"
                        ? "bg-blue-500"
                        : campaign.status === "aprobado"
                        ? "bg-green-500"
                        : "bg-red-500"
                    }`}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-4 gap-4 text-sm">
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
                    <p className="text-muted-foreground">Inversión:</p>
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
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
