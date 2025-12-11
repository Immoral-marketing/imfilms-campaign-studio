import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

interface TicketButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  text?: string;
  variant?: "default" | "solid";
}

export const TicketButton = ({ className, text = "EXPLORE", onClick, variant = "default", ...props }: TicketButtonProps) => {
  const isSolid = variant === "solid";

  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex items-center justify-center p-0 bg-transparent border-none outline-none focus:outline-none focus:ring-0 active:scale-95 transition-transform duration-200",
        className
      )}
      {...props}
    >
        {/* Left Ticket Stub */}
        <div 
            className={cn(
                "relative h-14 pl-8 pr-6 flex-1 w-full flex items-center justify-center border-2 border-r-0 rounded-l-xl transition-transform duration-300 group-hover:-translate-x-1",
                isSolid 
                    ? "bg-primary border-primary text-black" 
                    : "bg-black/40 backdrop-blur-sm border-white text-white"
            )}
            style={{
                maskImage: "radial-gradient(circle at 100% 0, transparent 6px, black 6.5px), radial-gradient(circle at 100% 100%, transparent 6px, black 6.5px)",
                WebkitMaskImage: "radial-gradient(circle at 100% 0, transparent 6px, black 6.5px), radial-gradient(circle at 100% 100%, transparent 6px, black 6.5px)",
                maskComposite: "intersect",
                WebkitMaskComposite: "destination-in",
            }}
        >
            <span className={cn("font-body font-bold text-lg tracking-widest uppercase", isSolid ? "text-black" : "text-white")}>
                {text}
            </span>
            {!isSolid && <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />}
            {isSolid && <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />}
        </div>

        {/* The Perforation Line */}
        <div className="relative z-10 w-0 h-10 flex flex-col items-center justify-center -mx-[1px]">
             <div className={cn("h-full border-l-2 border-dashed", isSolid ? "border-black/20" : "border-white/50")} />
        </div>

        {/* Right Ticket Part */}
        <div 
            className={cn(
                "relative h-14 pl-5 pr-6 flex items-center justify-center border-2 border-l-0 rounded-r-xl transition-all duration-300 group-hover:translate-x-2 group-hover:rotate-3 origin-left",
                isSolid 
                     ? "bg-primary border-primary" 
                     : "bg-black/40 backdrop-blur-sm border-white"
            )}
             style={{
                maskImage: "radial-gradient(circle at 0 0, transparent 6px, black 6.5px), radial-gradient(circle at 0 100%, transparent 6px, black 6.5px)",
                WebkitMaskImage: "radial-gradient(circle at 0 0, transparent 6px, black 6.5px), radial-gradient(circle at 0 100%, transparent 6px, black 6.5px)",
                maskComposite: "intersect",
                WebkitMaskComposite: "destination-in",
            }}
        >
            <ArrowRight className={cn("w-6 h-6 transition-colors duration-300", isSolid ? "text-black" : "text-white group-hover:text-primary")} />
            {!isSolid && <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />}
            {isSolid && <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />}
        </div>
    </button>
  );
};
