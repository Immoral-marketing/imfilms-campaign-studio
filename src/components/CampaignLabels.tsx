import { Badge } from "@/components/ui/badge";
import { AlertCircle, Clock, FileWarning, Sparkles } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export interface CampaignData {
    id: string;
    created_at: string;
    updated_at?: string;
    target_audience_text?: string;
    campaign_assets?: { count: number }[] | null;
    status?: string;
    pending_changes_list?: string[];
    films?: {
        title?: string;
        target_audience_text?: string;
        genre?: string;
    } | null;
}

interface CampaignLabelsProps {
    campaign: CampaignData;
}

const CampaignLabels = ({ campaign }: CampaignLabelsProps) => {
    const now = new Date();
    const createdAt = new Date(campaign.created_at);
    const updatedAt = campaign.updated_at ? new Date(campaign.updated_at) : null;

    // 1. Nuevo (Últimas 24h)
    const isNew = (now.getTime() - createdAt.getTime()) < 24 * 60 * 60 * 1000;

    // 2. Faltan materiales clave
    const missingFields: string[] = [];

    if (!campaign.target_audience_text && !campaign.films?.target_audience_text) {
        missingFields.push("Público objetivo");
    }

    if (campaign.films && !campaign.films.genre) {
        missingFields.push("Género");
    }

    const missingKeyMaterials = missingFields.length > 0;

    // 3. Cambios pendientes
    const pendingList = campaign.pending_changes_list || [];
    const hasPendingChanges = pendingList.length > 0;

    // Helper to translate field names
    const translateField = (field: string) => {
        const map: Record<string, string> = {
            target_audience_text: "Público objetivo",
            main_goals: "Objetivos",
            title: "Título",
            country: "País",
            genre: "Género",
            secondary_genre: "Género Secundario",
            platforms: "Plataformas",
            budget_percent: "Presupuesto",
            platform_name: "Plataforma"
        };
        return map[field] || field.charAt(0).toUpperCase() + field.slice(1);
    };

    // 4. Creatividades pendientes (0 assets)
    const assetsCount = campaign.campaign_assets?.[0]?.count || 0;
    const pendingCreatives = assetsCount === 0;

    return (
        <div className="flex flex-wrap gap-2 mt-2">
            <TooltipProvider>
                {isNew && (
                    <Tooltip>
                        <TooltipTrigger>
                            <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20 gap-1">
                                <Sparkles className="w-3 h-3" />
                                Nuevo
                            </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Creada en las últimas 24h</p>
                        </TooltipContent>
                    </Tooltip>
                )}

                {hasPendingChanges && (
                    <Tooltip>
                        <TooltipTrigger>
                            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/20 gap-1">
                                <Clock className="w-3 h-3" />
                                Cambios pendientes
                            </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p className="font-semibold mb-1">Esperando aprobación en:</p>
                            <ul className="list-disc pl-4 text-xs">
                                {pendingList.map((field, idx) => (
                                    <li key={idx}>{translateField(field)}</li>
                                ))}
                            </ul>
                        </TooltipContent>
                    </Tooltip>
                )}

                {missingKeyMaterials && (
                    <Tooltip>
                        <TooltipTrigger>
                            <Badge variant="outline" className="bg-orange-500/10 text-orange-400 border-orange-500/20 hover:bg-orange-500/20 gap-1">
                                <AlertCircle className="w-3 h-3" />
                                Faltan datos
                            </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p className="font-semibold mb-1">Faltan los siguientes datos:</p>
                            <ul className="list-disc pl-4 text-xs">
                                {missingFields.map(field => (
                                    <li key={field}>{field}</li>
                                ))}
                            </ul>
                        </TooltipContent>
                    </Tooltip>
                )}

                {pendingCreatives && (
                    <Tooltip>
                        <TooltipTrigger>
                            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20 gap-1">
                                <FileWarning className="w-3 h-3" />
                                Sin creatividades
                            </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>No se han subido materiales aún</p>
                        </TooltipContent>
                    </Tooltip>
                )}
            </TooltipProvider>
        </div>
    );
};

export default CampaignLabels;
