import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export interface ChatCampaign {
    id: string;
    film_title: string;
    last_message_at: string;
    last_message_preview?: string;
    unread_count?: number;
}

export const useChatCampaigns = () => {
    const queryClient = useQueryClient();
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        // Initial user check
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) setUserId(user.id);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            const id = session?.user?.id || null;
            setUserId(id);
            if (!id) {
                queryClient.setQueryData(['chat-campaigns', null], { campaigns: [], totalUnread: 0 });
            }
        });

        return () => subscription.unsubscribe();
    }, [queryClient]);

    const { data: chatData, isLoading: loading, refetch: fetchCampaigns } = useQuery({
        queryKey: ['chat-campaigns', userId],
        enabled: !!userId,
        staleTime: 0,
        queryFn: async () => {
            if (!userId) return { campaigns: [], totalUnread: 0 };

            console.log("Fetching chat campaigns for user:", userId);

            // 1. Fetch campaigns
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
                // 2. Fetch all messages for these campaigns
                // Also fetch read states for the current user
                const { data: allMessages, error: msgError } = await supabase
                    .from('campaign_messages')
                    .select('*, message_read_states(user_id)')
                    .in('campaign_id', campaignIds)
                    .order('created_at', { ascending: false });

                if (msgError) throw msgError;

                if (allMessages) {
                    const processedLatest = new Set();
                    allMessages.forEach((msg: any) => {
                        const camp = campaignsMap[msg.campaign_id];
                        if (camp) {
                            // Set the absolute latest message as preview
                            if (!processedLatest.has(msg.campaign_id)) {
                                camp.last_message_at = msg.created_at;
                                camp.last_message_preview = msg.message;
                                processedLatest.add(msg.campaign_id);
                            }

                            // Unread if: sender is NOT the current user AND NO read state exists for THIS user
                            const isReadByUser = msg.message_read_states?.some((rs: any) => rs.user_id === userId);

                            if (!isReadByUser && msg.sender_id !== userId) {
                                camp.unread_count = (camp.unread_count || 0) + 1;
                            }
                        }
                    });
                }
            }

            const loadedCampaigns = Object.values(campaignsMap);
            // Re-sort by latest activity
            loadedCampaigns.sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());

            return {
                campaigns: loadedCampaigns,
                totalUnread: loadedCampaigns.reduce((acc, curr) => acc + (curr.unread_count || 0), 0)
            };
        },
    });

    return {
        campaigns: chatData?.campaigns || [],
        totalUnread: chatData?.totalUnread || 0,
        loading,
        fetchCampaigns,
        userId
    };
};
