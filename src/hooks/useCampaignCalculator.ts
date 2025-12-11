import { useState, useEffect } from "react";

export interface CampaignCosts {
  adInvestment: number;
  fixedFeePlatforms: number;
  variableFeeInvestment: number;
  setupFee: number;
  addonsBaseCost: number;
  totalEstimated: number;
}

export interface CampaignConfig {
  platforms: string[];
  adInvestment: number;
  isFirstRelease: boolean;
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
const MIN_INVESTMENT = 3000;

// Tramos de fee variable según inversión publicitaria
const calculateVariableFee = (investment: number): number => {
  if (investment < 30000) {
    return investment * 0.10; // 10% para inversiones menores a 30k
  } else if (investment < 100000) {
    return investment * 0.10; // 10% para inversiones entre 30k y 99,999€
  } else {
    return investment * 0.06; // 6% para inversiones de 100k o más
  }
};

export const useCampaignCalculator = (config: CampaignConfig): CampaignCosts => {
  const [costs, setCosts] = useState<CampaignCosts>({
    adInvestment: 0,
    fixedFeePlatforms: 0,
    variableFeeInvestment: 0,
    setupFee: 0,
    addonsBaseCost: 0,
    totalEstimated: 0,
  });

  useEffect(() => {
    const numPlatforms = config.platforms.length;
    const investment = config.adInvestment;

    // Fixed fee per platforms
    let fixedFeePlatforms = 0;
    if (numPlatforms > 0) {
      fixedFeePlatforms = FIRST_PLATFORM_FEE;
    }

    // Variable fee según tramos de inversión
    const variableFeeInvestment = calculateVariableFee(investment);

    // Setup fee (only for first release)
    const setupFee = config.isFirstRelease ? numPlatforms * PLATFORM_SETUP_FEE : 0;

    // Addons base cost
    let addonsBaseCost = 0;
    if (config.selectedAddons.adaptacion) addonsBaseCost += ADDON_PRICES.adaptacion;
    if (config.selectedAddons.microsite) addonsBaseCost += ADDON_PRICES.microsite;
    if (config.selectedAddons.emailWhatsapp) addonsBaseCost += ADDON_PRICES.emailWhatsapp;

    // Total estimated
    const totalEstimated =
      investment + fixedFeePlatforms + variableFeeInvestment + setupFee + addonsBaseCost;

    setCosts({
      adInvestment: investment,
      fixedFeePlatforms,
      variableFeeInvestment,
      setupFee,
      addonsBaseCost,
      totalEstimated,
    });
  }, [config]);

  return costs;
};

export const validateInvestment = (amount: number): { valid: boolean; error?: string } => {
  if (amount < MIN_INVESTMENT) {
    return {
      valid: false,
      error: `El mínimo de inversión publicitaria para lanzar una campaña con imfilms es de ${MIN_INVESTMENT.toLocaleString("es-ES")}€. Ajusta la cifra para continuar.`,
    };
  }
  return { valid: true };
};
