import { useState, useEffect, useMemo } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Edit, Save, X, Plus, Trash2, DollarSign, Percent, Info, FileText, Upload, ExternalLink } from "lucide-react";
import { GENRES, GOALS, PLATFORMS_DATA } from "@/constants/campaignOptions";
import { useCreateFilmProposal } from "@/hooks/useFilmEditProposals";
import { toast } from "sonner";
import { useCampaignCalculator, FeeMode } from "@/hooks/useCampaignCalculator";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";

const formSchema = z.object({
    title: z.string().min(1, "El título es obligatorio"),
    country: z.string().min(1, "El país es obligatorio"),
    genre: z.string().min(1, "El género es obligatorio"),
    secondary_genre: z.string().optional(),
    target_audience_text: z.string().min(1, "El público objetivo es obligatorio"),
    target_audience_urls: z.array(z.string()).optional(),
    target_audience_files: z.array(z.string()).optional(), // URLs/Paths to files
    main_goals: z.array(z.string()).min(1, "Debes seleccionar al menos un objetivo"),
    ad_investment_amount: z.number().min(0, "El presupuesto debe ser mayor o igual a 0"),
    fee_mode_integrated: z.boolean(), // Checkbox for fee mode
    platforms: z.array(
        z.object({
            platform_name: z.string(),
            budget_percent: z.number().min(0).max(100),
            budget_amount: z.number().min(0).optional(), // Virtual field for UI
        })
    ).refine((platforms) => {
        const total = platforms.reduce((acc, curr) => acc + curr.budget_percent, 0);
        // Allow small floating point error
        return Math.abs(total - 100) < 0.1 || total === 0; // Allow 0 if no budget/platforms
    }, {
        message: "La suma de porcentajes debe ser 100%",
    }),
});

interface CampaignInfoEditableProps {
    film: any;
    platforms: any[];
    campaignId: string;
    totalBudget: number;
    feeDetails: {
        fixed_fee_amount: number;
        variable_fee_amount: number;
        setup_fee_amount: number;
        addons_base_amount: number;
        total_estimated_amount: number;
    };
    disabled?: boolean;
}

