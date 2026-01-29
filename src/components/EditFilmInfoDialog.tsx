import { useState } from 'react';
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
import { Edit, Plus, X } from 'lucide-react';
import { useCreateFilmProposal } from '@/hooks/useFilmEditProposals';

// Validation schema
const filmEditSchema = z.object({
    title: z.string().min(1, 'El título es requerido').max(200, 'Máximo 200 caracteres'),
    country: z.string().min(1, 'El país es requerido'),
    genre: z.string().min(1, 'El género es requerido'),
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
        target_audience_text?: string;
        main_goals?: string[];
    };
    campaignId: string;
    disabled?: boolean;
    children?: React.ReactNode;
}

const EditFilmInfoDialog = ({ film, campaignId, disabled, children }: EditFilmInfoDialogProps) => {
    const [open, setOpen] = useState(false);
    const [goals, setGoals] = useState<string[]>(film.main_goals || []);
    const [newGoal, setNewGoal] = useState('');

    const createProposal = useCreateFilmProposal();

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        reset,
    } = useForm<FilmEditFormData>({
        resolver: zodResolver(filmEditSchema),
        defaultValues: {
            title: film.title,
            country: film.country,
            genre: film.genre,
            target_audience_text: film.target_audience_text || '',
            main_goals: film.main_goals || [],
        },
    });

    const handleAddGoal = () => {
        if (newGoal.trim()) {
            setGoals([...goals, newGoal.trim()]);
            setNewGoal('');
        }
    };

    const handleRemoveGoal = (index: number) => {
        setGoals(goals.filter((_, i) => i !== index));
    };

    const onSubmit = async (data: FilmEditFormData) => {
        try {
            await createProposal.mutateAsync({
                filmId: film.id,
                campaignId,
                proposedData: {
                    ...data,
                    main_goals: goals,
                },
            });

            // Close dialog and reset form
            setOpen(false);
            reset();
            setGoals(film.main_goals || []);
        } catch (error) {
            // Error handling is done in the hook
            console.error('Error submitting proposal:', error);
        }
    };

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            // Reset form when closing
            reset();
            setGoals(film.main_goals || []);
            setNewGoal('');
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
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="font-cinema text-2xl">Editar Información de la Película</DialogTitle>
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

                    {/* País y Género en grid */}
                    <div className="grid grid-cols-2 gap-4">
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
                            <Label htmlFor="genre">Género *</Label>
                            <Input
                                id="genre"
                                {...register('genre')}
                                placeholder="Animación, Drama, etc."
                                className={errors.genre ? 'border-red-500' : ''}
                            />
                            {errors.genre && (
                                <p className="text-sm text-red-500">{errors.genre.message}</p>
                            )}
                        </div>
                    </div>

                    {/* Audiencia Objetivo */}
                    <div className="space-y-2">
                        <Label htmlFor="target_audience_text">Audiencia Objetivo</Label>
                        <Textarea
                            id="target_audience_text"
                            {...register('target_audience_text')}
                            placeholder="Describe el público objetivo de la película..."
                            rows={4}
                            className="resize-none"
                        />
                        <p className="text-xs text-muted-foreground">
                            Describe el perfil del público al que está dirigida la película.
                        </p>
                    </div>

                    {/* Objetivos Principales */}
                    <div className="space-y-3">
                        <Label>Objetivos Principales</Label>

                        {/* Lista de objetivos */}
                        {goals.length > 0 && (
                            <ul className="space-y-2">
                                {goals.map((goal, index) => (
                                    <li
                                        key={index}
                                        className="flex items-start gap-2 p-2 bg-muted rounded-md"
                                    >
                                        <span className="text-yellow-400 mt-1">•</span>
                                        <span className="flex-1 text-sm">{goal}</span>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleRemoveGoal(index)}
                                            className="h-6 w-6 p-0"
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        )}

                        {/* Añadir nuevo objetivo */}
                        <div className="flex gap-2">
                            <Input
                                value={newGoal}
                                onChange={(e) => setNewGoal(e.target.value)}
                                placeholder="Nuevo objetivo (ej: Awareness del estreno)"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddGoal();
                                    }
                                }}
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleAddGoal}
                                disabled={!newGoal.trim()}
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Define los objetivos principales de la campaña (awareness, conversión, etc.)
                        </p>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleOpenChange(false)}
                            disabled={isSubmitting}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Enviando...' : 'Enviar Propuesta'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default EditFilmInfoDialog;
