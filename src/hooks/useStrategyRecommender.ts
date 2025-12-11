import { useMemo } from 'react';

export type ReleaseSize = 'limitado' | 'mediano' | 'masivo';
export type Genre = 'accion' | 'comedia' | 'drama' | 'terror' | 'familiar' | 'otro';
export type Scenario = 'conservador' | 'estandar' | 'agresivo';

interface RecommendationInput {
  releaseSize?: ReleaseSize;
  genre?: Genre;
  targetAudience?: string;
}

interface PlatformWeight {
  platform: string;
  weight: number; // 0-100
  reason: string;
}

interface PhaseWeight {
  pre: number; // 0-100
  premiere: number;
  post: number;
}

interface ScenarioRecommendation {
  scenario: Scenario;
  investment: {
    min: number;
    recommended: number;
    max: number;
  };
  platforms: PlatformWeight[];
  phaseWeights: PhaseWeight;
  estimatedImpact: {
    reach: string;
    clicks: string;
    ctr: string;
  };
  description: string;
}

interface StrategyRecommendation {
  recommendedPlatforms: PlatformWeight[];
  phaseWeights: PhaseWeight;
  investmentRange: {
    min: number;
    recommended: number;
    max: number;
  };
  scenarios: ScenarioRecommendation[];
  reasoning: string[];
}

