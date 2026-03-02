import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Bell, FileImage, Pencil, Loader2, CheckCircle2, MessageSquare } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';

interface SystemMessage {
    id: string;
    campaign_id: string;
    sender_role: string;
    sender_name: string;
    message: string;
    created_at: string;
    read_at: string | null;
    message_read_states?: { user_id: string }[];
}

interface CampaignNotificationsProps {
    campaignId: string;
}

const getRelativeTime = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isToday(d)) return `Hoy, ${format(d, "HH:mm", { locale: es })}`;
    if (isYesterday(d)) return `Ayer, ${format(d, "HH:mm", { locale: es })}`;
    return format(d, "d MMM, HH:mm", { locale: es });
};

const CampaignNotifications = ({ campaignId }: CampaignNotificationsProps) => {
    const [notifications, setNotifications] = useState<SystemMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const mountedRef = useRef(true);

    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    useEffect(() => {
        mountedRef.current = true;
        loadNotifications();

        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) setCurrentUserId(user.id);
        });

        // Real-time subscription for new system messages
        const channel = supabase
            .channel(`campaign-system-msgs-${campaignId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'campaign_messages',
                    filter: `campaign_id=eq.${campaignId}`,
                },
                (payload) => {
                    // Only add system messages
                    if (mountedRef.current && (payload.new as any).sender_role === 'system') {
                        setNotifications((prev) => [payload.new as SystemMessage, ...prev]);
                    }
                }
            )
            .subscribe();

        return () => {
            mountedRef.current = false;
            supabase.removeChannel(channel);
        };
    }, [campaignId]);

    // Mark unread system messages as read when viewed
    useEffect(() => {
        const markAsRead = async () => {
            if (!currentUserId) return;

            const unread = notifications.filter((n) =>
                !n.message_read_states?.some(rs => rs.user_id === currentUserId)
            );

            if (unread.length > 0) {
                const entries = unread.map((n) => ({
                    message_id: n.id,
                    user_id: currentUserId
                }));

                await supabase
                    .from('message_read_states')
                    .upsert(entries, { onConflict: 'message_id,user_id' });

                setNotifications((prev) =>
                    prev.map((n) => {
                        const isNowRead = unread.some(u => u.id === n.id);
                        if (isNowRead) {
                            const currentStates = n.message_read_states || [];
                            if (!currentStates.some(rs => rs.user_id === currentUserId)) {
                                return { ...n, message_read_states: [...currentStates, { user_id: currentUserId }] };
                            }
                        }
                        return n;
                    })
                );
            }
        };

        if (notifications.length > 0) {
            markAsRead();
        }
    }, [notifications.length, currentUserId]);

    const loadNotifications = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('campaign_messages')
                .select('*, message_read_states(user_id)')
                .eq('campaign_id', campaignId)
                .eq('sender_role', 'system')
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            if (mountedRef.current) {
                setNotifications((data || []) as SystemMessage[]);
            }
        } catch (error) {
            console.error('Error loading notifications:', error);
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-40">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (notifications.length === 0) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-2 p-6">
                    <Bell className="h-12 w-12 text-muted-foreground mx-auto opacity-50" />
                    <p className="text-muted-foreground text-sm">
                        No hay notificaciones aún.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div
            className="h-full overflow-y-auto overscroll-contain"
            onWheel={(e) => e.stopPropagation()}
        >
            <div className="divide-y divide-border/20">
                {notifications.map((notif) => {
                    const isEditProposal = notif.message.startsWith('✏️');
                    const isProposalReady = notif.message.startsWith('📢');
                    const isProposalApproved = notif.message.startsWith('🟢');
                    const isProposalChanges = notif.message.startsWith('🟡');
                    const isMediaPlanReady = notif.message.startsWith('📅');
                    const isMediaPlanApproved = notif.message.startsWith('✅');
                    const isMediaPlanRejected = notif.message.startsWith('❌');

                    let NotifIcon = FileImage;
                    let notifTitle = 'Nuevas creatividades subidas';
                    let iconColor = 'text-cinema-yellow';
                    let iconBg = 'bg-primary/10';

                    if (isEditProposal) {
                        NotifIcon = Pencil;
                        notifTitle = 'Cambios propuestos';
                        iconColor = 'text-blue-400';
                        iconBg = 'bg-blue-500/10';
                    } else if (isProposalReady) {
                        NotifIcon = Bell;
                        notifTitle = 'Propuesta Lista';
                        iconColor = 'text-purple-400';
                        iconBg = 'bg-purple-500/10';
                    } else if (isProposalApproved) {
                        NotifIcon = CheckCircle2;
                        notifTitle = 'Propuesta Aprobada';
                        iconColor = 'text-green-500';
                        iconBg = 'bg-green-500/10';
                    } else if (isProposalChanges) {
                        NotifIcon = MessageSquare;
                        notifTitle = 'Cambios Sugeridos';
                        iconColor = 'text-yellow-500';
                        iconBg = 'bg-yellow-500/10';
                    } else if (isMediaPlanReady) {
                        NotifIcon = Bell;
                        notifTitle = notif.message.includes('(BETA)') ? 'Plan de Medios (BETA) Listo' : 'Plan de Medios Listo';
                        iconColor = 'text-cinema-yellow';
                        iconBg = 'bg-primary/10';
                    } else if (isMediaPlanApproved) {
                        NotifIcon = CheckCircle2;
                        notifTitle = notif.message.includes('(BETA)') ? 'Plan de Medios (BETA) Aprobado' : 'Plan de Medios Aprobado';
                        iconColor = 'text-green-500';
                        iconBg = 'bg-green-500/10';
                    } else if (isMediaPlanRejected) {
                        NotifIcon = MessageSquare;
                        notifTitle = notif.message.includes('(BETA)') ? 'Sugerencias en Plan de Medios (BETA)' : 'Sugerencias en Plan de Medios';
                        iconColor = 'text-red-500';
                        iconBg = 'bg-red-500/10';
                    }

                    const isRead = notif.message_read_states?.some(rs => rs.user_id === currentUserId);

                    return (
                        <div
                            key={notif.id}
                            className={`p-4 transition-colors ${!isRead ? 'bg-primary/5' : 'hover:bg-muted/30'
                                }`}
                        >
                            <div className="flex items-start gap-3">
                                <div className={`h-8 w-8 rounded-full ${iconBg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                                    <NotifIcon className={`h-4 w-4 ${iconColor}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <p className={`text-sm ${!isRead ? 'text-foreground font-bold' : 'text-foreground/90 font-medium'}`}>
                                            {notifTitle}
                                        </p>
                                        {!isRead && (
                                            <Badge variant="default" className="text-[9px] px-1.5 py-0 bg-primary/80 flex-shrink-0">
                                                Nuevo
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                        {notif.message.replace(/^[^\s]+ /, '')}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground/60 mt-2">
                                        {getRelativeTime(notif.created_at)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default CampaignNotifications;
