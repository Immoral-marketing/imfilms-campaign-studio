/**
 * RecomiendaPage — Awwwards-tier affiliate landing
 * Skill: high-end-visual-design
 * Vibe: Ethereal Glass + Cinematic hero images
 */
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, Copy, CheckCircle2, TrendingUp, Share2, Handshake, Banknote, Loader2, Sparkles } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

/* ─── Intersection Observer hook ─────────────────────────────────────── */
function useReveal(delay = 0) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (delay) setTimeout(() => setVisible(true), delay);
          else setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.06 }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [delay]);
  return { ref, visible };
}

/* ─── Double-Bezel Card ───────────────────────────────────────────────── */
function BezelCard({ children, className, glow }: { children: React.ReactNode; className?: string; glow?: boolean }) {
  return (
    <div className={cn(
      'p-[1.5px] rounded-[1.75rem] bg-white/[0.04] border border-white/[0.07]',
      glow && 'border-primary/20 shadow-[0_0_40px_-8px_rgba(245,216,73,0.15)]',
      className
    )}>
      <div className="relative rounded-[calc(1.75rem-1.5px)] bg-[#0a0a0c] overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.07)]">
        {children}
      </div>
    </div>
  );
}

/* ─── Pill Badge ──────────────────────────────────────────────────────── */
function Eyebrow({ children, color = 'default' }: { children: React.ReactNode; color?: 'default' | 'green' }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-medium border',
      color === 'green'
        ? 'border-emerald-500/25 bg-emerald-500/8 text-emerald-400'
        : 'border-primary/25 bg-primary/8 text-primary'
    )}>
      {children}
    </span>
  );
}

/* ─── Button-in-Button ────────────────────────────────────────────────── */
function PillButton({ children, onClick, href, variant = 'primary', className, disabled, loading }: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: 'primary' | 'ghost';
  className?: string;
  disabled?: boolean;
  loading?: boolean;
}) {
  const base = cn(
    'group inline-flex items-center gap-3 rounded-full px-6 py-3 font-medium text-sm transition-all duration-700',
    'ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]',
    variant === 'primary'
      ? 'bg-primary text-black hover:bg-primary/90 disabled:opacity-50'
      : 'border border-white/10 text-white/70 hover:text-white hover:border-white/20 hover:bg-white/5',
    disabled && 'cursor-not-allowed opacity-50',
    className
  );
  const icon = loading ? (
    <Loader2 className="h-3.5 w-3.5 animate-spin" />
  ) : (
    <span className={cn(
      'w-7 h-7 rounded-full flex items-center justify-center transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]',
      'group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:scale-105',
      variant === 'primary' ? 'bg-black/10' : 'bg-white/8'
    )}>
      <ArrowUpRight className="h-3.5 w-3.5" />
    </span>
  );

  if (href && !disabled) return (
    <Link to={href} className={base}>{children}{icon}</Link>
  );
  return <button onClick={onClick} disabled={disabled} className={base}>{children}{icon}</button>;
}

/* ─── Glow orb ────────────────────────────────────────────────────────── */
function GlowOrb({ className }: { className: string }) {
  return <div className={cn('absolute rounded-full pointer-events-none', className)} />;
}

