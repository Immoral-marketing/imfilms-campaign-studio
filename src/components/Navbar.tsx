import { useNavigate } from "react-router-dom";
import logoImfilms from "@/assets/logo-imfilms.png";
import { TicketButton } from "./TicketButton";
import { Button } from "./ui/button";
import { useEffect, useState } from "react";
import gsap from "gsap";

export const Navbar = () => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);



  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-6 py-4 flex items-center justify-between ${scrolled ? "bg-black/80 backdrop-blur-md border-b border-white/10" : "bg-transparent"
        }`}
    >
      <div className="flex items-center">
        <img
          src={logoImfilms}
          alt="Imfilms"
          className="h-10 md:h-12 w-auto object-contain cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => navigate("/")}
        />
      </div>

      <div className="flex items-center gap-4">
        <TicketButton
          text="PROBAR DEMO"
          onClick={() => navigate("/demo")}
          className="hidden md:flex scale-75 origin-right"
        />
        <Button
          onClick={() => navigate("/wizard")}
          className="bg-primary hover:bg-primary/90 text-black font-body font-bold text-base px-6 py-2 h-auto rounded-sm tracking-normal transition-transform hover:scale-105"
        >
          EMPEZAR AHORA
        </Button>
      </div>
    </nav>
  );
};
