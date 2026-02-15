// ==========================================================
// ONBOARDING TOUR IS CURRENTLY DISABLED
// To re-enable, restore the original logic from git history.
// ==========================================================

export const useOnboarding = () => {
  // Disabled: always return false, no DB calls
  return {
    showOnboarding: false,
    isLoading: false,
    completeOnboarding: async () => { },
    skipOnboarding: async () => { },
    resetOnboarding: () => { },
  };
};
