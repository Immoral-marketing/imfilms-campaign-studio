import { Card } from "@/components/ui/card";
import { CampaignCosts } from "@/hooks/useCampaignCalculator";
import UnlockBudgetGate from "./UnlockBudgetGate";

interface CostSummaryProps {
  costs: CampaignCosts;
  isFirstRelease: boolean;
  compact?: boolean;
  showPrices?: boolean;
}

const CostSummary = ({ costs, isFirstRelease, compact = false, showPrices = true }: CostSummaryProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (compact) {
    if (!showPrices) {
      return (
        <Card className="cinema-card p-6 space-y-3 bg-primary/5 border-primary/20">
          <div className="text-center leading-relaxed">
            <UnlockBudgetGate message="Crea tu cuenta de distribuidora para ver la estimación económica completa de esta configuración, sin compromiso." />
          </div>
        </Card>
      );
    }

    return (
      <Card className="cinema-card p-6 space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Inversión total prevista para tu campaña:</span>
          <span className="font-cinema text-3xl text-primary cinema-glow">
            {formatCurrency(costs.totalEstimated)}
          </span>
        </div>
      </Card>
    );
  }

  if (!showPrices) {
    return (
      <Card className="cinema-card p-8 space-y-4 bg-primary/5 border-primary/20">
        <h3 className="font-cinema text-3xl text-primary text-center">
          Presupuesto personalizado
        </h3>
        <div className="text-center leading-relaxed">
          <p className="text-cinema-ivory mb-4">
            Termina de configurar tu campaña.
          </p>
          <UnlockBudgetGate message="Crea tu cuenta de distribuidora para ver la estimación económica completa, sin compromiso." />
        </div>
        <p className="text-sm text-muted-foreground text-center italic">
          Tu presupuesto se calculará en base a las plataformas seleccionadas, inversión publicitaria y add-ons que elijas.
        </p>
      </Card>
    );
  }

  return (
    <Card className="cinema-card p-6 space-y-6">
      <h3 className="font-cinema text-3xl text-primary border-b border-border pb-3">
        Resumen económico
      </h3>

      <div className="space-y-3">
        <div className="flex justify-between items-center py-2 border-b border-border/50">
          <span className="text-cinema-ivory">Inversión en medios:</span>
          <span className="font-semibold text-cinema-yellow">{formatCurrency(costs.adInvestment)}</span>
        </div>

        <div className="flex justify-between items-center py-2 border-b border-border/50">
          <span className="text-cinema-ivory">Fee fijo por plataformas:</span>
          <span className="font-semibold text-cinema-yellow">{formatCurrency(costs.fixedFeePlatforms)}</span>
        </div>

        <div className="flex justify-between items-center py-2 border-b border-border/50">
          <span className="text-cinema-ivory">
            Fee variable ({costs.adInvestment >= 100000 ? '6%' : '10%'} sobre inversión):
          </span>
          <span className="font-semibold text-cinema-yellow">{formatCurrency(costs.variableFeeInvestment)}</span>
        </div>

        {costs.setupFee > 0 && (
          <div className="flex justify-between items-center py-2 border-b border-border/50">
            <span className="text-cinema-ivory">Fee de setup (primer estreno):</span>
            <span className="font-semibold text-cinema-yellow">{formatCurrency(costs.setupFee)}</span>
          </div>
        )}

        {costs.addonsBaseCost > 0 && (
          <div className="flex justify-between items-center py-2 border-b border-border/50">
            <span className="text-cinema-ivory">Add-ons:</span>
            <span className="font-semibold text-cinema-yellow">{formatCurrency(costs.addonsBaseCost)}</span>
          </div>
        )}
      </div>

      <div className="pt-4 border-t-2 border-primary">
        <div className="flex justify-between items-center">
          <span className="font-cinema text-2xl text-cinema-ivory">Inversión total prevista para tu campaña:</span>
          <span className="font-cinema text-4xl text-primary cinema-glow">
            {formatCurrency(costs.totalEstimated)}
          </span>
        </div>
      </div>

      <div className="pt-4 space-y-2">
        {isFirstRelease && (
          <p className="text-xs text-primary bg-primary/10 p-3 rounded border border-primary/30">
            ℹ️ Al ser tu primer estreno con nosotros, aplicamos un fee de setup de 150€ por plataforma seleccionada.
          </p>
        )}
        
        <p className="text-xs text-muted-foreground italic">
          Los fees e inversión son una estimación inicial que ajustaremos tras revisar tu campaña. Los add-ons tienen precio fijo. Todo se validará contigo antes de la activación.
        </p>
      </div>
    </Card>
  );
};

export default CostSummary;
