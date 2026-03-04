import { useMemo } from "react";
import { useFeeThresholds, FeeThreshold } from "./useFeeThresholds";

export type FeeMode = 'additional' | 'integrated';

export interface CampaignCosts {
  adInvestment: number;
  effectiveAdInvestment: number;
  fixedFeePlatforms: number;
  variableFeeInvestment: number;
  setupFee: number;
  totalFees: number;
  addonsBaseCost: number;
  totalEstimated: number;
  feeMode: FeeMode;
  variableFeeRate?: number;
  isLoading?: boolean;
}

export interface CampaignConfig {
  platforms: string[];
  adInvestment: number;
  isFirstRelease: boolean;
  feeMode: FeeMode;
  selectedAddons: {
    adaptacion: boolean;
    microsite: boolean;
    emailWhatsapp: boolean;
  };
}

const ADDON_PRICES = {
  adaptacion: 290,
  microsite: 490,
  emailWhatsapp: 390,
};

// Default fallbacks (current rules)
const DEFAULT_THRESHOLDS: FeeThreshold[] = [
  { id: '1', min_investment: 0, max_investment: 3000, variable_fee_rate: 0, fixed_fee_amount: 500, setup_fee_per_platform: 200, is_variable_fee_enabled: false, is_fixed_fee_enabled: true, is_setup_fee_enabled: true },
  { id: '2', min_investment: 3001, max_investment: 8000, variable_fee_rate: 0.20, fixed_fee_amount: 0, setup_fee_per_platform: 200, is_variable_fee_enabled: true, is_fixed_fee_enabled: false, is_setup_fee_enabled: true },
  { id: '3', min_investment: 8001, max_investment: 15000, variable_fee_rate: 0.15, fixed_fee_amount: 0, setup_fee_per_platform: 200, is_variable_fee_enabled: true, is_fixed_fee_enabled: false, is_setup_fee_enabled: true },
  { id: '4', min_investment: 15001, max_investment: 30000, variable_fee_rate: 0.12, fixed_fee_amount: 0, setup_fee_per_platform: 200, is_variable_fee_enabled: true, is_fixed_fee_enabled: false, is_setup_fee_enabled: true },
  { id: '5', min_investment: 30001, max_investment: null, variable_fee_rate: 0.08, fixed_fee_amount: 0, setup_fee_per_platform: 200, is_variable_fee_enabled: true, is_fixed_fee_enabled: false, is_setup_fee_enabled: true },
];

export const MIN_INVESTMENT = 1000;

const getThresholdForInvestment = (investment: number, thresholds: FeeThreshold[]): FeeThreshold => {
  return thresholds.find(t =>
    investment >= t.min_investment && (t.max_investment === null || investment <= t.max_investment)
  ) || thresholds[thresholds.length - 1]; // Fallback to last tier
};

const getApplicableFees = (investment: number, numPlatforms: number, thresholds: FeeThreshold[]) => {
  const threshold = getThresholdForInvestment(investment, thresholds);

  const setupFee = threshold.is_setup_fee_enabled ? numPlatforms * threshold.setup_fee_per_platform : 0;
  const fixedFee = threshold.is_fixed_fee_enabled ? threshold.fixed_fee_amount : 0;
  const variableRate = threshold.is_variable_fee_enabled ? threshold.variable_fee_rate : 0;

  return { fixedFee, setupFee, variableRate };
};

const calculateEffectiveInvestmentFromBudget = (
  totalBudget: number,
  numPlatforms: number,
  thresholds: FeeThreshold[]
): number => {
  // We need to iterate through thresholds to find which one fits when reverse-calculating
  // We'll try from highest to lowest to avoid overlap issues
  const sortedThresholds = [...thresholds].sort((a, b) => (b.min_investment - a.min_investment));

  for (const t of sortedThresholds) {
    const setupFee = t.is_setup_fee_enabled ? numPlatforms * t.setup_fee_per_platform : 0;
    const fixedFee = t.is_fixed_fee_enabled ? t.fixed_fee_amount : 0;
    const variableRate = t.is_variable_fee_enabled ? t.variable_fee_rate : 0;

    const effectiveAdInvestment = (totalBudget - setupFee - fixedFee) / (1 + variableRate);

    // Check if the resulting investment falls within this threshold's range
    if (effectiveAdInvestment >= t.min_investment && (t.max_investment === null || effectiveAdInvestment <= t.max_investment)) {
      return Math.max(0, effectiveAdInvestment);
    }
  }

  // Final fallback (safety)
  return Math.max(0, totalBudget - 500 - (numPlatforms * 200));
};

