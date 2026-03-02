import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MessageSquare, ChevronLeft, Loader2, Minimize2, Bell } from 'lucide-react';
import CampaignChat from '@/components/CampaignChat';
import CampaignNotifications from '@/components/CampaignNotifications';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useLocation } from 'react-router-dom';
import { useChatCampaigns } from '@/hooks/useChatCampaigns';
import { useQueryClient } from '@tanstack/react-query';

interface GlobalChatWidgetProps {
    showFloatingButton?: boolean;
    position?: 'bottom' | 'top';
}

const GlobalChatWidget = ({
    showFloatingButton = true,
    position = 'bottom'
}: GlobalChatWidgetProps) => {
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);
    const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);
    const widgetRef = useRef<HTMLDivElement>(null);
    const [activeTab, setActiveTab] = useState<'chat' | 'notifications'>('chat');
    const [notificationCount, setNotificationCount] = useState(0);
    const [userRole, setUserRole] = useState<'admin' | 'distributor' | null>(null);

    const location = useLocation();
    const { campaigns, totalUnread, loading, userId } = useChatCampaigns();

    useEffect(() => {
        if (userId) {
            fetchUserRole(userId);
        } else {
            setUserRole(null);
            setIsOpen(false);
            setActiveCampaignId(null);
        }
    }, [userId]);

    // Handle toggle event
    useEffect(() => {
        const handleToggle = () => setIsOpen((prev) => !prev);
        window.addEventListener('toggle-global-chat', handleToggle);
        return () => window.removeEventListener('toggle-global-chat', handleToggle);
    }, []);

    // Handle click outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            const isToggleAction = target.closest('#global-chat-toggle');

            if (widgetRef.current && !widgetRef.current.contains(target) && !isToggleAction) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const fetchUserRole = async (uid: string) => {
        const { data: adminRole } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', uid)
            .eq('role', 'admin')
            .maybeSingle();

        setUserRole(adminRole ? 'admin' : 'distributor');
    };

    const markMessagesAsRead = async (campaignId: string) => {
        if (!userId) return;

        try {
            // 1. Get all unread messages for this campaign not sent by current user
            // We use .or to include system messages (where sender_id is null)
            const { data: unreadMessages } = await supabase
                .from('campaign_messages')
                .select('id, message_read_states(user_id)')
                .eq('campaign_id', campaignId)
                .or(`sender_id.is.null,sender_id.neq.${userId}`);

            if (!unreadMessages) return;

            // Filter out messages that ALREADY have a read state for this user
            const messagesToMark = unreadMessages.filter((msg: any) =>
                !msg.message_read_states?.some((rs: any) => rs.user_id === userId)
            );

            if (messagesToMark.length === 0) return;

            // 2. Bulk insert into message_read_states
            const entries = messagesToMark.map(msg => ({
                message_id: msg.id,
                user_id: userId
            }));

            await supabase
                .from('message_read_states')
                .upsert(entries, { onConflict: 'message_id,user_id' });

            // Invalidate BOTH queries to update Widget, Notifications and Navbar
            queryClient.invalidateQueries({ queryKey: ['chat-campaigns', userId] });
            queryClient.invalidateQueries({ queryKey: ['global-notifications', userId] });
        } catch (error) {
            console.error('Error marking messages as read:', error);
        }
    };

    const handleCampaignClick = (campaignId: string) => {
        setActiveCampaignId(campaignId);
        setActiveTab('chat');
        markMessagesAsRead(campaignId);
        fetchNotificationCount(campaignId);
    };

    const fetchNotificationCount = async (campId: string) => {
        try {
            const { data: messages, error } = await supabase
                .from('campaign_messages')
                .select('id, message_read_states(user_id)')
                .eq('campaign_id', campId)
                .eq('sender_role', 'system');

            if (!error && messages) {
                // Count messages where NO read state exists for this user
                const unread = messages.filter((msg: any) =>
                    !msg.message_read_states?.some((rs: any) => rs.user_id === userId)
                ).length;
                setNotificationCount(unread);
            }
        } catch (err) {
            console.error('Error fetching notification count:', err);
        }
    };

    const isDashboardPage =
        location.pathname.startsWith('/campaigns') ||
        location.pathname.startsWith('/admin') ||
        location.pathname.startsWith('/team');

    const effectivePosition = position === 'bottom' && isDashboardPage ? 'top' : position;

    if (!userRole || !isDashboardPage) return null;

    if (!isOpen) {
        if (!showFloatingButton) return null;

        return (
            <div ref={widgetRef}>
                <Button
                    onClick={() => setIsOpen(true)}
                    className={`fixed h-14 w-14 rounded-full shadow-xl z-50 cinema-glow p-0 ${effectivePosition === 'bottom' ? 'bottom-6 right-6' : 'top-20 right-6'
                        }`}
                >
                    <MessageSquare className="h-6 w-6" />
                    {totalUnread > 0 && (
                        <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs font-bold rounded-full border-2 border-background flex items-center justify-center">
                            {totalUnread > 9 ? '9+' : totalUnread}
                        </span>
                    )}
                </Button>
            </div>
        );
    }

    return (
        <div ref={widgetRef}>
            <Card className={`fixed w-[380px] h-[500px] shadow-2xl z-[100] flex flex-col border-cinema-gold/30 bg-background/95 backdrop-blur-sm transition-all duration-300 overflow-hidden ${effectivePosition === 'bottom' ? 'bottom-6 right-6' : 'top-20 right-6'
                }`}>
                <div className="p-3 border-b border-border/40 flex items-center justify-between bg-muted/30">
                    <div className="flex items-center gap-2">
                        {activeCampaignId && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 -ml-1"
                                onClick={() => {
                                    if (activeCampaignId) markMessagesAsRead(activeCampaignId);
                                    setActiveCampaignId(null);
                                }}
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

                <div className="flex-1 min-h-0 flex flex-col">
                    {activeCampaignId ? (
                        <>
                            <div className="flex border-b border-border/30 bg-muted/10 flex-shrink-0">
                                <button
                                    onClick={() => setActiveTab('chat')}
                                    className={`flex-1 text-xs font-medium py-2.5 px-3 flex items-center justify-center gap-1.5 transition-colors border-b-2 ${activeTab === 'chat'
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-muted-foreground hover:text-foreground'
                                        }`}
                                >
                                    <MessageSquare className="h-3.5 w-3.5" />
                                    Conversación
                                </button>
                                <button
                                    onClick={() => { setActiveTab('notifications'); setNotificationCount(0); }}
                                    className={`flex-1 text-xs font-medium py-2.5 px-3 flex items-center justify-center gap-1.5 transition-colors border-b-2 ${activeTab === 'notifications'
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-muted-foreground hover:text-foreground'
                                        }`}
                                >
                                    <Bell className="h-3.5 w-3.5" />
                                    Notificaciones
                                    {notificationCount > 0 && (
                                        <span className="ml-1 h-4 min-w-[16px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                            {notificationCount > 9 ? '9+' : notificationCount}
                                        </span>
                                    )}
                                </button>
                            </div>
                            <div className="flex-1 min-h-0">
                                {activeTab === 'chat' ? (
                                    <CampaignChat
                                        campaignId={activeCampaignId}
                                        userRole={userRole}
                                        minimal={true}
                                    />
                                ) : (
                                    <CampaignNotifications campaignId={activeCampaignId} />
                                )}
                            </div>
                        </>
                    ) : (
                        <div
                            className="h-full overflow-y-auto overscroll-contain"
                            onWheel={(e) => e.stopPropagation()}
                        >
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
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default GlobalChatWidget;
