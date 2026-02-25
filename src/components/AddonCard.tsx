import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ReactNode } from "react";
import UnlockBudgetGate from "./UnlockBudgetGate";

interface AddonCardProps {
  title: string;
  description: string;
  price: string;
  icon: ReactNode;
  selected: boolean;
  onToggle: () => void;
  disclaimer?: string;
  showPrice?: boolean;
  priceHiddenMessage?: string;
}

const AddonCard = ({
  title,
  description,
  price,
  icon,
  selected,
  onToggle,
  disclaimer,
  showPrice = true,
  priceHiddenMessage = "El importe se incluirá en tu presupuesto personalizado al crear tu cuenta.",
}: AddonCardProps) => {
  return (
    <button
      onClick={onToggle}
      className={`cinema-card p-6 text-left space-y-4 w-full ${selected ? "border-primary bg-primary/5" : ""
        }`}
    >
      <div className="flex items-start justify-between">
        <div>{icon}</div>
        <Checkbox checked={selected} onCheckedChange={onToggle} className="border-primary data-[state=checked]:bg-primary" />
      </div>
      <div className="space-y-2">
        <h3 className="font-cinema text-2xl text-primary">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
        {showPrice ? (
          <p className="text-lg font-semibold text-cinema-yellow">Desde: {price}</p>
        ) : (
          <div className="text-xs text-muted-foreground/80">
            <UnlockBudgetGate message={priceHiddenMessage} />
          </div>
        )}
      </div>
    </button>
  );
};

export default AddonCard;