export const useCampaignCalculator = (config: CampaignConfig): CampaignCosts & { variableFeeRate: number } => {
  const { adInvestment, isFirstRelease, selectedAddons, platforms, feeMode } = config;
  const { data: dbThresholds, isLoading } = useFeeThresholds();

  const thresholds = useMemo(() => {
    return (dbThresholds && dbThresholds.length > 0) ? dbThresholds : DEFAULT_THRESHOLDS;
  }, [dbThresholds]);

  return useMemo(() => {
    const numPlatforms = platforms.length;
    const inputAmount = adInvestment;

    let addonsBaseCost = 0;
    if (selectedAddons.adaptacion) addonsBaseCost += ADDON_PRICES.adaptacion;
    if (selectedAddons.microsite) addonsBaseCost += ADDON_PRICES.microsite;
    if (selectedAddons.emailWhatsapp) addonsBaseCost += ADDON_PRICES.emailWhatsapp;

    let effectiveAdInvestment: number;
    let fixedFeePlatforms: number;
    let variableFeeInvestment: number;
    let setupFee: number;
    let totalFees: number;
    let totalEstimated: number;
    let variableFeeRate: number;

    if (feeMode === 'integrated') {
      effectiveAdInvestment = calculateEffectiveInvestmentFromBudget(
        inputAmount,
        numPlatforms,
        thresholds
      );

      const fees = getApplicableFees(effectiveAdInvestment, numPlatforms, thresholds);
      fixedFeePlatforms = fees.fixedFee;
      setupFee = fees.setupFee;
      variableFeeRate = fees.variableRate;
      variableFeeInvestment = effectiveAdInvestment * variableFeeRate;

      totalFees = fixedFeePlatforms + setupFee + variableFeeInvestment;
      totalEstimated = inputAmount + addonsBaseCost;

    } else {
      effectiveAdInvestment = inputAmount;

      const fees = getApplicableFees(effectiveAdInvestment, numPlatforms, thresholds);
      fixedFeePlatforms = fees.fixedFee;
      setupFee = fees.setupFee;
      variableFeeRate = fees.variableRate;
      variableFeeInvestment = effectiveAdInvestment * variableFeeRate;

      totalFees = fixedFeePlatforms + setupFee + variableFeeInvestment;
      totalEstimated = inputAmount + totalFees + addonsBaseCost;
    }

    return {
      adInvestment: inputAmount,
      effectiveAdInvestment,
      fixedFeePlatforms,
      variableFeeInvestment,
      setupFee,
      totalFees,
      addonsBaseCost,
      totalEstimated,
      feeMode,
      variableFeeRate,
      isLoading,
    };
  }, [
    adInvestment,
    isFirstRelease,
    selectedAddons.adaptacion,
    selectedAddons.microsite,
    selectedAddons.emailWhatsapp,
    platforms.length,
    feeMode,
    thresholds,
    isLoading
  ]);
};

export const validateInvestment = (
  amount: number,
  feeMode: FeeMode = 'additional',
  effectiveAdInvestment?: number
): { valid: boolean; error?: string } => {
  // Comparison is now always against the user-entered amount to allow 1000€ total budget
  const investmentToCheck = amount;

  if (investmentToCheck < MIN_INVESTMENT) {
    if (feeMode === 'integrated' && effectiveAdInvestment !== undefined) {
      return {
        valid: false,
        error: `Con los fees integrados, la inversión efectiva en medios sería de ${Math.round(effectiveAdInvestment).toLocaleString("es-ES")}€. El mínimo requerido es de ${MIN_INVESTMENT.toLocaleString("es-ES")}€. Aumenta el presupuesto o cambia a fees adicionales.`,
      };
    }
    return {
      valid: false,
      error: `El mínimo de inversión publicitaria para lanzar una campaña con imfilms es de ${MIN_INVESTMENT.toLocaleString("es-ES")}€. Ajusta la cifra para continuar.`,
    };
  }
  return { valid: true };
};
