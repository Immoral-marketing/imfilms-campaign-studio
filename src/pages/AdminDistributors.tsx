import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { formatDateShort } from "@/utils/dateUtils";
import { Search, Building2, Calendar, Film, Mail, Phone, RefreshCw } from "lucide-react";

interface Distributor {
  id: string;
  company_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  is_active: boolean;
  created_at: string;
  campaigns_count?: number;
  last_campaign_date?: string;
}

interface Campaign {
  id: string;
  status: string;
  created_at: string;
  ad_investment_amount: number;
  total_estimated_amount: number;
  films: {
    title: string;
  } | null;
}

const AdminDistributors = () => {
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterActive, setFilterActive] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("name");
  const [selectedDistributor, setSelectedDistributor] = useState<Distributor | null>(null);
  const [distributorCampaigns, setDistributorCampaigns] = useState<Campaign[]>([]);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Distributor>>({});
  const [isDeleting, setIsDeleting] = useState(false);

  const loadDistributors = async () => {
    setLoading(true);
    try {
      // Fetch distributors with campaign count
      const { data: distributorsData, error: distError } = await supabase
        .from("distributors")
        .select("*")
        .order("company_name");

      if (distError) throw distError;

      // For each distributor, get campaign count and last campaign date
      const distributorsWithStats = await Promise.all(
        (distributorsData || []).map(async (dist) => {
          const { data: campaigns, error: campError } = await supabase
            .from("campaigns")
            .select("created_at")
            .eq("distributor_id", dist.id)
            .order("created_at", { ascending: false });

          if (campError) {
            console.error("Error loading campaigns for distributor:", campError);
            return { ...dist, campaigns_count: 0, last_campaign_date: null };
          }

          return {
            ...dist,
            campaigns_count: campaigns?.length || 0,
            last_campaign_date: campaigns?.[0]?.created_at || null,
          };
        })
      );

      setDistributors(distributorsWithStats);
    } catch (error: any) {
      console.error("Error loading distributors:", error);
      toast.error("Error al cargar distribuidoras");
    } finally {
      setLoading(false);
    }
  };

  const loadDistributorCampaigns = async (distributorId: string) => {
    try {
      const { data, error } = await supabase
        .from("campaigns")
        .select(`
          id,
          status,
          created_at,
          ad_investment_amount,
          total_estimated_amount,
          films (
            title
          )
        `)
        .eq("distributor_id", distributorId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setDistributorCampaigns(data || []);
    } catch (error: any) {
      console.error("Error loading distributor campaigns:", error);
      toast.error("Error al cargar campañas de la distribuidora");
    }
  };

  const toggleDistributorActive = async (distributorId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("distributors")
        .update({ is_active: !currentStatus })
        .eq("id", distributorId);

      if (error) throw error;

      toast.success(`Distribuidora ${!currentStatus ? "activada" : "desactivada"}`);
      loadDistributors();

      if (selectedDistributor?.id === distributorId) {
        setSelectedDistributor({ ...selectedDistributor, is_active: !currentStatus });
      }
    } catch (error: any) {
      console.error("Error updating distributor status:", error);
      toast.error("Error al actualizar estado");
    }
  };

  const updateCampaignStatus = async (campaignId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("campaigns")
        .update({ status: newStatus })
        .eq("id", campaignId);

      if (error) throw error;

      toast.success("Estado de campaña actualizado");
      if (selectedDistributor) {
        loadDistributorCampaigns(selectedDistributor.id);
      }
    } catch (error: any) {
      console.error("Error updating campaign status:", error);
      toast.error("Error al actualizar estado de campaña");
    }
  };

  const handleEditSave = async () => {
    if (!selectedDistributor || !editForm) return;

    try {
      const { error } = await supabase
        .from("distributors")
        .update({
          company_name: editForm.company_name,
          contact_name: editForm.contact_name,
          contact_email: editForm.contact_email,
          contact_phone: editForm.contact_phone,
        })
        .eq("id", selectedDistributor.id);

      if (error) throw error;

      toast.success("Distribuidora actualizada corréctamente");
      setSelectedDistributor({ ...selectedDistributor, ...editForm } as Distributor);
      setIsEditing(false);
      loadDistributors();
    } catch (error: any) {
      console.error("Error updating distributor:", error);
      toast.error("Error al actualizar distribuidora");
    }
  };

  const handleDeleteDistributor = async () => {
    if (!selectedDistributor) return;

    if (!window.confirm("¿Estás seguro? ESTA ACCIÓN ES IRREVERSIBLE. Se borrarán TODAS las campañas, datos y el usuario perderá el acceso.")) {
      return;
    }

    setIsDeleting(true);
    try {
      // 1. Find the user associated with this distributor to delete auth account
      // We'll query distributor_users to find the owner or first user
      const { data: distUsers, error: userError } = await supabase
        .from("distributor_users")
        .select("user_id")
        .eq("distributor_id", selectedDistributor.id)
        .limit(1);

      const userId = distUsers && distUsers.length > 0 ? distUsers[0].user_id : null;

      // 2. Call Edge Function
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: {
          userId: userId, // Can be null, function handles it or we handle it? Function expects userId. 
          // If no user found (maybe partial delete before?), we might just want to delete DB record.
          // Let's pass what we have.
          distributorId: selectedDistributor.id
        }
      });

      if (error) throw error;

      toast.success("Distribuidora y usuario eliminados correctamente");
      setShowDetailDialog(false);
      loadDistributors();
    } catch (error: any) {
      console.error("Error deleting distributor:", error);
      toast.error("Error al eliminar distribuidora: " + (error.message || "Error desconocido"));
    } finally {
      setIsDeleting(false);
    }
  };

  const openDistributorDetail = (distributor: Distributor) => {
    setSelectedDistributor(distributor);
    setEditForm(distributor);
    setIsEditing(false);
    loadDistributorCampaigns(distributor.id);
    setShowDetailDialog(true);
  };

  useEffect(() => {
    loadDistributors();
  }, []);

  // Filter and sort distributors
  const filteredAndSortedDistributors = distributors
    .filter((dist) => {
      const matchesSearch =
        dist.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dist.contact_email.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesFilter =
        filterActive === "all" ? true :
          filterActive === "active" ? dist.is_active :
            !dist.is_active;

      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.company_name.localeCompare(b.company_name);
        case "campaigns":
          return (b.campaigns_count || 0) - (a.campaigns_count || 0);
        case "date":
          if (!a.last_campaign_date) return 1;
          if (!b.last_campaign_date) return -1;
          return new Date(b.last_campaign_date).getTime() - new Date(a.last_campaign_date).getTime();
        default:
          return 0;
      }
    });

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
      <Badge className={styles[status] || styles.borrador}>
        {labels[status] || status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-muted border-border text-foreground"
          />
        </div>

        <div className="flex gap-2">
          <Select value={filterActive} onValueChange={setFilterActive}>
            <SelectTrigger className="w-40 bg-muted border-border text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="active">Activas</SelectItem>
              <SelectItem value="inactive">Inactivas</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-48 bg-muted border-border text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Ordenar por nombre</SelectItem>
              <SelectItem value="campaigns">Ordenar por campañas</SelectItem>
              <SelectItem value="date">Ordenar por última campaña</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={loadDistributors}
            variant="outline"
            className="border-primary text-primary hover:bg-primary/10"
            disabled={loading}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Distributors Table */}
      <Card className="cinema-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-cinema-ivory">Distribuidora</TableHead>
              <TableHead className="text-cinema-ivory">Contacto</TableHead>
              <TableHead className="text-cinema-ivory">Email</TableHead>
              <TableHead className="text-cinema-ivory">Teléfono</TableHead>
              <TableHead className="text-cinema-ivory text-center">Campañas</TableHead>
              <TableHead className="text-cinema-ivory">Última campaña</TableHead>
              <TableHead className="text-cinema-ivory text-center">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedDistributors.map((distributor) => (
              <TableRow
                key={distributor.id}
                className="border-border hover:bg-muted/50 cursor-pointer"
                onClick={() => openDistributorDetail(distributor)}
              >
                <TableCell className="font-semibold text-cinema-yellow">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 cinema-icon-decorative" />
                    {distributor.company_name}
                  </div>
                </TableCell>
                <TableCell className="text-cinema-ivory">{distributor.contact_name}</TableCell>
                <TableCell className="text-cinema-ivory">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3 h-3 cinema-icon-decorative" />
                    {distributor.contact_email}
                  </div>
                </TableCell>
                <TableCell className="text-cinema-ivory">
                  {distributor.contact_phone ? (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3 h-3 cinema-icon-decorative" />
                      {distributor.contact_phone}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                    {distributor.campaigns_count || 0}
                  </Badge>
                </TableCell>
                <TableCell className="text-cinema-ivory text-sm">
                  {distributor.last_campaign_date ? (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3 h-3 cinema-icon-decorative" />
                      {formatDateShort(new Date(distributor.last_campaign_date))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Sin campañas</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <Badge className={distributor.is_active ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}>
                    {distributor.is_active ? "Activa" : "Inactiva"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {filteredAndSortedDistributors.length === 0 && !loading && (
          <div className="p-12 text-center">
            <p className="text-muted-foreground">No se encontraron distribuidoras</p>
          </div>
        )}

        {loading && (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          </div>
        )}
      </Card>

      {/* Distributor Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-background border-border">
          <DialogHeader>
            <DialogTitle className="font-cinema text-3xl text-primary">
              {selectedDistributor?.company_name}
            </DialogTitle>
          </DialogHeader>

          {selectedDistributor && (
            <div className="space-y-6">
              {/* Distributor Info */}
              <Card className="cinema-card p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-4 flex-1">
                    {isEditing ? (
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="company_name" className="text-right">Empresa</Label>
                          <Input
                            id="company_name"
                            value={editForm.company_name || ''}
                            onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })}
                            className="col-span-3 bg-muted border-border"
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="contact_name" className="text-right">Nombre</Label>
                          <Input
                            id="contact_name"
                            value={editForm.contact_name || ''}
                            onChange={(e) => setEditForm({ ...editForm, contact_name: e.target.value })}
                            className="col-span-3 bg-muted border-border"
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="contact_email" className="text-right">Email</Label>
                          <Input
                            id="contact_email"
                            value={editForm.contact_email || ''}
                            onChange={(e) => setEditForm({ ...editForm, contact_email: e.target.value })}
                            className="col-span-3 bg-muted border-border"
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="contact_phone" className="text-right">Teléfono</Label>
                          <Input
                            id="contact_phone"
                            value={editForm.contact_phone || ''}
                            onChange={(e) => setEditForm({ ...editForm, contact_phone: e.target.value })}
                            className="col-span-3 bg-muted border-border"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-muted-foreground">Contacto</p>
                          <p className="text-cinema-ivory font-semibold">{selectedDistributor.contact_name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Email</p>
                          <p className="text-cinema-ivory">{selectedDistributor.contact_email}</p>
                        </div>
                        {selectedDistributor.contact_phone && (
                          <div>
                            <p className="text-xs text-muted-foreground">Teléfono</p>
                            <p className="text-cinema-ivory">{selectedDistributor.contact_phone}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs text-muted-foreground">Registrado</p>
                          <p className="text-cinema-ivory">{formatDateShort(new Date(selectedDistributor.created_at))}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-4 items-end">
                    <div className="flex items-center gap-2">
                      <Label className="text-cinema-ivory">
                        {selectedDistributor.is_active ? "Activa" : "Inactiva"}
                      </Label>
                      <Switch
                        checked={selectedDistributor.is_active}
                        onCheckedChange={() => toggleDistributorActive(selectedDistributor.id, selectedDistributor.is_active)}
                      />
                    </div>

                    <div className="flex gap-2">
                      {isEditing ? (
                        <>
                          <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancelar</Button>
                          <Button onClick={handleEditSave} disabled={loading}>Guardar</Button>
                        </>
                      ) : (
                        <>
                          <Button variant="outline" onClick={() => setIsEditing(true)}>Editar</Button>
                          <Button
                            variant="destructive"
                            className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20"
                            onClick={handleDeleteDistributor}
                            disabled={isDeleting}
                          >
                            {isDeleting ? "Borrando..." : "Eliminar Usuario"}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Campaigns List */}
              <div>
                <h3 className="font-cinema text-2xl text-primary mb-4">
                  Campañas ({distributorCampaigns.length})
                </h3>

                {distributorCampaigns.length === 0 ? (
                  <Card className="cinema-card p-8 text-center">
                    <p className="text-muted-foreground">Esta distribuidora no tiene campañas registradas</p>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {distributorCampaigns.map((campaign) => (
                      <Card key={campaign.id} className="cinema-card p-4">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <Film className="w-4 h-4 cinema-icon-decorative" />
                              <h4 className="font-semibold text-cinema-yellow">
                                {campaign.films?.title || "Sin título"}
                              </h4>
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-xs text-muted-foreground">Fecha</p>
                                <p className="text-cinema-ivory">{formatDateShort(new Date(campaign.created_at))}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Inversión</p>
                                <p className="text-cinema-yellow">{campaign.ad_investment_amount.toLocaleString("es-ES")}€</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Total estimado</p>
                                <p className="text-primary">{campaign.total_estimated_amount.toLocaleString("es-ES")}€</p>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2 items-end">
                            {getStatusBadge(campaign.status)}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDistributors;
