import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, X, ChevronLeft, Loader2, Minimize2 } from 'lucide-react';
import CampaignChat from '@/components/CampaignChat';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ChatCampaign {
    id: string;
    film_title: string;
    last_message_at: string;
    last_message_preview?: string;
    unread_count?: number;
}

const GlobalChatWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);
    const [campaigns, setCampaigns] = useState<ChatCampaign[]>([]);
    const [loading, setLoading] = useState(false);
    const [userRole, setUserRole] = useState<'admin' | 'distributor' | null>(null);
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        checkUser();
    }, []);

    useEffect(() => {
        if (userId) {
            fetchCampaigns();

            // Global subscription for new messages to update badge
            const channel = supabase
                .channel('global-chat-notifications')
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'campaign_messages',
                    },
                    (payload) => {
                        // Only update if the message is NOT from the current user
                        if (payload.new.sender_id !== userId) {
                            // Determine if we should increment a specific campaign or just refetch
                            // Refetching is safer to get accurate unread counts
                            fetchCampaigns();
                        }
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [userId]);

    useEffect(() => {
        // Optional: polling or other logic for open state if needed, 
        // but the global subscription covers the badge.
        // We might want to refresh when opening just in case.
        if (isOpen && !activeCampaignId) {
            fetchCampaigns();
        }
    }, [isOpen, activeCampaignId]);

    const checkUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            setUserId(user.id);
            // Check if admin
            const { data: adminRole } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', user.id)
                .eq('role', 'admin')
                .maybeSingle();

            setUserRole(adminRole ? 'admin' : 'distributor');
        }
    };

    const fetchCampaigns = async () => {
        if (!userId) return;
        setLoading(true);

        try {
            // 1. Fetch campaigns (filtered by RLS)
            const { data: campaignsData, error } = await supabase
                .from('campaigns')
                .select(`
                id,
                created_at,
                films!inner (
                    title
                )
            `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const campaignIds = campaignsData.map((c: any) => c.id);
            const campaignsMap: Record<string, ChatCampaign> = {};

            // Initialize map
            campaignsData.forEach((c: any) => {
                campaignsMap[c.id] = {
                    id: c.id,
                    film_title: c.films?.title || 'Campaña sin título',
                    last_message_at: c.created_at,
                    unread_count: 0,
                    last_message_preview: 'Inicio de campaña'
                };
            });

            if (campaignIds.length > 0) {
                // 2. Fetch ALL messages for these campaigns to process locally
                // This ensures consistency and avoids multiple queries
                const { data: allMessages, error: msgError } = await supabase
                    .from('campaign_messages')
                    .select('campaign_id, message, created_at, read_at, sender_id')
                    .in('campaign_id', campaignIds)
                    .order('created_at', { ascending: false });

                if (msgError) throw msgError;

                if (allMessages) {
                    // Process messages
                    // We iterate through all messages. 
                    // Since they are ordered by created_at desc:
                    // - The first message encountered for a campaign is the LAST message.
                    // - We count unread for all messages.

                    const processedLatest = new Set();

                    allMessages.forEach((msg: any) => {
                        const camp = campaignsMap[msg.campaign_id];
                        if (camp) {
                            // Set latest message info if not yet set
                            if (!processedLatest.has(msg.campaign_id)) {
                                camp.last_message_at = msg.created_at;
                                camp.last_message_preview = msg.message;
                                processedLatest.add(msg.campaign_id);
                            }

                            // Count unread
                            // Unread if: read_at is null AND sender is not me
                            if (!msg.read_at && msg.sender_id !== userId) {
                                camp.unread_count = (camp.unread_count || 0) + 1;
                            }
                        }
                    });
                }
            }

            const loadedCampaigns = Object.values(campaignsMap);

            // Sort: 
            // 1. By Last Message Date (desc params)
            loadedCampaigns.sort((a, b) => {
                return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
            });

            setCampaigns(loadedCampaigns);
        } catch (error: any) {
            console.error('Error fetching campaigns for chat:', error);
            toast.error('Error al cargar chats', {
                description: error.message || 'Error desconocido'
            });
        } finally {
            setLoading(false);
        }
    };

    const markMessagesAsRead = async (campaignId: string) => {
        if (!userId) return;

        // Optimistic update: remove badge immediately
        setCampaigns(prev => prev.map(c =>
            c.id === campaignId ? { ...c, unread_count: 0 } : c
        ));

        try {
            await supabase
                .from('campaign_messages')
                .update({ read_at: new Date().toISOString() } as any)
                .eq('campaign_id', campaignId)
                .neq('sender_id', userId)
                .is('read_at', null);

            // No need to refetch, optimistic update covers it
        } catch (error) {
            console.error('Error marking messages as read:', error);
        }
    };

    const handleCampaignClick = (campaignId: string) => {
        setActiveCampaignId(campaignId);
        markMessagesAsRead(campaignId);
    };

    if (!userRole) return null; // Don't show if not logged in

    const totalUnread = campaigns.reduce((acc, curr) => acc + (curr.unread_count || 0), 0);

    if (!isOpen) {
        return (
            <Button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-xl z-50 cinema-glow p-0"
            >
                <MessageSquare className="h-6 w-6" />
                {totalUnread > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs font-bold rounded-full border-2 border-background flex items-center justify-center">
                        {totalUnread > 9 ? '9+' : totalUnread}
                    </span>
                )}
            </Button>
        );
    }

    return (
        <Card className="fixed bottom-6 right-6 w-[380px] h-[500px] shadow-2xl z-50 flex flex-col overflow-hidden border-cinema-gold/30 bg-background/95 backdrop-blur-sm animate-in slide-in-from-bottom-10 fade-in duration-200">
            {/* Header */}
            <div className="p-3 border-b border-border/40 flex items-center justify-between bg-muted/30">
                <div className="flex items-center gap-2">
                    {activeCampaignId && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 -ml-1"
                            onClick={() => setActiveCampaignId(null)}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                    )}
                    <span className="font-cinema text-lg">
                        {activeCampaignId ? 'Chat' : 'Mensajes'}
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setIsOpen(false)}
                    >
                        <Minimize2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
                {activeCampaignId ? (
                    <CampaignChat
                        campaignId={activeCampaignId}
                        userRole={userRole}
                        minimal={true}
                    />
                ) : (
                    <ScrollArea className="h-full">
                        {loading ? (
                            <div className="flex justify-center items-center h-40">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : campaigns.length === 0 ? (
                            <div className="p-6 text-center text-muted-foreground text-sm">
                                No tienes campañas activas.
                            </div>
                        ) : (
                            <div className="divide-y divide-border/20">
                                {campaigns.map((campaign) => (
                                    <button
                                        key={campaign.id}
                                        onClick={() => handleCampaignClick(campaign.id)}
                                        className="w-full text-left p-4 hover:bg-muted/50 transition-colors flex items-start gap-3 relative group"
                                    >
                                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 relative">
                                            <MessageSquare className="h-5 w-5 text-primary" />
                                            {campaign.unread_count ? (
                                                <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 flex items-center justify-center text-[10px] font-bold text-white shadow-sm ring-2 ring-background">
                                                    {campaign.unread_count > 9 ? '9+' : campaign.unread_count}
                                                </div>
                                            ) : null}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <p className={`font-medium text-sm truncate pr-2 ${campaign.unread_count ? 'text-foreground font-bold' : 'text-foreground/90'}`}>
                                                    {campaign.film_title}
                                                </p>
                                                {campaign.last_message_at && (
                                                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                                        {format(new Date(campaign.last_message_at), "d MMM", { locale: es })}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex justify-between items-center mt-1">
                                                <p className={`text-xs truncate max-w-[220px] ${campaign.unread_count ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                                                    {campaign.last_message_preview || 'Haz clic para ver la conversación'}
                                                </p>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                )}
            </div>
        </Card>
    );
};

export default GlobalChatWidget;
