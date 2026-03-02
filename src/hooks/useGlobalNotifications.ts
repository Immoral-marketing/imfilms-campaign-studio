import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export interface SystemNotification {
    id: string;
    campaign_id: string;
    film_title?: string;
    sender_role: string;
    sender_name: string;
    message: string;
    created_at: string;
    read_at: string | null;
}

export const useGlobalNotifications = () => {
    const queryClient = useQueryClient();
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) setUserId(user.id);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUserId(session?.user?.id || null);
        });

        return () => subscription.unsubscribe();
    }, []);

    const { data: notificationData, isLoading: loading } = useQuery({
        queryKey: ['global-notifications', userId],
        enabled: !!userId,
        staleTime: 0,
        queryFn: async () => {
            if (!userId) return { notifications: [], totalUnread: 0 };

            console.log("Fetching global notifications...");

            // 1. Fetch campaigns to get titles (and handle RLS)
            const { data: campaigns, error: campError } = await supabase
                .from('campaigns')
                .select('id, films(title)');

            if (campError) throw campError;

            const campMap = (campaigns || []).reduce((acc: any, curr: any) => {
                acc[curr.id] = curr.films?.title || 'Campaña sin título';
                return acc;
            }, {});

            const campaignIds = Object.keys(campMap);

            if (campaignIds.length === 0) return { notifications: [], totalUnread: 0 };

            // 2. Fetch system messages for these campaigns
            // We join with message_read_states to see if the CURRENT user has read each message
            const { data: messages, error: msgError } = await supabase
                .from('campaign_messages')
                .select('*, message_read_states(user_id)')
                .in('campaign_id', campaignIds)
                .eq('sender_role', 'system')
                .order('created_at', { ascending: false })
                .limit(50);

            if (msgError) throw msgError;

            const notifications: SystemNotification[] = (messages || []).map((msg: any) => ({
                ...msg,
                film_title: campMap[msg.campaign_id],
                // Mark as read if a record exists for this user in message_read_states
                read_at: msg.message_read_states?.some((rs: any) => rs.user_id === userId) ? 'read' : null
            }));

            const totalUnread = notifications.filter(n => !n.read_at).length;

            return { notifications, totalUnread };
        },
    });

    const markAllAsRead = async () => {
        if (!userId || !notificationData?.notifications) return;

        const unreadIds = notificationData.notifications
            .filter(n => !n.read_at)
            .map(n => n.id);

        if (unreadIds.length === 0) return;

        try {
            // Bulk insert into message_read_states for this user
            const readStateEntries = unreadIds.map(id => ({
                message_id: id,
                user_id: userId
            }));

            const { error } = await supabase
                .from('message_read_states')
                .upsert(readStateEntries, { onConflict: 'message_id,user_id' });

            if (error) throw error;

            // Invalidate BOTH to update UI everywhere
            queryClient.invalidateQueries({ queryKey: ['global-notifications', userId] });
            queryClient.invalidateQueries({ queryKey: ['chat-campaigns', userId] });
        } catch (err) {
            console.error('Error marking notifications as read:', err);
        }
    };

    return {
        notifications: notificationData?.notifications || [],
        totalUnread: notificationData?.totalUnread || 0,
        loading,
        markAllAsRead
    };
};
