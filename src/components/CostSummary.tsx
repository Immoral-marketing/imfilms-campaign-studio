import { Card } from "@/components/ui/card";
import { CampaignCosts, FeeMode } from "@/hooks/useCampaignCalculator";
import UnlockBudgetGate from "./UnlockBudgetGate";
import { Info } from "lucide-react";

interface CostSummaryProps {
  costs: CampaignCosts;
  isFirstRelease: boolean;
  compact?: boolean;
  showPrices?: boolean;
  feeMode?: FeeMode;
}

const CostSummary = ({ costs, isFirstRelease, compact = false, showPrices = true, feeMode = 'additional' }: CostSummaryProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const variableFeePercentage = costs.variableFeeRate
    ? `${(costs.variableFeeRate * 100).toLocaleString('es-ES')}%`
    : (costs.effectiveAdInvestment >= 100000 ? '6%' : '10%'); // Fallback if rate missing

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
        {/* Simple Banner for Step 3 - No detailed breakdown */}
        <div className="flex justify-between items-center bg-muted/20 p-4 rounded-lg border border-border/50">
          <span className="text-muted-foreground font-medium">
            Inversión total prevista para tu campaña:
          </span>
          <span className="font-cinema text-4xl text-cinema-yellow cinema-glow">
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
        {/* Budget/Investment input */}
        <div className="flex justify-between items-center py-2 border-b border-border/50">
          <span className="text-cinema-ivory">
            {feeMode === 'integrated' ? 'Presupuesto total indicado:' : 'Inversión en medios:'}
          </span>
          <span className="font-semibold text-cinema-yellow">{formatCurrency(costs.adInvestment)}</span>
        </div>

        {/* Fees section with highlight */}
        <div className="bg-muted/30 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-primary">Desglose de fees</span>
          </div>

          <div className="flex justify-between items-center py-1">
            <span className="text-cinema-ivory text-sm">Fee fijo de gestión:</span>
            <span className="font-semibold text-cinema-yellow">{formatCurrency(costs.fixedFeePlatforms)}</span>
          </div>

          <div className="flex justify-between items-center py-1">
            <span className="text-cinema-ivory text-sm">
              Fee variable ({variableFeePercentage} sobre inversión):
            </span>
            <span className="font-semibold text-cinema-yellow">{formatCurrency(costs.variableFeeInvestment)}</span>
          </div>

          {costs.setupFee > 0 && (
            <div className="flex justify-between items-center py-1">
              <span className="text-cinema-ivory text-sm">Fee setup (plataformas adicionales):</span>
              <span className="font-semibold text-cinema-yellow">{formatCurrency(costs.setupFee)}</span>
            </div>
          )}

          <div className="flex justify-between items-center py-2 border-t border-border/50 mt-2">
            <span className="text-cinema-ivory font-medium">Total fees:</span>
            <span className="font-bold text-primary">{formatCurrency(costs.totalFees)}</span>
          </div>
        </div>

        {/* Effective investment (only in integrated mode) */}
        {feeMode === 'integrated' && (
          <div className="flex justify-between items-center py-2 border-b border-border/50 bg-primary/5 px-3 rounded">
            <span className="text-cinema-ivory font-medium">Inversión real en medios:</span>
            <span className="font-bold text-lg text-cinema-yellow">{formatCurrency(costs.effectiveAdInvestment)}</span>
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
          <span className="font-cinema text-2xl text-cinema-ivory">
            {feeMode === 'integrated' ? 'Inversión total:' : 'Inversión total prevista:'}
          </span>
          <span className="font-cinema text-4xl text-primary cinema-glow">
            {formatCurrency(costs.totalEstimated)}
          </span>
        </div>
      </div>

      <div className="pt-4 space-y-2">
        {costs.setupFee > 0 && (
          <p className="text-xs text-primary bg-primary/10 p-3 rounded border border-primary/30">
            ℹ️ Aplicamos un fee de setup de 200€ por cada plataforma adicional seleccionada (el primer canal es bonificado).
          </p>
        )}

        {feeMode === 'integrated' && (
          <p className="text-xs text-secondary bg-secondary/10 p-3 rounded border border-secondary/30">
            💡 Has elegido integrar los fees dentro de tu presupuesto. La inversión real en medios después de descontar los fees es de {formatCurrency(costs.effectiveAdInvestment)}.
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

