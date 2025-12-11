import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import logoImfilms from "@/assets/logo-imfilms.png";
import heroBg from "@/assets/hero-bg.jpg";
import { Clapperboard, Film } from "lucide-react";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { TicketButton } from "./TicketButton";

gsap.registerPlugin(ScrollTrigger);

export const Hero = ({ user }: { user: any }) => {
  const navigate = useNavigate();
  const heroRef = useRef<HTMLDivElement>(null);
  
  // Refs for animations
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const titleLine1Ref = useRef<HTMLHeadingElement>(null);
  const titleLine2Ref = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const imageBgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      // Mouse movement effect for Grid AND Image Tilt
      const handleMouseMove = (e: MouseEvent) => {
        const { clientX, clientY } = e;
        const { innerWidth, innerHeight } = window;
        
        const x = (clientX - innerWidth / 2) / innerWidth;
        const y = (clientY - innerHeight / 2) / innerHeight;

        if (gridRef.current) {
             gsap.to(gridRef.current, {
                rotationX: 20 + y * 10, 
                rotationY: x * 10,
                duration: 1,
                ease: "power2.out"
            });
        }

        if (imageBgRef.current) {
             gsap.to(imageBgRef.current, {
                rotationX: y * 5, 
                rotationY: -x * 5,
                x: -x * 20, 
                y: -y * 20,
                duration: 1.2,
                ease: "power2.out"
            });
        }
      };

      window.addEventListener("mousemove", handleMouseMove);

      // --- HERO REVEAL SEQUENCE ---
      
      // 1. Split Screen Animation: Reveal Left Panel
      const mm = gsap.matchMedia();
      
      // Desktop: 48% split
      mm.add("(min-width: 768px)", () => {
          tl.to(leftPanelRef.current, {
              width: "48vw", // Reduced width
              duration: 0.8,
              ease: "expo.inOut",
              delay: 0.1
          });
      });
      
      // Mobile: Full width
      mm.add("(max-width: 767px)", () => {
          tl.to(leftPanelRef.current, {
               width: "100%", 
               height: "100%",
               duration: 0.8,
               ease: "expo.inOut",
               delay: 0
          });
      });


      // 2. Kinetic Title Reveal (Clean Line Slide)
      tl.from([titleLine1Ref.current, titleLine2Ref.current], {
          yPercent: 100,
          stagger: 0.15,
          duration: 1,
          ease: "power4.out"
      }, "-=0.3");

      // 3. Subtitle & Body
      tl.from([subtitleRef.current, textRef.current], {
        x: -50,
        opacity: 0,
        stagger: 0.2,
        duration: 0.8,
      }, "-=0.5");




      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
      };

    }, heroRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={heroRef} className="relative h-screen w-full overflow-hidden bg-black">
        
        {/* LAYER 0: Full Screen Background Image (Right side visible) */}
        <div className="absolute inset-0 z-0 pointer-events-none perspective-[1000px]">
            <div 
                ref={imageBgRef}
                className="absolute inset-0 bg-cover bg-center origin-center transition-transform duration-100 ease-out"
                style={{ backgroundImage: `url(${heroBg})`, transform: "scale(1.1)" }}
            />
            <div className="absolute inset-0 bg-black/30" /> {/* Slight dim */}
        </div>

        {/* LAYER 1: Left Split Panel (Mask) */}
        <div 
            ref={leftPanelRef}
            className="absolute top-0 left-0 bottom-0 z-[40] bg-black overflow-hidden border-r-4 border-primary w-0" 
        >
             {/* Kinetic Grid INSIDE Left Panel - COMMENTED TO FIX HOVER ISSUES */}
             {/* Kinetic Grid INSIDE Left Panel (Light lines for black bg) */}
             <div className="absolute inset-0 flex items-center justify-center perspective-[1000px] overflow-hidden opacity-30 pointer-events-none">
                 <div 
                    ref={gridRef}
                    className="absolute w-[150vw] h-[150vh] origin-center opacity-40"
                    style={{
                        backgroundImage: `
                            linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)
                        `,
                        backgroundSize: "40px 40px",
                        transform: "rotateX(20deg) scale(1.5)",
                    }}
                />
            </div>

            {/* Content Container (Left Aligned) */}
             <div ref={contentRef} className="absolute inset-0 flex flex-col justify-center px-8 md:px-16 lg:px-24">
                  <div className="flex flex-col items-start space-y-0">
                    <div className="overflow-hidden leading-none">
                        <h1 ref={titleLine1Ref} className="font-cinema text-6xl md:text-8xl lg:text-8xl leading-[0.8] text-white tracking-tighter uppercase inline-block text-left">
                            TU HISTORIA
                        </h1>
                    </div>
                    <div className="overflow-hidden leading-none -mt-3 md:-mt-5 lg:-mt-10">
                         <h1 ref={titleLine2Ref} className="font-cinema text-6xl md:text-8xl lg:text-8xl leading-[0.8] text-white tracking-tighter uppercase inline-block text-left">
                            YA TIENE PÚBLICO.
                        </h1>
                    </div>
                  </div>
                  
                  <div className="space-y-8 -mt-2 max-w-2xl">
                     <p ref={subtitleRef} className="font-cinema text-4xl md:text-8xl text-yellow-500 leading-[0.8] text-left">
                        Llévalo a la sala
                    </p>

                    <p ref={textRef} className="font-body text-zinc-400 text-lg md:text-2xl leading-relaxed text-left max-w-xl lg:max-w-2xl font-medium">
                        Define audiencias, elige plataformas y configura campañas digitales para tus estrenos de cine con precisión quirúrgica.
                    </p>

                    <div ref={ctaRef} className="flex justify-start pt-6 relative z-[50] pointer-events-auto isolate">
                        <TicketButton 
                           text="PROBAR DEMO"
                           onClick={() => navigate("/wizard")}
                           variant="solid" 
                           className="origin-left hover:scale-105 transition-transform" 
                        />
                    </div>
                  </div>
             </div>
        </div>
    </div>
  );
};
