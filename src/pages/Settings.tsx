import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { NavbarAdmin } from '@/components/NavbarAdmin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { User, Camera, Save, Lock, ArrowLeft, Loader2, Eye, EyeOff, Settings as SettingsIcon, Mail, Zap, PlayCircle, Plus, Trash2, Pencil, X, Check, GripVertical } from 'lucide-react';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { FeeThresholdManager } from '@/components/FeeThresholdManager';
import { CalendlySetting } from '@/components/CalendlySetting';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { EmailPreviewPanel } from '@/components/EmailPreviewPanel';

type SettingsTab = 'account' | 'notifications' | 'features' | 'help_center' | 'email_preview';

const Settings = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<SettingsTab>('account');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    const { isEnabled, toggleFlag, loading: flagsLoading } = useFeatureFlags();

    // Profile fields
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

    // Password fields
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // User info
    const [userId, setUserId] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<'admin' | 'distributor' | null>(null);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                navigate('/');
                return;
            }

            setUserId(user.id);
            setEmail(user.email || '');

            const { data: adminRole } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', user.id)
                .eq('role', 'admin')
                .maybeSingle();

            const role = adminRole ? 'admin' : 'distributor';
            setUserRole(role);

            const metaName = user.user_metadata?.full_name
                || user.user_metadata?.name
                || user.user_metadata?.contact_name
                || '';
            setFullName(metaName);
            setAvatarUrl(user.user_metadata?.avatar_url || null);

            const metaPhone = user.user_metadata?.phone || '';
            if (metaPhone) {
                setPhone(metaPhone);
            } else if (role === 'distributor') {
                const { data: dist } = await supabase
                    .from('distributors')
                    .select('contact_phone')
                    .eq('id', user.id)
                    .maybeSingle();
                setPhone((dist as any)?.contact_phone || '');
            }
        } catch (error) {
            console.error('Error loading profile:', error);
            toast.error('Error al cargar el perfil');
        } finally {
            setLoading(false);
        }
    };

    const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !userId) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Por favor selecciona una imagen');
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            toast.error('La imagen no puede superar 2MB');
            return;
        }

        setUploadingAvatar(true);
        try {
            const fileExt = file.name.split('.').pop();
            const filePath = `${userId}/avatar.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, { upsert: true });
            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

            const { error: updateError } = await supabase.auth.updateUser({
                data: { avatar_url: publicUrl }
            });
            if (updateError) throw updateError;

            setAvatarUrl(publicUrl);
            toast.success('Foto de perfil actualizada');
        } catch (error: any) {
            console.error('Error uploading avatar:', error);
            toast.error('Error al subir la imagen');
        } finally {
            setUploadingAvatar(false);
        }
    };

    const handleSaveProfile = async () => {
        if (!userId) return;
        setSaving(true);
        try {
            const { error: authError } = await supabase.auth.updateUser({
                data: { full_name: fullName, contact_name: fullName, phone }
            });
            if (authError) throw authError;

            if (userRole === 'distributor') {
                const { error: distError } = await supabase
                    .from('distributors')
                    .update({ contact_name: fullName, contact_phone: phone } as any)
                    .eq('id', userId);
                if (distError) throw distError;
            }

            toast.success('Perfil actualizado correctamente');
        } catch (error: any) {
            console.error('Error saving profile:', error);
            toast.error('Error al guardar los cambios');
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async () => {
        if (!newPassword || !confirmPassword) {
            toast.error('Completa ambos campos');
            return;
        }
        if (newPassword.length < 6) {
            toast.error('La contraseña debe tener al menos 6 caracteres');
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.error('Las contraseñas no coinciden');
            return;
        }

        setSavingPassword(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
            setNewPassword('');
            setConfirmPassword('');
            toast.success('Contraseña actualizada correctamente');
        } catch (error: any) {
            console.error('Error changing password:', error);
            toast.error(error.message || 'Error al cambiar la contraseña');
        } finally {
            setSavingPassword(false);
        }
    };

    const handleToggleFlag = async (key: string, currentValue: boolean) => {
        const success = await toggleFlag(key, !currentValue);
        if (success) {
            toast.success(`Función ${!currentValue ? 'activada' : 'desactivada'}`);
        } else {
            toast.error('Error al cambiar la función');
        }
    };

    // ── Help Center hooks (must be before any early return) ─────────────────
    const queryClient = useQueryClient();
    const { data: helpVideos = [], isLoading: videosLoading } = useQuery({
        queryKey: ['help_videos'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('help_videos')
                .select('*')
                .order('display_order', { ascending: true });
            if (error) throw error;
            return data as { id: string; title: string; description: string | null; iframe_url: string; display_order: number }[];
        },
        enabled: activeTab === 'help_center',
    });

    const [videoForm, setVideoForm] = useState({ title: '', description: '', iframe_url: '', display_order: 0 });
    const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
    const [savingVideo, setSavingVideo] = useState(false);
    const [showVideoForm, setShowVideoForm] = useState(false);

    // Build sidebar items based on role
    const sidebarItems: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
        { id: 'account', label: 'Ajustes de la cuenta', icon: SettingsIcon },
        { id: 'notifications', label: 'Notificaciones por mail', icon: Mail },
        ...(userRole === 'admin' ? [
            { id: 'features' as SettingsTab, label: 'Funciones', icon: Zap },
            { id: 'help_center' as SettingsTab, label: 'Centro de Ayuda', icon: PlayCircle },
            { id: 'email_preview' as SettingsTab, label: 'Preview Emails', icon: Mail },
        ] : []),
    ];

    if (loading) {
        return (
            <div className="min-h-screen bg-[#141416] text-cinema-ivory">
                <NavbarAdmin />
                <div className="flex items-center justify-center h-screen">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </div>
        );
    }

    const renderAccountSettings = () => (
        <div className="space-y-6">
            <div>
                <h2 className="font-cinema text-2xl tracking-wide text-cinema-ivory">Ajustes de la cuenta</h2>
                <p className="text-sm text-muted-foreground mt-1">Administra tu perfil y seguridad</p>
            </div>

            {/* Avatar Section */}
            <Card className="bg-[#1f1f22] border-cinema-gold/10">
                <CardContent className="pt-6">
                    <div className="flex items-center gap-6">
                        <div className="relative group">
                            <Avatar className="h-24 w-24 border-2 border-primary/30 group-hover:border-primary/60 transition-colors">
                                <AvatarImage src={avatarUrl || ''} />
                                <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                                    <User className="h-10 w-10" />
                                </AvatarFallback>
                            </Avatar>
                            <label
                                htmlFor="avatar-upload"
                                className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            >
                                {uploadingAvatar ? (
                                    <Loader2 className="h-6 w-6 text-white animate-spin" />
                                ) : (
                                    <Camera className="h-6 w-6 text-white" />
                                )}
                            </label>
                            <input
                                id="avatar-upload"
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleAvatarUpload}
                                disabled={uploadingAvatar}
                            />
                        </div>
                        <div>
                            <p className="text-sm text-cinema-ivory font-medium">{fullName || 'Sin nombre'}</p>
                            <p className="text-xs text-muted-foreground mt-1">{email}</p>
                            <Button
                                variant="outline"
                                size="sm"
                                className="mt-3 border-primary/30 text-primary hover:bg-primary hover:text-black text-xs"
                                onClick={() => document.getElementById('avatar-upload')?.click()}
                                disabled={uploadingAvatar}
                            >
                                {uploadingAvatar ? 'Subiendo...' : 'Cambiar foto'}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Personal Info */}
            <Card className="bg-[#1f1f22] border-cinema-gold/10">
                <CardHeader>
                    <CardTitle className="text-cinema-ivory font-cinema text-lg tracking-wide">
                        Información Personal
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                    <div className="space-y-2">
                        <Label htmlFor="fullName" className="text-cinema-ivory/80 text-sm">Nombre completo</Label>
                        <Input
                            id="fullName"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Tu nombre"
                            className="bg-[#141416] border-white/10 focus:border-primary/50 text-cinema-ivory"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-cinema-ivory/80 text-sm">Correo electrónico</Label>
                        <Input
                            id="email"
                            value={email}
                            disabled
                            className="bg-[#141416] border-white/10 text-cinema-ivory/50 cursor-not-allowed"
                        />
                        <p className="text-[11px] text-muted-foreground">El correo no puede ser modificado desde aquí</p>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="phone" className="text-cinema-ivory/80 text-sm">Teléfono</Label>
                        <Input
                            id="phone"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+54 11 1234-5678"
                            className="bg-[#141416] border-white/10 focus:border-primary/50 text-cinema-ivory"
                        />
                    </div>
                    <div className="pt-2">
                        <Button
                            onClick={handleSaveProfile}
                            disabled={saving}
                            className="bg-primary hover:bg-primary/90 text-black font-bold"
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                            {saving ? 'Guardando...' : 'Guardar cambios'}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Password */}
            <Card className="bg-[#1f1f22] border-cinema-gold/10">
                <CardHeader>
                    <CardTitle className="text-cinema-ivory font-cinema text-lg tracking-wide flex items-center gap-2">
                        <Lock className="h-5 w-5 text-primary" />
                        Cambiar Contraseña
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                    <div className="space-y-2">
                        <Label htmlFor="newPassword" className="text-cinema-ivory/80 text-sm">Nueva contraseña</Label>
                        <div className="relative">
                            <Input
                                id="newPassword"
                                type={showNewPassword ? 'text' : 'password'}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Mínimo 6 caracteres"
                                className="bg-[#141416] border-white/10 focus:border-primary/50 text-cinema-ivory pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-cinema-ivory transition-colors"
                            >
                                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword" className="text-cinema-ivory/80 text-sm">Confirmar contraseña</Label>
                        <div className="relative">
                            <Input
                                id="confirmPassword"
                                type={showConfirmPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Repite la contraseña"
                                className="bg-[#141416] border-white/10 focus:border-primary/50 text-cinema-ivory pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-cinema-ivory transition-colors"
                            >
                                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>
                    {newPassword && confirmPassword && newPassword !== confirmPassword && (
                        <p className="text-red-400 text-xs">Las contraseñas no coinciden</p>
                    )}
                    <div className="pt-2">
                        <Button
                            onClick={handleChangePassword}
                            disabled={savingPassword || !newPassword || !confirmPassword}
                            variant="outline"
                            className="border-primary/30 text-primary hover:bg-primary hover:text-black font-bold"
                        >
                            {savingPassword ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
                            {savingPassword ? 'Actualizando...' : 'Actualizar contraseña'}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );

    const renderNotificationsTab = () => (
        <div className="space-y-6">
            <div>
                <h2 className="font-cinema text-2xl tracking-wide text-cinema-ivory">Notificaciones por mail</h2>
                <p className="text-sm text-muted-foreground mt-1">Configura las notificaciones que recibes por correo electrónico</p>
            </div>
            <Card className="bg-[#1f1f22] border-cinema-gold/10">
                <CardContent className="pt-6">
                    <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                            <Mail className="h-8 w-8 text-primary" />
                        </div>
                        <h3 className="text-lg font-medium text-cinema-ivory">Próximamente</h3>
                        <p className="text-sm text-muted-foreground max-w-sm">
                            Aquí podrás configurar qué notificaciones recibes por correo electrónico: nuevos mensajes, cambios en tus campañas, reportes y más.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );

    const renderFeaturesTab = () => {
        const betaEnabled = isEnabled('show_beta_media_plan', true);
        const metricsEnabled = isEnabled('show_metrics_comparative', true);

        return (
            <div className="space-y-8">
                <div>
                    <h2 className="font-cinema text-2xl tracking-wide text-cinema-ivory">Funciones</h2>
                    <p className="text-sm text-muted-foreground mt-1">Administra las capacidades globales de la plataforma.</p>
                </div>

                {/* Section: Feature Flags */}
                <Card className="bg-[#1f1f22] border-cinema-gold/10">
                    <CardHeader>
                        <CardTitle className="text-cinema-ivory font-body font-normal text-lg tracking-wide flex items-center gap-2">
                            Interruptores de Funciones
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1">
                        {/* Feature: BETA Media Plan */}
                        <div className="flex items-center justify-between p-4 rounded-lg hover:bg-white/5 transition-colors">
                            <div className="flex-1 min-w-0 pr-4">
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium text-cinema-ivory">Plan de Medios (BETA)</p>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 font-medium">BETA</span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Muestra el botón "Agregar plan (BETA)" en el dashboard de campañas.
                                </p>
                            </div>
                            <Switch
                                checked={betaEnabled}
                                onCheckedChange={() => handleToggleFlag('show_beta_media_plan', betaEnabled)}
                                disabled={flagsLoading}
                                className="data-[state=checked]:bg-primary"
                            />
                        </div>

                        <div className="border-t border-white/5" />

                        {/* Feature: Metrics / Comparative */}
                        <div className="flex items-center justify-between p-4 rounded-lg hover:bg-white/5 transition-colors">
                            <div className="flex-1 min-w-0 pr-4">
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium text-cinema-ivory">Métricas / Comparativas</p>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Muestra la pestaña "Métricas / Comparativas" en el dashboard.
                                </p>
                            </div>
                            <Switch
                                checked={metricsEnabled}
                                onCheckedChange={() => handleToggleFlag('show_metrics_comparative', metricsEnabled)}
                                disabled={flagsLoading}
                                className="data-[state=checked]:bg-primary"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Section: Calendly */}
                <Card className="bg-[#1f1f22] border-cinema-gold/10">
                    <CardHeader>
                        <CardTitle className="text-cinema-ivory font-body font-normal text-lg tracking-wide flex items-center gap-2">
                            Calendly
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <CalendlySetting />
                    </CardContent>
                </Card>

                {/* Section: Fees/Thresholds */}
                <Card className="bg-[#1f1f22] border-cinema-gold/10">
                    <CardHeader>
                        <CardTitle className="text-cinema-ivory font-body font-normal text-lg tracking-wide flex items-center gap-2">
                            Gestión de Umbrales (Fees)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <FeeThresholdManager />
                    </CardContent>
                </Card>
            </div>
        );
    };

    // ── Help Center tab (admin only) ─────────────────────────────────────────
    const resetVideoForm = () => { setVideoForm({ title: '', description: '', iframe_url: '', display_order: 0 }); setEditingVideoId(null); setShowVideoForm(false); };

    const handleSaveVideo = async () => {
        if (!videoForm.title.trim() || !videoForm.iframe_url.trim()) { toast.error('Título e iframe son obligatorios'); return; }
        setSavingVideo(true);
        try {
            if (editingVideoId) {
                const { error } = await supabase.from('help_videos').update({ title: videoForm.title, description: videoForm.description || null, iframe_url: videoForm.iframe_url, display_order: videoForm.display_order }).eq('id', editingVideoId);
                if (error) throw error;
                toast.success('Vídeo actualizado');
            } else {
                const { error } = await supabase.from('help_videos').insert({ title: videoForm.title, description: videoForm.description || null, iframe_url: videoForm.iframe_url, display_order: videoForm.display_order });
                if (error) throw error;
                toast.success('Vídeo añadido');
            }
            queryClient.invalidateQueries({ queryKey: ['help_videos'] });
            resetVideoForm();
        } catch (e: any) { toast.error(e.message); } finally { setSavingVideo(false); }
    };

    const handleDeleteVideo = async (id: string) => {
        if (!confirm('¿Eliminar este vídeo?')) return;
        const { error } = await supabase.from('help_videos').delete().eq('id', id);
        if (error) { toast.error(error.message); return; }
        toast.success('Vídeo eliminado');
        queryClient.invalidateQueries({ queryKey: ['help_videos'] });
    };

    const handleEditVideo = (v: typeof helpVideos[0]) => {
        setVideoForm({ title: v.title, description: v.description ?? '', iframe_url: v.iframe_url, display_order: v.display_order });
        setEditingVideoId(v.id);
        setShowVideoForm(true);
    };

    const renderHelpCenterTab = () => (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="font-cinema text-2xl tracking-wide text-cinema-ivory">Centro de Ayuda</h2>
                    <p className="text-sm text-muted-foreground mt-1">Gestiona los vídeos tutoriales que ven los usuarios</p>
                </div>
                {!showVideoForm && (
                    <Button onClick={() => setShowVideoForm(true)} size="sm" className="gap-2 bg-primary text-black hover:bg-primary/90">
                        <Plus className="h-4 w-4" /> Añadir vídeo
                    </Button>
                )}
            </div>

            {/* Form */}
            {showVideoForm && (
                <Card className="bg-[#1f1f22] border-primary/20">
                    <CardHeader>
                        <CardTitle className="text-cinema-ivory font-cinema text-lg flex items-center justify-between">
                            {editingVideoId ? 'Editar vídeo' : 'Nuevo vídeo'}
                            <button onClick={resetVideoForm} className="text-muted-foreground hover:text-cinema-ivory transition-colors">
                                <X className="h-4 w-4" />
                            </button>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-cinema-ivory/80 text-sm">Título *</Label>
                            <Input value={videoForm.title} onChange={e => setVideoForm(f => ({ ...f, title: e.target.value }))} placeholder="Cómo configurar tu campaña" className="bg-[#141416] border-white/10 focus:border-primary/50 text-cinema-ivory" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-cinema-ivory/80 text-sm">Descripción</Label>
                            <Input value={videoForm.description} onChange={e => setVideoForm(f => ({ ...f, description: e.target.value }))} placeholder="Breve descripción del vídeo (opcional)" className="bg-[#141416] border-white/10 focus:border-primary/50 text-cinema-ivory" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-cinema-ivory/80 text-sm">Código iframe *</Label>
                            <Textarea value={videoForm.iframe_url} onChange={e => setVideoForm(f => ({ ...f, iframe_url: e.target.value }))} placeholder='<iframe src="https://..." ...></iframe>' className="bg-[#141416] border-white/10 focus:border-primary/50 text-cinema-ivory font-mono text-xs" rows={3} />
                            <p className="text-xs text-muted-foreground">Pega el código iframe completo de YouTube, Vimeo, Loom u otro servicio.</p>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-cinema-ivory/80 text-sm">Orden de visualización</Label>
                            <Input type="number" value={videoForm.display_order} onChange={e => setVideoForm(f => ({ ...f, display_order: parseInt(e.target.value) || 0 }))} className="bg-[#141416] border-white/10 focus:border-primary/50 text-cinema-ivory w-24" />
                        </div>
                        <div className="flex gap-3 pt-2">
                            <Button onClick={handleSaveVideo} disabled={savingVideo} className="bg-primary text-black hover:bg-primary/90 gap-2">
                                {savingVideo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                {editingVideoId ? 'Guardar cambios' : 'Añadir vídeo'}
                            </Button>
                            <Button variant="ghost" onClick={resetVideoForm} className="text-muted-foreground hover:text-cinema-ivory">Cancelar</Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* List */}
            <Card className="bg-[#1f1f22] border-cinema-gold/10">
                <CardContent className="pt-6">
                    {videosLoading ? (
                        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                    ) : helpVideos.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
                            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                                <PlayCircle className="h-7 w-7 text-primary" />
                            </div>
                            <p className="text-muted-foreground text-sm">Aún no hay vídeos. Añade el primero.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {helpVideos.map(v => (
                                <div key={v.id} className="flex items-start gap-4 p-4 rounded-xl bg-[#141416] border border-white/5 group hover:border-primary/20 transition-colors">
                                    <GripVertical className="h-5 w-5 text-white/15 mt-0.5 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs text-primary/60 font-mono">#{v.display_order}</span>
                                            <p className="font-medium text-cinema-ivory text-sm">{v.title}</p>
                                        </div>
                                        {v.description && <p className="text-xs text-muted-foreground mb-2">{v.description}</p>}
                                        <p className="text-xs text-white/20 font-mono truncate">{v.iframe_url.slice(0, 80)}…</p>
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button size="sm" variant="ghost" onClick={() => handleEditVideo(v)} className="h-8 w-8 p-0 text-muted-foreground hover:text-cinema-ivory hover:bg-white/10">
                                            <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button size="sm" variant="ghost" onClick={() => handleDeleteVideo(v.id)} className="h-8 w-8 p-0 text-muted-foreground hover:text-red-400 hover:bg-red-500/10">
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#141416] text-cinema-ivory">
            <NavbarAdmin />

            <div className="max-w-6xl mx-auto px-6 pt-32 pb-12">
                {/* Back button */}
                <Button
                    variant="ghost"
                    onClick={() => navigate('/campaigns')}
                    className="mb-6 text-muted-foreground hover:text-cinema-ivory hover:bg-white/5 -ml-3"
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Volver
                </Button>

                <h1 className="font-cinema text-3xl tracking-wide mb-8">AJUSTES</h1>

                <div className="flex gap-8">
                    {/* Sidebar */}
                    <aside className="w-56 flex-shrink-0">
                        <nav className="space-y-1 sticky top-32">
                            {sidebarItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = activeTab === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => setActiveTab(item.id)}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 text-left ${isActive
                                            ? 'bg-primary/10 text-primary border border-primary/30'
                                            : 'text-muted-foreground hover:text-cinema-ivory hover:bg-white/5 border border-transparent'
                                            }`}
                                    >
                                        <Icon className="h-4 w-4 flex-shrink-0" />
                                        {item.label}
                                    </button>
                                );
                            })}
                        </nav>
                    </aside>

                    {/* Main Content */}
                    <main className="flex-1 min-w-0">
                        {activeTab === 'account' && renderAccountSettings()}
                        {activeTab === 'notifications' && renderNotificationsTab()}
                        {activeTab === 'features' && userRole === 'admin' && renderFeaturesTab()}
                        {activeTab === 'help_center' && userRole === 'admin' && renderHelpCenterTab()}
                        {activeTab === 'email_preview' && userRole === 'admin' && (
                            <div className="space-y-4">
                                <div>
                                    <h2 className="font-cinema text-2xl tracking-wide text-cinema-ivory">Preview de Emails</h2>
                                    <p className="text-sm text-muted-foreground mt-1">Vista previa de todos los emails transaccionales que se envían a los usuarios</p>
                                </div>
                                <EmailPreviewPanel height="calc(100vh - 320px)" />
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
};

export default Settings;
