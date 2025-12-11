import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

interface PlatformCardProps {
  name: string;
  description: string;
  logo: string;
  selected: boolean;
  onToggle: () => void;
}

const PlatformCard = ({ name, description, logo, selected, onToggle }: PlatformCardProps) => {
  return (
    <button
      onClick={onToggle}
      className={`cinema-card p-6 text-left space-y-4 w-full ${
        selected ? "border-primary bg-primary/5" : ""
      }`}
    >
      <div className="flex items-start justify-between">
        <img src={logo} alt={`${name} logo`} className="w-12 h-12 object-contain" />
        <Checkbox checked={selected} onCheckedChange={onToggle} className="border-primary data-[state=checked]:bg-primary" />
      </div>
      <div className="space-y-2">
        <h3 className="font-cinema text-2xl text-primary">{name}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </button>
  );
};

export default PlatformCard;