/* ─── Step Card (isolated for Rules of Hooks) ─────────────────────────── */
function StepCard({ n, icon: Icon, title, body, accent, accentBg, accentBorder, delay, isLast }: {
  n: string; icon: React.ElementType; title: string; body: string;
  accent: string; accentBg: string; accentBorder: string; delay: number; isLast: boolean;
}) {
  const { ref, visible } = useReveal(delay + 80);
  return (
    <div
      ref={ref}
      className={cn(
        'relative flex items-start gap-6 md:gap-8 mb-4 last:mb-0',
        'transition-all duration-[1000ms] ease-[cubic-bezier(0.32,0.72,0,1)]',
        visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-5'
      )}
    >
      <div className="flex-shrink-0 flex flex-col items-center">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center relative" style={{ background: accentBg, border: `1px solid ${accentBorder}` }}>
          <Icon className="h-6 w-6" style={{ color: accent }} strokeWidth={1.5} />
          <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold bg-[#0a0a0c] border" style={{ color: accent, borderColor: accentBorder }}>
            {parseInt(n)}
          </span>
        </div>
        {!isLast && (
          <div className="w-px mt-3 flex-shrink-0" style={{ height: '48px', background: `linear-gradient(to bottom, ${accentBorder}, transparent)` }} />
        )}
      </div>
      <div className="flex-1 rounded-[1.5rem] p-[1.5px] mb-3" style={{ background: `linear-gradient(135deg, ${accentBorder}, rgba(255,255,255,0.03))` }}>
        <div className="rounded-[calc(1.5rem-1.5px)] p-8 relative overflow-hidden" style={{ background: '#0a0a0c' }}>
          <span className="absolute right-6 top-1/2 -translate-y-1/2 font-cinema text-[120px] leading-none select-none pointer-events-none" style={{ color: 'rgba(255,255,255,0.02)', letterSpacing: '-0.04em' }}>
            {n}
          </span>
          <div className="relative z-10">
            <h3 className="font-cinema text-[clamp(22px,3vw,32px)] text-white/90 mb-3 leading-tight" style={{ letterSpacing: '-0.02em' }}>{title}</h3>
            <p className="text-white/40 text-base leading-relaxed max-w-lg">{body}</p>
            <div className="mt-6 h-px w-24" style={{ background: `linear-gradient(to right, ${accent}40, transparent)` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════════════ */
const RecomiendaPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [heroIn, setHeroIn] = useState(false);
  const [hasPartner, setHasPartner] = useState<boolean | null>(null);
  const [activating, setActivating] = useState(false);

  const baseUrl = window.location.origin;
  const referralCode = user?.id?.slice(0, 8) ?? 'xxxxxxxx';
  const referralUrl = `${baseUrl}/quick-wizard?ref=${referralCode}`;

  useEffect(() => { const t = setTimeout(() => setHeroIn(true), 80); return () => clearTimeout(t); }, []);

  // Check if user already has a partner account
  useEffect(() => {
    if (!user) { setHasPartner(false); return; }
    supabase
      .from('partners')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => setHasPartner(!!data));
  }, [user]);

  const handleCopy = () => {
    navigator.clipboard.writeText(referralUrl).then(() => {
      setCopied(true);
      toast.success('Enlace de referencia copiado');
      setTimeout(() => setCopied(false), 2500);
    });
  };

  // Auto-activate partner from existing distributor account
  const handleActivatePartner = async () => {
    if (!user) { navigate('/afiliado'); return; }
    setActivating(true);
    try {
      const slug = user.id.slice(0, 8).toLowerCase();
      const nombre = user.user_metadata?.full_name
        || user.user_metadata?.contact_name
        || user.email?.split('@')[0]
        || 'Afiliado';

      const { error } = await supabase
        .from('partners')
        .insert({ user_id: user.id, nombre, email: user.email!, slug, activo: true });

      if (error && error.code !== '23505') throw error; // ignore duplicate
      setHasPartner(true);
      toast.success('¡Cuenta de afiliado activada!');
      navigate('/afiliado');
    } catch (err: any) {
      toast.error(err.message || 'Error al activar la cuenta');
    } finally {
      setActivating(false);
    }
  };

  const section1 = useReveal();
  const section2 = useReveal();
  const section3 = useReveal();

  // CTA config based on auth + partner status
  const primaryCta = hasPartner
    ? { label: 'Ver mis comisiones', href: '/afiliado' as string | undefined, onClick: undefined }
    : { label: user ? 'Activar mis comisiones' : 'Unirme al programa', href: user ? undefined : '/afiliado' as string | undefined, onClick: user ? handleActivatePartner : undefined };

  return (
    <div className="relative min-h-[100dvh] bg-[#050507] text-white overflow-x-hidden" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>

      {/* ── Noise grain ──────────────────────────────────────────────── */}
      <div className="fixed inset-0 z-[2] pointer-events-none opacity-[0.025]"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E\")", backgroundSize: '128px 128px' }}
      />

      {/* ── Ambient orbs ─────────────────────────────────────────────── */}
      <GlowOrb className="fixed w-[700px] h-[700px] bg-primary/[0.07] blur-[160px] top-[-200px] left-[-300px] z-[0]" />
      <GlowOrb className="fixed w-[500px] h-[500px] bg-emerald-500/[0.06] blur-[130px] top-[600px] right-[-200px] z-[0]" />

      {/* ── Nav ──────────────────────────────────────────────────────── */}
      <nav className="absolute top-0 left-0 right-0 z-20 container mx-auto px-6 pt-8">
        <Link to="/campaigns" className="inline-flex items-center gap-2 text-white/50 hover:text-white/90 text-sm transition-colors duration-500">
          <ArrowLeft className="h-4 w-4" /> Volver
        </Link>
      </nav>

      {/* ══════════════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════════════ */}
      <section className="relative z-10 min-h-[92vh] flex items-center justify-center overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=2000&q=85"
            alt=""
            className="w-full h-full object-cover object-center"
            style={{ filter: 'saturate(0.3) brightness(0.22)', transform: 'scale(1.03)' }}
          />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(5,5,7,0.5) 0%, rgba(5,5,7,0.05) 40%, rgba(5,5,7,0.85) 80%, rgba(5,5,7,1) 100%)' }} />
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 70% 100% at 50% 50%, transparent 30%, rgba(5,5,7,0.7) 100%)' }} />
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 50% 35% at 50% 0%, rgba(245,216,73,0.1) 0%, transparent 60%)' }} />
        </div>

        {/* Content */}
        <div className={cn('relative z-10 container mx-auto px-6 text-center transition-all duration-[1100ms] ease-[cubic-bezier(0.32,0.72,0,1)]', heroIn ? 'opacity-100 translate-y-0 blur-0' : 'opacity-0 translate-y-16 blur-sm')}>
          <h1 className="font-cinema leading-[0.88] tracking-tight mb-8">
            <span className="block text-[clamp(72px,12vw,160px)] text-white/90" style={{ letterSpacing: '-0.025em' }}>Recomienda.</span>
            <span className="block text-[clamp(72px,12vw,160px)] text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #F5D849 0%, #ffe87a 40%, #B8A237 100%)', letterSpacing: '-0.025em', filter: 'drop-shadow(0 0 80px rgba(245,216,73,0.4))' }}>
              Gana dinero.
            </span>
          </h1>

          <p className={cn('text-white/45 text-xl md:text-2xl max-w-xl mx-auto leading-relaxed mb-14 transition-all duration-[1200ms] delay-[150ms] ease-[cubic-bezier(0.32,0.72,0,1)]', heroIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8')}>
            Cada distribuidora que contrate a través de tu enlace
            genera una comisión. Sin techo. Sin límites.
          </p>

          <div className={cn('flex flex-col sm:flex-row items-center justify-center gap-4 transition-all duration-[1200ms] delay-[300ms] ease-[cubic-bezier(0.32,0.72,0,1)]', heroIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6')}>
            <PillButton
              href={primaryCta.href}
              onClick={primaryCta.onClick}
              variant="primary"
              loading={activating}
              disabled={activating}
            >
              {activating ? 'Activando...' : primaryCta.label}
            </PillButton>
            {user && (
              <PillButton variant="ghost" onClick={handleCopy}>
                {copied ? <><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Copiado</> : <><Copy className="h-4 w-4" /> Copiar enlace de referencia</>}
              </PillButton>
            )}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className={cn('absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-10 transition-all duration-[1400ms] delay-[600ms]', heroIn ? 'opacity-100' : 'opacity-0')}>
          <span className="text-[10px] text-white/20 uppercase tracking-[0.25em]">Scroll</span>
          <div className="w-px h-10 bg-gradient-to-b from-white/20 to-transparent" />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          BENTO STATS
      ══════════════════════════════════════════════════════════════ */}
      <section className="relative z-10 container mx-auto px-6 pt-32 pb-32">
        <div ref={section1.ref} className={cn('transition-all duration-[900ms] ease-[cubic-bezier(0.32,0.72,0,1)]', section1.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12')}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-4xl mx-auto">
            <BezelCard className="md:col-span-2" glow>
              <div className="p-8 md:p-10">
                <Eyebrow>Comisión</Eyebrow>
                <div className="font-cinema text-[80px] md:text-[100px] leading-none mt-4 mb-2 text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #F5D849, #ffe87a 60%, #B8A237)' }}>5%</div>
                <p className="text-white/40 text-sm">Por cada campaña contratada a través de tu enlace.</p>
                <div className="mt-6 h-px bg-gradient-to-r from-primary/40 to-transparent" />
                <p className="mt-4 text-xs text-white/25 uppercase tracking-widest">Sin límite de referencias</p>
              </div>
            </BezelCard>

            <BezelCard>
              <div className="p-8 flex flex-col justify-between h-full min-h-[180px]">
                <Eyebrow color="green">Pago</Eyebrow>
                <div>
                  <div className="font-cinema text-5xl text-white/80 mt-4">50€</div>
                  <p className="text-white/30 text-xs mt-2">Umbral mínimo de retiro</p>
                </div>
              </div>
            </BezelCard>

            <BezelCard className="md:col-span-2">
              <div className="p-8 flex items-center gap-6 min-h-[180px]">
                <div className="flex-1">
                  <Eyebrow color="green">Tracking</Eyebrow>
                  <p className="text-white/70 text-2xl font-light mt-4 leading-snug">Panel en tiempo real.<br /><span className="text-white/30">Cada clic, cada conversión.</span></p>
                </div>
                <TrendingUp className="h-16 w-16 text-primary/20 flex-shrink-0" strokeWidth={1} />
              </div>
            </BezelCard>

            <BezelCard>
              <div className="p-8 flex flex-col justify-between h-full min-h-[180px]">
                <Eyebrow>Pago</Eyebrow>
                <div>
                  <div className="font-cinema text-xl text-white/70 mt-4 leading-snug">Mensual<br />automático</div>
                  <p className="text-white/30 text-xs mt-2">Sin gestión manual</p>
                </div>
              </div>
            </BezelCard>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          THREE STEPS
      ══════════════════════════════════════════════════════════════ */}
      <section className="relative z-10 overflow-hidden pb-0">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(245,216,73,0.03) 0%, transparent 70%)' }} />
        <div className="container mx-auto px-6">
          <div ref={section2.ref} className={cn('text-center mb-20 transition-all duration-[900ms] ease-[cubic-bezier(0.32,0.72,0,1)]', section2.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10')}>
            <Eyebrow>Proceso</Eyebrow>
            <h2 className="font-cinema mt-6 text-[clamp(44px,7vw,88px)] text-white/90 leading-[0.9]" style={{ letterSpacing: '-0.025em' }}>
              Tres pasos.<br />
              <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.06))' }}>Sin fricción.</span>
            </h2>
          </div>
          <div className="max-w-5xl mx-auto pb-0">
            <StepCard n="01" icon={Share2} title="Comparte tu enlace" body="Tu URL única identifica cada visita. Distribuidoras, productoras, cualquier empresa que estrene películas en España." accent="#F5D849" accentBg="rgba(245,216,73,0.08)" accentBorder="rgba(245,216,73,0.15)" delay={0} isLast={false} />
            <StepCard n="02" icon={Handshake} title="Ellos contratan" body="Cuando confirman una campaña desde tu enlace, el sistema registra la referencia automáticamente. Tú no haces nada." accent="#34d399" accentBg="rgba(52,211,153,0.08)" accentBorder="rgba(52,211,153,0.15)" delay={120} isLast={false} />
            <StepCard n="03" icon={Banknote} title="Tú cobras" body="Comisión directa cada mes. Sin techo. A mayor volumen de referencias, mejor posición en el programa." accent="#a78bfa" accentBg="rgba(167,139,250,0.08)" accentBorder="rgba(167,139,250,0.15)" delay={240} isLast={true} />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          BOTTOM HERO CTA — as cinematic as the top
      ══════════════════════════════════════════════════════════════ */}
      <section className="relative z-10 mt-32 min-h-[80vh] flex items-center justify-center overflow-hidden">

        {/* Cinematic background — different frame from a film */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=2000&q=85"
            alt=""
            className="w-full h-full object-cover object-center"
            style={{ filter: 'saturate(0.25) brightness(0.2)', transform: 'scale(1.03)' }}
          />
          {/* Top dark fade */}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(5,5,7,1) 0%, rgba(5,5,7,0.2) 20%, rgba(5,5,7,0.2) 70%, rgba(5,5,7,0.9) 100%)' }} />
          {/* Vignette */}
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 70% 100% at 50% 50%, transparent 20%, rgba(5,5,7,0.65) 100%)' }} />
          {/* Purple-gold cross-glow */}
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 50% 60% at 50% 60%, rgba(245,216,73,0.07) 0%, transparent 60%)' }} />
        </div>

        {/* Content */}
        <div
          ref={section3.ref}
          className={cn(
            'relative z-10 container mx-auto px-6 text-center transition-all duration-[1000ms] ease-[cubic-bezier(0.32,0.72,0,1)]',
            section3.visible ? 'opacity-100 translate-y-0 blur-0' : 'opacity-0 translate-y-12 blur-sm'
          )}
        >
          {/* Eyebrow */}
          <div className="flex justify-center mb-8">
            <Eyebrow>
              <Sparkles className="h-3 w-3" />
              {user && hasPartner ? 'Tu programa activo' : 'Empieza ahora'}
            </Eyebrow>
          </div>

          {/* Headline */}
          <h2 className="font-cinema leading-[0.88] tracking-tight mb-8">
            <span className="block text-[clamp(56px,9vw,120px)] text-white/90" style={{ letterSpacing: '-0.025em' }}>
              Comparte.
            </span>
            <span
              className="block text-[clamp(56px,9vw,120px)] text-transparent bg-clip-text"
              style={{
                backgroundImage: 'linear-gradient(135deg, #F5D849 0%, #ffe87a 40%, #B8A237 100%)',
                letterSpacing: '-0.025em',
                filter: 'drop-shadow(0 0 60px rgba(245,216,73,0.35))',
              }}
            >
              Cobra.
            </span>
          </h2>

          <p className="text-white/40 text-lg md:text-xl max-w-md mx-auto leading-relaxed mb-12">
            {user && hasPartner
              ? 'Tu enlace único ya está activo. Compártelo y empieza a generar comisiones.'
              : 'Activa tu cuenta de afiliado con un clic. Usa el mismo acceso que tu dashboard — no necesitas crear nada nuevo.'}
          </p>

          {/* Referral URL box (only if logged in) */}
          {user && (
            <div className="max-w-lg mx-auto mb-10">
              <div className="p-[1px] rounded-2xl bg-white/[0.06] border border-white/[0.06]">
                <div className="flex items-center gap-3 rounded-[calc(1rem-1px)] bg-[#0d0d10]/80 backdrop-blur-sm px-5 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                  <span className="flex-1 text-xs text-white/30 truncate font-mono text-left">
                    {referralUrl}
                  </span>
                  <button
                    onClick={handleCopy}
                    className={cn(
                      'shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-500',
                      copied
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                        : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10 hover:text-white/80'
                    )}
                  >
                    {copied ? <><CheckCircle2 className="h-3 w-3" /> Copiado</> : <><Copy className="h-3 w-3" /> Copiar</>}
                  </button>
                </div>
              </div>
              <p className="mt-3 text-xs text-white/20 text-center">
                Comparte este enlace — cualquier persona que cree su cuenta a través de él queda vinculada a ti.
              </p>
            </div>
          )}

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <PillButton
              href={primaryCta.href}
              onClick={primaryCta.onClick}
              variant="primary"
              loading={activating}
              disabled={activating}
              className="text-base px-8 py-4"
            >
              {activating ? 'Activando...' : primaryCta.label}
            </PillButton>
            {!user && (
              <p className="text-xs text-white/25 max-w-xs">
                Usa el mismo usuario y contraseña que en tu dashboard.
                No necesitas crear una cuenta nueva.
              </p>
            )}
          </div>

        </div>
      </section>

      {/* Bottom padding */}
      <div className="h-32" />

    </div>
  );
};

export default RecomiendaPage;
