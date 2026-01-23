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

const PLATFORM_SETUP_FEE = 150;
const FIRST_PLATFORM_FEE = 700;
export const MIN_INVESTMENT = 3000;

// Variable fee percentage based on investment tier
const getVariableFeeRate = (investment: number): number => {
  if (investment >= 100000) {
    return 0.06; // 6% for 100k+
  }
  return 0.10; // 10% for all others
};

// Calculate variable fee based on investment
const calculateVariableFee = (investment: number): number => {
  return investment * getVariableFeeRate(investment);
};

// Calculate fixed fees (not including variable) for a given config
const calculateFixedFees = (numPlatforms: number): number => {
  let fixedFee = 0;
  if (numPlatforms > 0) {
    fixedFee = FIRST_PLATFORM_FEE;
  }
  const setupFee = numPlatforms * PLATFORM_SETUP_FEE;
  return fixedFee + setupFee;
};

// For integrated mode: calculate effective investment from total budget
// Budget = effectiveInvestment + fixedFees + variableFee(effectiveInvestment)
// Budget = effectiveInvestment + fixedFees + effectiveInvestment * rate
// Budget = effectiveInvestment * (1 + rate) + fixedFees
// effectiveInvestment = (Budget - fixedFees) / (1 + rate)
const calculateEffectiveInvestmentFromBudget = (
  totalBudget: number,
  numPlatforms: number
): number => {
  const fixedFees = calculateFixedFees(numPlatforms);
  const availableForInvestmentAndVariable = totalBudget - fixedFees;

  if (availableForInvestmentAndVariable <= 0) {
    return 0;
  }

  // Determine rate based on expected investment range
  // We need to solve iteratively since rate depends on final investment
  // Start with 10% assumption and adjust if needed
  let rate = 0.10;
  let effectiveInvestment = availableForInvestmentAndVariable / (1 + rate);

  // If result would be 100k+, recalculate with 6% rate
  if (effectiveInvestment >= 100000) {
    rate = 0.06;
    effectiveInvestment = availableForInvestmentAndVariable / (1 + rate);
  }

  return Math.max(0, effectiveInvestment);
};

export const useCampaignCalculator = (config: CampaignConfig): CampaignCosts => {
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

    if (feeMode === 'integrated') {
      // In integrated mode, the input is the TOTAL budget (including fees)
      // We need to calculate backwards to find effective ad investment
      effectiveAdInvestment = calculateEffectiveInvestmentFromBudget(
        inputAmount,
        numPlatforms
      );

      // Fixed fee per platforms
      fixedFeePlatforms = numPlatforms > 0 ? FIRST_PLATFORM_FEE : 0;

      // Variable fee based on effective investment
      variableFeeInvestment = calculateVariableFee(effectiveAdInvestment);

      // Setup fee (always applied per platform)
      setupFee = numPlatforms * PLATFORM_SETUP_FEE;

      // Total fees
      totalFees = fixedFeePlatforms + variableFeeInvestment + setupFee;

      // Total = input amount (budget includes fees) + addons
      totalEstimated = inputAmount + addonsBaseCost;

    } else {
      // In additional mode (default), input is the ad investment
      // Fees are added on top
      effectiveAdInvestment = inputAmount;

      // Fixed fee per platforms
      fixedFeePlatforms = numPlatforms > 0 ? FIRST_PLATFORM_FEE : 0;

      // Variable fee based on investment
      variableFeeInvestment = calculateVariableFee(inputAmount);

      // Setup fee (always applied per platform)
      setupFee = numPlatforms * PLATFORM_SETUP_FEE;

      // Total fees
      totalFees = fixedFeePlatforms + variableFeeInvestment + setupFee;

      // Total = investment + fees + addons
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
