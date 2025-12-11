// Tracking utility for analytics events
// This provides a centralized place to track user interactions
// Connect to your analytics provider (PostHog, GA4, etc.) by implementing these functions

type EventName = 
  | 'onboarding_tour_started'
  | 'onboarding_tour_completed'
  | 'onboarding_tour_skipped'
  | 'tooltip_opened'
  | 'help_center_opened'
  | 'help_center_search'
  | 'help_center_article_opened';

interface EventProperties {
  fieldId?: string;
  query?: string;
  articleId?: string;
  articleTitle?: string;
  [key: string]: any;
}

export const trackEvent = (eventName: EventName, properties?: EventProperties) => {
  // TODO: Connect to your analytics provider
  // Example implementations:
  
  // PostHog:
  // if (window.posthog) {
  //   window.posthog.capture(eventName, properties);
  // }
  
  // Google Analytics 4:
  // if (window.gtag) {
  //   window.gtag('event', eventName, properties);
  // }
  
  // For now, just log to console in development
  if (import.meta.env.DEV) {
    console.log('📊 Track Event:', eventName, properties);
  }
};