export const CampaignInfoEditable = ({
    film,
    platforms,
    campaignId,
    totalBudget,
    feeDetails,
    disabled
}: CampaignInfoEditableProps) => {
    const [isEditing, setIsEditing] = useState(false);
    const [budgetMode, setBudgetMode] = useState<'percent' | 'amount'>('percent');
    const { mutate: createProposal, isPending } = useCreateFilmProposal();
    const [uploadingFiles, setUploadingFiles] = useState(false);

    // Infer initial fee mode
    // If Total Est ~= Ad Inv + Addons -> Integrated
    // If Total Est > Ad Inv + Addons -> Additional (because fees are on top)
    const initialFeeModeIntegrated = useMemo(() => {
        const estimatedFees = (feeDetails.fixed_fee_amount || 0) + (feeDetails.variable_fee_amount || 0) + (feeDetails.setup_fee_amount || 0);
        const totalWithFees = totalBudget + estimatedFees + (feeDetails.addons_base_amount || 0);
        return Math.abs(totalWithFees - feeDetails.total_estimated_amount) > 1; // If stored total is different from sum, it implies integrated (where TotalEst is just the budget input)
        // Wait, let's reverse logic:
        // Integrated: User says "I have 1000". We take fees FROM it. Total Est = 1000 (plus addons maybe). 
        // Additional: User says "I want 1000 ads". We ADD fees. Total Est = 1000 + Fees + Addons.

        // So if Total Est approx equals Ad Inv + Addons -> Integrated.
        const expectedIntegratedTotal = totalBudget + (feeDetails.addons_base_amount || 0);
        const diffIntegrated = Math.abs(expectedIntegratedTotal - feeDetails.total_estimated_amount);

        return diffIntegrated < 5; // Tolerance
    }, [totalBudget, feeDetails]);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: film.title,
            country: film.country,
            genre: film.genre,
            secondary_genre: film.secondary_genre || "",
            target_audience_text: film.target_audience_text || "",
            target_audience_urls: film.target_audience_urls || [],
            target_audience_files: film.target_audience_files || [],
            main_goals: film.main_goals || [],
            ad_investment_amount: totalBudget || 0,
            fee_mode_integrated: initialFeeModeIntegrated,
            platforms: platforms?.map((p: any) => ({
                platform_name: p.platform_name,
                budget_percent: p.budget_percent,
                budget_amount: (totalBudget * (p.budget_percent / 100))
            })) || []
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "platforms",
    });

    // Calculate fees dynamically based on form state
    const watchedInvestment = form.watch("ad_investment_amount");
    const watchedPlatforms = form.watch("platforms");
    const watchedFeeIntegrated = form.watch("fee_mode_integrated");

    // Use the hook logic to calculate fees
    // We need to construct a "fake" config for the hook
    const campaignConfig = useMemo(() => ({
        platforms: watchedPlatforms.map(p => p.platform_name),
        adInvestment: watchedInvestment,
        isFirstRelease: true, // Assuming true or doesn't change fee logic much? (variable fee depends on amount mostly)
        feeMode: watchedFeeIntegrated ? 'integrated' as FeeMode : 'additional' as FeeMode,
        selectedAddons: {
            // We don't edit addons here, so we assume base cost matches what was passed or 0 for calculation purposes
            // Actually we need to know if we should include addon cost in total. 
            // For now, let's just use the `addons_base_amount` from props as a fixed lump sum if needed,
            // BUT the hook calculates it from bools. 
            // Trick: We can just use the hook for FEES and add the existing `addons_base_amount` manually to Total.
            adaptacion: false, microsite: false, emailWhatsapp: false
        }
    }), [watchedInvestment, watchedPlatforms, watchedFeeIntegrated]);

    const calculatedCosts = useCampaignCalculator(campaignConfig);

    // Reset form when entering edit mode
    useEffect(() => {
        if (isEditing) {
            form.reset({
                title: film.title,
                country: film.country,
                genre: film.genre,
                secondary_genre: film.secondary_genre || "",
                target_audience_text: film.target_audience_text || "",
                target_audience_urls: film.target_audience_urls || [],
                target_audience_files: film.target_audience_files || [],
                main_goals: film.main_goals || [],
                ad_investment_amount: totalBudget || 0,
                fee_mode_integrated: initialFeeModeIntegrated,
                platforms: platforms?.map((p: any) => ({
                    platform_name: p.platform_name,
                    budget_percent: p.budget_percent,
                    budget_amount: parseFloat(((totalBudget * (p.budget_percent / 100)) || 0).toFixed(2))
                })) || []
            });
            setBudgetMode('percent');
        }
    }, [isEditing, film, platforms, totalBudget, form, initialFeeModeIntegrated]);

    const availablePlatforms = PLATFORMS_DATA.filter(
        p => !form.watch("platforms").some((existing: any) => existing.platform_name === p.name)
    );

    const handleAddPlatform = (platformName: string) => {
        append({
            platform_name: platformName,
            budget_percent: 0,
            budget_amount: 0
        });
    };

    const handleBudgetChange = (newTotal: number) => {
        const currentPlatforms = form.getValues("platforms");
        // If we change total budget, update amounts based on percentages
        const updatedPlatforms = currentPlatforms.map(p => ({
            ...p,
            budget_amount: parseFloat(((newTotal * (p.budget_percent / 100)) || 0).toFixed(2))
        }));
        form.setValue("platforms", updatedPlatforms);
    };

    const updateAmountsFromPercentages = () => {
        const total = form.getValues("ad_investment_amount");
        const currentPlatforms = form.getValues("platforms");
        const updated = currentPlatforms.map(p => ({
            ...p,
            budget_amount: parseFloat(((total * (p.budget_percent / 100)) || 0).toFixed(2))
        }));
        form.setValue("platforms", updated);
    };

    const updatePercentagesFromAmounts = () => {
        const total = form.getValues("ad_investment_amount");
        const currentPlatforms = form.getValues("platforms");
        if (total === 0) return;

        const updated = currentPlatforms.map(p => ({
            ...p,
            budget_percent: parseFloat((((p.budget_amount || 0) / total) * 100).toFixed(2))
        }));
        form.setValue("platforms", updated);
    };

    const toggleBudgetMode = () => {
        if (budgetMode === 'percent') {
            updateAmountsFromPercentages();
            setBudgetMode('amount');
        } else {
            updatePercentagesFromAmounts();
            setBudgetMode('percent');
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        setUploadingFiles(true);
        const filesToUpload = Array.from(e.target.files);
        const uploadedUrls: string[] = [];

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No autenticado");

            for (const file of filesToUpload) {
                const fileExt = file.name.split(".").pop();
                const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                const filePath = `${user.id}/${fileName}`; // Store in user folder

                const { error: uploadError } = await supabase.storage
                    .from("campaign-materials")
                    .upload(filePath, file);

                if (uploadError) {
                    toast.error(`Error al subir ${file.name}`);
                    continue;
                }

                // Get Public URL
                const { data: { publicUrl } } = supabase.storage
                    .from("campaign-materials")
                    .getPublicUrl(filePath);

                uploadedUrls.push(publicUrl);
            }

            if (uploadedUrls.length > 0) {
                const currentFiles = form.getValues("target_audience_files") || [];
                form.setValue("target_audience_files", [...currentFiles, ...uploadedUrls]);
                toast.success(`${uploadedUrls.length} archivo(s) subido(s)`);
            }
        } catch (error) {
            console.error("Upload error:", error);
            toast.error("Error general al subir archivos");
        } finally {
            setUploadingFiles(false);
            e.target.value = ''; // Reset input
        }
    };

    const onSubmit = (values: z.infer<typeof formSchema>) => {
        const changes: Record<string, any> = {};
        let hasChanges = false;

        // Check basic fields
        if (values.title !== film.title) { changes.title = values.title; hasChanges = true; }
        if (values.country !== film.country) { changes.country = values.country; hasChanges = true; }
        if (values.genre !== film.genre) { changes.genre = values.genre; hasChanges = true; }
        if (values.secondary_genre !== (film.secondary_genre || "")) { changes.secondary_genre = values.secondary_genre; hasChanges = true; }
        if (values.target_audience_text !== (film.target_audience_text || "")) { changes.target_audience_text = values.target_audience_text; hasChanges = true; }

        // Check arrays
        const oldUrls = film.target_audience_urls || [];
        const newUrls = values.target_audience_urls || [];
        if (JSON.stringify(oldUrls.sort()) !== JSON.stringify(newUrls.sort())) {
            changes.target_audience_urls = newUrls;
            hasChanges = true;
        }

        const oldFiles = film.target_audience_files || [];
        const newFiles = values.target_audience_files || [];
        if (JSON.stringify(oldFiles.sort()) !== JSON.stringify(newFiles.sort())) {
            changes.target_audience_files = newFiles;
            hasChanges = true;
        }

        // Check array fields
        if (JSON.stringify(values.main_goals.sort()) !== JSON.stringify((film.main_goals || []).sort())) {
            changes.main_goals = values.main_goals;
            hasChanges = true;
        }

        // Check Budget & Fees
        // Logic: If budget updated OR fee mode updated, we send all fee fields
        const feeModeChanged = values.fee_mode_integrated !== initialFeeModeIntegrated;
        const budgetChanged = values.ad_investment_amount !== totalBudget;

        if (budgetChanged || feeModeChanged) {
            changes.ad_investment_amount = values.ad_investment_amount;

            // Include calculated fees
            changes.fixed_fee_amount = calculatedCosts.fixedFeePlatforms;
            changes.variable_fee_amount = calculatedCosts.variableFeeInvestment;
            changes.setup_fee_amount = calculatedCosts.setupFee;
            // Total Est = Calculated Total Est - Calculated Addons + Real Addons
            // (Since useCampaignCalculator assumes 0 custom addons, we add the real base back)
            const realTotalEstimated = calculatedCosts.totalEstimated - calculatedCosts.addonsBaseCost + (feeDetails.addons_base_amount || 0);
            changes.total_estimated_amount = realTotalEstimated;

            hasChanges = true;
        }

        // Check platforms
        const currentPlatforms = platforms?.map((p: any) => ({
            platform_name: p.platform_name,
            budget_percent: p.budget_percent
        })).sort((a: any, b: any) => a.platform_name.localeCompare(b.platform_name));

        const newPlatforms = values.platforms.map(p => ({
            platform_name: p.platform_name,
            budget_percent: p.budget_percent
        })).sort((a, b) => a.platform_name.localeCompare(b.platform_name));

        if (JSON.stringify(currentPlatforms) !== JSON.stringify(newPlatforms)) {
            changes.platforms = newPlatforms;
            hasChanges = true;
        }

        if (!hasChanges) {
            toast.info("No se han detectado cambios");
            setIsEditing(false);
            return;
        }

        createProposal({
            filmId: film.id,
            campaignId,
            proposedData: changes
        }, {
            onSuccess: () => {
                setIsEditing(false);
            }
        });
    };

    const handleDisplayPlatformGoal = (platformName: string) => {
        const goals: Record<string, string> = {
            "Instagram": "Stories, reels y posts para alcanzar audiencias visuales",
            "Facebook": "Segmentación demográfica precisa y eventos de cine",
            "TikTok": "Contenido viral y audiencias jóvenes",
            "YouTube": "Pre-rolls y campañas de video premium"
        };
        return goals[platformName];
    };

    if (!isEditing) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between border-b pb-4">
                    <h3 className="font-cinema text-xl text-primary">Información de la Película</h3>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditing(true)}
                        disabled={disabled}
                    >
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                    </Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-sm text-muted-foreground">Título</p>
                        <p className="text-foreground text-lg">{film.title}</p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Género</p>
                        <p className="text-foreground">{film.genre}{film.secondary_genre ? ` / ${film.secondary_genre}` : ''}</p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">País</p>
                        <p className="text-foreground">{film.country}</p>
                    </div>
                </div>

                <div>
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="font-cinema text-xl text-primary">Plataformas y Distribución</h3>
                        <div className="text-right">
                            <span className="text-sm text-muted-foreground mr-2">Presupuesto:</span>
                            <span className="font-bold text-lg text-primary">{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(totalBudget || 0)}</span>
                            {initialFeeModeIntegrated && <span className="text-xs text-muted-foreground block">(Fees incluidos)</span>}
                        </div>
                    </div>

                    {platforms && platforms.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {platforms.map((platform: any, index: number) => (
                                <Card key={index} className="p-4 bg-muted/30 border-muted">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="font-medium text-foreground">{platform.platform_name}</span>
                                        <div className="text-right">
                                            <span className="text-primary font-bold block">
                                                {platform.budget_percent ? `${platform.budget_percent}%` : '0%'}
                                            </span>
                                            {totalBudget > 0 && (
                                                <span className="text-xs text-muted-foreground">
                                                    {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(totalBudget * (platform.budget_percent / 100))}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground">{handleDisplayPlatformGoal(platform.platform_name)}</p>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground italic">No hay plataformas seleccionadas.</p>
                    )}
                </div>

                {film.target_audience_text && (
                    <div>
                        <h3 className="font-cinema text-xl text-primary mb-3">Audiencia Objetivo</h3>
                        <p className="text-foreground whitespace-pre-wrap">{film.target_audience_text}</p>

                        {(film.target_audience_urls?.length > 0 || film.target_audience_files?.length > 0) && (
                            <div className="mt-4 pt-3 border-t border-dashed border-primary/20">
                                <p className="text-sm font-medium text-primary mb-2">Material Adicional</p>
                                <div className="space-y-2">
                                    {film.target_audience_urls?.map((url: string, i: number) => (
                                        <a key={i} href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors">
                                            <ExternalLink className="w-3 h-3" />
                                            {url}
                                        </a>
                                    ))}
                                    {film.target_audience_files?.map((url: string, i: number) => {
                                        const fileName = url.split('/').pop() || "Archivo";
                                        return (
                                            <a key={i} href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-yellow-400 hover:text-yellow-300 transition-colors">
                                                <FileText className="w-3 h-3" />
                                                {fileName}
                                            </a>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {film.main_goals && film.main_goals.length > 0 && (
                    <div>
                        <h3 className="font-cinema text-xl text-primary mb-3">Objetivos Principales</h3>
                        <ul className="space-y-2">
                            {film.main_goals.map((goal: string, index: number) => (
                                <li key={index} className="flex items-start gap-2">
                                    <span className="text-yellow-400 mt-1">•</span>
                                    <span className="text-foreground">{goal}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-6 bg-muted/10 p-6 rounded-lg border border-primary/20">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-cinema text-xl text-primary">Editando Información</h3>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(false)}
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {/* Film Info Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Título</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="country"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>País</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="genre"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Género Principal</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecciona un género" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {GENRES.map((genre) => (
                                                <SelectItem key={genre} value={genre}>
                                                    {genre}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="secondary_genre"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Género Secundario (Opcional)</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecciona un género" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {GENRES.map((genre) => (
                                                <SelectItem key={genre} value={genre}>
                                                    {genre}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    {/* Budget & Platforms Section */}
                    <div className="space-y-4 pt-4 border-t border-primary/20">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                            <div className="flex-1 space-y-2">
                                <FormField
                                    control={form.control}
                                    name="ad_investment_amount"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Inversión Publicitaria Total (€)</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        {...field}
                                                        onChange={e => {
                                                            const newVal = parseFloat(e.target.value) || 0;
                                                            field.onChange(newVal);
                                                            handleBudgetChange(newVal);
                                                        }}
                                                        className="pl-9"
                                                    />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="space-y-3 pt-2">
                                    <FormLabel>Gestión de Fees</FormLabel>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Integrated Checkbox */}
                                        <FormField
                                            control={form.control}
                                            name="fee_mode_integrated"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-col items-start space-y-2 p-3 border rounded-md bg-muted/20 h-full">
                                                    <div className="flex flex-row items-center space-x-3 space-y-0">
                                                        <FormControl>
                                                            <Checkbox
                                                                checked={field.value === true}
                                                                onCheckedChange={(checked) => {
                                                                    if (checked) field.onChange(true);
                                                                }}
                                                            />
                                                        </FormControl>
                                                        <FormLabel className="cursor-pointer font-medium m-0">
                                                            Incluir fees en este presupuesto
                                                        </FormLabel>
                                                    </div>
                                                    <p className="text-[0.8rem] text-muted-foreground pl-7">
                                                        Los gastos de gestión se descontarán del total. La inversión real en medios será menor.
                                                    </p>
                                                </FormItem>
                                            )}
                                        />

                                        {/* Additional Checkbox */}
                                        <FormField
                                            control={form.control}
                                            name="fee_mode_integrated"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-col items-start space-y-2 p-3 border rounded-md bg-muted/20 h-full">
                                                    <div className="flex flex-row items-center space-x-3 space-y-0">
                                                        <FormControl>
                                                            <Checkbox
                                                                checked={field.value === false}
                                                                onCheckedChange={(checked) => {
                                                                    if (checked) field.onChange(false);
                                                                }}
                                                            />
                                                        </FormControl>
                                                        <FormLabel className="cursor-pointer font-medium m-0">
                                                            Sumar fees al presupuesto
                                                        </FormLabel>
                                                    </div>
                                                    <p className="text-[0.8rem] text-muted-foreground pl-7">
                                                        Los gastos de gestión se sumarán aparte. El total a pagar será mayor que el presupuesto indicado.
                                                    </p>
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>

                                {/* Live Fee Preview */}
                                <div className="text-xs text-muted-foreground mt-2 px-2 font-medium">
                                    {watchedFeeIntegrated ? (
                                        <span>Inversión Real en Medios (aprox): {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(calculatedCosts.effectiveAdInvestment)}</span>
                                    ) : (
                                        <span>Total Estimado a Pagar (aprox): {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(calculatedCosts.totalEstimated - calculatedCosts.addonsBaseCost + (feeDetails.addons_base_amount || 0))}</span>
                                    )}
                                </div>

                                {/* Budget Toggle Buttons - Removed from here */}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex flex-col gap-3">
                                <div className="flex justify-between items-center">
                                    <h4 className="font-medium">Distribución por Plataforma</h4>
                                    {availablePlatforms.length > 0 && (
                                        <Select onValueChange={handleAddPlatform}>
                                            <SelectTrigger className="w-[180px] h-8 text-xs">
                                                <Plus className="w-3 h-3 mr-2" />
                                                <SelectValue placeholder="Añadir Plataforma" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {availablePlatforms.map(p => (
                                                    <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                </div>

                                {/* Toggle Buttons - Moved here */}
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant={budgetMode === 'percent' ? 'secondary' : 'outline'}
                                        size="sm"
                                        onClick={toggleBudgetMode}
                                        className={budgetMode === 'percent' ? 'bg-primary/20' : ''}
                                    >
                                        <Percent className="w-4 h-4 mr-2" />
                                        Porcentajes
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={budgetMode === 'amount' ? 'secondary' : 'outline'}
                                        size="sm"
                                        onClick={toggleBudgetMode}
                                        className={budgetMode === 'amount' ? 'bg-primary/20' : ''}
                                    >
                                        <DollarSign className="w-4 h-4 mr-2" />
                                        Presupuesto
                                    </Button>
                                </div>
                            </div>

                            <div className="grid gap-3">
                                {fields.map((fieldItem, index) => (
                                    <div key={fieldItem.id} className="flex items-end gap-3 p-3 bg-card rounded border">
                                        <div className="flex-none w-32 pt-2">
                                            <span className="text-sm font-medium block">{form.watch(`platforms.${index}.platform_name`)}</span>
                                        </div>

                                        <FormField
                                            control={form.control}
                                            name={`platforms.${index}.${budgetMode === 'percent' ? 'budget_percent' : 'budget_amount'}`}
                                            render={({ field }) => (
                                                <FormItem className="flex-1 mb-0 space-y-1">
                                                    <FormLabel className="text-xs text-muted-foreground">
                                                        {budgetMode === 'percent' ? 'Porcentaje' : 'Presupuesto'}
                                                    </FormLabel>
                                                    <FormControl>
                                                        <div className="relative">
                                                            {budgetMode === 'amount' && <DollarSign className="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" />}
                                                            <Input
                                                                type="number"
                                                                min={0}
                                                                max={budgetMode === 'percent' ? 100 : undefined}
                                                                {...field}
                                                                onChange={e => {
                                                                    const val = parseFloat(e.target.value) || 0;
                                                                    field.onChange(val);

                                                                    const currentTotal = form.getValues("ad_investment_amount");

                                                                    if (budgetMode === 'percent') {
                                                                        // Percent Mode: Update Amount
                                                                        const amount = parseFloat(((currentTotal * (val / 100)) || 0).toFixed(2));
                                                                        form.setValue(`platforms.${index}.budget_amount`, amount);
                                                                    } else {
                                                                        // Amount Mode: Update Total Budget and ALL Percentages
                                                                        // 1. Calculate new total from all platform amounts
                                                                        const allPlatforms = form.getValues("platforms");
                                                                        // Note: form.getValues gives us the current state. 
                                                                        // Since we just called field.onChange(val), react-hook-form *should* have the new value in state OR we rely on the object reference if not yet committed.
                                                                        // Safer to explicitly update the value in our calculation array
                                                                        allPlatforms[index].budget_amount = val;

                                                                        const newSum = allPlatforms.reduce((acc, p) => acc + (p.budget_amount || 0), 0);

                                                                        // 2. Update Total Budget
                                                                        form.setValue("ad_investment_amount", newSum);

                                                                        // 3. Update Percentages for ALL platforms based on new total
                                                                        if (newSum > 0) {
                                                                            allPlatforms.forEach((p, idx) => {
                                                                                const percent = parseFloat((((p.budget_amount || 0) / newSum) * 100).toFixed(2));
                                                                                form.setValue(`platforms.${idx}.budget_percent`, percent);
                                                                            });
                                                                        } else {
                                                                            allPlatforms.forEach((p, idx) => {
                                                                                form.setValue(`platforms.${idx}.budget_percent`, 0);
                                                                            });
                                                                        }
                                                                    }
                                                                }}
                                                                className={budgetMode === 'amount' ? 'pl-6' : 'pr-6'}
                                                            />
                                                            {budgetMode === 'percent' && <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">%</span>}
                                                        </div>
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />

                                        {/* Read-only view of the other value */}
                                        <div className="flex-none w-24 pb-2 text-right text-sm text-muted-foreground">
                                            {budgetMode === 'percent' ? (
                                                <span>{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(form.watch(`platforms.${index}.budget_amount`) || 0)}</span>
                                            ) : (
                                                <span>{form.watch(`platforms.${index}.budget_percent`)}%</span>
                                            )}
                                        </div>

                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive hover:bg-destructive/10 mb-0.5"
                                            onClick={() => remove(index)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}

                                {fields.length === 0 && (
                                    <p className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded">
                                        No hay plataformas seleccionadas. Añade una para comenzar.
                                    </p>
                                )}
                            </div>

                            {form.formState.errors.platforms && (
                                <p className="text-destructive text-sm font-medium">
                                    {form.formState.errors.platforms.root?.message || "La suma debe ser correcta."}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Target Audience & Goals */}
                    <div className="pt-4 border-t border-primary/20">
                        <FormField
                            control={form.control}
                            name="target_audience_text"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Público Objetivo</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            {...field}
                                            className="h-32"
                                            placeholder="Describe el público objetivo de la película..."
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    {/* Target Audience Materials (URLs & Files) */}
                    <div className="space-y-4 pt-2 pb-2 bg-muted/20 p-3 rounded-md border border-primary/10">
                        <FormLabel>Material Adicional del Público Objetivo</FormLabel>

                        {/* URLs */}
                        <div className="space-y-2">
                            <FormLabel className="text-xs text-muted-foreground">Enlaces (URLs)</FormLabel>
                            {form.watch("target_audience_urls")?.map((url, index) => (
                                <div key={index} className="flex gap-2">
                                    <Input value={url} readOnly className="h-8 text-xs bg-muted" />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                        onClick={() => {
                                            const current = form.getValues("target_audience_urls") || [];
                                            form.setValue("target_audience_urls", current.filter((_, i) => i !== index));
                                        }}
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </Button>
                                </div>
                            ))}
                            <div className="flex gap-2">
                                <Input
                                    id="add-url-input"
                                    placeholder="https://"
                                    className="h-8 text-xs"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            const val = e.currentTarget.value.trim();
                                            if (val) {
                                                const current = form.getValues("target_audience_urls") || [];
                                                form.setValue("target_audience_urls", [...current, val]);
                                                e.currentTarget.value = '';
                                            }
                                        }
                                    }}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8"
                                    onClick={() => {
                                        const input = document.getElementById('add-url-input') as HTMLInputElement;
                                        const val = input.value.trim();
                                        if (val) {
                                            const current = form.getValues("target_audience_urls") || [];
                                            form.setValue("target_audience_urls", [...current, val]);
                                            input.value = '';
                                        }
                                    }}
                                >
                                    <Plus className="w-3 h-3 mr-1" />
                                    Añadir
                                </Button>
                            </div>
                        </div>

                        {/* Files */}
                        <div className="space-y-2 mt-4">
                            <FormLabel className="text-xs text-muted-foreground">Archivos (PDF, DOCX...)</FormLabel>
                            {form.watch("target_audience_files")?.map((url, index) => {
                                const fileName = url.split('/').pop() || "Archivo";
                                return (
                                    <div key={index} className="flex gap-2 items-center bg-background p-2 rounded border border-input">
                                        <FileText className="w-4 h-4 text-primary" />
                                        <span className="text-xs truncate flex-1">{fileName}</span>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-destructive hover:bg-destructive/10"
                                            onClick={() => {
                                                const current = form.getValues("target_audience_files") || [];
                                                form.setValue("target_audience_files", current.filter((_, i) => i !== index));
                                            }}
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </Button>
                                    </div>
                                );
                            })}

                            <div className="relative">
                                <Input
                                    type="file"
                                    id="upload-campaign-file"
                                    className="hidden"
                                    multiple
                                    onChange={handleFileUpload}
                                    disabled={uploadingFiles}
                                />
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    className="w-full text-xs"
                                    disabled={uploadingFiles}
                                    onClick={() => document.getElementById('upload-campaign-file')?.click()}
                                >
                                    {uploadingFiles ? (
                                        "Subiendo..."
                                    ) : (
                                        <>
                                            <Upload className="w-3 h-3 mr-2" />
                                            Subir Archivos
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>

                    <FormField
                        control={form.control}
                        name="main_goals"
                        render={() => (
                            <FormItem>
                                <div className="mb-4">
                                    <FormLabel className="text-base">Objetivos Principales</FormLabel>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {GOALS.map((goal) => (
                                        <FormField
                                            key={goal}
                                            control={form.control}
                                            name="main_goals"
                                            render={({ field }) => {
                                                return (
                                                    <FormItem
                                                        key={goal}
                                                        className="flex flex-row items-start space-x-3 space-y-0"
                                                    >
                                                        <FormControl>
                                                            <Checkbox
                                                                checked={field.value?.includes(goal)}
                                                                onCheckedChange={(checked) => {
                                                                    return checked
                                                                        ? field.onChange([...field.value, goal])
                                                                        : field.onChange(
                                                                            field.value?.filter(
                                                                                (value) => value !== goal
                                                                            )
                                                                        )
                                                                }}
                                                            />
                                                        </FormControl>
                                                        <FormLabel className="font-normal cursor-pointer">
                                                            {goal}
                                                        </FormLabel>
                                                    </FormItem>
                                                )
                                            }}
                                        />
                                    ))}
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="flex justify-end gap-4 pt-4 border-t">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsEditing(false)}
                            disabled={isPending}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isPending} className="bg-primary text-primary-foreground">
                            <Save className="w-4 h-4 mr-2" />
                            {isPending ? "Guardando..." : "Guardar Propuesta"}
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
};
