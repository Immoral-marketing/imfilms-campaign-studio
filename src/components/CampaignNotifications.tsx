import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, FileImage, Loader2 } from 'lucide-react';
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

    useEffect(() => {
        mountedRef.current = true;
        loadNotifications();

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
        const unread = notifications.filter((n) => !n.read_at);
        if (unread.length > 0) {
            const ids = unread.map((n) => n.id);
            supabase
                .from('campaign_messages')
                .update({ read_at: new Date().toISOString() } as any)
                .in('id', ids)
                .then(() => {
                    setNotifications((prev) =>
                        prev.map((n) =>
                            ids.includes(n.id) ? { ...n, read_at: new Date().toISOString() } : n
                        )
                    );
                });
        }
    }, [notifications.length]);

    const loadNotifications = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('campaign_messages')
                .select('*')
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
        <ScrollArea className="h-full">
            <div className="divide-y divide-border/20">
                {notifications.map((notif) => (
                    <div
                        key={notif.id}
                        className={`p-4 transition-colors ${!notif.read_at ? 'bg-primary/5' : 'hover:bg-muted/30'
                            }`}
                    >
                        <div className="flex items-start gap-3">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <FileImage className="h-4 w-4 text-cinema-yellow" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                    <p className={`text-sm ${!notif.read_at ? 'text-foreground font-bold' : 'text-foreground/90 font-medium'}`}>
                                        Nuevas creatividades subidas
                                    </p>
                                    {!notif.read_at && (
                                        <Badge variant="default" className="text-[9px] px-1.5 py-0 bg-primary/80 flex-shrink-0">
                                            Nuevo
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                    {notif.message}
                                </p>
                                <p className="text-[10px] text-muted-foreground/60 mt-2">
                                    {getRelativeTime(notif.created_at)}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </ScrollArea>
    );
};

export default CampaignNotifications;
