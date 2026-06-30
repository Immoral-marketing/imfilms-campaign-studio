import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Copy, Check, LogOut, Link2, Users, FileText, Euro, KeyRound, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------
interface Partner {
  id: string;
  nombre: string;
  email: string;
  slug: string;
  activo: boolean;
}

interface Solicitud {
  id: string;
  estado: string;
  created_at: string;
  importe_cobrado: number | null;
}

interface Comision {
  id: string;
  solicitud_id: string;
  importe_comision: number;
  estado: string;
  pagada_at: string | null;
}

type AuthState = 'loading' | 'unauthenticated' | 'forgot_password' | 'set_password' | 'authenticated';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const ESTADO_CONFIG: Record<string, { label: string; className: string }> = {
  pendiente:   { label: 'Pendiente',   className: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  en_proceso:  { label: 'En proceso',  className: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  aprobada:    { label: 'Aprobada',    className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  cerrada:     { label: 'Cerrada',     className: 'bg-slate-500/15 text-slate-400 border-slate-500/30' },
  pagada:      { label: 'Pagada',      className: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
};

const ESTADO_COMISION_CONFIG: Record<string, { label: string; className: string }> = {
  pendiente:   { label: 'Pendiente',   className: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  confirmada:  { label: 'Confirmada',  className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  pagada:      { label: 'Pagada',      className: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}
function formatEur(amount: number) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------
export default function AfiliadoPage() {
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const hash = window.location.hash;
    const hashParams = new URLSearchParams(hash.replace('#', ''));
    const linkType = hashParams.get('type');
    const isInvite = linkType === 'invite';
    const isRecovery = linkType === 'recovery';

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session && (isInvite || isRecovery)) {
        window.history.replaceState(null, '', window.location.pathname);
        setAuthState('set_password');
      } else {
        setAuthState(session ? 'authenticated' : 'unauthenticated');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === 'USER_UPDATED') setAuthState('authenticated');
      else if (!session) setAuthState('unauthenticated');
    });

    return () => subscription.unsubscribe();
  }, []);

  if (authState === 'loading') return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
  if (authState === 'unauthenticated') return <LoginForm onSuccess={() => setAuthState('authenticated')} onForgotPassword={() => setAuthState('forgot_password')} />;
  if (authState === 'forgot_password') return <ForgotPasswordForm onBack={() => setAuthState('unauthenticated')} />;
  if (authState === 'set_password') return <SetPasswordForm onSuccess={() => setAuthState('authenticated')} />;
  return <Dashboard session={session!} />;
}

// ---------------------------------------------------------------------------
// SetPasswordForm — primer acceso desde enlace de invitación
// ---------------------------------------------------------------------------
function SetPasswordForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres'); return; }
    if (password !== confirm) { setError('Las contraseñas no coinciden'); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { setError('No se pudo establecer la contraseña. Inténtalo de nuevo.'); setLoading(false); return; }
    toast({ title: '¡Contraseña establecida!', description: 'Ya puedes acceder a tu panel de afiliado' });
    onSuccess();
  };

  return (
    <AuthShell title="Bienvenido al portal" subtitle="Establece tu contraseña para acceder">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField id="new-password" label="Nueva contraseña" type="password" value={password} onChange={setPassword} placeholder="Mínimo 8 caracteres" />
        <FormField id="confirm-password" label="Confirmar contraseña" type="password" value={confirm} onChange={setConfirm} placeholder="Repite la contraseña" />
        {error && <ErrorMsg>{error}</ErrorMsg>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</> : 'Establecer contraseña'}
        </Button>
      </form>
    </AuthShell>
  );
}

// ---------------------------------------------------------------------------
// LoginForm
// ---------------------------------------------------------------------------
function LoginForm({ onSuccess, onForgotPassword }: { onSuccess: () => void; onForgotPassword: () => void }) {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError('Email o contraseña incorrectos'); setLoading(false); return; }
    toast({ title: 'Sesión iniciada', description: 'Bienvenido a tu panel de afiliado' });
    onSuccess();
  };

  return (
    <AuthShell title="Portal de Afiliados" subtitle="Imfilms Campaign Studio">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField id="email" label="Email" type="email" value={email} onChange={setEmail} placeholder="tu@email.com" autoComplete="email" />
        <FormField id="password" label="Contraseña" type="password" value={password} onChange={setPassword} placeholder="••••••••" autoComplete="current-password" />
        {error && <ErrorMsg>{error}</ErrorMsg>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Accediendo...</> : 'Acceder'}
        </Button>
        <button type="button" onClick={onForgotPassword} className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors">
          ¿Olvidaste tu contraseña?
        </button>
      </form>
      <p className="text-center text-xs text-muted-foreground mt-4">
        Las credenciales son asignadas por el equipo de Imfilms.<br />
        Si tienes problemas, escribe a <span className="text-foreground">hola@imfilms.es</span>
      </p>
    </AuthShell>
  );
}

