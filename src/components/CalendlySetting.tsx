import { useState, useEffect } from "react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const CalendlySetting = () => {
    const { getSetting, updateSetting, isUpdating, isLoading } = useSiteSettings();
    const [adminUrl, setAdminUrl] = useState("");
    const [paidMediaUrl, setPaidMediaUrl] = useState("");

    const currentAdminUrl = getSetting("calendly_admin_url", getSetting("calendly_url", ""));
    const currentPaidMediaUrl = getSetting("calendly_paid_media_url", "");

    useEffect(() => {
        if (currentAdminUrl) setAdminUrl(currentAdminUrl);
        if (currentPaidMediaUrl) setPaidMediaUrl(currentPaidMediaUrl);
    }, [currentAdminUrl, currentPaidMediaUrl]);

    const handleSaveAdmin = () => {
        if (!adminUrl.trim()) return;
        updateSetting({ key: "calendly_admin_url", value: adminUrl.trim() });
    };

    const handleSavePaidMedia = () => {
        if (!paidMediaUrl.trim()) return;
        updateSetting({ key: "calendly_paid_media_url", value: paidMediaUrl.trim() });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-sm font-semibold text-cinema-ivory">Calendly: Administración</h3>
                </div>

                <Alert className="bg-blue-500/10 border-blue-500/30 text-blue-400 py-2">
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                        Este enlace se usará para la opción "Reunión con Administración".
                    </AlertDescription>
                </Alert>

                <div className="flex flex-col md:flex-row gap-3 items-end">
                    <div className="flex-1 w-full space-y-2">
                        <Label htmlFor="admin-url" className="text-xs text-muted-foreground">URL de Administración</Label>
                        <Input
                            id="admin-url"
                            value={adminUrl}
                            onChange={(e) => setAdminUrl(e.target.value)}
                            placeholder="https://calendly.com/..."
                            className="bg-[#141416] border-white/10 focus:border-primary/50 text-cinema-ivory h-9 text-sm"
                        />
                    </div>
                    <Button
                        onClick={handleSaveAdmin}
                        disabled={isUpdating || adminUrl === currentAdminUrl}
                        size="sm"
                        className="bg-primary hover:bg-primary/90 text-black font-bold h-9"
                    >
                        {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                        Guardar
                    </Button>
                </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-white/5">
                <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-sm font-semibold text-cinema-ivory">Calendly: Paid Media</h3>
                </div>

                <Alert className="bg-purple-500/10 border-purple-500/30 text-purple-400 py-2">
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                        Este enlace se usará para la opción "Reunión Equipo Paid Media".
                    </AlertDescription>
                </Alert>

                <div className="flex flex-col md:flex-row gap-3 items-end">
                    <div className="flex-1 w-full space-y-2">
                        <Label htmlFor="paid-media-url" className="text-xs text-muted-foreground">URL de Paid Media</Label>
                        <Input
                            id="paid-media-url"
                            value={paidMediaUrl}
                            onChange={(e) => setPaidMediaUrl(e.target.value)}
                            placeholder="https://calendly.com/..."
                            className="bg-[#141416] border-white/10 focus:border-primary/50 text-cinema-ivory h-9 text-sm"
                        />
                    </div>
                    <Button
                        onClick={handleSavePaidMedia}
                        disabled={isUpdating || paidMediaUrl === currentPaidMediaUrl}
                        size="sm"
                        className="bg-primary hover:bg-primary/90 text-black font-bold h-9"
                    >
                        {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                        Guardar
                    </Button>
                </div>
            </div>
        </div>
    );
};
