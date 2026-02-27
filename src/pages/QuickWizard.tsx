import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Day } from "react-day-picker";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Card } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import { Clapperboard, Globe, Mail, Info, RotateCcw, CalendarClock, CalendarRange, CalendarCheck, FileText, ArrowLeft, Check, Loader2, Eye, EyeOff, Euro, Percent, Zap, Trash2, Plus, Upload, ExternalLink, Settings2, Download } from "lucide-react";
import WizardProgress from "@/components/WizardProgress";
import PlatformCard from "@/components/PlatformCard";
import AddonCard from "@/components/AddonCard";
import CostSummary from "@/components/CostSummary";
import ConflictAlert from "@/components/ConflictAlert";
import HelpTooltip from "@/components/HelpTooltip";
import AuthModal from "@/components/AuthModal";
import GlobalHelpButton from "@/components/GlobalHelpButton";
import OnboardingTour from "@/components/OnboardingTour";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useCampaignCalculator, validateInvestment, FeeMode } from "@/hooks/useCampaignCalculator";
import { useConflictDetection } from "@/hooks/useConflictDetection";
import { calculateCampaignDates, formatDateEs, formatDateShort } from "@/utils/dateUtils";
import { isSameDay, addDays } from "date-fns";
import { z } from "zod";
import logoImfilms from "@/assets/logo-imfilms.png";
import tiktokLogo from "@/assets/tiktok-logo.png";
import facebookLogo from "@/assets/facebook-logo.png";
import instagramLogo from "@/assets/instagram-logo.png";
import youtubeLogo from "@/assets/youtube-logo.png";

const WIZARD_DRAFT_KEY = "imfilms_wizard_draft";

const GENRES = [
  "Drama", "Comedia", "Thriller", "Terror", "Acción", "Romance",
  "Documental", "Animación", "Ciencia ficción", "Fantasía", "Otro"
];

const GOALS = [
  "Awareness del estreno",
  "Vender el máximo de entradas posible",
  "Mantener conversación post-estreno",
  "Apoyo a nominaciones/premios/festivales"
];

const PLATFORMS = [
  { name: "Instagram", logo: instagramLogo, description: "Stories, reels y posts para alcanzar audiencias visuales" },
  { name: "Facebook", logo: facebookLogo, description: "Segmentación demográfica precisa y eventos de cine" },
  { name: "TikTok", logo: tiktokLogo, description: "Contenido viral y audiencias jóvenes" },
  { name: "YouTube", logo: youtubeLogo, description: "Pre-rolls y campañas de video premium" },
];

const filmSchema = z.object({
  title: z.string().trim().min(1, "El título es obligatorio").max(500),
  genre: z.string().min(1, "Selecciona un género"),
  country: z.string().trim().min(1, "El país es obligatorio").max(200),
  distributorName: z.string().trim().min(1, "La distribuidora es obligatoria").max(200),
});

const validatePercentages = (percentages: Record<string, number>, platforms: string[]) => {
  if (Object.keys(percentages).length === 0 && platforms.length > 0) return true; // Si es equitativo, no hay validación manual
  const total = Object.values(percentages).reduce((a, b) => a + b, 0);
  return Math.abs(total - 100) < 0.1; // Margen de error pequeño por decimales
};

interface WizardDraft {
  currentStep: number;
  filmData: {
    title: string;
    genre: string;
    secondaryGenre: string;
    otherGenre: string;
    country: string;
    distributorName: string;
    targetAudience: string;
    targetAudienceUrls?: string[];
    goals: string[];
  };
  releaseDate?: string;
  campaignEndDate?: string;
  manualEndDateMode?: boolean;
  selectedPlatforms: string[];
  otherPlatform: string;
  adInvestment: string;
  feeMode: FeeMode;
  platformPercentages: Record<string, number>;
  selectedAddons: {
    adaptacion: boolean;
    microsite: boolean;
    emailWhatsapp: boolean;
  };
  contactData: {
    companyName: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    password: string;
    comments: string;
  };
  isFirstRelease: boolean;
  planningMode: 'simple' | 'amount' | 'percentage';
}

