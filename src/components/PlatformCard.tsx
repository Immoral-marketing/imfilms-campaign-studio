import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

interface PlatformCardProps {
  name: string;
  description: string;
  logo: string;
  selected: boolean;
  onToggle: () => void;
  setupFee?: number;
  isBonificado?: boolean;
  hidePrice?: boolean;
  hideDescription?: boolean;
}

const PlatformCard = ({
  name,
  description,
  logo,
  selected,
  onToggle,
  setupFee,
  isBonificado,
  hidePrice = false,
  hideDescription = false
}: PlatformCardProps) => {
  return (
    <button
      onClick={onToggle}
      className={`cinema-card p-6 text-left space-y-4 w-full relative group transition-all duration-300 ${selected ? "border-primary bg-primary/5 shadow-lg" : "hover:border-primary/50"
        }`}
    >
      <div className="flex items-start justify-between">
        <img src={logo} alt={`${name} logo`} className="w-12 h-12 object-contain" />
        <Checkbox checked={selected} onCheckedChange={onToggle} className="border-primary data-[state=checked]:bg-primary" />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-cinema text-2xl text-primary">{name}</h3>

        </div>
        {!hideDescription && <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>}
      </div>
    </button>
  );
};

export default PlatformCard;
