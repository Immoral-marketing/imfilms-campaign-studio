import { useMemo } from "react";

export type FeeMode = 'additional' | 'integrated';

export interface CampaignCosts {
  adInvestment: number;
  effectiveAdInvestment: number; // Real ad spend after fee deduction (in integrated mode)
  fixedFeePlatforms: number;
  variableFeeInvestment: number;
  setupFee: number;
  totalFees: number; // Sum of all fees (fixed + variable + setup)
  addonsBaseCost: number;
  totalEstimated: number;
  feeMode: FeeMode;
  variableFeeRate?: number; // Optional for backward compatibility if needed, but we always return it now
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

const PLATFORM_SETUP_FEE = 200; // Updated to 200
const FIXED_FEE = 500;          // Updated to 500
export const MIN_INVESTMENT = 1000; // Updated to 1000

// Variable fee percentage based on investment tier
const getVariableFeeRate = (investment: number): number => {
  if (investment >= 100000) {
    return 0.06; // 6% for 100k+
  }
  if (investment >= 50000) {
    return 0.08; // 8% for 50k - 100k
  }
  if (investment >= 35000) {
    return 0.09; // 9% for 35k - 50k
  }
  return 0.10; // 10% for < 35k
};

// Calculate variable fee based on investment
const calculateVariableFee = (investment: number): number => {
  return investment * getVariableFeeRate(investment);
};

// Determine applied fees based on investment tiers
const getApplicableFees = (investment: number, numPlatforms: number) => {
  let fixedFee = 0;
  let setupFee = 0;

  if (investment < 11000) {
    // Tier 1 (1k - 10999): Fixed + Setup + Variable
    if (numPlatforms > 0) fixedFee = FIXED_FEE;
    setupFee = Math.max(0, numPlatforms - 1) * PLATFORM_SETUP_FEE;
  } else if (investment < 30000) {
    // Tier 2 (11k - 29999): Setup + Variable (No Fixed)
    fixedFee = 0;
    setupFee = Math.max(0, numPlatforms - 1) * PLATFORM_SETUP_FEE;
  } else {
    // Tier 3 (30k+): Variable only (No Fixed, No Setup)
    fixedFee = 0;
    setupFee = 0;
  }

  return { fixedFee, setupFee };
};


// For integrated mode: calculate effective investment from total budget
// We need to reverse calculate, accounting for the tiers
const calculateEffectiveInvestmentFromBudget = (
  totalBudget: number,
  numPlatforms: number
): number => {
  // Strategy: Try tiers from highest to lowest.
  // E = (B - F - S) / (1 + R)

  const setupFeeForTier12 = Math.max(0, numPlatforms - 1) * PLATFORM_SETUP_FEE;
  const fixedFeeForTier1 = FIXED_FEE;

  let effectiveInvestment: number;

  // Try Tier 4 (Effective >= 100k) -> No Fixed, No Setup, 6% Variable
  effectiveInvestment = totalBudget / (1 + 0.06);
  if (effectiveInvestment >= 100000) return effectiveInvestment;

  // Try Tier 3 (Effective 50k - 99999) -> No Fixed, No Setup, 8% Variable
  effectiveInvestment = totalBudget / (1 + 0.08);
  if (effectiveInvestment >= 50000) return effectiveInvestment;

  // Try Tier 1 (Effective 11k - 29999) -> No Fixed, Setup, 10% Variable
  effectiveInvestment = (totalBudget - setupFeeForTier12) / (1 + 0.10);
  if (effectiveInvestment >= 11000) return Math.max(0, effectiveInvestment);

  // Fallback: Effective < 11k -> Fixed, Setup, 10% Variable
  effectiveInvestment = (totalBudget - fixedFeeForTier1 - setupFeeForTier12) / (1 + 0.10);
  return Math.max(0, effectiveInvestment);
};

export const useCampaignCalculator = (config: CampaignConfig): CampaignCosts & { variableFeeRate: number } => {
  const { adInvestment, isFirstRelease, selectedAddons, platforms, feeMode } = config;

  return useMemo(() => {
    const numPlatforms = platforms.length;
    const inputAmount = adInvestment;

    // Calculate addons base cost
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
      // Input is TOTAL budget
      effectiveAdInvestment = calculateEffectiveInvestmentFromBudget(
        inputAmount,
        numPlatforms
      );

      // Now calculate fees forward based on the determined effective investment
      const fees = getApplicableFees(effectiveAdInvestment, numPlatforms);
      fixedFeePlatforms = fees.fixedFee;
      setupFee = fees.setupFee;
      variableFeeRate = getVariableFeeRate(effectiveAdInvestment);
      variableFeeInvestment = effectiveAdInvestment * variableFeeRate;

      totalFees = fixedFeePlatforms + setupFee + variableFeeInvestment;
      totalEstimated = inputAmount + addonsBaseCost;

    } else {
      // Input is INVESTMENT
      effectiveAdInvestment = inputAmount;

      const fees = getApplicableFees(effectiveAdInvestment, numPlatforms);
      fixedFeePlatforms = fees.fixedFee;
      setupFee = fees.setupFee;
      variableFeeRate = getVariableFeeRate(effectiveAdInvestment);
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
    };
  }, [
    adInvestment,
    isFirstRelease,
    selectedAddons.adaptacion,
    selectedAddons.microsite,
    selectedAddons.emailWhatsapp,
    platforms.length,
    feeMode,
  ]);
};

export const validateInvestment = (
  amount: number,
  feeMode: FeeMode = 'additional',
  effectiveAdInvestment?: number
): { valid: boolean; error?: string } => {
  // In integrated mode, check the effective ad investment (after fees)
  const investmentToCheck = feeMode === 'integrated' && effectiveAdInvestment !== undefined
    ? effectiveAdInvestment
    : amount;

  if (investmentToCheck < MIN_INVESTMENT) {
    if (feeMode === 'integrated') {
      return {
        valid: false,
        error: `Con los fees integrados, la inversión efectiva en medios sería de ${Math.round(investmentToCheck).toLocaleString("es-ES")}€. El mínimo requerido es de ${MIN_INVESTMENT.toLocaleString("es-ES")}€. Aumenta el presupuesto o cambia a fees adicionales.`,
      };
    }
    return {
      valid: false,
      error: `El mínimo de inversión publicitaria para lanzar una campaña con imfilms es de ${MIN_INVESTMENT.toLocaleString("es-ES")}€. Ajusta la cifra para continuar.`,
    };
  }
  return { valid: true };
};
