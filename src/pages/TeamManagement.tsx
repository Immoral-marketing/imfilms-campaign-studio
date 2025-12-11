import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import logoImfilms from "@/assets/logo-imfilms.png";
import { 
  Users, 
  UserPlus, 
  Mail, 
  Shield, 
  Check, 
  X, 
  ChevronLeft,
  Settings,
  Crown,
  Briefcase,
  Eye,
  DollarSign
} from "lucide-react";
import { z } from "zod";

const inviteSchema = z.object({
  email: z.string().trim().email("Email inválido"),
});

type TeamMember = {
  id: string;
  user_id: string;
  role: string;
  is_owner: boolean;
  can_manage_campaigns: boolean;
  can_receive_reports: boolean;
  can_manage_billing: boolean;
  is_active: boolean;
  pending_approval: boolean;
  created_at: string;
  user_email?: string;
};

const TeamManagement = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [distributor, setDistributor] = useState<any>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [pendingRequests, setPendingRequests] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("marketing");

  useEffect(() => {
    checkAuthAndLoadTeam();
  }, []);

  const checkAuthAndLoadTeam = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        navigate("/campaigns");
        return;
      }

      setUser(session.user);

      // Check if user is owner of any distributor
      const { data: distributorUsers, error: duError } = await supabase
        .from("distributor_users")
        .select("*, distributors(*)")
        .eq("user_id", session.user.id)
        .eq("is_active", true);

      if (duError) throw duError;

      const ownerRecord = distributorUsers?.find(du => du.is_owner);
      
      if (!ownerRecord) {
        toast.error("No tienes permisos para gestionar el equipo");
        navigate("/campaigns");
        return;
      }

      setIsOwner(true);
      setDistributor(ownerRecord.distributors);
      await loadTeamMembers(ownerRecord.distributor_id);
    } catch (error: any) {
      console.error("Error loading team:", error);
      toast.error("Error al cargar el equipo");
    } finally {
      setLoading(false);
    }
  };

  const loadTeamMembers = async (distributorId: string) => {
    try {
      const { data: session } = await supabase.auth.getSession();
      
      if (!session?.session?.access_token) {
        throw new Error('No session token');
      }

      const { data, error } = await supabase.functions.invoke('get-team-members', {
        body: { distributorId },
        headers: {
          Authorization: `Bearer ${session.session.access_token}`
        }
      });

      if (error) throw error;

      const members = data.members || [];
      const active = members.filter((m: TeamMember) => !m.pending_approval);
      const pending = members.filter((m: TeamMember) => m.pending_approval);

      setTeamMembers(active);
      setPendingRequests(pending);
    } catch (error: any) {
      console.error("Error loading team members:", error);
      toast.error("Error al cargar los miembros del equipo");
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validated = inviteSchema.parse({ email: inviteEmail });
      
      const { data: session } = await supabase.auth.getSession();
      
      if (!session?.session?.access_token) {
        throw new Error('No session token');
      }

      const { data, error } = await supabase.functions.invoke('invite-team-member', {
        body: { 
          email: validated.email,
          distributorId: distributor.id,
          role: inviteRole
        },
        headers: {
          Authorization: `Bearer ${session.session.access_token}`
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.error) {
        toast.error(data.message || data.error);
        return;
      }

      toast.success(`Invitación enviada a ${validated.email}`);
      setInviteEmail("");
      await loadTeamMembers(distributor.id);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        console.error("Error inviting user:", error);
        toast.error(error.message || "Error al enviar la invitación");
      }
    }
  };

  const getRolePermissions = (role: string) => {
    switch (role) {
      case "owner":
        return {
          is_owner: true,
          can_manage_campaigns: true,
          can_receive_reports: true,
          can_manage_billing: true
        };
      case "marketing":
        return {
          is_owner: false,
          can_manage_campaigns: true,
          can_receive_reports: true,
          can_manage_billing: false
        };
      case "finance":
        return {
          is_owner: false,
          can_manage_campaigns: false,
          can_receive_reports: true,
          can_manage_billing: true
        };
      case "readonly":
        return {
          is_owner: false,
          can_manage_campaigns: false,
          can_receive_reports: false,
          can_manage_billing: false
        };
      default:
        return {
          is_owner: false,
          can_manage_campaigns: true,
          can_receive_reports: true,
          can_manage_billing: false
        };
    }
  };

  const handleUpdateMember = async (memberId: string, updates: Partial<TeamMember>) => {
    try {
      const { error } = await supabase
        .from("distributor_users")
        .update(updates)
        .eq("id", memberId);

      if (error) throw error;

      toast.success("Miembro actualizado correctamente");
      await loadTeamMembers(distributor.id);
    } catch (error: any) {
      console.error("Error updating member:", error);
      toast.error("Error al actualizar el miembro");
    }
  };

  const handleApproveRequest = async (memberId: string) => {
    await handleUpdateMember(memberId, { pending_approval: false, is_active: true });
  };

  const handleRejectRequest = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from("distributor_users")
        .delete()
        .eq("id", memberId);

      if (error) throw error;

      toast.success("Solicitud rechazada");
      await loadTeamMembers(distributor.id);
    } catch (error: any) {
      console.error("Error rejecting request:", error);
      toast.error("Error al rechazar la solicitud");
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "owner":
        return <Crown className="w-4 h-4 cinema-icon" />;
      case "marketing":
        return <Briefcase className="w-4 h-4 cinema-icon" />;
      case "finance":
        return <DollarSign className="w-4 h-4 cinema-icon" />;
      case "readonly":
        return <Eye className="w-4 h-4 cinema-icon" />;
      default:
        return <Users className="w-4 h-4 cinema-icon" />;
    }
  };

  const getRoleName = (role: string) => {
    const names: Record<string, string> = {
      owner: "Propietario",
      marketing: "Marketing",
      finance: "Finanzas",
      readonly: "Solo lectura"
    };
    return names[role] || role;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Cargando gestión de equipo...</p>
        </div>
      </div>
    );
  }

  if (!isOwner) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background py-12 px-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <button onClick={() => navigate("/")} className="block">
            <img 
              src={logoImfilms}
              alt="IMFILMS" 
              className="w-32 cursor-pointer hover:opacity-80 transition-opacity"
            />
          </button>
          
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate("/campaigns")}
              variant="outline"
              size="sm"
              className="border-primary text-primary hover:bg-primary/10"
            >
              <ChevronLeft className="w-4 h-4 mr-2 cinema-icon" />
              Volver
            </Button>
          </div>

          <div>
            <h1 className="font-cinema text-5xl md:text-6xl text-primary mb-2">
              Gestión de Equipo
            </h1>
            <p className="text-cinema-ivory text-lg">
              {distributor?.company_name}
            </p>
            <p className="text-muted-foreground mt-1">
              Invita colaboradores, asigna roles y gestiona permisos de tu equipo
            </p>
          </div>
        </div>

        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <Card className="cinema-card p-6 border-blue-500/30 bg-blue-500/5">
            <div className="flex items-center gap-3 mb-4">
              <Mail className="w-6 h-6 text-blue-400 cinema-icon-decorative" />
              <h2 className="font-cinema text-2xl text-blue-400">
                Solicitudes Pendientes ({pendingRequests.length})
              </h2>
            </div>
            <div className="space-y-3">
              {pendingRequests.map((request) => (
                <div 
                  key={request.id}
                  className="flex items-center justify-between p-4 bg-background/50 rounded-lg border border-border"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <Users className="w-5 h-5 text-primary cinema-icon" />
                    </div>
                    <div>
                      <p className="text-cinema-ivory font-semibold">{request.user_email}</p>
                      <p className="text-sm text-muted-foreground">
                        Solicita unirse como {getRoleName(request.role)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleApproveRequest(request.id)}
                      size="sm"
                      className="bg-green-500 hover:bg-green-600"
                    >
                      <Check className="w-4 h-4 mr-1 cinema-icon" />
                      Aprobar
                    </Button>
                    <Button
                      onClick={() => handleRejectRequest(request.id)}
                      size="sm"
                      variant="outline"
                      className="border-red-500 text-red-500 hover:bg-red-500/10"
                    >
                      <X className="w-4 h-4 mr-1 cinema-icon" />
                      Rechazar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Invite Form */}
        <Card className="cinema-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <UserPlus className="w-6 h-6 text-primary cinema-icon-decorative" />
            <h2 className="font-cinema text-2xl text-primary">
              Invitar Miembro
            </h2>
          </div>

          <form onSubmit={handleInvite} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-cinema-ivory">
                  Email del usuario
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="usuario@ejemplo.com"
                  className="bg-muted border-border text-foreground"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  El usuario debe estar registrado en la plataforma
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role" className="text-cinema-ivory">
                  Rol
                </Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger className="bg-muted border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">
                      <div className="flex items-center gap-2">
                        <Crown className="w-4 h-4 cinema-icon" />
                        Propietario
                      </div>
                    </SelectItem>
                    <SelectItem value="marketing">
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4 cinema-icon" />
                        Marketing
                      </div>
                    </SelectItem>
                    <SelectItem value="finance">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 cinema-icon" />
                        Finanzas
                      </div>
                    </SelectItem>
                    <SelectItem value="readonly">
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4 cinema-icon" />
                        Solo lectura
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button 
              type="submit"
              className="w-full md:w-auto bg-primary text-primary-foreground hover:bg-secondary"
            >
              <UserPlus className="w-4 h-4 mr-2 cinema-icon" />
              Enviar invitación
            </Button>
          </form>
        </Card>

        {/* Team Members List */}
        <Card className="cinema-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <Users className="w-6 h-6 text-primary cinema-icon-decorative" />
            <h2 className="font-cinema text-2xl text-primary">
              Miembros del Equipo ({teamMembers.length})
            </h2>
          </div>

          <div className="space-y-4">
            {teamMembers.map((member) => (
              <Card key={member.id} className="p-6 bg-muted/20 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                      {getRoleIcon(member.role)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-cinema-ivory font-semibold text-lg">
                          {member.user_email}
                        </p>
                        {member.user_id === user?.id && (
                          <Badge variant="outline" className="text-xs border-primary text-primary">
                            Tú
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className="bg-primary/20 text-primary">
                          {getRoleName(member.role)}
                        </Badge>
                        {!member.is_active && (
                          <Badge variant="outline" className="text-muted-foreground">
                            Inactivo
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {member.user_id !== user?.id && (
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={member.is_active}
                        onCheckedChange={(checked) => 
                          handleUpdateMember(member.id, { is_active: checked })
                        }
                      />
                      <Label className="text-sm text-muted-foreground">
                        {member.is_active ? "Activo" : "Inactivo"}
                      </Label>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Rol</Label>
                    <Select
                      value={member.role}
                      onValueChange={(value) => {
                        const permissions = getRolePermissions(value);
                        handleUpdateMember(member.id, { role: value, ...permissions });
                      }}
                      disabled={member.user_id === user?.id}
                    >
                      <SelectTrigger className="bg-background border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="owner">Propietario</SelectItem>
                        <SelectItem value="marketing">Marketing</SelectItem>
                        <SelectItem value="finance">Finanzas</SelectItem>
                        <SelectItem value="readonly">Solo lectura</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm text-muted-foreground">Permisos</Label>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Gestionar campañas</Label>
                        <Switch
                          checked={member.can_manage_campaigns}
                          onCheckedChange={(checked) =>
                            handleUpdateMember(member.id, { can_manage_campaigns: checked })
                          }
                          disabled={member.user_id === user?.id}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Recibir informes</Label>
                        <Switch
                          checked={member.can_receive_reports}
                          onCheckedChange={(checked) =>
                            handleUpdateMember(member.id, { can_receive_reports: checked })
                          }
                          disabled={member.user_id === user?.id}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Gestionar facturación</Label>
                        <Switch
                          checked={member.can_manage_billing}
                          onCheckedChange={(checked) =>
                            handleUpdateMember(member.id, { can_manage_billing: checked })
                          }
                          disabled={member.user_id === user?.id}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}

            {teamMembers.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4 cinema-icon-decorative opacity-50" />
                <p className="text-muted-foreground">
                  Todavía no has invitado a ningún miembro al equipo
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default TeamManagement;
