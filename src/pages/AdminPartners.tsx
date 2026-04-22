import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, Plus, Users, Link2, FileText, Euro, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------
interface Partner {
  id: string;
  nombre: string;
  email: string;
  slug: string;
  activo: boolean;
  created_at: string;
}

interface Solicitud {
  id: string;
  partner_id: string | null;
  datos_formulario: Record<string, any>;
  estado: string;
  importe_cobrado: number | null;
  created_at: string;
  partners?: { nombre: string; slug: string };
}

interface Comision {
  id: string;
  solicitud_id: string;
  partner_id: string;
  importe_base: number;
  importe_comision: number;
  estado: string;
  pagada_at: string | null;
  created_at: string;
  partners?: { nombre: string };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const ESTADO_SOL: Record<string, string> = {
  pendiente: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  en_proceso: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  aprobada: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  cerrada: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
  pagada: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
};

const ESTADO_COM: Record<string, string> = {
  pendiente: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  confirmada: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  pagada: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
};

const fmt = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------
export default function AdminPartners() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [comisiones, setComisiones] = useState<Comision[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'partners' | 'solicitudes' | 'comisiones'>('partners');

  // Modal crear partner
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newPartner, setNewPartner] = useState({ nombre: '', email: '', slug: '' });

  // Modal editar solicitud
  const [editSolicitud, setEditSolicitud] = useState<Solicitud | null>(null);
  const [editImporte, setEditImporte] = useState('');
  const [editEstado, setEditEstado] = useState('');
  const [saving, setSaving] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [p, s, c] = await Promise.all([
        supabase.from('partners').select('*').order('created_at', { ascending: false }),
        supabase.from('solicitudes_afiliado')
          .select('*, partners(nombre, slug)')
          .order('created_at', { ascending: false }),
        supabase.from('comisiones')
          .select('*, partners(nombre)')
          .order('created_at', { ascending: false }),
      ]);
      setPartners(p.data ?? []);
      setSolicitudes(s.data ?? []);
      setComisiones(c.data ?? []);
    } catch (e) {
      toast.error('Error al cargar datos de afiliados');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Métricas rápidas
  const totalComisionesPendientes = comisiones
    .filter(c => c.estado !== 'pagada')
    .reduce((s, c) => s + c.importe_comision, 0);

  // ---------------------------------------------------------------------------
  // Crear partner
  // ---------------------------------------------------------------------------
  const handleCreatePartner = async () => {
    if (!newPartner.nombre || !newPartner.email || !newPartner.slug) {
      toast.error('Completa todos los campos');
      return;
    }
    setCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No hay sesión activa');

      const { data, error } = await supabase.functions.invoke('create-partner', {
        body: newPartner,
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      // Extraer el mensaje real del cuerpo de la respuesta de la Edge Function
      if (error) {
        let realMessage = error.message;
        try {
          const body = await (error as any).context?.json?.();
          if (body?.error) realMessage = body.error;
        } catch { /* ignore */ }
        throw new Error(realMessage);
      }
      if (data?.error) throw new Error(data.error);

      toast.success(`Partner ${newPartner.nombre} creado. Se envió email de invitación.`);
      setShowCreateModal(false);
      setNewPartner({ nombre: '', email: '', slug: '' });
      loadAll();
    } catch (e: any) {
      toast.error(e.message || 'Error al crear el partner');
    } finally {
      setCreating(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Toggle activo/inactivo
  // ---------------------------------------------------------------------------
  const togglePartnerActivo = async (partner: Partner) => {
    try {
      const { error } = await supabase
        .from('partners')
        .update({ activo: !partner.activo })
        .eq('id', partner.id);
      if (error) throw error;
      toast.success(`Partner ${!partner.activo ? 'activado' : 'desactivado'}`);
      setPartners(prev => prev.map(p => p.id === partner.id ? { ...p, activo: !p.activo } : p));
    } catch {
      toast.error('Error al actualizar el partner');
    }
  };

  // ---------------------------------------------------------------------------
  // Guardar solicitud (estado + importe)
  // ---------------------------------------------------------------------------
  const handleSaveSolicitud = async () => {
    if (!editSolicitud) return;
    setSaving(true);
    try {
      const updates: any = { estado: editEstado };
      if (editImporte !== '') updates.importe_cobrado = parseFloat(editImporte);

      const { error } = await supabase
        .from('solicitudes_afiliado')
        .update(updates)
        .eq('id', editSolicitud.id);
      if (error) throw error;

      toast.success('Solicitud actualizada');
      setEditSolicitud(null);
      loadAll();
    } catch {
      toast.error('Error al guardar la solicitud');
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Crear comisión desde solicitud aprobada
  // ---------------------------------------------------------------------------
  const handleCrearComision = async (sol: Solicitud) => {
    if (!sol.partner_id || !sol.importe_cobrado) {
      toast.error('La solicitud debe tener partner e importe cobrado para crear comisión');
      return;
    }
    const existente = comisiones.find(c => c.solicitud_id === sol.id);
    if (existente) {
      toast.error('Ya existe una comisión para esta solicitud');
      return;
    }
    try {
      const { error } = await supabase.from('comisiones').insert({
        solicitud_id: sol.id,
        partner_id: sol.partner_id,
        importe_base: sol.importe_cobrado,
        importe_comision: sol.importe_cobrado * 0.15,
        estado: 'pendiente',
      });
      if (error) throw error;
      toast.success(`Comisión de ${fmt(sol.importe_cobrado * 0.15)} creada`);
      loadAll();
    } catch {
      toast.error('Error al crear comisión');
    }
  };

  // ---------------------------------------------------------------------------
  // Cambiar estado comisión
  // ---------------------------------------------------------------------------
  const handleComisionEstado = async (com: Comision, newEstado: string) => {
    try {
      const updates: any = { estado: newEstado };
      if (newEstado === 'pagada') updates.pagada_at = new Date().toISOString();
      const { error } = await supabase.from('comisiones').update(updates).eq('id', com.id);
      if (error) throw error;
      toast.success('Estado de comisión actualizado');
      loadAll();
    } catch {
      toast.error('Error al actualizar comisión');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Sistema de Afiliados</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gestión de partners, solicitudes referidas y comisiones
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={loadAll}>
            <RefreshCw className="h-4 w-4 mr-2" />Actualizar
          </Button>
          <Button size="sm" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />Crear partner
          </Button>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-3 gap-4">
        <MetricCard icon={<Users className="h-5 w-5 text-blue-400" />} label="Partners activos"
          value={partners.filter(p => p.activo).length.toString()} bg="bg-blue-500/10" />
        <MetricCard icon={<FileText className="h-5 w-5 text-amber-400" />} label="Solicitudes totales"
          value={solicitudes.length.toString()} bg="bg-amber-500/10" />
        <MetricCard icon={<Euro className="h-5 w-5 text-emerald-400" />} label="Comisiones pendientes"
          value={fmt(totalComisionesPendientes)} bg="bg-emerald-500/10" />
      </div>

      {/* Navegación de secciones */}
      <div className="flex gap-2 border-b border-border pb-0">
        {(['partners', 'solicitudes', 'comisiones'] as const).map(s => (
          <button
            key={s}
            onClick={() => setActiveSection(s)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors -mb-px ${
              activeSection === s
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {s === 'partners' ? 'Partners' : s === 'solicitudes' ? 'Solicitudes' : 'Comisiones'}
          </button>
        ))}
      </div>

      {/* ── PARTNERS ── */}
      {activeSection === 'partners' && (
        <div className="rounded-xl border border-border overflow-hidden">
          {partners.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Sin partners aún</p>
              <p className="text-sm mt-1">Usa el botón "Crear partner" para invitar al primero.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {['Nombre', 'Email', 'Slug / Link', 'Estado', 'Alta', 'Acciones'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {partners.map(p => (
                  <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{p.nombre}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.email}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Link2 className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="font-mono text-xs text-primary">?ref={p.slug}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={`border ${p.activo ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-slate-500/15 text-slate-400 border-slate-500/30'}`}>
                        {p.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{fmtDate(p.created_at)}</td>
                    <td className="px-4 py-3">
                      <Button variant="outline" size="sm" onClick={() => togglePartnerActivo(p)}>
                        {p.activo ? 'Desactivar' : 'Activar'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── SOLICITUDES ── */}
      {activeSection === 'solicitudes' && (
        <div className="rounded-xl border border-border overflow-hidden">
          {solicitudes.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Sin solicitudes aún</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {['Ref', 'Fecha', 'Partner', 'Cliente', 'Estado', 'Importe', 'Acciones'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {solicitudes.map(sol => {
                  const tieneComision = comisiones.some(c => c.solicitud_id === sol.id);
                  return (
                    <tr key={sol.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">#{sol.id.slice(0, 8).toUpperCase()}</td>
                      <td className="px-4 py-3 text-foreground">{fmtDate(sol.created_at)}</td>
                      <td className="px-4 py-3 text-foreground">{(sol as any).partners?.nombre ?? '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {sol.datos_formulario?.company || sol.datos_formulario?.contact || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={`border ${ESTADO_SOL[sol.estado] ?? ESTADO_SOL.pendiente}`}>{sol.estado}</Badge>
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {sol.importe_cobrado != null ? fmt(sol.importe_cobrado) : '—'}
                      </td>
                      <td className="px-4 py-3 flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => {
                          setEditSolicitud(sol);
                          setEditEstado(sol.estado);
                          setEditImporte(sol.importe_cobrado?.toString() ?? '');
                        }}>
                          Editar
                        </Button>
                        {sol.estado === 'aprobada' && sol.importe_cobrado && !tieneComision && (
                          <Button size="sm" onClick={() => handleCrearComision(sol)}>
                            Comisión
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── COMISIONES ── */}
      {activeSection === 'comisiones' && (
        <div className="rounded-xl border border-border overflow-hidden">
          {comisiones.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <Euro className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Sin comisiones aún</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {['Fecha', 'Partner', 'Base', 'Comisión (15%)', 'Estado', 'Pagada el', 'Acciones'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {comisiones.map(com => (
                  <tr key={com.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 text-foreground">{fmtDate(com.created_at)}</td>
                    <td className="px-4 py-3 text-foreground">{(com as any).partners?.nombre ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{fmt(com.importe_base)}</td>
                    <td className="px-4 py-3 font-semibold text-foreground">{fmt(com.importe_comision)}</td>
                    <td className="px-4 py-3">
                      <Badge className={`border ${ESTADO_COM[com.estado] ?? ESTADO_COM.pendiente}`}>{com.estado}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {com.pagada_at ? fmtDate(com.pagada_at) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {com.estado === 'pendiente' && (
                        <Button variant="outline" size="sm" onClick={() => handleComisionEstado(com, 'confirmada')}>
                          Confirmar
                        </Button>
                      )}
                      {com.estado === 'confirmada' && (
                        <Button size="sm" onClick={() => handleComisionEstado(com, 'pagada')}>
                          Marcar pagada
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── MODAL CREAR PARTNER ── */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Crear nuevo partner</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="p-nombre">Nombre</Label>
              <Input id="p-nombre" value={newPartner.nombre} onChange={e => setNewPartner(p => ({ ...p, nombre: e.target.value }))} placeholder="María García" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-email">Email</Label>
              <Input id="p-email" type="email" value={newPartner.email} onChange={e => setNewPartner(p => ({ ...p, email: e.target.value }))} placeholder="maria@ejemplo.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-slug">Slug (identificador único)</Label>
              <Input id="p-slug" value={newPartner.slug} onChange={e => setNewPartner(p => ({ ...p, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))} placeholder="maria-garcia" />
              {newPartner.slug && (
                <p className="text-xs text-muted-foreground">Link: ?ref=<span className="text-primary">{newPartner.slug}</span></p>
              )}
            </div>
            <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
              Supabase enviará automáticamente un email de invitación al partner para que establezca su contraseña.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancelar</Button>
            <Button onClick={handleCreatePartner} disabled={creating}>
              {creating ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Creando...</> : 'Crear e invitar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL EDITAR SOLICITUD ── */}
      <Dialog open={!!editSolicitud} onOpenChange={open => !open && setEditSolicitud(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar solicitud #{editSolicitud?.id.slice(0, 8).toUpperCase()}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={editEstado} onValueChange={setEditEstado}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['pendiente', 'en_proceso', 'aprobada', 'cerrada', 'pagada'].map(e => (
                    <SelectItem key={e} value={e}>{e}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="importe">Importe cobrado (€)</Label>
              <Input id="importe" type="number" min="0" step="0.01" value={editImporte}
                onChange={e => setEditImporte(e.target.value)} placeholder="0.00" />
            </div>
            {editSolicitud?.datos_formulario && (
              <div className="bg-muted/40 rounded-lg px-3 py-2 text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground mb-1">Datos del cliente</p>
                {Object.entries(editSolicitud.datos_formulario).map(([k, v]) => (
                  <p key={k}><span className="capitalize">{k}:</span> {String(v)}</p>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSolicitud(null)}>Cancelar</Button>
            <Button onClick={handleSaveSolicitud} disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Guardando...</> : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MetricCard
// ---------------------------------------------------------------------------
function MetricCard({ icon, label, value, bg }: { icon: React.ReactNode; label: string; value: string; bg: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 flex items-center gap-4">
      <div className={`p-3 rounded-xl ${bg} shrink-0`}>{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}
