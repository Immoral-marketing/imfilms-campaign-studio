import { useState } from 'react';
import { useFeeThresholds, useUpsertFeeThreshold, useDeleteFeeThreshold, FeeThreshold } from '@/hooks/useFeeThresholds';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Save, X, Loader2, Euro } from 'lucide-react';

export const FeeThresholdManager = () => {
    const { data: thresholds, isLoading } = useFeeThresholds();
    const upsertMutation = useUpsertFeeThreshold();
    const deleteMutation = useDeleteFeeThreshold();

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<FeeThreshold> | null>(null);
    const [isAdding, setIsAdding] = useState(false);

    const handleEdit = (threshold: FeeThreshold) => {
        setEditingId(threshold.id);
        setEditForm(threshold);
        setIsAdding(false);
    };

    const handleCancel = () => {
        setEditingId(null);
        setEditForm(null);
        setIsAdding(false);
    };

    const handleSave = async () => {
        if (!editForm || editForm.min_investment === undefined) return;
        await upsertMutation.mutateAsync(editForm as FeeThreshold & { min_investment: number });
        handleCancel();
    };

    const handleAdd = () => {
        setIsAdding(true);
        setEditingId('new');
        setEditForm({
            min_investment: 0,
            max_investment: null,
            variable_fee_rate: 0,
            fixed_fee_amount: 0,
            setup_fee_per_platform: 200,
            is_variable_fee_enabled: true,
            is_fixed_fee_enabled: true,
            is_setup_fee_enabled: true,
        });
    };

    if (isLoading) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-normal text-cinema-ivory">Gestión de Umbrales de Fees</h3>
                {!isAdding && (
                    <Button onClick={handleAdd} size="sm" className="bg-primary hover:bg-primary/90 text-black">
                        <Plus className="h-4 w-4 mr-2" />
                        Nuevo Umbral
                    </Button>
                )}
            </div>

            <div className="grid gap-4">
                {isAdding && editForm && (
                    <ThresholdForm
                        form={editForm}
                        setForm={setEditForm}
                        onSave={handleSave}
                        onCancel={handleCancel}
                        isSaving={upsertMutation.isPending}
                    />
                )}

                {(thresholds || []).map((t) => (
                    editingId === t.id ? (
                        <ThresholdForm
                            key={t.id}
                            form={editForm!}
                            setForm={setEditForm}
                            onSave={handleSave}
                            onCancel={handleCancel}
                            isSaving={upsertMutation.isPending}
                        />
                    ) : (
                        <Card key={t.id} className="bg-[#1f1f22] border-cinema-gold/10 hover:border-primary/30 transition-colors">
                            <CardContent className="p-6">
                                <div className="flex flex-col md:flex-row justify-between gap-6">
                                    <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div>
                                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Inversión</p>
                                            <p className="text-cinema-ivory font-medium">
                                                {t.min_investment.toLocaleString()}€ {t.max_investment ? `- ${t.max_investment.toLocaleString()}€` : '+'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Fee Variable</p>
                                            <p className={t.is_variable_fee_enabled ? "text-cinema-yellow font-bold" : "text-muted-foreground/50 line-through"}>
                                                {(t.variable_fee_rate * 100).toFixed(0)}%
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Fee Fijo</p>
                                            <p className={t.is_fixed_fee_enabled ? "text-cinema-ivory font-medium" : "text-muted-foreground/50 line-through"}>
                                                {t.fixed_fee_amount}€
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Setup / Plataforma</p>
                                            <p className={t.is_setup_fee_enabled ? "text-cinema-ivory font-medium" : "text-muted-foreground/50 line-through"}>
                                                {t.setup_fee_per_platform}€
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button variant="ghost" size="sm" onClick={() => handleEdit(t)} className="text-muted-foreground hover:text-cinema-ivory">
                                            Editar
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(t.id)} className="text-red-400 hover:text-red-300 hover:bg-red-400/10">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )
                ))}
            </div>
        </div>
    );
};

interface ThresholdFormProps {
    form: Partial<FeeThreshold>;
    setForm: (form: Partial<FeeThreshold>) => void;
    onSave: () => void;
    onCancel: () => void;
    isSaving: boolean;
}

