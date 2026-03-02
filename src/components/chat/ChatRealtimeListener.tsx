import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

export const ChatRealtimeListener = () => {
    const queryClient = useQueryClient();

    useEffect(() => {
        let userId: string | null = null;

        const setupSubscription = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            userId = user?.id || null;
            if (!userId) return;

            console.log("Setting up global chat realtime listener...");

            const channel = supabase
                .channel('global-app-chat-realtime')
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'campaign_messages',
                    },
                    (payload) => {
                        console.log("Global Realtime Event:", payload.eventType, payload.new);
                        // Invalidate the shared query cache for chat
                        queryClient.invalidateQueries({ queryKey: ['chat-campaigns'] });
                        // Also invalidate for notifications
                        queryClient.invalidateQueries({ queryKey: ['global-notifications'] });
                    }
                )
                .subscribe((status) => {
                    console.log("Global Chat Subscription Status:", status);
                });

            return channel;
        };

        const channelPromise = setupSubscription();

        return () => {
            channelPromise.then((channel) => {
                if (channel) {
                    console.log("Cleaning up global chat realtime listener...");
                    supabase.removeChannel(channel);
                }
            });
        };
    }, [queryClient]);

    return null; // This component doesn't render anything
};
