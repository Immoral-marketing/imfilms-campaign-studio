import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { trackEvent } from '@/utils/trackingUtils';

const ONBOARDING_KEY = 'imfilms_onboarding_completed';

export const useOnboarding = () => {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // Check Supabase for distributor's onboarding status
      const { data: distributor } = await supabase
        .from('distributors')
        .select('has_completed_onboarding')
        .eq('id', user.id)
        .single();

      const hasCompleted = distributor?.has_completed_onboarding ?? false;
      setShowOnboarding(!hasCompleted);
    } else {
      // For unauthenticated users, check localStorage
      const completed = localStorage.getItem(ONBOARDING_KEY);
      setShowOnboarding(completed !== 'true');
    }
    
    setIsLoading(false);
  };

  const completeOnboarding = async () => {
    trackEvent('onboarding_tour_completed');
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      await supabase
        .from('distributors')
        .update({ has_completed_onboarding: true })
        .eq('id', user.id);
    } else {
      localStorage.setItem(ONBOARDING_KEY, 'true');
    }
    
    setShowOnboarding(false);
  };

  const skipOnboarding = async () => {
    trackEvent('onboarding_tour_skipped');
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      await supabase
        .from('distributors')
        .update({ has_completed_onboarding: true })
        .eq('id', user.id);
    } else {
      localStorage.setItem(ONBOARDING_KEY, 'true');
    }
    
    setShowOnboarding(false);
  };

  const resetOnboarding = () => {
    trackEvent('onboarding_tour_started');
    setShowOnboarding(true);
  };

  return {
    showOnboarding,
    isLoading,
    completeOnboarding,
    skipOnboarding,
    resetOnboarding,
  };
};
