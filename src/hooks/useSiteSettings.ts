import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useSiteSettings = () => {
    const queryClient = useQueryClient();

    const { data: settings, isLoading } = useQuery({
        queryKey: ["site-settings"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("site_settings")
                .select("key, value");

            if (error) {
                console.error("Error fetching site settings:", error);
                throw error;
            }

            const settingsMap: Record<string, string> = {};
            data.forEach((item) => {
                settingsMap[item.key] = item.value;
            });
            return settingsMap;
        },
    });

    const updateSettingMutation = useMutation({
        mutationFn: async ({ key, value }: { key: string; value: string }) => {
            const { data: { user } } = await supabase.auth.getUser();

            const { error } = await supabase
                .from("site_settings")
                .upsert({
                    key,
                    value,
                    updated_at: new Date().toISOString(),
                    updated_by: user?.id
                })
                .eq("key", key);

            if (error) throw error;
            return { key, value };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["site-settings"] });
            toast.success("Ajuste actualizado correctamente");
        },
        onError: (error: any) => {
            console.error("Error updating site setting:", error);
            toast.error("Error al actualizar el ajuste");
        },
    });

    const getSetting = (key: string, defaultValue: string = ""): string => {
        return settings?.[key] ?? defaultValue;
    };

    return {
        settings,
        isLoading,
        updateSetting: updateSettingMutation.mutate,
        isUpdating: updateSettingMutation.isPending,
        getSetting,
    };
};
