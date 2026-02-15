import { useNavigate } from "react-router-dom";
import { useState, useLayoutEffect, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Crosshair, Film, BarChart3, Clapperboard, Play, Trophy, CheckCircle2, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import GlobalHelpButton from "@/components/GlobalHelpButton";
import { Hero } from "@/components/Hero";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Observer } from "gsap/Observer";
import { TicketButton } from "@/components/TicketButton";

gsap.registerPlugin(ScrollTrigger, Observer);

import { Navbar } from "@/components/Navbar";
import { UserSelection } from "@/components/UserSelection";

const Landing = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState(1);

  const mainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useLayoutEffect(() => {
    if (loading) return;

    // Scroll Animations
    const ctx = gsap.context(() => {

      // Interactive "Slide" transition using Observer
      // This detects user intent immediately (onDown/onUp) to trigger navigation
      let isAnimating = false;

      Observer.create({
        target: window,
        type: "wheel,touch,pointer",
        onChangeY: (self) => {
          if (isAnimating) return;

          const scrollY = window.scrollY;

          // Defined sections in order
          const sections = [
            { id: "user-selection", el: document.getElementById("user-selection") },
            { id: "features", el: document.getElementById("features") },
            { id: "process", el: document.getElementById("process") },
            { id: "final-block", el: document.getElementById("final-block") }
          ];

          // Helper for smooth scroll
          const scrollToId = (target: string | number) => {
            isAnimating = true;
            (window as any).lenis?.scrollTo(target, {
              duration: 1.2,
              easing: (t: number) => 1 === t ? 1 : 1 - Math.pow(2, -10 * t),
              lock: true,
              onComplete: () => setTimeout(() => isAnimating = false, 100)
            });
          };

          // 1. Hero -> First Section (Down)
          if (self.deltaY > 0 && scrollY < 50) {
            scrollToId("#user-selection");
            return;
          }

          // 2. Navigation between sections
          for (let i = 0; i < sections.length; i++) {
            const current = sections[i];
            if (!current.el) continue;

            const rect = current.el.getBoundingClientRect();
            // Check if we are aligned with this section
            if (Math.abs(rect.top) < 50) {

              // Scroll UP
              if (self.deltaY < 0) {
                if (i === 0) {
                  // UserSelection -> Hero
                  scrollToId(0);
                } else {
                  // Go to previous section
                  scrollToId(`#${sections[i - 1].id}`);
                }
                return;
              }

              // Scroll DOWN
              if (self.deltaY > 0) {
                if (i < sections.length - 1) {
                  // Go to next section
                  scrollToId(`#${sections[i + 1].id}`);
                  return;
                }
              }
            }
          }
        }
      });

      // Sections Fade Up
      const sections = gsap.utils.toArray(".reveal-section");
      sections.forEach((section: any) => {
        gsap.fromTo(section,
          { y: 50, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 1,
            scrollTrigger: {
              trigger: section,
              start: "top 80%",
              toggleActions: "play none none reverse"
            }
          }
        );
      });

      // Staggered Items (Features)
      gsap.from(".feature-item", {
        y: 30,
        opacity: 0,
        duration: 0.8,
        stagger: 0.2,
        scrollTrigger: {
          trigger: ".features-grid",
          start: "top 75%"
        }
      });

      // Process Steps
      gsap.from(".process-step", {
        x: -30,
        opacity: 0,
        duration: 0.8,
        stagger: 0.2,
        scrollTrigger: {
          trigger: ".process-container",
          start: "top 70%"
        }
      });

      // Infinite Marquee - Why Work With Us
      gsap.to(".infinite-marquee", {
        xPercent: -50,
        duration: 20,
        ease: "none",
        repeat: -1
      });

    }, mainRef);

    return () => ctx.revert();
  }, [loading]);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    } catch (error) {
      console.error("Auth check error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary" />
      </div>
    );
  }

  return (
    <div ref={mainRef} className="bg-black text-foreground selection:bg-primary/30">

      <Navbar />

      {/* Fixed Hero Section */}
      <div className="fixed inset-0 z-0">
        <Hero user={user} />
      </div>

      {/* Scrolling Content */}
      <div className="relative z-10 bg-transparent pointer-events-none">

        {/* Transparent Spacer for Hero visibility */}
        <div className="hero-spacer h-screen w-full" />

        <div className="pointer-events-auto relative">
          <UserSelection user={user} />

          {/* What You Can Do Section - Modern Grid */}
          {/* What You Can Do Section - Modern Grid */}
          <section id="features" className="min-h-screen flex flex-col justify-center py-20 relative z-20 overflow-hidden bg-black">
            {/* Background Image */}
            <div className="absolute inset-0 z-0 select-none pointer-events-none">
              <img src="/imgs/bg-hacer.webp" alt="" className="w-full h-full object-cover opacity-100" />
              <div className="absolute inset-0" />
            </div>

            <div className="w-full max-w-[95%] mx-auto px-8 relative z-10 h-full flex flex-col justify-center">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-24 items-center">

                {/* Left Column - Title */}
                <div className="lg:col-span-4 flex flex-col justify-center">
                  <div>
                    <h2 className="font-cinema text-5xl md:text-7xl lg:text-8xl text-white leading-[0.85] tracking-tight mb-8">
                      QUÉ <br /> PUEDES <br /> <span className="text-cinema-yellow">HACER</span> <br /> AQUÍ
                    </h2>
                    <p className="text-zinc-400 text-lg md:text-xl max-w-sm font-light leading-relaxed">
                      Herramientas diseñadas para potenciar cada etapa de tu lanzamiento.
                    </p>
                  </div>
                </div>

                {/* Right Column - 3 Cards */}
                <div className="lg:col-span-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full min-h-[500px] lg:h-[65vh]">

                    {/* Card 1: Dark Gray */}
                    <div className="group relative rounded-[2rem] bg-zinc-900 border border-white/10 p-8 flex flex-col justify-end overflow-hidden hover:-translate-y-2 transition-transform duration-500">
                      <div className="absolute top-6 right-6 w-12 h-12 rounded-full border border-white/20 flex items-center justify-center bg-white/5 group-hover:bg-white/10 transition-colors">
                        <Crosshair className="w-6 h-6 text-white" />
                      </div>
                      <div className="space-y-4 mb-4">
                        <h3 className="font-cinema text-4xl lg:text-5xl text-white leading-none uppercase">
                          DEFINE <br /> AUDIENCIAS <br /> con criterio
                        </h3>
                        <p className="text-zinc-400 text-sm leading-relaxed">
                          Comparte con nosotros el ADN de tu película y te ayudamos a traducirlo en audiencias concretas en Instagram, TikTok, YouTube y otras plataformas.
                        </p>
                      </div>
                    </div>

                    {/* Card 2: White */}
                    <div className="group relative rounded-[2rem] bg-white text-black border border-white p-8 flex flex-col justify-end overflow-hidden hover:-translate-y-2 transition-transform duration-500">
                      <div className="absolute top-6 right-6 w-12 h-12 rounded-full border border-black/10 flex items-center justify-center bg-black/5 group-hover:bg-black/10 transition-colors">
                        <Film className="w-6 h-6 text-black" />
                      </div>
                      <div className="space-y-4 mb-4">
                        <h3 className="font-cinema text-4xl lg:text-5xl text-black leading-none uppercase">
                          DISEÑA <br /> la ESTRATEGIA <br /> de campaña
                        </h3>
                        <p className="text-zinc-600 text-sm leading-relaxed font-medium">
                          Pre-campaña, fin de semana de estreno y conversación posterior: marcamos juntos los momentos clave y la intensidad de la inversión.
                        </p>
                      </div>
                    </div>

                    {/* Card 3: Yellow */}
                    <div className="group relative rounded-[2rem] bg-cinema-yellow text-black border border-cinema-yellow p-8 flex flex-col justify-end overflow-hidden hover:-translate-y-2 transition-transform duration-500">
                      <div className="absolute top-6 right-6 w-12 h-12 rounded-full border border-black/10 flex items-center justify-center bg-black/5 group-hover:bg-black/10 transition-colors">
                        <BarChart3 className="w-6 h-6 text-black" />
                      </div>
                      <div className="space-y-4 mb-4">
                        <h3 className="font-cinema text-4xl lg:text-5xl text-black leading-none uppercase">
                          Lanza, MIDE Y <br /> guarda tu histórico
                        </h3>
                        <p className="text-zinc-800 text-sm leading-relaxed font-medium">
                          Cada campaña queda guardada en tu panel de distribuidora para que puedas revisar resultados, aprender de cada estreno y preparar el siguiente.
                        </p>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* How It Works - Process Stream */}
          <section id="process" className="min-h-screen flex flex-col justify-center py-20 bg-black border-t border-white/5 relative z-20 overflow-hidden">
            <div className="w-full max-w-[95%] mx-auto px-6">
              <div className="flex flex-col mb-20">
                <h2 className="font-cinema text-5xl md:text-8xl text-white tracking-tight leading-none mb-6">
                  CÓMO <span className="text-cinema-yellow">FUNCIONA</span>
                </h2>
                <p className="text-zinc-400 max-w-xl text-lg font-light">
                  Un flujo de trabajo lineal y optimizado.
                </p>
              </div>

              <div className="process-stepper relative">
                {/* Progress Track (Desktop) */}
                <div className="hidden md:block absolute top-10 left-0 w-full h-[2px] bg-white/10" />

                {/* Interactive Progress Line */}
                <div
                  className="hidden md:block absolute top-10 left-0 h-[2px] bg-gradient-to-r from-cinema-yellow to-cinema-yellow/50 shadow-[0_0_15px_rgba(235,179,39,0.5)] transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]"
                  style={{ width: activeStep === 1 ? "12%" : activeStep === 2 ? "37%" : activeStep === 3 ? "62%" : "88%" }}
                />

                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-4">

                  {/* Step 1 */}
                  <div className="step-item group flex md:block items-start gap-6 cursor-pointer" onMouseEnter={() => setActiveStep(1)}>
                    {/* Icon */}
                    <div className="relative mb-4 md:mb-8 md:pl-4 flex-shrink-0">
                      <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full bg-black border flex items-center justify-center relative z-10 transition-all duration-500 ${activeStep >= 1 ? 'border-cinema-yellow shadow-[0_0_20px_rgba(235,179,39,0.2)]' : 'border-white/20'}`}>
                        <Clapperboard className={`w-6 h-6 md:w-8 md:h-8 transition-colors duration-500 ${activeStep >= 1 ? 'text-cinema-yellow' : 'text-white'}`} />
                      </div>
                    </div>
                    {/* Content */}
                    <div className="md:pl-4 pt-2 md:pt-0">
                      <h3 className={`font-cinema text-2xl md:text-3xl mb-2 md:mb-3 transition-colors duration-500 ${activeStep >= 1 ? 'text-cinema-yellow' : 'text-white'}`}>Configura tu estreno</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed max-w-xs transition-colors duration-500 group-hover:text-white/80">
                        Rellena los datos de tu película, fechas clave y plataformas objetivo.
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="step-item group flex md:block items-start gap-6 cursor-pointer" onMouseEnter={() => setActiveStep(2)}>
                    <div className="relative mb-4 md:mb-8 md:pl-4 flex-shrink-0">
                      <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full bg-black border flex items-center justify-center relative z-10 transition-all duration-500 ${activeStep >= 2 ? 'border-cinema-yellow shadow-[0_0_20px_rgba(235,179,39,0.2)]' : 'border-white/20'}`}>
                        <Crosshair className={`w-6 h-6 md:w-8 md:h-8 transition-colors duration-500 ${activeStep >= 2 ? 'text-cinema-yellow' : 'text-white'}`} />
                      </div>
                    </div>
                    <div className="md:pl-4 pt-2 md:pt-0">
                      <h3 className={`font-cinema text-2xl md:text-3xl mb-2 md:mb-3 transition-colors duration-500 ${activeStep >= 2 ? 'text-cinema-yellow' : 'text-white'}`}>Ajustamos la estrategia</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed max-w-xs transition-colors duration-500 group-hover:text-white/80">
                        Revisamos audiencias, inversión y combinamos nuestra experiencia con tu conocimiento del título.
                      </p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="step-item group flex md:block items-start gap-6 cursor-pointer" onMouseEnter={() => setActiveStep(3)}>
                    <div className="relative mb-4 md:mb-8 md:pl-4 flex-shrink-0">
                      <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full bg-black border flex items-center justify-center relative z-10 transition-all duration-500 ${activeStep >= 3 ? 'border-cinema-yellow shadow-[0_0_20px_rgba(235,179,39,0.2)]' : 'border-white/20'}`}>
                        <Play className={`w-6 h-6 md:w-8 md:h-8 transition-colors duration-500 ${activeStep >= 3 ? 'text-cinema-yellow' : 'text-white'}`} />
                      </div>
                    </div>
                    <div className="md:pl-4 pt-2 md:pt-0">
                      <h3 className={`font-cinema text-2xl md:text-3xl mb-2 md:mb-3 transition-colors duration-500 ${activeStep >= 3 ? 'text-cinema-yellow' : 'text-white'}`}>Lanzamos la campaña</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed max-w-xs transition-colors duration-500 group-hover:text-white/80">
                        Ejecutamos la estrategia en las plataformas seleccionadas, optimizando durante el recorrido.
                      </p>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="step-item group flex md:block items-start gap-6 cursor-pointer" onMouseEnter={() => setActiveStep(4)}>
                    <div className="relative mb-4 md:mb-8 md:pl-4 flex-shrink-0">
                      <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full bg-black border flex items-center justify-center relative z-10 transition-all duration-500 ${activeStep >= 4 ? 'border-cinema-yellow shadow-[0_0_20px_rgba(235,179,39,0.2)]' : 'border-white/20'}`}>
                        <Trophy className={`w-6 h-6 md:w-8 md:h-8 transition-colors duration-500 ${activeStep >= 4 ? 'text-cinema-yellow' : 'text-white'}`} />
                      </div>
                    </div>
                    <div className="md:pl-4 pt-2 md:pt-0">
                      <h3 className={`font-cinema text-2xl md:text-3xl mb-2 md:mb-3 transition-colors duration-500 ${activeStep >= 4 ? 'text-cinema-yellow' : 'text-white'}`}>Medimos y archivamos</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed max-w-xs transition-colors duration-500 group-hover:text-white/80">
                        Te entregamos un informe final y el estreno queda guardado en tu panel para futuras decisiones.
                      </p>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </section>

          {/* Why Work With Us - Clean List */}
          <div id="final-block" className="min-h-screen relative z-20 bg-black flex flex-col justify-center">
            <section className="py-32 relative overflow-hidden border-t border-white/5">
              {/* Animated Background Text */}
              <div className="absolute top-1/2 left-0 w-full -translate-y-1/2 flex items-center opacity-5 pointer-events-none select-none z-0">
                <div className="infinite-marquee whitespace-nowrap flex">
                  <span className="font-cinema text-[45vw] leading-none text-white tracking-widest px-10">IMFILMS STUDIO</span>
                  <span className="font-cinema text-[45vw] leading-none text-white tracking-widest px-10">IMFILMS STUDIO</span>
                </div>
              </div>

              <div className="max-w-6xl mx-auto px-6 relative z-10">
                <div className="grid md:grid-cols-2 gap-16 items-center">
                  <div>
                    <h2 className="font-cinema text-5xl md:text-7xl text-white mb-8 leading-[0.9]">
                      POR QUÉ <br /> <span className="text-cinema-yellow">TRABAJAR</span> CON <br /> NOSOTROS
                    </h2>
                    <div className="h-1 w-24 bg-primary rounded-full mb-8" />
                  </div>

                  <div className="space-y-10">
                    <div className="flex gap-6 group">
                      <div className="w-12 h-12 flex-shrink-0 rounded-full bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-primary/50 transition-colors">
                        <CheckCircle2 className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-cinema text-3xl text-white mb-2">Especializados en cine</h3>
                        <p className="text-muted-foreground text-lg">
                          Entendemos el lenguaje del cine y sabemos cómo conectar cada película con su público.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-6 group">
                      <div className="w-12 h-12 flex-shrink-0 rounded-full bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-cinema-yellow/50 transition-colors">
                        <CheckCircle2 className="w-6 h-6 text-cinema-yellow" />
                      </div>
                      <div>
                        <h3 className="font-cinema text-3xl text-white mb-2">Data-driven con emoción</h3>
                        <p className="text-muted-foreground text-lg">
                          Combinamos análisis de datos con storytelling para campañas que conectan.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-6 group">
                      <div className="w-12 h-12 flex-shrink-0 rounded-full bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-primary/50 transition-colors">
                        <CheckCircle2 className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-cinema text-3xl text-white mb-2">Proceso medible</h3>
                        <p className="text-muted-foreground text-lg">
                          Nos integramos con tu equipo de PR para lograr resultados concretos en cada película.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Final CTA - Minimalist */}
            <section className="py-32 border-t border-white/10 bg-black relative overflow-hidden">
              {/* Background Image */}
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: "url('/imgs/bg-cta.webp')", opacity: 1.0 }}
              />

              <div className="container mx-auto px-4 text-center relative z-10">
                <h2 className="font-cinema text-5xl md:text-8xl text-white mb-8 tracking-tight leading-tight py-4">
                  ¿LISTO PARA TU <br /> <span className="text-cinema-yellow">PRÓXIMO ESTRENO?</span>
                </h2>
                <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
                  Únete a las distribuidoras que ya confían en imfilms para sus campañas digitales.
                </p>

                <div className="flex flex-col sm:flex-row gap-8 justify-center items-center">
                  <TicketButton text="PROBAR DEMO" onClick={() => navigate("/demo")} className="w-80" />
                  <TicketButton
                    text="EMPEZAR AHORA"
                    onClick={() => navigate("/wizard")}
                    variant="solid"
                    className="w-80 font-body"
                    style={{ fontFamily: "'Manrope', sans-serif" }}
                  />
                </div>
              </div>
            </section>
          </div>

          {/* Footer - Simple */}
          <footer className="py-12 px-6 border-t border-white/5 bg-black relative z-50">
            <div className="max-w-7xl mx-auto flex flex-col items-center gap-8">
              <div className="flex flex-col md:flex-row justify-between items-center w-full gap-6">
                <p className="text-xs text-muted-foreground/60 uppercase tracking-widest">
                  © {new Date().getFullYear()} Imfilms Campaign Studio
                </p>
                <p className="text-sm font-cinema text-white/40">
                  Tu película tiene su público. Nosotros lo llevamos a la sala.
                </p>
              </div>
              <div className="border-t border-white/5 pt-8 w-full flex justify-center">
                <p className="flex items-center gap-3 text-white/40 text-sm">
                  Somos parte de
                  <a href="https://www.immoral.es" target="_blank" rel="noopener noreferrer" className="inline-block hover:opacity-80 transition-opacity">
                    <img src="/imgs/logoImmoral.png" alt="Immoral" className="h-5 inline-block" />
                  </a>
                </p>
              </div>
            </div>
          </footer>
        </div> {/* End pointer-events-auto content wrapper */}

        <GlobalHelpButton />
      </div>
    </div>
  );
};

export default Landing;