export const useStrategyRecommender = (input: RecommendationInput): StrategyRecommendation | null => {
  return useMemo(() => {
    if (!input.releaseSize) return null;

    const { releaseSize, genre = 'otro' } = input;

    // Base platform recommendations by release size
    const basePlatforms: Record<ReleaseSize, PlatformWeight[]> = {
      limitado: [
        { platform: 'Instagram', weight: 40, reason: 'Audiencia urbana y cinéfila' },
        { platform: 'Facebook', weight: 30, reason: 'Targeting preciso por intereses' },
        { platform: 'YouTube', weight: 30, reason: 'Pre-roll en canales especializados' },
      ],
      mediano: [
        { platform: 'Instagram', weight: 30, reason: 'Alcance y engagement equilibrado' },
        { platform: 'TikTok', weight: 25, reason: 'Viralidad y audiencia joven' },
        { platform: 'YouTube', weight: 25, reason: 'Video largo y awareness' },
        { platform: 'Facebook', weight: 20, reason: 'Alcance cross-generacional' },
      ],
      masivo: [
        { platform: 'Instagram', weight: 25, reason: 'Máxima cobertura urbana' },
        { platform: 'TikTok', weight: 25, reason: 'Viralidad masiva' },
        { platform: 'YouTube', weight: 20, reason: 'Video y retargeting' },
        { platform: 'Facebook', weight: 20, reason: 'Alcance masivo' },
        { platform: 'Twitter', weight: 10, reason: 'Conversación y tendencias' },
      ],
    };

    // Phase weights by release size
    const phaseWeights: Record<ReleaseSize, PhaseWeight> = {
      limitado: { pre: 60, premiere: 30, post: 10 },
      mediano: { pre: 50, premiere: 35, post: 15 },
      masivo: { pre: 40, premiere: 40, post: 20 },
    };

    // Investment ranges by release size
    const investmentRanges: Record<ReleaseSize, { min: number; recommended: number; max: number }> = {
      limitado: { min: 3000, recommended: 8500, max: 15000 },
      mediano: { min: 15000, recommended: 35000, max: 60000 },
      masivo: { min: 60000, recommended: 125000, max: 250000 },
    };

    // Genre adjustments
    const genreAdjustments: Partial<Record<Genre, Partial<PlatformWeight>[]>> = {
      terror: [
        { platform: 'TikTok', weight: 35, reason: 'Clips virales de sustos' },
        { platform: 'Instagram', weight: 30, reason: 'Stories y reels impactantes' },
      ],
      familiar: [
        { platform: 'Facebook', weight: 35, reason: 'Padres y familias' },
        { platform: 'YouTube', weight: 30, reason: 'Video familiar safe' },
      ],
      accion: [
        { platform: 'TikTok', weight: 30, reason: 'Clips de acción virales' },
        { platform: 'Instagram', weight: 30, reason: 'Reels dinámicos' },
      ],
    };

    let platforms = [...basePlatforms[releaseSize]];
    
    // Apply genre adjustments
    if (genre in genreAdjustments) {
      const adjustments = genreAdjustments[genre]!;
      adjustments.forEach((adj) => {
        const existing = platforms.find((p) => p.platform === adj.platform);
        if (existing && adj.weight) {
          existing.weight = adj.weight;
          if (adj.reason) existing.reason = adj.reason;
        }
      });
    }

    const baseInvestment = investmentRanges[releaseSize];

    // Generate scenarios
    const scenarios: ScenarioRecommendation[] = [
      {
        scenario: 'conservador',
        investment: {
          min: baseInvestment.min,
          recommended: baseInvestment.min * 1.2,
          max: baseInvestment.min * 1.5,
        },
        platforms: platforms.slice(0, 2), // Only top 2 platforms
        phaseWeights: { ...phaseWeights[releaseSize], pre: 70, premiere: 25, post: 5 },
        estimatedImpact: {
          reach: releaseSize === 'limitado' ? '150K-250K' : releaseSize === 'mediano' ? '600K-900K' : '2M-3M',
          clicks: releaseSize === 'limitado' ? '6K-10K' : releaseSize === 'mediano' ? '24K-36K' : '80K-120K',
          ctr: '4.0-4.5%',
        },
        description: 'Enfoque seguro con menos plataformas y mayor peso en pre-estreno. Ideal para validar mercado con riesgo controlado.',
      },
      {
        scenario: 'estandar',
        investment: baseInvestment,
        platforms,
        phaseWeights: phaseWeights[releaseSize],
        estimatedImpact: {
          reach: releaseSize === 'limitado' ? '250K-400K' : releaseSize === 'mediano' ? '1M-1.5M' : '4M-6M',
          clicks: releaseSize === 'limitado' ? '10K-16K' : releaseSize === 'mediano' ? '40K-60K' : '160K-240K',
          ctr: '4.0%',
        },
        description: 'Balance óptimo entre alcance y eficiencia. Estrategia recomendada basada en campañas exitosas similares.',
      },
      {
        scenario: 'agresivo',
        investment: {
          min: baseInvestment.recommended,
          recommended: baseInvestment.max,
          max: baseInvestment.max * 1.5,
        },
        platforms,
        phaseWeights: { ...phaseWeights[releaseSize], premiere: 50, pre: 35, post: 15 },
        estimatedImpact: {
          reach: releaseSize === 'limitado' ? '400K-600K' : releaseSize === 'mediano' ? '1.5M-2.5M' : '6M-10M',
          clicks: releaseSize === 'limitado' ? '16K-24K' : releaseSize === 'mediano' ? '60K-100K' : '240K-400K',
          ctr: '4.0-4.2%',
        },
        description: 'Máxima cobertura y frecuencia. Peso fuerte en fin de semana de estreno para saturar mercado y maximizar ocupación.',
      },
    ];

    // Generate reasoning
    const reasoning: string[] = [
      `Para un estreno ${releaseSize}, recomendamos ${platforms.length} plataformas principales.`,
      `${platforms[0].platform} es la plataforma prioritaria: ${platforms[0].reason.toLowerCase()}.`,
    ];

    if (genre !== 'otro') {
      reasoning.push(`El género ${genre} responde especialmente bien en ${platforms[0].platform} y ${platforms[1]?.platform || 'plataformas visuales'}.`);
    }

    reasoning.push(`Distribución temporal: ${phaseWeights[releaseSize].pre}% pre-estreno, ${phaseWeights[releaseSize].premiere}% fin de semana, ${phaseWeights[releaseSize].post}% post-estreno.`);

    return {
      recommendedPlatforms: platforms,
      phaseWeights: phaseWeights[releaseSize],
      investmentRange: baseInvestment,
      scenarios,
      reasoning,
    };
  }, [input.releaseSize, input.genre, input.targetAudience]);
};
