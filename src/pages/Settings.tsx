import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { NavbarAdmin } from '@/components/NavbarAdmin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { User, Camera, Save, Lock, ArrowLeft, Loader2, Eye, EyeOff, Settings as SettingsIcon, Mail, Zap } from 'lucide-react';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';

type SettingsTab = 'account' | 'notifications' | 'features';

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

    // Build sidebar items based on role
    const sidebarItems: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
        { id: 'account', label: 'Ajustes de la cuenta', icon: SettingsIcon },
        { id: 'notifications', label: 'Notificaciones por mail', icon: Mail },
        ...(userRole === 'admin' ? [{ id: 'features' as SettingsTab, label: 'Funciones', icon: Zap }] : []),
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
            <div className="space-y-6">
                <div>
                    <h2 className="font-cinema text-2xl tracking-wide text-cinema-ivory">Funciones</h2>
                    <p className="text-sm text-muted-foreground mt-1">Activa o desactiva funciones de la plataforma. Los cambios aplican para todos los usuarios.</p>
                </div>
                <Card className="bg-[#1f1f22] border-cinema-gold/10">
                    <CardContent className="pt-6">
                        <div className="space-y-1">
                            {/* Feature: BETA Media Plan */}
                            <div className="flex items-center justify-between p-4 rounded-lg hover:bg-white/5 transition-colors">
                                <div className="flex-1 min-w-0 pr-4">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium text-cinema-ivory">Plan de Medios (BETA)</p>
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 font-medium">BETA</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Muestra el botón "Agregar plan (BETA)" en el dashboard de campañas para administradores y distribuidoras.
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
                                        Muestra la pestaña "Métricas / Comparativas" en el dashboard para todos los usuarios.
                                    </p>
                                </div>
                                <Switch
                                    checked={metricsEnabled}
                                    onCheckedChange={() => handleToggleFlag('show_metrics_comparative', metricsEnabled)}
                                    disabled={flagsLoading}
                                    className="data-[state=checked]:bg-primary"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    };

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
                    </main>
                </div>
            </div>
        </div>
    );
};

export default Settings;
