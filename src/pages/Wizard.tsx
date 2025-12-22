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
import { Card } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Clapperboard, Globe, Mail, Info, RotateCcw, CalendarClock, CalendarRange, CalendarCheck, FileText } from "lucide-react";
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
import { useCampaignCalculator, validateInvestment } from "@/hooks/useCampaignCalculator";
import { useConflictDetection } from "@/hooks/useConflictDetection";
import { calculateCampaignDates, formatDateEs, formatDateShort } from "@/utils/dateUtils";
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

interface WizardDraft {
  currentStep: number;
  filmData: {
    title: string;
    genre: string;
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
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Onboarding
  const { showOnboarding, completeOnboarding, skipOnboarding } = useOnboarding();

  // Conflict detection
  const { checkConflicts, isChecking: isCheckingConflicts, lastResult: conflictResult } = useConflictDetection();
  const [hasCheckedConflicts, setHasCheckedConflicts] = useState(false);

  // Step 1: Film data
  const [filmData, setFilmData] = useState({
    title: "",
    genre: "",
    otherGenre: "",
    country: "",
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
  }, [
    currentStep,
    releaseDate,
    filmData.genre,
    filmData.otherGenre,
    filmData.targetAudience,
    filmData.country,
    campaignEndDate,
    selectedPlatforms,
    selectedAddons.adaptacion,
  ]);

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
    }
  };

  const loadDraft = () => {
    const savedDraft = localStorage.getItem(WIZARD_DRAFT_KEY);
    if (!savedDraft) return;

    try {
      const draft: WizardDraft = JSON.parse(savedDraft);
      setCurrentStep(draft.currentStep);
      setFilmData(draft.filmData);
      setReleaseDate(draft.releaseDate ? new Date(draft.releaseDate) : undefined);
      setCampaignEndDate(draft.campaignEndDate ? new Date(draft.campaignEndDate) : undefined);
      setManualEndDateMode(draft.manualEndDateMode || false);
      setSelectedPlatforms(draft.selectedPlatforms);
      setOtherPlatform(draft.otherPlatform);
      setAdInvestment(draft.adInvestment);
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
      otherGenre: "",
      country: "",
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
    setSelectedPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    );
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
      const validation = validateInvestment(parseFloat(adInvestment) || 0);
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

  const handleCreateAccount = async () => {
    // Validate signup data
    if (!signupData.companyName || !signupData.contactName || !signupData.contactEmail || !signupData.contactPhone || !signupData.password) {
      toast.error("Por favor completa todos los campos requeridos");
      return;
    }

    setLoading(true);

    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: signupData.contactEmail,
        password: signupData.password,
        options: {
          data: {
            company_name: signupData.companyName,
            contact_name: signupData.contactName,
            contact_phone: signupData.contactPhone,
          },
          emailRedirectTo: `${window.location.origin}/campaigns`,
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("No se pudo crear el usuario");

      setUser(authData.user);
      setIsDistributor(true);
      setJustRegistered(true);
      await fetchDistributorProfile(authData.user.id);

      toast.success("¡Cuenta creada! Ahora puedes ver tu presupuesto");
      window.scrollTo({ top: 0, behavior: "smooth" });
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
          status: "nuevo",
        })
        .select()
        .single();

      if (campaignError) throw campaignError;

      // Add platforms
      const platformsToInsert = [...selectedPlatforms];
      if (otherPlatform) platformsToInsert.push(otherPlatform);

      for (const platform of platformsToInsert) {
        await supabase.from("campaign_platforms").insert({
          campaign_id: campaignRecord.id,
          platform_name: platform,
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

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
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
                  <Label htmlFor="country" className="text-cinema-ivory">País de producción *</Label>
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
                  />
                </div>
              </div>

              {/* Conflict Detection Alert */}
              {releaseDate && hasCheckedConflicts && conflictResult && (
                <div className="animate-in fade-in duration-500">
                  <ConflictAlert
                    level={conflictResult.level}
                    conflicts={conflictResult.conflicts}
                    onModifyDates={() => {
                      setReleaseDate(undefined);
                      setCampaignEndDate(undefined);
                      setHasCheckedConflicts(false);
                      toast.info("Modifica la fecha de estreno para revisar conflictos");
                    }}
                    onModifyAudience={() => {
                      setCurrentStep(1);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                      toast.info("Ajusta la audiencia objetivo en el paso 1");
                    }}
                    onContactTeam={() => {
                      toast.info("Puedes contactar con nuestro equipo una vez creada la campaña");
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
                            className="rounded-md border border-border bg-muted pointer-events-auto transition-all duration-300"
                            weekStartsOn={1}
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

              {selectedPlatforms.length > 0 && parseFloat(adInvestment) >= 3000 && (
                <CostSummary costs={costs} isFirstRelease={isFirstRelease} compact showPrices={isDistributor} />
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

              <CostSummary costs={costs} isFirstRelease={isFirstRelease} showPrices={isDistributor} />
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
                    <p className="text-cinema-ivory">{selectedPlatforms.join(", ")}{otherPlatform && `, ${otherPlatform}`}</p>
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
                      <Input
                        id="contact-email"
                        type="email"
                        value={signupData.contactEmail}
                        onChange={(e) => setSignupData({ ...signupData, contactEmail: e.target.value })}
                        className="bg-muted border-border text-foreground"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="contact-phone" className="text-cinema-ivory">Teléfono *</Label>
                      <Input
                        id="contact-phone"
                        type="tel"
                        value={signupData.contactPhone}
                        onChange={(e) => setSignupData({ ...signupData, contactPhone: e.target.value })}
                        className="bg-muted border-border text-foreground"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-cinema-ivory">Contraseña *</Label>
                      <Input
                        id="password"
                        type="password"
                        value={signupData.password}
                        onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                        className="bg-muted border-border text-foreground"
                        placeholder="Mínimo 6 caracteres"
                        required
                      />
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
                    disabled={loading || !signupData.companyName || !signupData.contactName || !signupData.contactEmail || !signupData.contactPhone || !signupData.password}
                    className="ml-auto bg-primary text-primary-foreground hover:bg-secondary cinema-glow text-lg px-8 py-6"
                  >
                    {loading ? "Creando cuenta..." : "Crear cuenta y ver mi presupuesto"}
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
          onComplete={completeOnboarding}
          onSkip={skipOnboarding}
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