const QuickWizard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [user, setUser] = useState<any>(null);
  const [distributor, setDistributor] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showDraftDialog, setShowDraftDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [isDistributor, setIsDistributor] = useState(false);
  const [justRegistered, setJustRegistered] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Step 5 Email Verification
  const [step5VerificationState, setStep5VerificationState] = useState<"form" | "code" | "verified">("form");
  const [step5VerificationCode, setStep5VerificationCode] = useState("");
  const [step5VerificationLoading, setStep5VerificationLoading] = useState(false);
  const [showStep5Password, setShowStep5Password] = useState(false);
  const [countryCode, setCountryCode] = useState("+34");

  // Onboarding
  const { showOnboarding, completeOnboarding, skipOnboarding } = useOnboarding();

  // Check admin status
  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();
      setIsAdmin(!!data);
    };
    checkAdmin();
  }, [user]);

  // Conflict detection
  const { checkConflicts, isChecking: isCheckingConflicts, lastResult: conflictResult } = useConflictDetection();
  const [hasCheckedConflicts, setHasCheckedConflicts] = useState(false);

  // Step 1: Film data
  const [filmData, setFilmData] = useState({
    title: "",
    genre: "",
    secondaryGenre: "",
    otherGenre: "",
    country: "España",
    distributorName: "",
    targetAudience: "",
    targetAudienceUrls: [] as string[],
    goals: [] as string[],
  });

  // Step 1: Target Audience Files (Not persisted in draft)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // Step 4: Creative Assets (Not persisted in draft)
  const [creativeAssets, setCreativeAssets] = useState<File[]>([]);

  // Step 2: Calendar
  const [releaseDate, setReleaseDate] = useState<Date | undefined>(undefined);
  const [campaignEndDate, setCampaignEndDate] = useState<Date | undefined>(undefined);
  const [manualEndDateMode, setManualEndDateMode] = useState(false);

  // Step 3: Platforms & Investment
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [otherPlatform, setOtherPlatform] = useState("");
  const [adInvestment, setAdInvestment] = useState("");
  const [feeMode, setFeeMode] = useState<FeeMode>('integrated');
  const [planningMode, setPlanningMode] = useState<'simple' | 'amount' | 'percentage'>('simple');
  const [platformPercentages, setPlatformPercentages] = useState<Record<string, number>>({});
  const [platformAmounts, setPlatformAmounts] = useState<Record<string, number>>({});

  // Step 4: Add-ons
  const [selectedAddons, setSelectedAddons] = useState({
    adaptacion: false,
    microsite: false,
    emailWhatsapp: false,
  });

  // Step 5: Registration/Login data
  const [signupData, setSignupData] = useState({
    companyName: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    password: "",
    comments: "",
  });

  const isFirstRelease = !isDistributor; // First release if not a registered distributor yet

  const campaignConfig = {
    platforms: selectedPlatforms,
    adInvestment: parseFloat(adInvestment) || 0,
    isFirstRelease,
    feeMode,
    selectedAddons,
  };

  const costs = useCampaignCalculator(campaignConfig);

  const campaignDates = releaseDate
    ? calculateCampaignDates(releaseDate, selectedAddons.adaptacion, campaignEndDate)
    : null;

  // Auto-sync campaign end date with premiere weekend end when release date changes
  useEffect(() => {
    if (releaseDate && !manualEndDateMode) {
      // Calculate dates to get the premiere weekend end
      const tempDates = calculateCampaignDates(releaseDate, selectedAddons.adaptacion);
      // Automatically set campaign end date to premiere weekend end (Sunday)
      setCampaignEndDate(tempDates.premiereWeekendEnd);
    }
  }, [releaseDate, manualEndDateMode, selectedAddons.adaptacion]);

  // Check for conflicts when key data changes (Step 2 onwards)
  useEffect(() => {
    if (currentStep >= 2 && releaseDate && filmData.genre) {
      setHasCheckedConflicts(false); // Reset status on change
      const delayCheck = setTimeout(async () => {
        const dates = calculateCampaignDates(releaseDate, selectedAddons.adaptacion, campaignEndDate);
        await checkConflicts({
          filmGenre: filmData.genre === 'Otro' ? filmData.otherGenre : filmData.genre,
          targetAudience: filmData.targetAudience,
          territory: filmData.country,
          premiereStart: dates.premiereWeekendStart.toISOString(),
          premiereEnd: dates.premiereWeekendEnd.toISOString(),
          platforms: selectedPlatforms,
        });
        setHasCheckedConflicts(true);
      }, 500); // Debounce for 500ms

      return () => clearTimeout(delayCheck);
    }
  }, [releaseDate, filmData.genre, filmData.otherGenre, filmData.targetAudience, filmData.country, currentStep]);


  // Check for saved draft on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem(WIZARD_DRAFT_KEY);
    if (savedDraft) {
      setHasDraft(true);
      setShowDraftDialog(true);
    }

    // Check authentication
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        setUser(session.user);
        await fetchDistributorProfile(session.user.id);
        // Check if user is a distributor
        await checkDistributorRole(session.user.id);
      }
    });

    // Listen for auth state changes (e.g., after registration from modal)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setUser(session.user);
        await fetchDistributorProfile(session.user.id);
        await checkDistributorRole(session.user.id);
        setJustRegistered(true);
        toast.success("¡Ahora puedes ver tu presupuesto completo!");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Auto-save draft whenever state changes
  useEffect(() => {
    if (!hasDraft) return; // Don't save until user has made a choice about draft

    const draft: WizardDraft = {
      currentStep,
      filmData,
      releaseDate: releaseDate?.toISOString(),
      campaignEndDate: campaignEndDate?.toISOString(),
      manualEndDateMode,
      selectedPlatforms,
      otherPlatform,
      adInvestment,
      feeMode,
      platformPercentages,
      selectedAddons,
      contactData: signupData,
      isFirstRelease,
      planningMode,
    };

    localStorage.setItem(WIZARD_DRAFT_KEY, JSON.stringify(draft));
  }, [
    currentStep,
    filmData,
    releaseDate,
    campaignEndDate,
    manualEndDateMode,
    selectedPlatforms,
    otherPlatform,
    adInvestment,
    feeMode,
    platformPercentages,
    selectedAddons,
    signupData,
    isFirstRelease,
    hasDraft,
  ]);

  const checkDistributorRole = async (userId: string) => {
    const { data } = await supabase
      .from("distributors")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    setIsDistributor(!!data);
  };

  const fetchDistributorProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("distributors")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (data) {
      setDistributor(data);
      setSignupData({
        companyName: data.company_name || "",
        contactName: data.contact_name || "",
        contactEmail: data.contact_email || "",
        contactPhone: data.contact_phone || "",
        password: "",
        comments: "",
      });

      // Auto-fill distributor name in Step 1 if user is logged in and field is empty
      setFilmData(prev => {
        if (!prev.distributorName && data.company_name) {
          return { ...prev, distributorName: data.company_name };
        }
        return prev;
      });
    }
  };

  const uploadTargetAudienceFiles = async (userId: string, campaignId?: string) => {
    if (selectedFiles.length === 0) return [];

    const uploadedPaths: string[] = [];

    // We need a campaign ID or a temp folder. 
    // If we have campaignId (existing campaign), use it.
    // If not (new campaign), we might need to use a temp ID or just the User ID until we have the campaign ID?
    // Actually submit-campaign creates the campaign. 
    // We can upload to a temporary folder `temp/{userId}/` and then move? 
    // OR, better: The Edge Function `submit-campaign` returns the campaignId. 
    // BUT we need the file paths *before* calling `submit-campaign` to include them in the DB insert? 
    // OR we call `submit-campaign` first, get ID, then upload, then update DB?
    // The latter is safer for consistency but requires an extra update.

    // Alternative: Use a predictable path like `{userId}/{timestamp}_{filename}`.
    // The bucket is `campaign-materials`. 
    // Let's use `{userId}/{timestamp}_{filename}`.

    for (const file of selectedFiles) {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("campaign-materials")
        .upload(filePath, file);

      if (uploadError) {
        console.error("Error uploading file:", uploadError);
        continue;
      }

      // Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from("campaign-materials")
        .getPublicUrl(filePath);

      uploadedPaths.push(publicUrl);
    }
    return uploadedPaths;
  };

  const uploadCreativeAssets = async (userId: string, campaignId: string) => {
    if (creativeAssets.length === 0) return;

    for (const file of creativeAssets) {
      const fileExt = file.name.split(".").pop();
      const fileNameWithoutExt = file.name.replace(`.${fileExt}`, "");
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${campaignId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("campaign-assets")
        .upload(filePath, file);

      if (uploadError) {
        console.error("Error uploading creative asset:", uploadError);
        continue;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("campaign-assets")
        .getPublicUrl(filePath);

      await supabase
        .from("campaign_assets")
        .insert({
          campaign_id: campaignId,
          type: "otro",
          file_url: publicUrl,
          original_filename: file.name,
          name: fileNameWithoutExt,
          status: "pendiente_revision",
          uploaded_by: userId,
        });
    }
  };

  const loadDraft = () => {
    const savedDraft = localStorage.getItem(WIZARD_DRAFT_KEY);
    if (!savedDraft) return;

    try {
      const draft: WizardDraft = JSON.parse(savedDraft);
      setCurrentStep(draft.currentStep);
      setFilmData({
        ...draft.filmData,
        secondaryGenre: draft.filmData.secondaryGenre || "",
        targetAudienceUrls: draft.filmData.targetAudienceUrls || []
      });
      setReleaseDate(draft.releaseDate ? new Date(draft.releaseDate) : undefined);
      setCampaignEndDate(draft.campaignEndDate ? new Date(draft.campaignEndDate) : undefined);
      setManualEndDateMode(draft.manualEndDateMode || false);
      setSelectedPlatforms(draft.selectedPlatforms);
      setOtherPlatform(draft.otherPlatform);
      setAdInvestment(draft.adInvestment);
      setFeeMode(draft.feeMode || 'additional');
      setPlatformPercentages(draft.platformPercentages || {});
      setPlanningMode(draft.planningMode || 'amount');
      setSelectedAddons(draft.selectedAddons);
      setSignupData(draft.contactData);
      toast.success("Borrador recuperado correctamente");
    } catch (error) {
      console.error("Error loading draft:", error);
      toast.error("Error al cargar el borrador");
    }
  };

  const clearDraft = () => {
    localStorage.removeItem(WIZARD_DRAFT_KEY);
    setHasDraft(false);
  };

  const handleContinueDraft = () => {
    loadDraft();
    setShowDraftDialog(false);
    setHasDraft(true);
  };

  const handleStartFresh = () => {
    clearDraft();
    setShowDraftDialog(false);
    setHasDraft(true); // Enable auto-save for new session
  };

  const handleResetConfig = () => {
    setShowResetDialog(true);
  };

  const confirmReset = () => {
    clearDraft();
    // Reset all state
    setCurrentStep(1);
    setFilmData({
      title: "",
      genre: "",
      secondaryGenre: "",
      otherGenre: "",
      country: "España",
      distributorName: "",
      targetAudience: "",
      targetAudienceUrls: [],
      goals: [],
    });
    setSelectedFiles([]);
    setReleaseDate(undefined);
    setCampaignEndDate(undefined);
    setManualEndDateMode(false);
    setSelectedPlatforms([]);
    setOtherPlatform("");
    setAdInvestment("");
    setFeeMode('additional');
    setPlanningMode('amount');
    setPlatformPercentages({});
    setPlatformAmounts({});
    setSelectedAddons({
      adaptacion: false,
      microsite: false,
      emailWhatsapp: false,
    });
    setSignupData({
      companyName: "",
      contactName: "",
      contactEmail: "",
      contactPhone: "",
      password: "",
      comments: "",
    });
    setShowResetDialog(false);
    setHasDraft(true); // Re-enable auto-save
    toast.success("Configuración reiniciada");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleGoalToggle = (goal: string) => {
    setFilmData((prev) => ({
      ...prev,
      goals: prev.goals.includes(goal)
        ? prev.goals.filter((g) => g !== goal)
        : [...prev.goals, goal],
    }));
  };

  const handlePlatformToggle = (platform: string) => {
    setSelectedPlatforms((prev) => {
      const isRemoving = prev.includes(platform);
      const newPlatforms = isRemoving ? prev.filter((p) => p !== platform) : [...prev, platform];

      // Re-initialize distribution logic for the new platform set
      const all = [...newPlatforms];
      if (otherPlatform) all.push(otherPlatform);
      const count = all.length;

      if (count > 0) {
        if (planningMode === 'simple') {
          // In simple mode, we just need to ensure the equal split is ready for later
          const share = parseFloat((100 / count).toFixed(2));
          const newPercentages: Record<string, number> = {};
          all.forEach(p => newPercentages[p] = share);
          setPlatformPercentages(newPercentages);
        } else {
          // In manual modes (amount/percentage), we try to preserve existing values or init fairly
          const totalInvestment = parseFloat(adInvestment) || 0;
          const share = parseFloat((100 / count).toFixed(2));
          const amtShare = parseFloat((totalInvestment / count).toFixed(2));

          setPlatformPercentages(prevPct => {
            const next = { ...prevPct };
            if (isRemoving) {
              delete next[platform];
            } else if (next[platform] === undefined) {
              next[platform] = 0; // Init new to 0 to let user decide
            }
            return next;
          });

          setPlatformAmounts(prevAmt => {
            const next = { ...prevAmt };
            if (isRemoving) {
              delete next[platform];
              // If removing in amount mode, update total investment
              if (planningMode === 'amount') {
                const newTotal = Object.values(next).reduce((a, b) => a + b, 0);
                setAdInvestment(newTotal.toString());
              }
            } else if (next[platform] === undefined) {
              next[platform] = 0;
            }
            return next;
          });
        }
      } else {
        setPlatformPercentages({});
        setPlatformAmounts({});
        if (planningMode === 'amount') setAdInvestment("");
      }

      return newPlatforms;
    });
  };

  const handlePercentageChange = (platform: string, value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0 || numValue > 100) return;

    setPlatformPercentages(prev => {
      const newPercentages = { ...prev, [platform]: numValue };

      // Update platformAmounts based on the new percentage
      const totalInvestment = parseFloat(adInvestment) || 0;
      const newAmounts = { ...platformAmounts };
      newAmounts[platform] = parseFloat(((totalInvestment * numValue) / 100).toFixed(2));
      setPlatformAmounts(newAmounts);

      return newPercentages;
    });
  };

  const handleAmountChange = (platform: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    if (numValue < 0) return;

    setPlatformAmounts(prev => {
      const newAmounts = { ...prev, [platform]: numValue };

      // Calculate total investment from the sum of platform amounts
      const newTotal = Object.values(newAmounts).reduce((acc, curr) => acc + curr, 0);
      setAdInvestment(newTotal.toString());

      // Update percentages based on the new total
      if (newTotal > 0) {
        const newPercentages: Record<string, number> = {};
        Object.entries(newAmounts).forEach(([p, amt]) => {
          newPercentages[p] = parseFloat(((amt / newTotal) * 100).toFixed(2));
        });
        setPlatformPercentages(newPercentages);
      }

      return newAmounts;
    });
  };

  const handleNext = () => {
    // Validate current step
    if (currentStep === 1) {
      if (!filmData.title || !filmData.genre || !filmData.country || !filmData.distributorName) {
        toast.error("Por favor completa los campos obligatorios");
        return;
      }
      if (filmData.goals.length === 0) {
        toast.error("Por favor selecciona al menos un objetivo para la campaña");
        return;
      }
      if (filmData.genre === "Otro" && !filmData.otherGenre) {
        toast.error("Por favor especifica el género");
        return;
      }

      // Target Audience Validation: At least one field (text, urls, or files) is required
      const hasAudienceText = filmData.targetAudience.trim().length > 0;
      const hasUrls = filmData.targetAudienceUrls && filmData.targetAudienceUrls.length > 0;
      const hasFiles = selectedFiles.length > 0;

      if (!hasAudienceText && !hasUrls && !hasFiles) {
        toast.error("Por favor, describe el público objetivo o añade material adicional (enlaces o archivos).");
        return;
      }

      if (!releaseDate) {
        toast.error("Por favor selecciona una fecha de estreno");
        return;
      }

      // Step 2 (Dates) is now merged into Step 1, so we go directly to Step 2 (Platforms)
      setCurrentStep(2);
      return;
    } else if (currentStep === 2) { // Platforms
      if (selectedPlatforms.length === 0) {
        toast.error("Por favor selecciona al menos una plataforma");
        return;
      }

      if (planningMode === 'percentage') {
        const total = Object.values(platformPercentages).reduce((a, b) => a + b, 0);
        if (Math.abs(total - 100) > 0.5) {
          toast.error(`La suma de porcentajes debe ser 100%. Actual: ${total.toFixed(1)}%`);
          return;
        }
      }

      const investmentVal = parseFloat(adInvestment) || 0;
      const validation = validateInvestment(
        investmentVal,
        feeMode,
        costs.effectiveAdInvestment
      );
      if (!validation.valid) {
        toast.error(validation.error);
        return;
      }
    }

    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Step 5: Send verification code
  const handleStep5SendVerification = async () => {
    if (!signupData.contactEmail) {
      toast.error("Por favor introduce tu email");
      return;
    }

    setStep5VerificationLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-email", {
        body: {
          type: "verification_code",
          recipientEmail: signupData.contactEmail,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Error al enviar código");

      toast.success(`Código enviado a ${signupData.contactEmail}`);
      setStep5VerificationState("code");
    } catch (error: any) {
      toast.error(error.message || "Error al enviar código");
    } finally {
      setStep5VerificationLoading(false);
    }
  };

  // Step 5: Verify code
  const handleStep5VerifyCode = async () => {
    if (step5VerificationCode.length !== 4) {
      toast.error("El código debe tener 4 dígitos");
      return;
    }

    setStep5VerificationLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-email", {
        body: {
          type: "verify_code",
          recipientEmail: signupData.contactEmail,
          code: step5VerificationCode,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Código inválido");

      toast.success("¡Email verificado correctamente!");
      setStep5VerificationState("verified");
    } catch (error: any) {
      toast.error(error.message || "Código incorrecto o expirado");
    } finally {
      setStep5VerificationLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    // Validate signup data
    if (!signupData.companyName || !signupData.contactName || !signupData.contactEmail || !signupData.contactPhone || !signupData.password) {
      toast.error("Por favor completa todos los campos requeridos");
      return;
    }

    // REQUIRED: Email must be verified
    if (step5VerificationState !== "verified") {
      toast.error("Por favor verifica tu email antes de continuar");
      return;
    }

    setLoading(true);

    try {
      // 1. Create auth user
      // FORCE HTTPS redirect to avoid localhost issues
      const redirectUrl = "https://estrenos.imfilms.es/campaigns";

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: signupData.contactEmail,
        password: signupData.password,
        options: {
          data: {
            company_name: signupData.companyName,
            contact_name: signupData.contactName,
            contact_phone: `${countryCode} ${signupData.contactPhone}`,
          },
          emailRedirectTo: redirectUrl,
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("No se pudo crear el usuario");

      // 2. Submit Campaign immediately via Edge Function (Bypassing RLS for unconfirmed users)
      const campaignPayload = {
        userId: authData.user.id,
        filmData: {
          title: filmData.title,
          genre: filmData.genre,
          country: filmData.country,
          distributorName: filmData.distributorName,
          targetAudience: filmData.targetAudience,
          goals: filmData.goals,
        },
        campaignData: {
          releaseDate: releaseDate?.toISOString().split("T")[0],
          preStartDate: campaignDates?.preStartDate.toISOString().split("T")[0],
          preEndDate: campaignDates?.preEndDate.toISOString().split("T")[0],
          premiereWeekendStart: campaignDates?.premiereWeekendStart.toISOString().split("T")[0],
          premiereWeekendEnd: campaignDates?.premiereWeekendEnd.toISOString().split("T")[0],
          finalReportDate: campaignDates?.finalReportDate.toISOString().split("T")[0],
          creativesDeadline: campaignDates?.creativesDeadline.toISOString().split("T")[0],
          adInvestment: costs.adInvestment,
          effectiveAdInvestment: costs.effectiveAdInvestment,
          fixedFee: costs.fixedFeePlatforms,
          variableFee: costs.variableFeeInvestment,
          setupFee: costs.setupFee,
          totalFees: costs.totalFees,
          addonsCost: costs.addonsBaseCost,
          totalEstimated: costs.totalEstimated,
          feeMode: feeMode,
          isFirstRelease: true
        },
        platforms: [...selectedPlatforms, ...(otherPlatform ? [otherPlatform] : [])],
        addons: Object.entries(selectedAddons)
          .filter(([_, selected]) => selected)
          .map(([type]) => type),
        contactData: { ...signupData, contactPhone: `${countryCode} ${signupData.contactPhone}` },
        notifyAdmin: true
      };

      // Upload files first
      let uploadedFileUrls: string[] = [];
      try {
        uploadedFileUrls = await uploadTargetAudienceFiles(authData.user.id);
      } catch (e) {
        console.error("Error uploading files", e);
        toast.error("Error al subir archivos. Se continuará sin ellos.");
      }

      // Add files/urls to payload
      // We need to update the payload types in the edge function too if we pass them here
      // But wait, the edge function expects `target_audience_urls` and `files` inside `filmData`.
      // Let's inject them.
      campaignPayload.filmData = {
        ...campaignPayload.filmData,
        // @ts-ignore
        targetAudienceUrls: filmData.targetAudienceUrls,
        targetAudienceFiles: uploadedFileUrls
      };

      const { error: submitError } = await supabase.functions.invoke('submit-campaign', {
        body: campaignPayload
      });

      if (submitError) {
        console.error("Edge Function Error:", submitError);
        throw new Error("Error al guardar la campaña. Por favor contacta con soporte.");
      }

      // Success handling
      toast.success("¡Cuenta creada y campaña enviada con éxito!");

      if (!authData.session) {
        toast.info("Hemos enviado un correo de confirmación. Por favor revísalo para acceder a tu panel.", {
          duration: 6000,
        });
      } else {
        setUser(authData.user);
        setIsDistributor(true);
      }

      clearDraft();
      navigate("/confirmation");

    } catch (error: any) {
      console.error("Error creating account:", error);
      toast.error(error.message || "Error al crear la cuenta");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!releaseDate || !campaignDates) {
      toast.error("Faltan datos necesarios");
      return;
    }

    if (!user || !isDistributor) {
      toast.error("Debes crear una cuenta primero");
      return;
    }

    await saveCampaign(user.id);
  };

  const saveCampaign = async (distributorId: string) => {
    if (!releaseDate || !campaignDates) return;

    setLoading(true);

    try {
      // Upload files first
      let uploadedFileUrls: string[] = [];
      try {
        uploadedFileUrls = await uploadTargetAudienceFiles(distributorId);
      } catch (e) {
        console.error("Error uploading files", e);
        toast.error("Error al subir archivos. Se continuará sin ellos.");
      }

      // Create film
      const { data: filmRecord, error: filmError } = await supabase
        .from("films")
        .insert({
          distributor_id: distributorId,
          title: filmData.title,
          genre: filmData.genre,
          secondary_genre: filmData.secondaryGenre || null,
          country: filmData.country,
          distributor_name: filmData.distributorName,
          target_audience_text: filmData.targetAudience,
          main_goals: filmData.goals,
          release_date: releaseDate.toISOString().split("T")[0],
          target_audience_urls: filmData.targetAudienceUrls || [],
          target_audience_files: uploadedFileUrls,
        })
        .select()
        .single();

      if (filmError) throw filmError;

      // Create campaign
      const { data: campaignRecord, error: campaignError } = await supabase
        .from("campaigns")
        .insert({
          distributor_id: distributorId,
          film_id: filmRecord.id,
          pre_start_date: campaignDates.preStartDate.toISOString().split("T")[0],
          pre_end_date: campaignDates.preEndDate.toISOString().split("T")[0],
          premiere_weekend_start: campaignDates.premiereWeekendStart.toISOString().split("T")[0],
          premiere_weekend_end: campaignDates.premiereWeekendEnd.toISOString().split("T")[0],
          final_report_date: campaignDates.finalReportDate.toISOString().split("T")[0],
          creatives_deadline: campaignDates.creativesDeadline.toISOString().split("T")[0],
          ad_investment_amount: costs.adInvestment,
          fixed_fee_amount: costs.fixedFeePlatforms,
          variable_fee_amount: costs.variableFeeInvestment,
          setup_fee_amount: costs.setupFee,
          addons_base_amount: costs.addonsBaseCost,
          total_estimated_amount: costs.totalEstimated,
          is_first_release: isFirstRelease,
          contact_name: signupData.contactName || distributor?.contact_name || "",
          contact_email: signupData.contactEmail || distributor?.contact_email || "",
          contact_phone: signupData.contactPhone || distributor?.contact_phone || "",
          additional_comments: signupData.comments,
          status: "en_revision",
        })
        .select()
        .single();

      if (campaignError) throw campaignError;

      // Upload creative assets if any
      try {
        await uploadCreativeAssets(distributorId, campaignRecord.id);
      } catch (e) {
        console.error("Error uploading creative assets", e);
        // Non-fatal, we continue
      }

      // Add platforms
      const platformsToInsert = [...selectedPlatforms];

      // Note: otherPlatform is just a string, simpler to handle separately or treat as platform logic

      // Calculate percentages for insert
      const finalPercentages: Record<string, number> = {};
      const allPlatforms = [...selectedPlatforms];
      if (otherPlatform) allPlatforms.push(otherPlatform);

      if (planningMode === 'simple') {
        const count = allPlatforms.length;
        const share = 100 / count;
        allPlatforms.forEach(p => finalPercentages[p] = share);
      } else {
        // percentage or amount (both maintain sync, so platformPercentages is up to date)
        allPlatforms.forEach(p => {
          finalPercentages[p] = platformPercentages[p] || 0;
        });
      }

      for (const platform of platformsToInsert) {
        await supabase.from("campaign_platforms").insert({
          campaign_id: campaignRecord.id,
          platform_name: platform,
          budget_percent: finalPercentages[platform] || 0
        });
      }

      if (otherPlatform) {
        await supabase.from("campaign_platforms").insert({
          campaign_id: campaignRecord.id,
          platform_name: otherPlatform,
          budget_percent: finalPercentages[otherPlatform] || 0
        });
      }

      // Add addons
      const addonTypes = Object.entries(selectedAddons)
        .filter(([_, selected]) => selected)
        .map(([type]) => type);

      for (const addonType of addonTypes) {
        await supabase.from("campaign_addons").insert({
          campaign_id: campaignRecord.id,
          addon_type: addonType,
        });
      }

      // Notify Admin via Email
      try {
        console.log("SENDING EMAIL NOTIFICATION...", {
          type: 'new_campaign',
          campaignId: campaignRecord.id,
          campaignTitle: filmData.title,
          distributorName: filmData.distributorName,
          recipientEmail: signupData.contactEmail
        });

        const { data, error } = await supabase.functions.invoke('send-email', {
          body: {
            type: 'new_campaign',
            campaignId: campaignRecord.id,
            campaignTitle: filmData.title,
            distributorName: filmData.distributorName || distributor?.company_name || "Desconocido",
            recipientEmail: signupData.contactEmail || distributor?.contact_email
          }
        });

        console.log("EMAIL RESULT:", data, error);

        if (error) console.error("EMAIL FUNCTION ERROR:", error);
      } catch (emailError) {
        console.error("Failed to send notification email (CATCH):", emailError);
      }

      // Clear draft on successful submission
      clearDraft();

      toast.success("¡Solicitud enviada con éxito!");
      navigate("/confirmation");
    } catch (error: any) {
      console.error("Error submitting campaign:", error);
      toast.error(error.message || "Error al enviar la solicitud");
    } finally {
      setLoading(false);
    }
  };

  if (false) { // Remove auth check - allow anonymous navigation
    navigate("/auth?mode=signup&returnTo=/wizard");
    return null;
  }

  return (
    <>
      {/* Draft Recovery Dialog */}
      <AlertDialog open={showDraftDialog} onOpenChange={setShowDraftDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Borrador encontrado</AlertDialogTitle>
            <AlertDialogDescription>
              Hemos encontrado un borrador de una campaña anterior. ¿Quieres continuar donde lo dejaste?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleStartFresh}>
              Empezar de cero
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleContinueDraft}>
              Continuar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Reiniciar configuración?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción borrará todo el progreso actual y comenzarás desde cero. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmReset} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Sí, reiniciar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="min-h-screen bg-background py-12 px-6">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <button onClick={() => navigate("/")} className="block mx-auto">
              <img
                src={logoImfilms}
                alt="IMFILMS"
                className="w-32 md:w-40 cursor-pointer hover:opacity-80 transition-opacity"
              />
            </button>
            <h1 className="font-cinema text-4xl md:text-5xl text-primary">
              Configura tu campaña
            </h1>
            <p className="text-muted-foreground">
              {isFirstRelease ? "Bienvenido a imfilms" : "Bienvenido de nuevo"}
            </p>
          </div>

          {/* Auto-save notification */}
          {hasDraft && (
            <Card className="bg-secondary/10 border-secondary/50 p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 cinema-icon-decorative mt-0.5 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <p className="text-sm text-cinema-ivory">
                    Guardamos automáticamente tu progreso para que no pierdas nada aunque cierres o recargues esta página.
                  </p>
                  <Button
                    onClick={handleResetConfig}
                    variant="outline"
                    size="sm"
                    className="border-destructive/50 text-destructive hover:bg-destructive/10"
                  >
                    <RotateCcw className="w-4 h-4 mr-2 cinema-icon" />
                    Reiniciar configuración
                  </Button>
                </div>
              </div>
            </Card>
          )}

          <WizardProgress
            currentStep={currentStep}
            totalSteps={4}
            onBack={handleBack}
            steps={[
              { title: "Película", subtitle: "Datos y Fechas" },
              { title: "Inversión", subtitle: "Plataformas" },
              { title: "Materiales", subtitle: "Creatividades" },
              { title: "Resumen", subtitle: "Enviar campaña" },
            ]}
          />

          {/* Step 1: Film Data */}
          {currentStep === 1 && (
            <Card className="cinema-card p-8 space-y-6">
              <h2 className="font-cinema text-3xl text-primary">Datos de la película</h2>

              <div className="space-y-4 mb-6">
                <p className="text-cinema-ivory leading-relaxed">
                  Cada estreno es único. Detrás de cada fecha de lanzamiento hay meses de trabajo, talento y una historia que merece encontrarse con su público. Nuestro trabajo es sencillo de explicar y complejo de hacer bien: llenar salas conectando tu película con las personas adecuadas, en el momento exacto.
                </p>
                <p className="text-cinema-ivory leading-relaxed">
                  En los próximos pasos te pediremos algunos detalles clave sobre tu película.
                </p>
                <p className="text-cinema-ivory leading-relaxed">
                  Con esa información podremos diseñar una estrategia a la altura de tu estreno: qué contar, a quién, en qué plataformas y con qué intensidad. Tú pones la película; nosotros nos encargamos de que la conversación alrededor de ella empiece mucho antes de que se apague la luz en la sala.
                </p>
              </div>

              <div className="space-y-8">
                {/* Block 1: Basic Film Data */}
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="title" className="text-cinema-ivory">Título de la película *</Label>
                      <HelpTooltip
                        fieldId="film_title"
                        title="¿Por qué te preguntamos el título?"
                        content="Usamos el título para personalizar comunicaciones, reportes y tu panel. Es la referencia principal de todo lo que hagamos con ese estreno."
                      />
                    </div>
                    <Input
                      id="title"
                      value={filmData.title}
                      onChange={(e) => setFilmData({ ...filmData, title: e.target.value })}
                      className="bg-muted border-border text-foreground"
                    />
                  </div>

                  <div className="grid md:grid-cols-4 gap-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 h-6">
                        <Label htmlFor="genre" className="text-cinema-ivory">Género principal *</Label>
                        <HelpTooltip
                          fieldId="film_genre"
                          title="¿Por qué te preguntamos el género?"
                          content="El género nos ayuda a identificar conflictos con otras campañas similares y a definir las audiencias correctas. También influye en el tipo de creatividad y plataformas recomendadas."
                        />
                      </div>
                      <Select value={filmData.genre} onValueChange={(v) => setFilmData({ ...filmData, genre: v })}>
                        <SelectTrigger className="bg-muted border-border text-foreground">
                          <SelectValue placeholder="Selecciona género" />
                        </SelectTrigger>
                        <SelectContent>
                          {GENRES.map((g) => (
                            <SelectItem key={g} value={g}>{g}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 h-6">
                        <Label htmlFor="secondaryGenre" className="text-cinema-ivory">Género secundario</Label>
                      </div>
                      <Select value={filmData.secondaryGenre} onValueChange={(v) => setFilmData({ ...filmData, secondaryGenre: v })}>
                        <SelectTrigger className="bg-muted border-border text-foreground">
                          <SelectValue placeholder="Opcional" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Ninguno</SelectItem>
                          {GENRES.map((g) => (
                            <SelectItem key={g} value={g}>{g}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 h-6">
                        <Label htmlFor="distributor" className="text-cinema-ivory">Distribuidora / Productora *</Label>
                      </div>
                      <Input
                        id="distributor"
                        value={filmData.distributorName}
                        onChange={(e) => setFilmData({ ...filmData, distributorName: e.target.value })}
                        className="bg-muted border-border text-foreground"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 h-6">
                        <Label htmlFor="country" className="text-cinema-ivory">País de estreno *</Label>
                      </div>
                      <Input
                        id="country"
                        value={filmData.country}
                        onChange={(e) => setFilmData({ ...filmData, country: e.target.value })}
                        className="bg-muted border-border text-foreground"
                      />
                    </div>
                  </div>

                  {filmData.genre === "Otro" && (
                    <div className="space-y-2">
                      <Label htmlFor="otherGenre" className="text-cinema-ivory">¿Cuál? *</Label>
                      <Input
                        id="otherGenre"
                        value={filmData.otherGenre}
                        onChange={(e) => setFilmData({ ...filmData, otherGenre: e.target.value })}
                        className="bg-muted border-border text-foreground"
                        placeholder="Especifica el género"
                      />
                    </div>
                  )}
                </div>

                <div className="w-full h-px bg-cinema-yellow/10" />

                {/* Block 2: Audience & Materials */}
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <Label htmlFor="targetAudience" className="text-lg font-teko text-cinema-ivory">
                      Público Objetivo *
                    </Label>
                    <p className="text-sm text-cinema-ivory/70">
                      Cuéntanos a quién va dirigida tu película.
                    </p>
                    <Textarea
                      id="targetAudience"
                      value={filmData.targetAudience}
                      onChange={(e) => setFilmData({ ...filmData, targetAudience: e.target.value })}
                      maxLength={1000}
                      placeholder="Describe a quién va dirigida la película (edad, género, intereses, hábitos de consumo cultural...)"
                      className="bg-muted border-border text-foreground placeholder:text-muted-foreground/50 focus:border-primary transition-colors min-h-[200px]"
                    />
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-cinema-ivory/60 italic">
                        * Puedes dejar esto en blanco si subes archivos o enlaces
                      </span>
                      <span className="text-xs text-cinema-ivory/40">
                        {filmData.targetAudience.length}/1000
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-lg font-teko text-cinema-ivory uppercase tracking-wider">Material Adicional</Label>
                    <p className="text-sm text-cinema-ivory/70">
                      Si lo prefieres, adjunta enlaces o archivos en lugar de describir.
                    </p>

                    {/* URLs Section */}
                    <div className="bg-cinema-charcoal/40 p-3 rounded border border-cinema-yellow/10">
                      <Label className="text-xs text-cinema-ivory/60 mb-2 block">Enlaces de interés (Press kit, referencias, etc.)</Label>
                      <div className="space-y-2">
                        {filmData.targetAudienceUrls?.map((url, idx) => (
                          <div key={idx} className="flex gap-2">
                            <Input
                              value={url}
                              readOnly
                              className="bg-muted border-border text-foreground h-8 text-xs"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                              onClick={() => {
                                const newUrls = [...(filmData.targetAudienceUrls || [])];
                                newUrls.splice(idx, 1);
                                setFilmData({ ...filmData, targetAudienceUrls: newUrls });
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                        <div className="flex gap-2">
                          <Input
                            id="new-url-input"
                            placeholder="https://"
                            className="bg-muted border-border text-foreground h-8 text-xs placeholder:text-muted-foreground/50"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const val = e.currentTarget.value.trim();
                                if (val) {
                                  setFilmData({ ...filmData, targetAudienceUrls: [...(filmData.targetAudienceUrls || []), val] });
                                  e.currentTarget.value = '';
                                }
                              }
                            }}
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 border-cinema-yellow/30 text-cinema-yellow hover:bg-cinema-yellow/10"
                            onClick={() => {
                              const input = document.getElementById('new-url-input') as HTMLInputElement;
                              const val = input.value.trim();
                              if (val) {
                                setFilmData({ ...filmData, targetAudienceUrls: [...(filmData.targetAudienceUrls || []), val] });
                                input.value = '';
                              }
                            }}
                          >
                            Añadir URL
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Files Section */}
                    <div className="bg-cinema-charcoal/40 p-3 rounded border border-cinema-yellow/10">
                      <Label className="text-xs text-cinema-ivory/60 mb-2 block">Archivos (PDF, Briefs, Presentaciones)</Label>

                      {selectedFiles.length > 0 && (
                        <div className="space-y-2 mb-2">
                          {selectedFiles.map((file, idx) => (
                            <div key={idx} className="flex gap-2 items-center bg-cinema-charcoal/60 p-2 rounded border border-cinema-yellow/10">
                              <FileText className="h-4 w-4 text-cinema-yellow/70" />
                              <span className="text-xs text-cinema-ivory truncate flex-1">{file.name}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                                onClick={() => {
                                  const newFiles = [...selectedFiles];
                                  newFiles.splice(idx, 1);
                                  setSelectedFiles(newFiles);
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="relative">
                        <Input
                          type="file"
                          id="target-audience-files"
                          multiple
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files) {
                              const newFiles = Array.from(e.target.files);
                              setSelectedFiles([...selectedFiles, ...newFiles]);
                            }
                            // Reset value to allow re-selecting same file if needed
                            e.target.value = '';
                          }}
                        />
                        <Label
                          htmlFor="target-audience-files"
                          className="flex items-center justify-center gap-2 w-full p-2 border border-dashed border-cinema-yellow/30 rounded cursor-pointer hover:bg-cinema-yellow/5 transition-colors text-xs text-cinema-yellow"
                        >
                          <Upload className="h-3 w-3" />
                          <span>Subir Archivos</span>
                        </Label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="w-full h-px bg-cinema-yellow/10" />

                {/* Block 3: Goals */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Label className="text-cinema-ivory">Objetivo principal de la campaña *</Label>
                    <HelpTooltip
                      fieldId="campaign_goals"
                      title="¿Por qué te preguntamos los objetivos?"
                      content="Los objetivos nos ayudan a configurar la estrategia correcta: timing, plataformas, creativos y presión publicitaria. Cada objetivo requiere un enfoque diferente."
                    />
                  </div>
                  <div className="grid md:grid-cols-2 gap-3">
                    {GOALS.map((goal) => (
                      <button
                        key={goal}
                        onClick={() => handleGoalToggle(goal)}
                        className={`cinema-card p-4 text-left flex items-center gap-3 ${filmData.goals.includes(goal) ? "border-primary bg-primary/5" : ""
                          }`}
                      >
                        <Checkbox checked={filmData.goals.includes(goal)} className="border-primary data-[state=checked]:bg-primary" />
                        <span className="text-sm">{goal}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="w-full h-px bg-cinema-yellow/10" />

              {/* Block 4: Calendar */}
              <div className="space-y-4">
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2">
                    <h3 className="font-cinema text-xl text-primary">Así trabajamos tu estreno en digital</h3>
                    <HelpTooltip
                      fieldId="campaign_phases"
                      title="¿Por qué te preguntamos las fechas?"
                      content="Las fechas nos permiten definir la pre-campaña, el fin de semana del estreno y la duración óptima."
                    />
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Marcamos tres momentos clave en cada campaña: pre-campaña de 14 días antes del estreno, fin de semana de estreno y cierre con informe final 3 días laborables después del último día de campaña.
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Para llegar con todo afinado, necesitamos recibir las creatividades finales 3 días laborables antes de activar la pre-campaña. Más adelante podrás elegir si prefieres que nuestro equipo se encargue de crear todos los anuncios a partir de tu tráiler o de algunas piezas en bruto que nos compartas.
                  </p>
                </div>

                <Label className="text-cinema-ivory text-lg">Selecciona la fecha oficial de estreno en salas *</Label>
                <p className="text-sm text-muted-foreground">
                  El sistema calculará automáticamente el fin de semana de estreno (viernes-domingo) y todos los plazos de la campaña.
                </p>

                {!manualEndDateMode && (
                  <div className="flex justify-center animate-in fade-in duration-500">
                    <TooltipProvider>
                      <Calendar
                        mode="single"
                        selected={releaseDate}
                        onSelect={setReleaseDate}
                        className="rounded-md border border-border bg-muted pointer-events-auto transition-all duration-300"
                        weekStartsOn={1}
                        modifiers={{
                          creativesDeadline: campaignDates ? [campaignDates.creativesDeadline] : [],
                          preCampaign: campaignDates ? [
                            { from: campaignDates.preStartDate, to: campaignDates.preEndDate }
                          ] : [],
                          premiereWeekend: campaignDates ? [
                            { from: campaignDates.premiereWeekendStart, to: campaignDates.premiereWeekendEnd }
                          ] : [],
                        }}
                        modifiersClassNames={{
                          creativesDeadline: "bg-secondary text-secondary-foreground hover:bg-secondary hover:text-secondary-foreground",
                          preCampaign: "bg-primary/20 text-primary-foreground",
                          premiereWeekend: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                        }}
                        components={{
                          Day: (props) => {
                            const isDeadline = campaignDates && isSameDay(props.date, campaignDates.creativesDeadline);
                            if (isDeadline) {
                              return (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div>
                                      <Day {...props} />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Deadline para enviar las creatividades</p>
                                  </TooltipContent>
                                </Tooltip>
                              );
                            }
                            return <Day {...props} />;
                          }
                        }}
                      />
                    </TooltipProvider>
                  </div>
                )}

                {releaseDate && campaignDates && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="w-full h-px bg-cinema-yellow/10" />

                    {/* Custom End Date Toggle Area */}
                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 space-y-4">
                      <div className="flex items-start gap-4">
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all ${manualEndDateMode ? 'border-primary bg-primary' : 'border-muted-foreground hover:border-primary'}`}
                          onClick={() => setManualEndDateMode(!manualEndDateMode)}
                        >
                          {manualEndDateMode && <div className="w-3 h-3 rounded-full bg-background" />}
                        </div>
                        <div className="flex-1 space-y-2">
                          <h4 className="font-cinema text-xl text-primary leading-none cursor-pointer" onClick={() => setManualEndDateMode(!manualEndDateMode)}>
                            ¿Quieres definir otra fecha de finalización de campaña?
                          </h4>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            Cada película tiene su propio recorrido. Si quieres <span className="text-primary font-bold">reforzar el impacto</span>, mantener la conversación más tiempo o aprovechar un buen boca-oreja, puedes alargar la campaña desde aquí.
                          </p>

                          {manualEndDateMode && (
                            <div className="mt-4 p-4 bg-background/50 rounded-lg border border-primary/20 animate-in zoom-in-95 duration-500">
                              <Label className="text-cinema-ivory block mb-4">Selecciona la nueva fecha de fin</Label>
                              <div className="flex justify-center">
                                <Calendar
                                  mode="single"
                                  selected={campaignEndDate}
                                  onSelect={setCampaignEndDate}
                                  disabled={(date) => date <= releaseDate}
                                  className="bg-muted border border-border rounded-md transition-all duration-300"
                                  weekStartsOn={1}
                                  modifiers={{
                                    creativesDeadline: campaignDates ? [campaignDates.creativesDeadline] : [],
                                    preCampaign: campaignDates ? [
                                      { from: campaignDates.preStartDate, to: campaignDates.preEndDate }
                                    ] : [],
                                    premiereWeekend: campaignDates ? [
                                      { from: campaignDates.premiereWeekendStart, to: campaignDates.premiereWeekendEnd }
                                    ] : [],
                                  }}
                                  modifiersClassNames={{
                                    creativesDeadline: "bg-secondary text-secondary-foreground hover:bg-secondary hover:text-secondary-foreground",
                                    preCampaign: "bg-primary/20 text-primary-foreground",
                                    premiereWeekend: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Milestone Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Deadline Card */}
                      <div className="bg-muted/40 border border-border rounded-xl p-5 space-y-3 relative overflow-hidden group hover:border-primary/30 transition-colors">
                        <div className="flex items-center gap-2 text-primary">
                          <CalendarClock className="w-5 h-5" />
                          <span className="font-cinema text-lg">Deadline creatividades</span>
                        </div>
                        <div className="text-2xl font-teko text-cinema-ivory">
                          {formatDateEs(campaignDates.creativesDeadline)}
                        </div>
                        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-[100px] -mr-8 -mt-8 pointer-events-none" />
                      </div>

                      {/* Pre-campaign Card */}
                      <div className="bg-muted/40 border border-border rounded-xl p-5 space-y-3 relative overflow-hidden group hover:border-primary/30 transition-colors">
                        <div className="flex items-center gap-2 text-primary">
                          <CalendarRange className="w-5 h-5" />
                          <span className="font-cinema text-lg">Pre-campaña</span>
                        </div>
                        <div className="text-2xl font-teko text-cinema-ivory">
                          {formatDateEs(campaignDates.preStartDate)} - {formatDateEs(campaignDates.preEndDate)}
                        </div>
                        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-[100px] -mr-8 -mt-8 pointer-events-none" />
                      </div>

                      {/* Launch Weekend Card */}
                      <div className="bg-muted/40 border border-primary/40 rounded-xl p-5 space-y-3 relative overflow-hidden ring-1 ring-primary/20 bg-primary/5">
                        <div className="flex items-center gap-2 text-primary">
                          <CalendarCheck className="w-5 h-5" />
                          <span className="font-cinema text-lg">Fin de semana estreno</span>
                        </div>
                        <div className="text-2xl font-teko text-primary">
                          {formatDateEs(campaignDates.premiereWeekendStart)} - {formatDateEs(campaignDates.premiereWeekendEnd)}
                        </div>
                      </div>

                      {/* Report Card */}
                      <div className="bg-muted/30 border border-border/50 rounded-xl p-5 space-y-3 relative overflow-hidden opacity-80">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <FileText className="w-5 h-5" />
                          <span className="font-cinema text-lg text-muted-foreground">Este día recibirás el informe final</span>
                        </div>
                        <div className="text-2xl font-teko text-cinema-ivory">
                          {formatDateEs(campaignDates.finalReportDate)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Old Step 2 Removed */}

          {/* Step 2: Platforms & Investment (formerly Step 3) */}
          {
            currentStep === 2 && (
              <Card className="cinema-card p-8 space-y-6">
                <h2 className="font-cinema text-3xl text-primary">Plataformas e inversión</h2>

                <div className="space-y-6">
                  {/* Platform Selection */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <h3 className="font-cinema text-2xl text-primary">Elige dónde quieres que viva tu película</h3>
                      <HelpTooltip
                        fieldId="platforms"
                        title="¿Por qué te preguntamos en qué plataformas?"
                        content="Cada plataforma tiene su lógica y audiencia. Saber dónde quieres aparecer nos ayuda a equilibrar creatividad, formatos y presupuesto para maximizar el impacto del estreno."
                      />
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Cada plataforma es una sala distinta: Instagram, Facebook, TikTok, YouTube… cada una tiene su propio lenguaje, su ritmo y su forma de llenar butacas. Selecciona aquí las plataformas publicitarias donde quieres que se anuncie tu estreno:
                    </p>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {PLATFORMS.map((platform) => {
                        const investmentVal = parseFloat(adInvestment) || 0;
                        const isAboveThreshold = investmentVal >= 30000;
                        const isBonificado = isAboveThreshold ||
                          (selectedPlatforms.length === 0) ||
                          (selectedPlatforms.length > 0 && selectedPlatforms[0] === platform.name);

                        return (
                          <PlatformCard
                            key={platform.name}
                            name={platform.name}
                            description={platform.description}
                            logo={platform.logo}
                            selected={selectedPlatforms.includes(platform.name)}
                            onToggle={() => handlePlatformToggle(platform.name)}
                            setupFee={200}
                            isBonificado={isBonificado}
                            hidePrice={true}
                            hideDescription={true}
                          />
                        );
                      })}
                    </div>

                    <div className="mt-4 space-y-2">
                      <Label htmlFor="other-platform" className="text-cinema-ivory">Otras plataformas (opcional)</Label>
                      <Input
                        id="other-platform"
                        value={otherPlatform}
                        onChange={(e) => setOtherPlatform(e.target.value)}
                        className="bg-muted border-border text-foreground"
                        placeholder="Especifica otras plataformas"
                      />
                    </div>
                  </div>

                  {/* Budget Selection */}
                  {(selectedPlatforms.length > 0 || otherPlatform) && (
                    <div className="mt-8 space-y-8 animate-in fade-in duration-500">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Label className="text-xl text-cinema-ivory">Planificación de presupuesto</Label>
                          <HelpTooltip
                            fieldId="budget_dist"
                            title="¿Cómo quieres distribuir tu inversión?"
                            content="Dividiremos tu presupuesto de forma equilibrada entre las plataformas seleccionadas para maximizar el impacto de tu estreno."
                          />
                        </div>

                        <div className="space-y-3 p-6 bg-primary/5 rounded-lg border border-primary/20">
                          <div className="flex items-center gap-2">
                            <Label htmlFor="investment" className="text-cinema-gold font-bold text-lg">Inversión publicitaria total (€) *</Label>
                          </div>
                          <Input
                            id="investment"
                            type="number"
                            min="3000"
                            step="500"
                            value={adInvestment}
                            onChange={(e) => setAdInvestment(e.target.value)}
                            className="bg-background border-primary/30 text-foreground text-3xl font-bold h-16"
                            placeholder="Mínimo 3.000€"
                          />
                          <p className="text-xs text-muted-foreground">
                            A partir de 3.000€ tu campaña empieza a tener el músculo necesario.
                          </p>
                        </div>


                      </div>

                      {/* Fee Mode Toggle */}
                      {parseFloat(adInvestment) >= 3000 && (
                        <div className="space-y-3 pt-6 border-t border-border/10">
                          <div className="flex items-center gap-2">
                            <Label className="text-cinema-ivory text-lg">¿Cómo prefieres gestionar los fees?</Label>
                            <HelpTooltip
                              fieldId="fee_mode"
                              title="Opciones de fees"
                              content="Puedes sumar nuestros fees a tu inversión publicitaria o integrarlos dentro de tu presupuesto total."
                            />
                          </div>

                          <div className="grid md:grid-cols-2 gap-4">
                            <div
                              onClick={() => setFeeMode('integrated')}
                              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${feeMode === 'integrated' ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`w-4 h-4 rounded-full border-2 mt-1 flex items-center justify-center ${feeMode === 'integrated' ? 'border-primary bg-primary' : 'border-muted-foreground'}`}>
                                  {feeMode === 'integrated' && <div className="w-2 h-2 rounded-full bg-background" />}
                                </div>
                                <div>
                                  <p className="font-semibold text-cinema-ivory">Integrar fees en mi presupuesto</p>
                                  <p className="text-sm text-muted-foreground mt-1">Los fees se descuentan del total.</p>
                                </div>
                              </div>
                            </div>
                            <div
                              onClick={() => setFeeMode('additional')}
                              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${feeMode === 'additional' ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`w-4 h-4 rounded-full border-2 mt-1 flex items-center justify-center ${feeMode === 'additional' ? 'border-primary bg-primary' : 'border-muted-foreground'}`}>
                                  {feeMode === 'additional' && <div className="w-2 h-2 rounded-full bg-background" />}
                                </div>
                                <div>
                                  <p className="font-semibold text-cinema-ivory">Sumar fees a mi inversión</p>
                                  <p className="text-sm text-muted-foreground mt-1">Los fees se añaden al total.</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Cost Summary */}
                      {parseFloat(adInvestment) >= 3000 && (
                        <div className="animate-in fade-in duration-500">
                          <CostSummary costs={costs} isFirstRelease={isFirstRelease} compact showPrices={isDistributor} feeMode={feeMode} />
                        </div>
                      )}
                    </div>
                  )}


                </div>
              </Card>
            )
          }

          {/* Step 3: Creative Assets (formerly Step 4) */}
          {
            currentStep === 3 && (
              <Card className="cinema-card p-8 space-y-6">
                <div className="space-y-4">
                  <h2 className="font-cinema text-3xl text-primary">Materiales y Creatividades</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Sube las piezas creativas de tu campaña (trailers, clips, posters, gráficas). Si aún no las tienes listas, no te preocupes, este paso es <strong>opcional</strong>.
                  </p>

                  {campaignDates && (
                    <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg flex items-start gap-4">
                      <CalendarClock className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                      <div>
                        <p className="font-semibold text-cinema-ivory">Fecha límite de entrega</p>
                        <p className="text-sm text-muted-foreground">
                          Para garantizar el inicio de la campaña a tiempo, necesitamos los materiales finales antes del <span className="text-primary font-bold">{formatDateEs(campaignDates.creativesDeadline)}</span>.
                        </p>
                      </div>
                    </div>
                  )}

                  <a
                    href="/Guía de creativos.pdf"
                    download
                    className="flex items-center gap-4 p-4 rounded-lg border border-border bg-muted/30 hover:bg-muted/60 hover:border-primary/40 transition-all group"
                  >
                    <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-cinema-ivory text-sm">Guía de especificaciones y buenas prácticas (Guía básica)</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Encuentra la guía completa dentro de la seccion de creatividades una vez creada tu campaña</p>
                    </div>
                    <Download className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                  </a>
                </div>

                <div className="space-y-4">
                  <Label className="text-cinema-ivory">Subir archivos</Label>
                  <div className="border-2 border-dashed border-border rounded-xl p-8 text-center space-y-4 hover:border-primary/50 transition-colors">
                    <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Upload className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <Button
                        variant="secondary"
                        onClick={() => document.getElementById('creative-assets')?.click()}
                      >
                        Seleccionar archivos
                      </Button>
                      <input
                        id="creative-assets"
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files) {
                            setCreativeAssets(prev => [...prev, ...Array.from(e.target.files!)]);
                          }
                        }}
                      />
                      <p className="text-sm text-muted-foreground mt-2">
                        Formatos permitidos: MP4, MOV, JPG, PNG, PDF. Máx 50MB por archivo.
                      </p>
                    </div>
                  </div>

                  {creativeAssets.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      {creativeAssets.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg border border-border">
                          <div className="flex items-center gap-3 truncate">
                            <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                            <span className="text-sm truncate">{file.name}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setCreativeAssets(prev => prev.filter((_, i) => i !== index))}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            )
          }

          {/* Step 4: Final Summary (formerly Step 5) */}
          {
            currentStep === 4 && (
              <div className="space-y-6">
                {!isDistributor && (
                  <Card className="cinema-card p-6 bg-primary/5 border-primary/20">
                    <div className="text-center space-y-3">
                      <p className="text-cinema-ivory leading-relaxed">
                        <strong>Ya tienes tu campaña definida.</strong> Solo falta crear tu cuenta de distribuidora para ver el presupuesto estimado y enviar la solicitud.
                      </p>
                      <p className="text-sm text-muted-foreground">
                        ¿Ya tienes cuenta?{" "}
                        <button
                          onClick={() => setShowAuthModal(true)}
                          className="text-primary hover:text-secondary font-semibold underline transition-colors"
                        >
                          Inicia sesión aquí
                        </button>
                        {" "}para ver el presupuesto sin perder la información del formulario.
                      </p>
                    </div>
                  </Card>
                )}

                {isDistributor && justRegistered && (
                  <Card className="cinema-card p-6 bg-green-500/10 border-green-500/30">
                    <p className="text-cinema-ivory text-center leading-relaxed">
                      ✓ <strong>¡Cuenta creada con éxito!</strong> Ahora puedes ver tu presupuesto completo y enviar la campaña.
                    </p>
                  </Card>
                )}

                {isDistributor && !justRegistered && (
                  <Card className="cinema-card p-6 bg-primary/5 border-primary/20">
                    <p className="text-cinema-ivory text-center">
                      Revisa tus datos y confirma el envío de la campaña. Estos datos de distribuidora se usarán para la facturación y seguimiento del estreno.
                    </p>
                  </Card>
                )}

                <Card className="cinema-card p-8 space-y-6">
                  <h2 className="font-cinema text-3xl text-primary">Resumen de tu campaña</h2>

                  <div className="space-y-4">
                    <div>
                      <h3 className="font-cinema text-xl text-primary mb-2">Película</h3>
                      <p className="text-cinema-ivory"><strong>{filmData.title}</strong></p>
                      <p className="text-sm text-muted-foreground">{filmData.genre} | {filmData.country} | {filmData.distributorName}</p>
                      {releaseDate && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Estreno: <strong>{formatDateEs(releaseDate)}</strong>
                        </p>
                      )}
                    </div>

                    {campaignDates && (
                      <div>
                        <h3 className="font-cinema text-xl text-primary mb-2">Calendario</h3>
                        <div className="grid md:grid-cols-3 gap-2 text-sm">
                          <div>
                            <p className="text-muted-foreground">Pre-campaña:</p>
                            <p className="text-cinema-ivory">{formatDateShort(campaignDates.preStartDate)} - {formatDateShort(campaignDates.preEndDate)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Estreno:</p>
                            <p className="text-cinema-ivory">{formatDateShort(campaignDates.premiereWeekendStart)} - {formatDateShort(campaignDates.premiereWeekendEnd)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Deadline creatividades:</p>
                            <p className="text-cinema-ivory">{formatDateShort(campaignDates.creativesDeadline)}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div>
                      <h3 className="font-cinema text-xl text-primary mb-2">Plataformas</h3>
                      <div className="space-y-1">
                        {(() => {
                          const all = [...selectedPlatforms];
                          if (otherPlatform) all.push(otherPlatform);

                          // Calculate display percentages
                          const displayPercentages = planningMode === 'simple'
                            ? all.reduce((acc, p) => ({ ...acc, [p]: 100 / (all.length || 1) }), {} as Record<string, number>)
                            : platformPercentages;

                          return all.map(p => {
                            const grossTotal = parseFloat(adInvestment) || 0;
                            const grossAmount = planningMode === 'simple'
                              ? (grossTotal / (all.length || 1))
                              : (platformAmounts[p] || 0);
                            const reductionRatio = costs.effectiveAdInvestment / (grossTotal || 1);
                            const netAmount = Math.round(grossAmount * reductionRatio);

                            return (
                              <div key={p} className="flex justify-between items-center text-sm text-cinema-ivory border-b border-white/10 py-1 last:border-0">
                                <span>{p}</span>
                                <div className="flex flex-col items-end">
                                  <span className="text-muted-foreground">{displayPercentages[p]?.toFixed(0)}%</span>
                                  {feeMode === 'integrated' && (
                                    <span className="text-[10px] text-primary font-bold">
                                      Neta: {netAmount.toLocaleString()}€
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-cinema text-xl text-primary mb-2">Add-ons</h3>
                      <p className="text-cinema-ivory">
                        {Object.entries(selectedAddons)
                          .filter(([_, selected]) => selected)
                          .map(([key]) => {
                            const names: any = {
                              adaptacion: "Adaptación de contenido",
                              microsite: "Microsite oficial",
                              emailWhatsapp: "Campañas email/WhatsApp",
                            };
                            return names[key];
                          })
                          .join(", ") || "Ninguno"}
                      </p>
                    </div>
                  </div>
                </Card>

                {isDistributor && <CostSummary costs={costs} isFirstRelease={isFirstRelease} showPrices={true} />}

                {!isDistributor ? (
                  <Card className="cinema-card p-8 space-y-6">
                    <div className="space-y-3 mb-6">
                      <h2 className="font-cinema text-3xl text-primary">Crea tu cuenta de distribuidora</h2>
                      <p className="text-muted-foreground">
                        Crear tu cuenta es gratis y solo te llevará un minuto. Así podrás ver el presupuesto estimado, guardar el histórico de tus estrenos y seguir el estado de cada campaña.
                      </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="company-name" className="text-cinema-ivory">Nombre de la empresa / distribuidora *</Label>
                        <Input
                          id="company-name"
                          value={signupData.companyName}
                          onChange={(e) => setSignupData({ ...signupData, companyName: e.target.value })}
                          className="bg-muted border-border text-foreground"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="contact-name" className="text-cinema-ivory">Nombre y apellidos (contacto) *</Label>
                        <Input
                          id="contact-name"
                          value={signupData.contactName}
                          onChange={(e) => setSignupData({ ...signupData, contactName: e.target.value })}
                          className="bg-muted border-border text-foreground"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="contact-email" className="text-cinema-ivory">Email *</Label>
                        <div className="flex gap-2">
                          <Input
                            id="contact-email"
                            type="email"
                            value={signupData.contactEmail}
                            onChange={(e) => {
                              setSignupData({ ...signupData, contactEmail: e.target.value });
                              // Reset verification if email changes after being verified
                              if (step5VerificationState !== "form") {
                                setStep5VerificationState("form");
                                setStep5VerificationCode("");
                              }
                            }}
                            className="bg-muted border-border text-foreground flex-1"
                            placeholder="tu@email.com"
                            required
                            disabled={step5VerificationState === "verified"}
                          />
                          {step5VerificationState === "verified" ? (
                            <div className="flex items-center gap-2 px-4 py-2 bg-green-900/30 border border-green-600/50 rounded-md text-green-400 text-sm">
                              <Check className="w-4 h-4" /> Verificado
                            </div>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleStep5SendVerification}
                              disabled={!signupData.contactEmail || step5VerificationLoading}
                              className="border-primary text-primary hover:bg-primary hover:text-primary-foreground whitespace-nowrap"
                            >
                              {step5VerificationLoading ? <Loader2 className="w-4 h-4 animate-spin" /> :
                                step5VerificationState === "code" ? "Reenviar" : "Verificar email"}
                            </Button>
                          )}
                        </div>

                        {/* OTP Code Input */}
                        {step5VerificationState === "code" && (
                          <div className="mt-4 p-4 bg-muted/30 rounded-lg border border-border space-y-4 animate-in fade-in slide-in-from-top-2">
                            <p className="text-sm text-cinema-ivory">
                              Introduce el código de 4 dígitos enviado a <span className="text-primary">{signupData.contactEmail}</span>
                            </p>
                            <div className="flex items-center gap-4">
                              <InputOTP
                                maxLength={4}
                                value={step5VerificationCode}
                                onChange={setStep5VerificationCode}
                              >
                                <InputOTPGroup className="gap-2">
                                  <InputOTPSlot index={0} className="w-12 h-12 text-xl border-primary/50" />
                                  <InputOTPSlot index={1} className="w-12 h-12 text-xl border-primary/50" />
                                  <InputOTPSlot index={2} className="w-12 h-12 text-xl border-primary/50" />
                                  <InputOTPSlot index={3} className="w-12 h-12 text-xl border-primary/50" />
                                </InputOTPGroup>
                              </InputOTP>
                              <Button
                                type="button"
                                onClick={handleStep5VerifyCode}
                                disabled={step5VerificationCode.length !== 4 || step5VerificationLoading}
                                className="bg-cinema-yellow hover:bg-cinema-yellow/90 text-black"
                              >
                                {step5VerificationLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar"}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="contact-phone" className="text-cinema-ivory">Teléfono *</Label>
                        <div className="flex gap-2">
                          <Select value={countryCode} onValueChange={setCountryCode}>
                            <SelectTrigger className="w-[100px] bg-muted border-border text-foreground">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="+34">🇪🇸 +34</SelectItem>
                              <SelectItem value="+1">🇺🇸 +1</SelectItem>
                              <SelectItem value="+44">🇬🇧 +44</SelectItem>
                              <SelectItem value="+33">🇫🇷 +33</SelectItem>
                              <SelectItem value="+49">🇩🇪 +49</SelectItem>
                              <SelectItem value="+39">🇮🇹 +39</SelectItem>
                              <SelectItem value="+351">🇵🇹 +351</SelectItem>
                              <SelectItem value="+52">🇲🇽 +52</SelectItem>
                              <SelectItem value="+54">🇦🇷 +54</SelectItem>
                              <SelectItem value="+55">🇧🇷 +55</SelectItem>
                              <SelectItem value="+56">🇨🇱 +56</SelectItem>
                              <SelectItem value="+57">🇨🇴 +57</SelectItem>
                              <SelectItem value="+58">🇻🇪 +58</SelectItem>
                              <SelectItem value="+51">🇵🇪 +51</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            id="contact-phone"
                            type="tel"
                            value={signupData.contactPhone}
                            onChange={(e) => setSignupData({ ...signupData, contactPhone: e.target.value })}
                            className="bg-muted border-border text-foreground flex-1"
                            placeholder="612 345 678"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="password" className="text-cinema-ivory">Contraseña *</Label>
                        <div className="relative">
                          <Input
                            id="password"
                            type={showStep5Password ? "text" : "password"}
                            value={signupData.password}
                            onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                            className="bg-muted border-border text-foreground pr-10"
                            placeholder="Mínimo 6 caracteres"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowStep5Password(!showStep5Password)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
                          >
                            {showStep5Password ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="comments" className="text-cinema-ivory">Comentarios adicionales</Label>
                      <Textarea
                        id="comments"
                        value={signupData.comments}
                        onChange={(e) => setSignupData({ ...signupData, comments: e.target.value })}
                        className="bg-muted border-border text-foreground min-h-24"
                        placeholder="Cualquier información adicional que quieras compartir con nosotros"
                      />
                    </div>
                  </Card>
                ) : (
                  <Card className="cinema-card p-8 space-y-6">
                    <h2 className="font-cinema text-3xl text-primary">Datos de tu distribuidora</h2>
                    <div className="bg-muted/30 p-6 rounded-lg border border-border space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Distribuidora</p>
                          <p className="text-cinema-yellow font-semibold text-lg">{distributor?.company_name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Contacto</p>
                          <p className="text-cinema-ivory font-semibold">{distributor?.contact_name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Email</p>
                          <p className="text-cinema-ivory">{distributor?.contact_email}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Teléfono</p>
                          <p className="text-cinema-ivory">{distributor?.contact_phone || "—"}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="comments" className="text-cinema-ivory">Comentarios adicionales</Label>
                      <Textarea
                        id="comments"
                        value={signupData.comments}
                        onChange={(e) => setSignupData({ ...signupData, comments: e.target.value })}
                        className="bg-muted border-border text-foreground min-h-24"
                        placeholder="Cualquier información adicional que quieras compartir con nosotros"
                      />
                    </div>
                  </Card>
                )}
              </div>
            )
          }

          {/* Navigation buttons */}
          <div className="flex justify-between items-center pt-6">
            {currentStep > 1 && (
              <Button
                onClick={handleBack}
                variant="outline"
                className="border-primary text-primary hover:bg-primary/10"
              >
                ← Volver
              </Button>
            )}

            {currentStep < 4 ? (
              <Button
                onClick={handleNext}
                className="ml-auto bg-primary text-primary-foreground hover:bg-secondary cinema-glow"
              >
                Siguiente →
              </Button>
            ) : (
              <>
                {!isDistributor ? (
                  <Button
                    onClick={handleCreateAccount}
                    disabled={loading || !signupData.companyName || !signupData.contactName || !signupData.contactEmail || !signupData.contactPhone || !signupData.password || step5VerificationState !== "verified"}
                    className="ml-auto bg-primary text-primary-foreground hover:bg-secondary cinema-glow text-lg px-8 py-6"
                  >
                    {loading ? "Creando cuenta..." : step5VerificationState !== "verified" ? "Verifica tu email para continuar" : "Crear cuenta y ver mi presupuesto"}
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="ml-auto bg-primary text-primary-foreground hover:bg-secondary cinema-glow text-lg px-8 py-6"
                  >
                    {loading ? "Enviando..." : "Confirmar y enviar campaña"}
                  </Button>
                )}
              </>
            )}
          </div>
        </div >
      </div >

      {/* Auth Modal */}
      < AuthModal
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
        onSuccess={() => {
          setShowAuthModal(false);
          // The auth state listener will automatically update isDistributor
        }}
      />

      {/* Onboarding Tour */}
      {
        showOnboarding && (
          <OnboardingTour
            onComplete={(persist) => completeOnboarding(persist)}
            onSkip={(persist) => skipOnboarding(persist)}
          />
        )
      }

      {/* Global Help Button */}
      <GlobalHelpButton context={
        currentStep === 1 ? "wizard" :
          currentStep === 2 ? "inversión" :
            currentStep === 3 ? "creatividades" :
              "campaña"
      } />
    </>
  );
};

export default QuickWizard;
