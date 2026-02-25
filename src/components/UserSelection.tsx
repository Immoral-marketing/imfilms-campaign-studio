import { Button } from "@/components/ui/button";
import { Clapperboard, Film } from "lucide-react";
import { useNavigate } from "react-router-dom";

// Helper component for the SVG Card shape
const NotchedCard = ({ children, onClick, icon: Icon, label, title, description, buttonText, variant = "primary" }: any) => {
  return (
    <div
      onClick={onClick}
      className="group relative w-full max-w-[400px] cursor-pointer transition-transform duration-500"
      style={{ aspectRatio: '848/899' }}
    >
      {/* SVG Background & Border */}
      <svg className="absolute inset-0 w-full h-full drop-shadow-2xl" viewBox="0 0 848 899.11">
        <defs>
          <linearGradient id="cardGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(24, 24, 27, 0.95)" />
            <stop offset="100%" stopColor="rgba(24, 24, 27, 0.8)" />
          </linearGradient>
        </defs>
        {/* Custom User SVG Path - STRICTLY PRESERVED */}
        <path
          d="M848,255.33v581.78c0,34.24-27.76,62-62,62H62c-34.24,0-62-27.76-62-62V62C0,27.76,27.76,0,62,0h536.66c32.4,0,58.67,26.27,58.67,58.67v58.89c0,40.62,32.93,73.55,73.55,73.55h52.9c35.47,0,64.22,28.75,64.22,64.22Z"
          fill="rgba(10, 10, 10, 1)"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="1.5"
          className={`transition-all duration-500 group-hover:stroke-cinema-yellow`}
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* Notch Icon Container */}
      <div className="absolute top-0 right-[-20px] w-[30%] h-[18%] flex items-center justify-center z-20">
        <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-transparent border border-white/20 flex items-center justify-center group-hover:bg-cinema-yellow group-hover:border-cinema-yellow transition-all duration-500 shadow-xl">
          <Icon className="w-8 h-8 md:w-10 md:h-10 text-white group-hover:text-black transition-colors" />
        </div>
      </div>

      {/* Content Container */}
      <div className="absolute inset-0 p-6 md:p-8 flex flex-col justify-end z-10 pb-5 md:pb-6">

        <div className="mb-auto mt-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100 pl-2">
          {/* Optional top content */}
        </div>

        <div className="space-y-4">
          <div className="inline-block px-4 py-1.5 rounded-full border border-cinema-yellow bg-cinema-yellow/10 text-cinema-yellow text-[10px] uppercase tracking-widest font-bold group-hover:bg-cinema-yellow group-hover:text-black transition-all duration-300">
            {label}
          </div>

          <h3 className="font-cinema text-4xl md:text-5xl text-white leading-[0.85] uppercase">
            {title}
          </h3>

          <div className="w-full h-px bg-white/10 group-hover:bg-cinema-yellow/30 transition-colors" />

          <p className="text-zinc-400 text-sm md:text-base leading-relaxed font-light line-clamp-3">
            {description}
          </p>

          <Button
            variant="ghost"
            className="w-full border border-white/20 text-white bg-transparent text-base md:text-lg py-5 md:py-6 rounded-full font-cinema tracking-wide mt-2 transition-all duration-300 uppercase hover:bg-cinema-yellow hover:text-black hover:border-cinema-yellow"
          >
            {buttonText}
          </Button>
        </div>
      </div>
    </div>
  );
};


export const UserSelection = ({ user }: { user: any }) => {
  const navigate = useNavigate();

  return (
    <section id="user-selection" className="min-h-screen bg-black relative z-10 flex flex-col justify-center snap-start snap-always py-10">
      <div className="container px-4 mx-auto relative cursor-default">

        {/* Intro Text */}
        <div className="max-w-4xl mx-auto text-center mb-10 sm:mb-14 lg:mb-24">
          <p className="text-xl md:text-2xl text-zinc-300 font-light leading-relaxed">
            Configura tu campaña en unos minutos, recibe nuestra propuesta afinada y guarda el histórico de todos tus estrenos en un panel propio de distribuidora.
          </p>
        </div>

        <div className="flex flex-col md:flex-row justify-center gap-10 items-center px-4">
          <NotchedCard
            label="Nuevo Estreno"
            title={<>¿ES TU PRIMER <br /> ESTRENO?</>}
            description="Te guiaremos en la elección de audiencias, plataformas y momentos clave para que tu estreno tenga la visibilidad que merece."
            buttonText="CONFIGURAR mi primera CAMPAÑA"
            icon={Clapperboard}
            onClick={() => navigate("/quick-wizard")}
          />

          <NotchedCard
            label={user ? "Tu Espacio" : "Acceso Clientes"}
            title={<>PANEL DE <br /> DISTRIBUIDORA</>}
            description="Revisa el histórico de campañas, consulta estados y prepara tu próximo estreno con todo el aprendizaje acumulado."
            buttonText={user ? "IR AL PANEL" : "ACCEDER a mi panel de estrenos"}
            icon={Film}
            onClick={() => navigate(user ? "/campaigns" : "/campaigns")}
          />
        </div>

        <div className="mt-16 max-w-3xl mx-auto text-center px-4">
          <p className="text-cinema-yellow text-base md:text-lg font-light leading-relaxed opacity-90">
            Las distribuidoras registradas tienen un panel donde pueden ver todas las campañas trabajadas con imfilms: fechas, inversión, plataformas, estados y resultados.
          </p>
        </div>
      </div>
    </section>
  );
};