// ---------------------------------------------------------------------------
// ForgotPasswordForm
// ---------------------------------------------------------------------------
function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: `${window.location.origin}/afiliado` },
    );
    setLoading(false);
    if (error) { toast({ title: 'Error al enviar el email', variant: 'destructive' }); return; }
    setSent(true);
  };

  return (
    <AuthShell title="Recuperar contraseña" subtitle="Te enviaremos un enlace para crear una nueva">
      {sent ? (
        <div className="text-center space-y-3">
          <p className="text-foreground font-medium">Email enviado</p>
          <p className="text-sm text-muted-foreground">Si tu email está registrado, recibirás un enlace. Revisa también spam.</p>
          <Button variant="outline" className="w-full mt-4" onClick={onBack}>Volver al login</Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField id="reset-email" label="Email" type="email" value={email} onChange={setEmail} placeholder="tu@email.com" autoFocus />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enviando...</> : 'Enviar enlace'}
          </Button>
          <button type="button" onClick={onBack} className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors">
            Volver al login
          </button>
        </form>
      )}
    </AuthShell>
  );
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
function Dashboard({ session }: { session: Session }) {
  const { toast } = useToast();
  const [partner, setPartner] = useState<Partner | null>(null);
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [comisiones, setComisiones] = useState<Comision[]>([]);
  const [clicksCount, setClicksCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const referralUrl = partner ? `${window.location.origin}/?ref=${partner.slug}` : '';

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: partnerData, error: partnerError } = await supabase
        .from('partners').select('*').eq('user_id', session.user.id).maybeSingle();

      if (partnerError || !partnerData) {
        toast({ title: 'Cuenta de afiliado no encontrada', description: 'Ve a la página de Recomienda y activa tu cuenta primero.', variant: 'destructive' });
        setLoading(false);
        return;
      }
      setPartner(partnerData);

      const { count } = await supabase
        .from('referral_clicks').select('*', { count: 'exact', head: true }).eq('partner_id', partnerData.id);
      setClicksCount(count ?? 0);

      const { data: solicitudesData } = await supabase
        .from('solicitudes_afiliado').select('id, estado, created_at, importe_cobrado')
        .eq('partner_id', partnerData.id).order('created_at', { ascending: false });
      setSolicitudes(solicitudesData ?? []);

      const { data: comisionesData } = await supabase
        .from('comisiones').select('id, solicitud_id, importe_comision, estado, pagada_at')
        .eq('partner_id', partnerData.id).order('created_at', { ascending: false });
      setComisiones(comisionesData ?? []);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: 'Enlace copiado', description: 'Ya puedes compartirlo' });
    } catch {
      toast({ title: 'No se pudo copiar', variant: 'destructive' });
    }
  };

  const totalGenerado = comisiones.reduce((sum, c) => sum + c.importe_comision, 0);
  const totalPagado = comisiones.filter((c) => c.estado === 'pagada').reduce((sum, c) => sum + c.importe_comision, 0);
  const totalPendiente = totalGenerado - totalPagado;
  const comisionBySolicitudId = Object.fromEntries(comisiones.map((c) => [c.solicitud_id, c]));

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Portal de Afiliados · Imfilms</p>
            <h1 className="text-lg font-semibold text-foreground">{partner?.nombre ?? session.user.email}</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={() => supabase.auth.signOut()} className="text-muted-foreground">
            <LogOut className="h-4 w-4 mr-2" />Salir
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Métricas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard icon={<Users className="h-5 w-5 text-blue-400" />} label="Visitas generadas" value={clicksCount.toLocaleString('es-ES')} bg="bg-blue-500/10" />
          <MetricCard icon={<FileText className="h-5 w-5 text-amber-400" />} label="Solicitudes asignadas" value={solicitudes.length.toLocaleString('es-ES')} bg="bg-amber-500/10" />
          <MetricCard icon={<Euro className="h-5 w-5 text-emerald-400" />} label="Comisión pendiente" value={formatEur(totalPendiente)} bg="bg-emerald-500/10" />
        </div>

        {/* Enlace personalizado */}
        <section className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <Link2 className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-foreground">Tu enlace de afiliado</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Comparte este enlace. Cada visita y conversión quedará registrada automáticamente a tu nombre.
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-muted border border-border rounded-lg px-4 py-2.5 font-mono text-sm text-foreground break-all">
              {referralUrl}
            </div>
            <Button onClick={handleCopy} size="sm" className="shrink-0 gap-2">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copiado' : 'Copiar'}
            </Button>
          </div>
        </section>

        {/* Resumen de comisiones */}
        {comisiones.length > 0 && (
          <section className="bg-card border border-border rounded-xl p-6">
            <h2 className="font-semibold text-foreground mb-4">Resumen de comisiones</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Generada</p>
                <p className="text-xl font-bold text-foreground">{formatEur(totalGenerado)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Pagada</p>
                <p className="text-xl font-bold text-purple-400">{formatEur(totalPagado)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Pendiente</p>
                <p className="text-xl font-bold text-amber-400">{formatEur(totalPendiente)}</p>
              </div>
            </div>
            {totalPendiente > 0 && totalPendiente < 100 && (
              <p className="text-xs text-muted-foreground mt-4 text-center">
                El mínimo para procesar el pago es <strong className="text-foreground">100€</strong>.
                Te faltan <strong className="text-amber-400">{formatEur(100 - totalPendiente)}</strong> para alcanzarlo.
              </p>
            )}
          </section>
        )}

        {/* Solicitudes */}
        <section className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground">Solicitudes asignadas</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Solo se muestra el estado y la fecha — los datos del cliente son confidenciales.</p>
          </div>
          {solicitudes.length === 0 ? (
            <div className="px-6 py-12 text-center text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Sin solicitudes aún</p>
              <p className="text-sm mt-1">Comparte tu enlace para empezar a generar leads.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    {['Referencia', 'Fecha', 'Estado', 'Comisión'].map((h, i) => (
                      <th key={h} className={`px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide ${i === 3 ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {solicitudes.map((sol) => {
                    const estadoConfig = ESTADO_CONFIG[sol.estado] ?? ESTADO_CONFIG.pendiente;
                    const comision = comisionBySolicitudId[sol.id];
                    const comisionConfig = comision ? ESTADO_COMISION_CONFIG[comision.estado] ?? ESTADO_COMISION_CONFIG.pendiente : null;
                    return (
                      <tr key={sol.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4 font-mono text-xs text-muted-foreground">#{sol.id.slice(0, 8).toUpperCase()}</td>
                        <td className="px-6 py-4 text-foreground">{formatDate(sol.created_at)}</td>
                        <td className="px-6 py-4">
                          <Badge className={`${estadoConfig.className} border`}>{estadoConfig.label}</Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {comision ? (
                            <div className="flex items-center justify-end gap-2">
                              <span className="font-medium text-foreground">{formatEur(comision.importe_comision)}</span>
                              <Badge className={`${comisionConfig?.className} border`}>{comisionConfig?.label}</Badge>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">{sol.estado === 'aprobada' ? '—' : 'Por determinar'}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Seguridad */}
        <ChangePasswordSection />
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ChangePasswordSection
// ---------------------------------------------------------------------------
function ChangePasswordSection() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleToggle = () => { setOpen((p) => !p); setError(''); setPassword(''); setConfirm(''); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return; }
    if (password !== confirm) { setError('Las contraseñas no coinciden.'); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { setError('No se pudo actualizar la contraseña.'); return; }
    toast({ title: 'Contraseña actualizada' });
    setOpen(false); setPassword(''); setConfirm('');
  };

  return (
    <section className="bg-card border border-border rounded-xl overflow-hidden">
      <button type="button" onClick={handleToggle} className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-slate-500/10 shrink-0">
            <KeyRound className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-left">
            <h2 className="font-semibold text-foreground text-sm">Seguridad de la cuenta</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Cambia tu contraseña de acceso al portal</p>
          </div>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>
      {open && (
        <div className="px-6 pb-6 border-t border-border pt-5">
          <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
            <FormField id="change-password" label="Nueva contraseña" type="password" value={password} onChange={setPassword} placeholder="Mínimo 8 caracteres" autoFocus />
            <FormField id="change-confirm" label="Confirmar nueva contraseña" type="password" value={confirm} onChange={setConfirm} placeholder="Repite la contraseña" />
            {error && <ErrorMsg>{error}</ErrorMsg>}
            <div className="flex items-center gap-3 pt-1">
              <Button type="submit" size="sm" disabled={loading}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</> : 'Actualizar contraseña'}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={handleToggle}>Cancelar</Button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Sub-componentes reutilizables
// ---------------------------------------------------------------------------
function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4">
            <Link2 className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-6 shadow-lg">{children}</div>
      </div>
    </div>
  );
}

function FormField({ id, label, type, value, onChange, placeholder, autoComplete, autoFocus }: {
  id: string; label: string; type: string; value: string;
  onChange: (v: string) => void; placeholder?: string; autoComplete?: string; autoFocus?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} required autoComplete={autoComplete} autoFocus={autoFocus} />
    </div>
  );
}

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

function ErrorMsg({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">{children}</p>
  );
}
