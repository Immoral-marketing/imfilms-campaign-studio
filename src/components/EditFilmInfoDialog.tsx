import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edit, Plus, X, AlertTriangle } from 'lucide-react';
import { useCreateFilmProposal } from '@/hooks/useFilmEditProposals';
import { GENRES, GOALS } from '@/constants/campaignOptions';

// Validation schema
const filmEditSchema = z.object({
    title: z.string().min(1, 'El título es requerido').max(200, 'Máximo 200 caracteres'),
    country: z.string().min(1, 'El país es requerido'),
    genre: z.string().min(1, 'El género es requerido'),
    secondary_genre: z.string().optional(),
    target_audience_text: z.string().optional(),
    main_goals: z.array(z.string()).default([]),
});

type FilmEditFormData = z.infer<typeof filmEditSchema>;

interface EditFilmInfoDialogProps {
    film: {
        id: string;
        title: string;
        country: string;
        genre: string;
        secondary_genre?: string;
        target_audience_text?: string;
        main_goals?: string[];
    };
    platforms?: {
        platform_name: string;
        budget_percent: number;
    }[];
    campaignId: string;
    disabled?: boolean;
    children?: React.ReactNode;
}

const EditFilmInfoDialog = ({ film, platforms = [], campaignId, disabled, children }: EditFilmInfoDialogProps) => {
    const [open, setOpen] = useState(false);
    const [platformPercentages, setPlatformPercentages] = useState<Record<string, number>>({});

    // Initialize platform percentages
    useEffect(() => {
        if (open && platforms.length > 0) {
            const initialPercentages: Record<string, number> = {};
            platforms.forEach(p => {
                initialPercentages[p.platform_name] = p.budget_percent;
            });
            setPlatformPercentages(initialPercentages);
        }
    }, [open, platforms]);

    const createProposal = useCreateFilmProposal();

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors, isSubmitting },
        reset,
    } = useForm<FilmEditFormData>({
        resolver: zodResolver(filmEditSchema),
        defaultValues: {
            title: film.title,
            country: film.country,
            genre: film.genre,
            secondary_genre: film.secondary_genre || '',
            target_audience_text: film.target_audience_text || '',
            main_goals: film.main_goals || [],
        },
    });

    const currentGoals = watch('main_goals');
    const genre = watch('genre');
    const secondaryGenre = watch('secondary_genre');

    const handleGoalToggle = (goal: string) => {
        const newGoals = currentGoals.includes(goal)
            ? currentGoals.filter(g => g !== goal)
            : [...currentGoals, goal];
        setValue('main_goals', newGoals, { shouldDirty: true });
    };

    const handlePercentageChange = (platformName: string, value: string) => {
        const numValue = parseFloat(value);
        if (isNaN(numValue) || numValue < 0 || numValue > 100) return;

        setPlatformPercentages(prev => ({
            ...prev,
            [platformName]: numValue
        }));
    };

    const getTotalPercentage = () => {
        return Object.values(platformPercentages).reduce((a, b) => a + b, 0);
    };

    const onSubmit = async (data: FilmEditFormData) => {
        // Validate percentages if platforms exist
        if (Object.keys(platformPercentages).length > 0) {
            const total = getTotalPercentage();
            if (Math.abs(total - 100) > 0.5) {
                return; // Prevent submit if not 100%
            }
        }

        try {
            await createProposal.mutateAsync({
                filmId: film.id,
                campaignId,
                proposedData: {
                    ...data,
                    // Include platform data in proposed_data
                    // Note: This requires backend support to apply these changes
                    platforms: Object.entries(platformPercentages).map(([name, percent]) => ({
                        platform_name: name,
                        budget_percent: percent
                    }))
                } as any, // Cast to any because proposed_data might strict type in hook
            });

            // Close dialog and reset form
            setOpen(false);
            reset();
        } catch (error) {
            console.error('Error submitting proposal:', error);
        }
    };

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            reset();
        }
        setOpen(newOpen);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                {children || (
                    <Button variant="outline" size="sm" disabled={disabled}>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="font-cinema text-2xl">Editar Información de la Campaña</DialogTitle>
                    <DialogDescription>
                        Los cambios que propongas serán revisados por un administrador antes de aplicarse.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* Título */}
                    <div className="space-y-2">
                        <Label htmlFor="title">Título *</Label>
                        <Input
                            id="title"
                            {...register('title')}
                            placeholder="Nombre de la película"
                            className={errors.title ? 'border-red-500' : ''}
                        />
                        {errors.title && (
                            <p className="text-sm text-red-500">{errors.title.message}</p>
                        )}
                    </div>

                    {/* País y Géneros */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="country">País *</Label>
                            <Input
                                id="country"
                                {...register('country')}
                                placeholder="España"
                                className={errors.country ? 'border-red-500' : ''}
                            />
                            {errors.country && (
                                <p className="text-sm text-red-500">{errors.country.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label>Género Principal *</Label>
                            <Select
                                value={genre}
                                onValueChange={(val) => setValue('genre', val, { shouldDirty: true })}
                            >
                                <SelectTrigger className={errors.genre ? 'border-red-500' : ''}>
                                    <SelectValue placeholder="Seleccionar..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {GENRES.map((g) => (
                                        <SelectItem key={g} value={g}>{g}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.genre && (
                                <p className="text-sm text-red-500">{errors.genre.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label>Género Secundario</Label>
                            <Select
                                value={secondaryGenre || "none"}
                                onValueChange={(val) => setValue('secondary_genre', val === "none" ? "" : val, { shouldDirty: true })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Opcional..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Ninguno</SelectItem>
                                    {GENRES.filter(g => g !== genre).map((g) => (
                                        <SelectItem key={g} value={g}>{g}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Audiencia Objetivo */}
                    <div className="space-y-2">
                        <Label htmlFor="target_audience_text">Audiencia Objetivo</Label>
                        <Textarea
                            id="target_audience_text"
                            {...register('target_audience_text')}
                            placeholder="Describe el público objetivo de la película..."
                            rows={3}
                            className="resize-none"
                        />
                    </div>

                    {/* Objetivos Principales (Select Multiple) */}
                    <div className="space-y-3">
                        <Label>Objetivos Principales</Label>
                        <div className="grid grid-cols-1 gap-2">
                            {GOALS.map((goal) => (
                                <div key={goal} className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        id={`goal-${goal}`}
                                        checked={currentGoals.includes(goal)}
                                        onChange={() => handleGoalToggle(goal)}
                                        className="h-4 w-4 rounded border-gray-300 text-cinema-yellow focus:ring-cinema-yellow"
                                    />
                                    <Label htmlFor={`goal-${goal}`} className="text-sm font-normal cursor-pointer">
                                        {goal}
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Distribución de Plataformas (Solo si hay plataformas) */}
                    {Object.keys(platformPercentages).length > 0 && (
                        <div className="space-y-3 pt-4 border-t border-gray-700">
                            <Label className="text-base font-semibold">Distribución de Presupuesto (%)</Label>
                            <p className="text-xs text-muted-foreground mb-2">
                                Ajusta el porcentaje de inversión para cada plataforma. Debe sumar 100%.
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {Object.entries(platformPercentages).map(([platform, percent]) => (
                                    <div key={platform} className="flex items-center space-x-2">
                                        <Label className="w-24 text-sm">{platform}</Label>
                                        <div className="relative flex-1">
                                            <Input
                                                type="number"
                                                min="0"
                                                max="100"
                                                step="0.1"
                                                value={percent}
                                                onChange={(e) => handlePercentageChange(platform, e.target.value)}
                                                className="pr-6"
                                            />
                                            <span className="absolute right-2 top-2.5 text-xs text-muted-foreground">%</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-end items-center gap-2 mt-2">
                                <span className="text-sm">Total:</span>
                                <span className={`text-sm font-bold ${Math.abs(getTotalPercentage() - 100) > 0.5 ? 'text-red-500' : 'text-green-500'}`}>
                                    {getTotalPercentage().toFixed(1)}%
                                </span>
                            </div>
                            {Math.abs(getTotalPercentage() - 100) > 0.5 && (
                                <p className="text-xs text-red-500 text-right">
                                    La suma debe ser 100%
                                </p>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleOpenChange(false)}
                            disabled={isSubmitting}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting || (Object.keys(platformPercentages).length > 0 && Math.abs(getTotalPercentage() - 100) > 0.5)}
                        >
                            {isSubmitting ? 'Enviando...' : 'Enviar Propuesta'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default EditFilmInfoDialog;
