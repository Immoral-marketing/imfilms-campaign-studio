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
import { Clapperboard, Globe, Mail, Info, RotateCcw, CalendarClock, CalendarRange, CalendarCheck, FileText, ArrowLeft, Check, Loader2, Eye, EyeOff } from "lucide-react";
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
import { isSameDay } from "date-fns";
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
    goals: string[];
  };
  releaseDate?: string;
  campaignEndDate?: string;
  manualEndDateMode?: boolean;
  selectedPlatforms: string[];
  otherPlatform: string;
  adInvestment: string;
  feeMode: FeeMode;
  distributeEqually: boolean;
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
}

const Wizard = () => {
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
    goals: [] as string[],
  });

  // Step 2: Calendar
  const [releaseDate, setReleaseDate] = useState<Date | undefined>(undefined);
  const [campaignEndDate, setCampaignEndDate] = useState<Date | undefined>(undefined);
  const [manualEndDateMode, setManualEndDateMode] = useState(false);

  // Step 3: Platforms & Investment
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [otherPlatform, setOtherPlatform] = useState("");
  const [adInvestment, setAdInvestment] = useState("");
  const [feeMode, setFeeMode] = useState<FeeMode>('additional');
  const [distributeEqually, setDistributeEqually] = useState(true);
  const [platformPercentages, setPlatformPercentages] = useState<Record<string, number>>({});

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
      distributeEqually,
      platformPercentages,
      selectedAddons,
      contactData: signupData,
      isFirstRelease,
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
    distributeEqually,
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

  const loadDraft = () => {
    const savedDraft = localStorage.getItem(WIZARD_DRAFT_KEY);
    if (!savedDraft) return;

    try {
      const draft: WizardDraft = JSON.parse(savedDraft);
      setCurrentStep(draft.currentStep);
      setFilmData({ ...draft.filmData, secondaryGenre: draft.filmData.secondaryGenre || "" });
      setReleaseDate(draft.releaseDate ? new Date(draft.releaseDate) : undefined);
      setCampaignEndDate(draft.campaignEndDate ? new Date(draft.campaignEndDate) : undefined);
      setManualEndDateMode(draft.manualEndDateMode || false);
      setSelectedPlatforms(draft.selectedPlatforms);
      setOtherPlatform(draft.otherPlatform);
      setAdInvestment(draft.adInvestment);
      setFeeMode(draft.feeMode || 'additional');
      setDistributeEqually(draft.distributeEqually ?? true);
      setPlatformPercentages(draft.platformPercentages || {});
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
      goals: [],
    });
    setReleaseDate(undefined);
    setCampaignEndDate(undefined);
    setManualEndDateMode(false);
    setSelectedPlatforms([]);
    setOtherPlatform("");
    setAdInvestment("");
    setFeeMode('additional');
    setDistributeEqually(true);
    setPlatformPercentages({});
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
      const newPlatforms = prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform];

      // Reset percentages if toggling platforms while in manual mode to avoid inconsistency
      if (!distributeEqually) {
        const count = newPlatforms.length;
        if (count > 0) {
          const equalShare = parseFloat((100 / count).toFixed(2));
          const newPercentages: Record<string, number> = {};
          newPlatforms.forEach(p => {
            newPercentages[p] = equalShare;
          });
          // Fix rounding error on last item
          if (count > 0) {
            const currentSum = Object.values(newPercentages).reduce((a, b) => a + b, 0);
            const diff = 100 - currentSum;
            if (diff !== 0) {
              newPercentages[newPlatforms[newPlatforms.length - 1]] += diff;
            }
          }
          setPlatformPercentages(newPercentages);
        } else {
          setPlatformPercentages({});
        }
      }
      return newPlatforms;
    });
  };

  const handlePercentageChange = (platform: string, value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0 || numValue > 100) return;

    setPlatformPercentages(prev => ({
      ...prev,
      [platform]: numValue
    }));
  };

  const handleNext = () => {
    // Validate current step
    if (currentStep === 1) {
      try {
        filmSchema.parse({
          title: filmData.title,
          genre: filmData.genre,
          country: filmData.country,
          distributorName: filmData.distributorName,
        });
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          toast.error(error.errors[0].message);
          return;
        }
      }
    } else if (currentStep === 2) {
      if (!releaseDate) {
        toast.error("Por favor selecciona la fecha de estreno");
        return;
      }
      // Block if high conflict detected
      if (conflictResult && conflictResult.level === 'high') {
        toast.error("Conflicto detectado. Por favor ajusta fechas o audiencia antes de continuar.");
        return;
      }
    } else if (currentStep === 3) {
      if (selectedPlatforms.length === 0) {
        toast.error("Por favor selecciona al menos una plataforma");
        return;
      }
      if (!distributeEqually) {
        // Filtrar porcentajes solo de las plataformas seleccionadas
        const relevantPercentages: Record<string, number> = {};
        let total = 0;
        selectedPlatforms.forEach(p => {
          const val = platformPercentages[p] || 0;
          relevantPercentages[p] = val;
          total += val;
        });

        if (Math.abs(total - 100) > 0.5) { // Un poco de tolerancia
          toast.error(`La suma de porcentajes debe ser 100%. Actual: ${total.toFixed(2)}%`);
          return;
        }
      }
      const validation = validateInvestment(
        parseFloat(adInvestment) || 0,
        feeMode,
        costs.effectiveAdInvestment
      );
      if (!validation.valid) {
        toast.error(validation.error);
        return;
      }
    }

    if (currentStep < 5) {
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

      // Add platforms
      const platformsToInsert = [...selectedPlatforms];

      // Note: otherPlatform is just a string, simpler to handle separately or treat as platform logic

      // Calculate percentages for insert
      const finalPercentages: Record<string, number> = {};
      const allPlatforms = [...selectedPlatforms];
      if (otherPlatform) allPlatforms.push(otherPlatform);

      if (distributeEqually) {
        const count = allPlatforms.length;
        const share = 100 / count;
        allPlatforms.forEach(p => finalPercentages[p] = share);
      } else {
        allPlatforms.forEach(p => {
          finalPercentages[p] = platformPercentages[p] || 0;
          // Si added 'otherPlatform' y no estaba en el estado, darle 0 o manejarlo?
          // Asumimos que si no está en percentages es 0, pero debería estar validado.
          // Para 'otherPlatform' es un caso especial si no tiene input.
          // Vamos a simplificar: si hay 'otherPlatform', le asignamos el resto si falta o 0.
        });
        // If other platform exists and wasn't in the explicit list logic (since it's a separate input),
        // we might have an issue. Let's assume for now user only percents the main list.
        // Wait, the requirement says "divide equally" or "user defines".
        // If user defines, we should probably include 'otherPlatform' in the inputs?
        // The current UI has 'otherPlatform' as a separate input field below the cards.
        // Logic adjustment: add 'otherPlatform' to the percentage distribution UI if it has a value.
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

          <WizardProgress currentStep={currentStep} totalSteps={5} />

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

              <div className="grid md:grid-cols-2 gap-6">
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

                <div className="grid grid-cols-2 gap-4">
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
                    <div className="flex items-center gap-2 h-6"> {/* Fixed height wrapper for alignment */}
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

                <div className="space-y-2">
                  <Label htmlFor="country" className="text-cinema-ivory">País de estreno *</Label>
                  <Input
                    id="country"
                    value={filmData.country}
                    onChange={(e) => setFilmData({ ...filmData, country: e.target.value })}
                    className="bg-muted border-border text-foreground"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="distributor" className="text-cinema-ivory">Distribuidora / Productora *</Label>
                  <Input
                    id="distributor"
                    value={filmData.distributorName}
                    onChange={(e) => setFilmData({ ...filmData, distributorName: e.target.value })}
                    className="bg-muted border-border text-foreground"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="text-cinema-ivory">Objetivo principal de la campaña</Label>
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

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="audience" className="text-cinema-ivory">Define la audiencia objetivo</Label>
                  <HelpTooltip
                    fieldId="target_audience"
                    title="¿Por qué te preguntamos por tu público?"
                    content="Cuanto mejor entendamos a quién va dirigida tu película, más fino será el targeting. Mezclamos tus inputs con nuestros datos para elegir audiencias con mayor intención de compra."
                  />
                </div>
                <Textarea
                  id="audience"
                  value={filmData.targetAudience}
                  onChange={(e) => setFilmData({ ...filmData, targetAudience: e.target.value })}
                  className="bg-muted border-border text-foreground min-h-32"
                  placeholder="Si ya tenéis definido el público objetivo de tu película, danos aquí el máximo nivel de detalle posible: edad, géneros, intereses, tipo de cine que consumen, ciudades clave…"
                />
              </div>
            </Card>
          )}

          {/* Step 2: Calendar */}
          {currentStep === 2 && (
            <Card className="cinema-card p-8 space-y-6">
              <h2 className="font-cinema text-3xl text-primary">Calendario y momentos clave</h2>

              <div className="space-y-4">
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2">
                    <h3 className="font-cinema text-xl text-primary">Así trabajamos tu estreno en digital</h3>
                    <HelpTooltip
                      fieldId="campaign_phases"
                      title="¿Por qué te preguntamos las fechas?"
                      content="Las fechas nos permiten definir la pre-campaña, el fin de semana del estreno y la duración óptima. Nuestro algoritmo también las usa para evitar conflictos con otras campañas similares."
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

                <div className="flex justify-center">
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
              </div>

              {/* Conflict Detection Alert */}
              {releaseDate && hasCheckedConflicts && conflictResult && (
                <div className="animate-in fade-in duration-500">
                  <ConflictAlert
                    level={conflictResult.level}
                    conflicts={conflictResult.conflicts}
                    isAdmin={isAdmin}
                    onModifyDates={() => {
                      setReleaseDate(undefined);
                      setCampaignEndDate(undefined);
                      setHasCheckedConflicts(false);
                      toast.info("Modifica la fecha de estreno para revisar conflictos");
                    }}
                  />
                </div>
              )}

              {releaseDate && campaignDates && (
                <div className="space-y-6 pt-6 border-t border-border animate-in fade-in duration-500">
                  <div className="space-y-6">
                    <div className="flex items-start gap-4 p-6 bg-cinema-gold/10 border border-cinema-gold/30 rounded-lg">
                      <Checkbox
                        id="manual-end-date"
                        checked={manualEndDateMode}
                        onCheckedChange={(checked) => {
                          setManualEndDateMode(checked as boolean);
                          if (!checked) {
                            // Restaurar fecha por defecto al desmarcar
                            setCampaignEndDate(campaignDates.premiereWeekendEnd);
                          } else {
                            // Al activar modo manual, si no hay fecha personalizada, usar la fecha por defecto
                            if (!campaignEndDate || campaignEndDate === campaignDates.premiereWeekendEnd) {
                              setCampaignEndDate(campaignDates.premiereWeekendEnd);
                            }
                          }
                        }}
                        className="mt-1 flex-shrink-0"
                      />
                      <div className="space-y-3 flex-1">
                        <Label
                          htmlFor="manual-end-date"
                          className="text-base text-cinema-ivory font-semibold cursor-pointer block"
                        >
                          ¿Quieres definir otra fecha de finalización de campaña?
                        </Label>
                        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                          <p>
                            Por defecto, la campaña termina el <span className="text-cinema-gold font-medium">domingo del fin de semana del estreno</span>, el punto natural donde la mayoría de títulos consolidan su rendimiento.
                          </p>
                          <p>
                            Pero cada película tiene su propio recorrido. Si quieres <span className="text-cinema-ivory font-medium">reforzar el impacto</span>, mantener la conversación más tiempo o aprovechar un buen boca-oreja, puedes alargar la campaña desde aquí.
                          </p>
                          <p className="text-cinema-gold/90 text-xs italic pt-1">
                            Y no te preocupes: si tu película empieza a romper taquilla, siempre podrás extender la campaña en cualquier momento. El éxito también se gestiona sobre la marcha.
                          </p>
                        </div>
                      </div>
                    </div>

                    {manualEndDateMode && (
                      <div className="space-y-4 animate-in fade-in duration-300">
                        <Label className="text-cinema-ivory text-lg">Fecha final de campaña personalizada</Label>
                        <p className="text-sm text-muted-foreground">
                          Selecciona una fecha posterior al domingo del fin de semana de estreno ({formatDateShort(campaignDates.premiereWeekendEnd)})
                        </p>
                        <div className="flex justify-center">
                          <Calendar
                            mode="single"
                            selected={campaignEndDate}
                            onSelect={setCampaignEndDate}
                            disabled={(date) => date < campaignDates.premiereWeekendEnd}
                            defaultMonth={releaseDate}
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
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <Card className="bg-secondary/10 border-secondary/50 p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <CalendarClock className="w-4 h-4 cinema-icon-decorative" />
                        <p className="text-xs text-muted-foreground font-semibold">Deadline creatividades</p>
                      </div>
                      <p className="text-sm text-cinema-ivory">
                        {formatDateShort(campaignDates.creativesDeadline)}
                      </p>
                    </Card>

                    <Card className="bg-primary/10 border-primary/30 p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <CalendarRange className="w-4 h-4 cinema-icon-decorative" />
                        <p className="text-xs text-muted-foreground font-semibold">Pre-campaña</p>
                      </div>
                      <p className="text-sm text-cinema-ivory">
                        {formatDateShort(campaignDates.preStartDate)} - {formatDateShort(campaignDates.preEndDate)}
                      </p>
                    </Card>

                    <Card className="bg-primary/20 border-primary p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <CalendarCheck className="w-4 h-4 cinema-icon-decorative" />
                        <p className="text-xs text-muted-foreground font-semibold">Fin de semana estreno</p>
                      </div>
                      <p className="text-sm text-cinema-ivory">
                        {formatDateShort(campaignDates.premiereWeekendStart)} - {formatDateShort(campaignDates.premiereWeekendEnd)}
                      </p>
                    </Card>

                    <Card className="bg-muted p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 cinema-icon-decorative" />
                        <p className="text-xs text-muted-foreground font-semibold">Este día recibirás el informe con los resultados de la campaña</p>
                      </div>
                      <p className="text-sm text-cinema-ivory">
                        {formatDateShort(campaignDates.finalReportDate)}
                      </p>
                    </Card>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Step 3: Platforms & Investment */}
          {currentStep === 3 && (
            <Card className="cinema-card p-8 space-y-6">
              <h2 className="font-cinema text-3xl text-primary">Plataformas e inversión</h2>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-cinema text-2xl text-primary">Elige dónde quieres que viva tu película</h3>
                    <HelpTooltip
                      fieldId="platforms"
                      title="¿Por qué te preguntamos en qué plataformas?"
                      content="Cada plataforma tiene su lógica y audiencia. Saber dónde quieres aparecer nos ayuda a equilibrar creatividad, formatos y presupuesto para maximizar el impacto del estreno."
                    />
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Cada plataforma es una sala distinta: Instagram, Facebook, TikTok, YouTube… cada una tiene su propio lenguaje, su ritmo y su forma de llenar butacas. Aquí puedes decidir en qué escenarios quieres que aparezca tu estreno y verás cómo la inversión y los fees se actualizan en tiempo real según las ventanas que elijas.
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Cuando nos cuentes al detalle cuál es la audiencia objetivo de tu película, haremos un análisis profundo y te propondremos la combinación de plataformas que mejor encaje con tu estreno. Si alguna recomendación difiere de tu previsión inicial, te explicaremos el porqué con datos y experiencia, pero la decisión final será siempre tuya. Nosotros ponemos el criterio y la estrategia; tú mantienes el control de cómo y dónde se proyecta tu campaña.
                  </p>
                  <p className="text-sm text-muted-foreground font-medium">
                    Selecciona aquí las plataformas publicitarias donde quieres que se anuncie tu estreno:
                  </p>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  {PLATFORMS.map((platform) => (
                    <PlatformCard
                      key={platform.name}
                      name={platform.name}
                      description={platform.description}
                      logo={platform.logo}
                      selected={selectedPlatforms.includes(platform.name)}
                      onToggle={() => handlePlatformToggle(platform.name)}
                    />
                  ))}
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

                {/* Percentage Distribution */}
                {(selectedPlatforms.length > 0 || otherPlatform) && (
                  <div className="mt-8 p-6 rounded-lg border border-border bg-card/50 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Label className="text-lg text-cinema-ivory">Distribución del presupuesto</Label>
                        <HelpTooltip
                          fieldId="budget_dist"
                          title="Distribución"
                          content="Decide cuánto peso quieres dar a cada plataforma. Si no lo tienes claro, déjalo en automático y nosotros lo equilibraremos."
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="distribute-equally"
                          checked={distributeEqually}
                          onCheckedChange={(checked) => {
                            setDistributeEqually(checked as boolean);
                            if (!checked) {
                              // Initialize percentages when switching to manual
                              const all = [...selectedPlatforms];
                              if (otherPlatform) all.push(otherPlatform);
                              const count = all.length;
                              const newPercentages: Record<string, number> = {};
                              if (count > 0) {
                                const share = parseFloat((100 / count).toFixed(2));
                                all.forEach(p => newPercentages[p] = share);
                                // Adjust last to match 100
                                const currentSum = Object.values(newPercentages).reduce((a, b) => a + b, 0);
                                if (currentSum !== 100) {
                                  newPercentages[all[all.length - 1]] += (100 - currentSum);
                                }
                              }
                              setPlatformPercentages(newPercentages);
                            }
                          }}
                        />
                        <Label htmlFor="distribute-equally" className="cursor-pointer">Distribuir equitativamente</Label>
                      </div>
                    </div>

                    {!distributeEqually && (
                      <div className="grid gap-4 pt-2">
                        {[...selectedPlatforms, ...(otherPlatform ? [otherPlatform] : [])].map(p => (
                          <div key={p} className="flex items-center gap-4">
                            <span className="w-32 text-sm font-medium">{p}</span>
                            <div className="relative flex-1">
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={platformPercentages[p] || 0}
                                onChange={(e) => handlePercentageChange(p, e.target.value)}
                                className="pr-8"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                            </div>
                          </div>
                        ))}
                        <div className="flex justify-end pt-2">
                          <span className={`text-sm font-bold ${Math.abs((Object.values(platformPercentages).reduce((a, b) => a + b, 0)) - 100) < 0.5 ? 'text-green-500' : 'text-red-500'}`}>
                            Total: {Object.values(platformPercentages).reduce((a, b) => a + b, 0).toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    )}

                    {distributeEqually && (
                      <div className="pt-2 text-sm text-muted-foreground">
                        Se asignará un <strong>{((100 / ([...selectedPlatforms, ...(otherPlatform ? [1] : [])].length || 1))).toFixed(0)}%</strong> del presupuesto a cada plataforma seleccionada.
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="investment" className="text-cinema-ivory text-lg">Inversión publicitaria total (€) *</Label>
                  <HelpTooltip
                    fieldId="ad_investment"
                    title="¿Por qué te preguntamos el presupuesto?"
                    content="Con el presupuesto podemos estimar el alcance, elegir las plataformas correctas y ajustar la presión publicitaria. No compartimos esta información con nadie más."
                  />
                </div>
                <Input
                  id="investment"
                  type="number"
                  min="3000"
                  step="500"
                  value={adInvestment}
                  onChange={(e) => setAdInvestment(e.target.value)}
                  className="bg-muted border-border text-foreground text-2xl font-bold"
                  placeholder="Mínimo 3.000€"
                />
                <p className="text-xs text-muted-foreground">
                  A partir de 3.000€ tu campaña empieza a tener el músculo necesario: cuanto mayor sea la inversión, mayor alcance sobre tu audiencia objetivo y más impacto directo en la venta de entradas.
                </p>
              </div>

              {/* Fee Mode Toggle */}
              {selectedPlatforms.length > 0 && parseFloat(adInvestment) >= 3000 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Label className="text-cinema-ivory text-lg">¿Cómo prefieres gestionar los fees?</Label>
                    <HelpTooltip
                      fieldId="fee_mode"
                      title="Opciones de fees"
                      content="Puedes sumar nuestros fees a tu inversión publicitaria (opción por defecto) o integrarlos dentro de tu presupuesto total, en cuyo caso se descontarán de la inversión en medios."
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div
                      onClick={() => setFeeMode('additional')}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${feeMode === 'additional'
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                        }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-4 h-4 rounded-full border-2 mt-1 flex items-center justify-center ${feeMode === 'additional' ? 'border-primary bg-primary' : 'border-muted-foreground'
                          }`}>
                          {feeMode === 'additional' && (
                            <div className="w-2 h-2 rounded-full bg-background" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-cinema-ivory">Sumar fees a mi inversión</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Tu inversión en medios se mantiene íntegra. Los fees se añaden al total.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div
                      onClick={() => setFeeMode('integrated')}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${feeMode === 'integrated'
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                        }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-4 h-4 rounded-full border-2 mt-1 flex items-center justify-center ${feeMode === 'integrated' ? 'border-primary bg-primary' : 'border-muted-foreground'
                          }`}>
                          {feeMode === 'integrated' && (
                            <div className="w-2 h-2 rounded-full bg-background" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-cinema-ivory">Integrar fees en mi presupuesto</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Los fees se descuentan de tu presupuesto total. La inversión real en medios será menor.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {selectedPlatforms.length > 0 && parseFloat(adInvestment) >= 3000 && (
                <CostSummary costs={costs} isFirstRelease={isFirstRelease} compact showPrices={isDistributor} feeMode={feeMode} />
              )}
            </Card>
          )}

          {/* Step 4: Add-ons */}
          {currentStep === 4 && (
            <Card className="cinema-card p-8 space-y-6">
              <h2 className="font-cinema text-3xl text-primary">Complementa tu lanzamiento</h2>

              <div className="grid md:grid-cols-3 gap-4">
                <AddonCard
                  title="Adaptación de contenido"
                  description="Adaptamos tus trailers y piezas al lenguaje de cada plataforma (formatos 1:1, 9:16, motion graphics, versiones cortas, etc.)"
                  price="290€"
                  icon={<Clapperboard className="w-10 h-10 cinema-icon-decorative" />}
                  selected={selectedAddons.adaptacion}
                  onToggle={() => setSelectedAddons({ ...selectedAddons, adaptacion: !selectedAddons.adaptacion })}
                  showPrice={isDistributor}
                  priceHiddenMessage="Te mostraremos el coste exacto al crear tu cuenta de distribuidora."
                />

                <AddonCard
                  title="Microsite oficial"
                  description="Página oficial de la película con sinopsis, trailer, ficha artística y llamada a la compra de entradas."
                  price="490€"
                  icon={<Globe className="w-10 h-10 cinema-icon-decorative" />}
                  selected={selectedAddons.microsite}
                  onToggle={() => setSelectedAddons({ ...selectedAddons, microsite: !selectedAddons.microsite })}
                  showPrice={isDistributor}
                  priceHiddenMessage="El importe se mostrará en tu presupuesto personalizado."
                />

                <AddonCard
                  title="Campañas email / WhatsApp"
                  description="Automatizamos comunicaciones directas con tu público: bases de datos, newsletters y mensajes segmentados vía email y/o WhatsApp."
                  price="390€"
                  icon={<Mail className="w-10 h-10 cinema-icon-decorative" />}
                  selected={selectedAddons.emailWhatsapp}
                  onToggle={() => setSelectedAddons({ ...selectedAddons, emailWhatsapp: !selectedAddons.emailWhatsapp })}
                  showPrice={isDistributor}
                  priceHiddenMessage="Verás el coste de este servicio en tu presupuesto al registrarte."
                />
              </div>

              <CostSummary costs={costs} isFirstRelease={isFirstRelease} showPrices={isDistributor} feeMode={feeMode} />
            </Card>
          )}

          {/* Step 5: Summary & Submit */}
          {currentStep === 5 && (
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
                        const displayPercentages = distributeEqually
                          ? all.reduce((acc, p) => ({ ...acc, [p]: 100 / all.length }), {} as Record<string, number>)
                          : platformPercentages;

                        return all.map(p => (
                          <div key={p} className="flex justify-between text-sm text-cinema-ivory border-b border-white/10 py-1 last:border-0">
                            <span>{p}</span>
                            <span className="text-muted-foreground">{displayPercentages[p]?.toFixed(0)}%</span>
                          </div>
                        ));
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
          )}

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

            {currentStep < 5 ? (
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
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
        onSuccess={() => {
          setShowAuthModal(false);
          // The auth state listener will automatically update isDistributor
        }}
      />

      {/* Onboarding Tour */}
      {showOnboarding && (
        <OnboardingTour
          onComplete={(persist) => completeOnboarding(persist)}
          onSkip={(persist) => skipOnboarding(persist)}
        />
      )}

      {/* Global Help Button */}
      <GlobalHelpButton context={
        currentStep === 1 ? "wizard" :
          currentStep === 2 ? "fechas" :
            currentStep === 3 ? "inversión" :
              currentStep === 4 ? "extras" :
                "campaña"
      } />
    </>
  );
};

export default Wizard;