const ThresholdForm = ({ form, setForm, onSave, onCancel, isSaving }: ThresholdFormProps) => {
    return (
        <Card className="bg-[#141416] border-primary/50 shadow-[0_0_15px_rgba(235,179,39,0.1)]">
            <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <Label className="text-primary text-xs uppercase tracking-widest font-bold">Rango de Inversión</Label>
                        <div className="flex items-center gap-4">
                            <div className="flex-1 space-y-2">
                                <Label htmlFor="min">Mínimo (€)</Label>
                                <Input
                                    id="min"
                                    type="number"
                                    value={form.min_investment}
                                    onChange={(e) => setForm({ ...form, min_investment: Number(e.target.value) })}
                                    className="bg-[#1f1f22] border-white/10"
                                />
                            </div>
                            <div className="flex-1 space-y-2">
                                <Label htmlFor="max">Máximo (€, opcional)</Label>
                                <Input
                                    id="max"
                                    type="number"
                                    value={form.max_investment || ''}
                                    onChange={(e) => setForm({ ...form, max_investment: e.target.value ? Number(e.target.value) : null })}
                                    placeholder="Sin límite"
                                    className="bg-[#1f1f22] border-white/10"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <Label className="text-primary text-xs uppercase tracking-widest font-bold">Setup Fee / Plataforma</Label>
                        <div className="flex items-center gap-4">
                            <div className="flex-1 space-y-2">
                                <Label htmlFor="setup">Valor (€)</Label>
                                <Input
                                    id="setup"
                                    type="number"
                                    value={form.setup_fee_per_platform}
                                    onChange={(e) => setForm({ ...form, setup_fee_per_platform: Number(e.target.value) })}
                                    className="bg-[#1f1f22] border-white/10"
                                />
                            </div>
                            <div className="flex flex-col items-center justify-end h-full py-2">
                                <Label className="mb-2 text-[10px]">Habilitar</Label>
                                <Switch
                                    checked={form.is_setup_fee_enabled}
                                    onCheckedChange={(val) => setForm({ ...form, is_setup_fee_enabled: val })}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
                    <div className="space-y-4">
                        <Label className="text-cinema-yellow text-xs uppercase tracking-widest font-bold">Fee Variable</Label>
                        <div className="flex items-center gap-4">
                            <div className="flex-1 space-y-2">
                                <Label htmlFor="var_rate">Porcentaje (0-1, ej: 0.2 para 20%)</Label>
                                <Input
                                    id="var_rate"
                                    type="number"
                                    step="0.01"
                                    value={form.variable_fee_rate}
                                    onChange={(e) => setForm({ ...form, variable_fee_rate: Number(e.target.value) })}
                                    className="bg-[#1f1f22] border-white/10"
                                />
                            </div>
                            <div className="flex flex-col items-center justify-end h-full py-2">
                                <Label className="mb-2 text-[10px]">Habilitar</Label>
                                <Switch
                                    checked={form.is_variable_fee_enabled}
                                    onCheckedChange={(val) => setForm({ ...form, is_variable_fee_enabled: val })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <Label className="text-cinema-ivory text-xs uppercase tracking-widest font-bold">Fee Fijo</Label>
                        <div className="flex items-center gap-4">
                            <div className="flex-1 space-y-2">
                                <Label htmlFor="fixed">Valor (€)</Label>
                                <Input
                                    id="fixed"
                                    type="number"
                                    value={form.fixed_fee_amount}
                                    onChange={(e) => setForm({ ...form, fixed_fee_amount: Number(e.target.value) })}
                                    className="bg-[#1f1f22] border-white/10"
                                />
                            </div>
                            <div className="flex flex-col items-center justify-end h-full py-2">
                                <Label className="mb-2 text-[10px]">Habilitar</Label>
                                <Switch
                                    checked={form.is_fixed_fee_enabled}
                                    onCheckedChange={(val) => setForm({ ...form, is_fixed_fee_enabled: val })}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                    <Button variant="ghost" onClick={onCancel} disabled={isSaving}>
                        Cancelar
                    </Button>
                    <Button onClick={onSave} disabled={isSaving} className="bg-primary hover:bg-primary/90 text-black font-bold">
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                        {isSaving ? 'Guardando...' : 'Guardar Umbral'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};
