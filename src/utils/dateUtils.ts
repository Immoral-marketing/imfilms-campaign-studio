import { addDays, subDays, startOfDay, format, addBusinessDays, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";

export interface CampaignDates {
  releaseDate: Date;
  preStartDate: Date;
  preEndDate: Date;
  premiereWeekendStart: Date;
  premiereWeekendEnd: Date;
  campaignEndDate: Date;
  finalReportDate: Date;
  creativesDeadline: Date;
}

// Helper function to get the Friday of the week for any given date
const getFridayOfWeek = (date: Date): Date => {
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 5 = Friday, 6 = Saturday

  // Calculate days to the Friday of that week
  let daysToFriday = 0;

  if (dayOfWeek === 0) { // Sunday
    // Go back 2 days to Friday of the same weekend
    daysToFriday = -2;
  } else if (dayOfWeek === 6) { // Saturday  
    // Go back 1 day to Friday of the same weekend
    daysToFriday = -1;
  } else {
    // Monday (1) to Friday (5)
    // Days until next Friday: 5 - dayOfWeek
    daysToFriday = 5 - dayOfWeek;
  }

  return addDays(date, daysToFriday);
};

export const calculateCampaignDates = (
  releaseDate: Date,
  hasAdaptationAddon: boolean,
  campaignEndDate?: Date
): CampaignDates => {
  const release = startOfDay(releaseDate);

  // Calculate premiere weekend: always Friday-Sunday of the release week
  // Find the Friday of the week for the selected release date
  const premiereWeekendStart = getFridayOfWeek(release);
  const premiereWeekendEnd = addDays(premiereWeekendStart, 2); // Sunday

  // Pre-campaign: 14 days before premiere weekend start until day before
  const preStartDate = subDays(premiereWeekendStart, 14);
  const preEndDate = subDays(premiereWeekendStart, 1);

  // Campaign end date (user selected or default to premiere weekend end)
  const endDate = campaignEndDate ? startOfDay(campaignEndDate) : premiereWeekendEnd;

  // Final report: 3 business days after campaign end date
  const finalReportDate = addBusinessDays(endDate, 3);

  // Creatives deadline: 3 business days before pre-campaign start
  const creativesDeadline = addBusinessDays(preStartDate, -3);

  return {
    releaseDate: release,
    preStartDate,
    preEndDate,
    premiereWeekendStart,
    premiereWeekendEnd,
    campaignEndDate: endDate,
    finalReportDate,
    creativesDeadline,
  };
};

export const formatDateEs = (date: Date): string => {
  return format(date, "d 'de' MMMM, yyyy", { locale: es });
};

export const formatDateShort = (date: Date): string => {
  return format(date, "dd/MM/yyyy");
};

export const getRelativeTime = (date: Date): { text: string; isPast: boolean; days: number } => {
  const today = startOfDay(new Date());
  const target = startOfDay(date);
  const diff = differenceInDays(target, today);
  const absDiff = Math.abs(diff);

  if (diff === 0) {
    return { text: "Hoy", isPast: false, days: 0 };
  } else if (diff === 1) {
    return { text: "Mañana", isPast: false, days: 1 };
  } else if (diff === -1) {
    return { text: "Ayer", isPast: true, days: 1 };
  } else if (diff > 0) {
    return { text: `Faltan ${absDiff} días`, isPast: false, days: absDiff };
  } else {
    return { text: `Hace ${absDiff} días`, isPast: true, days: absDiff };
  }
};

