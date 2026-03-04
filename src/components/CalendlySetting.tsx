import { useState, useEffect } from "react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const CalendlySetting = () => {
    const { getSetting, updateSetting, isUpdating, isLoading } = useSiteSettings();
    const [url, setUrl] = useState("");

    const currentUrl = getSetting("calendly_url");

    useEffect(() => {
        if (currentUrl) {
            setUrl(currentUrl);
        }
    }, [currentUrl]);

    const handleSave = () => {
        if (!url.trim()) return;
        updateSetting({ key: "calendly_url", value: url.trim() });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
                <h3 className="text-sm font-normal text-cinema-ivory">Enlace de Calendly</h3>
            </div>

            <Alert className="bg-blue-500/10 border-blue-500/30 text-blue-400 py-2">
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                    Ingresa la URL completa de tu evento de Calendly (ej: https://calendly.com/tu-usuario/reunion). Este enlace se usará en el botón "Agenda una reunión" del dashboard de distribuidoras.
                </AlertDescription>
            </Alert>

            <div className="flex flex-col md:flex-row gap-3 items-end">
                <div className="flex-1 w-full space-y-2">
                    <Label htmlFor="calendly-url" className="text-xs text-muted-foreground">URL de Calendly</Label>
                    <Input
                        id="calendly-url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://calendly.com/..."
                        className="bg-[#141416] border-white/10 focus:border-primary/50 text-cinema-ivory h-9 text-sm"
                    />
                </div>
                <Button
                    onClick={handleSave}
                    disabled={isUpdating || url === currentUrl}
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-black font-bold h-9"
                >
                    {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Guardar URL
                </Button>
            </div>
        </div>
    );
};
