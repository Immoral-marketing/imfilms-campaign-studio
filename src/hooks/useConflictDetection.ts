import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ConflictCheckParams {
  filmGenre?: string;
  targetAudience?: string;
  territory?: string;
  premiereStart?: string;
  premiereEnd?: string;
  platforms?: string[];
  excludeCampaignId?: string;
}

interface ConflictResult {
  level: 'none' | 'low' | 'medium' | 'high';
  conflicts: Array<{
    id: string;
    filmTitle: string;
    reason: string[];
    premiereDate: string;
  }>;
  score: number;
}

export const useConflictDetection = () => {
  const [isChecking, setIsChecking] = useState(false);
  const [lastResult, setLastResult] = useState<ConflictResult | null>(null);

  const checkConflicts = async (params: ConflictCheckParams): Promise<ConflictResult> => {
    setIsChecking(true);

    try {
      // Use the secure RPC function to check for conflicts globally (ignoring RLS)
      // @ts-ignore - RPC function created via migration, types not yet updated
      const { data: campaigns, error } = await supabase
        .rpc('get_active_campaigns_for_conflicts', {
          check_start_date: params.premiereStart?.split('T')[0] || new Date().toISOString().split('T')[0],
          check_end_date: params.premiereEnd?.split('T')[0] || new Date().toISOString().split('T')[0],
          exclude_campaign_id: params.excludeCampaignId || '00000000-0000-0000-0000-000000000000',
        });

      if (error) throw error;

      const conflicts: ConflictResult['conflicts'] = [];
      let totalScore = 0;

      if (campaigns && params.premiereStart) {
        const targetDate = new Date(params.premiereStart);

        for (const campaign of campaigns) {

          // Check: Strict Genre Filter (Must match to be a conflict)
          const dbGenre = (campaign.film_genre || '').toLowerCase().trim();
          const paramGenre = (params.filmGenre || '').toLowerCase().trim();

          if (dbGenre !== paramGenre) {
            continue; // Skip campaigns with different genres
          }

          let conflictScore = 0;
          conflictScore += 4; // Base score for genre match (now guaranteed if we are here)
          const reasons: string[] = ['Mismo género cinematográfico']; // Always add this reason

          // Check 1: Solapamiento de fechas (±14 días)
          const campaignDate = new Date(campaign.premiere_start);
          const daysDiff = Math.abs((targetDate.getTime() - campaignDate.getTime()) / (1000 * 60 * 60 * 24));

          if (daysDiff <= 14) {
            reasons.push(`Estreno en fechas cercanas (${Math.round(daysDiff)} días de diferencia)`);
            conflictScore += 4; // Increased from 3 to 4 to reach High (8) with Genre
          }

          // Check 3: Audiencia similar (keywords básicas)
          if (campaign.target_audience && params.targetAudience) {
            const keywords1 = params.targetAudience.toLowerCase().split(/\s+/).filter(w => w.length > 3);
            const keywords2 = campaign.target_audience.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3);
            const commonKeywords = keywords1.filter(k => keywords2.includes(k));

            if (commonKeywords.length >= 2) {
              reasons.push(`Audiencia similar (${commonKeywords.length} coincidencias)`);
              conflictScore += 2;
            }
          }

          // Check 4: Mismo territorio
          if (campaign.territory && params.territory && campaign.territory === params.territory) {
            reasons.push('Mismo territorio geográfico');
            conflictScore += 1;
          }

          // Si hay razones de conflicto, añadir a la lista
          if (reasons.length > 0) {
            conflicts.push({
              id: campaign.campaign_id,
              filmTitle: campaign.film_title || 'Película sin título',
              reason: reasons,
              premiereDate: campaign.premiere_start,
            });
            totalScore += conflictScore;
          }
        }
      }

      // Determinar nivel de conflicto
      let level: ConflictResult['level'] = 'none';
      if (totalScore >= 8) {
        level = 'high';
      } else if (totalScore >= 5) {
        level = 'medium';
      } else if (totalScore > 0) {
        level = 'low';
      }

      const result: ConflictResult = {
        level,
        conflicts,
        score: totalScore,
      };

      setLastResult(result);
      return result;
    } catch (error) {
      console.error('Error checking conflicts:', error);
      return {
        level: 'none',
        conflicts: [],
        score: 0,
      };
    } finally {
      setIsChecking(false);
    }
  };

  return {
    checkConflicts,
    isChecking,
    lastResult,
  };
};
