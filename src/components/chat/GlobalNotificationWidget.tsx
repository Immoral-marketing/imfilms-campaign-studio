import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, X, FileImage, Pencil, CheckCircle2, MessageSquare, Loader2 } from 'lucide-react';
import { useGlobalNotifications } from '@/hooks/useGlobalNotifications';
import { format, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface GlobalNotificationWidgetProps {
    position?: 'bottom' | 'top';
}

const getRelativeTime = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isToday(d)) return `Hoy, ${format(d, "HH:mm", { locale: es })}`;
    if (isYesterday(d)) return `Ayer, ${format(d, "HH:mm", { locale: es })}`;
    return format(d, "d MMM, HH:mm", { locale: es });
};

const GlobalNotificationWidget = ({ position = 'top' }: GlobalNotificationWidgetProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const widgetRef = useRef<HTMLDivElement>(null);
    const { notifications, totalUnread, loading, markAllAsRead } = useGlobalNotifications();
    const navigate = useNavigate();

    // Handle toggle event
    useEffect(() => {
        const handleToggle = () => setIsOpen((prev) => !prev);
        window.addEventListener('toggle-global-notifications', handleToggle);
        return () => window.removeEventListener('toggle-global-notifications', handleToggle);
    }, []);

    // Handle click outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            const isToggleAction = target.closest('#global-notifications-toggle');

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

    // Mark all as read when opening the widget
    useEffect(() => {
        if (isOpen && totalUnread > 0) {
            markAllAsRead();
        }
    }, [isOpen, totalUnread, markAllAsRead]);

    if (!isOpen) return null;

    return (
        <div ref={widgetRef}>
            <Card className={`fixed w-[380px] h-[500px] shadow-2xl z-[100] flex flex-col border-cinema-gold/30 bg-background/95 backdrop-blur-sm transition-all duration-300 overflow-hidden ${position === 'bottom' ? 'bottom-6 right-6' : 'top-20 right-6'
                }`}>
                <div className="p-4 border-b border-border/40 flex items-center justify-between bg-muted/30">
                    <div className="flex items-center gap-2">
                        <Bell className="h-5 w-5 text-primary" />
                        <h3 className="font-cinema text-lg tracking-wide uppercase">Notificaciones</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        {totalUnread > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-[10px] uppercase tracking-tighter h-7 px-2 hover:text-primary"
                                onClick={markAllAsRead}
                            >
                                Marcar todo como leído
                            </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsOpen(false)}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <div
                    className="flex-1 min-h-0 overflow-y-auto overscroll-contain"
                    onWheel={(e) => e.stopPropagation()}
                >
                    {loading ? (
                        <div className="flex items-center justify-center h-40">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-3 opacity-50">
                            <Bell className="h-12 w-12 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">No tienes notificaciones por ahora</p>
                        </div>
                    ) : (
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
                                let notifTitle = 'Nuevas creatividades';
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

                                return (
                                    <div
                                        key={notif.id}
                                        onClick={() => {
                                            navigate(`/campaigns/${notif.campaign_id}`);
                                            setIsOpen(false);
                                        }}
                                        className={`p-4 cursor-pointer transition-colors ${!notif.read_at ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted/30'}`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`h-9 w-9 rounded-full ${iconBg} flex items-center justify-center flex-shrink-0 mt-0.5 border border-primary/10`}>
                                                <NotifIcon className={`h-4 w-4 ${iconColor}`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <p className={`text-[10px] font-cinema uppercase tracking-widest text-primary mb-0.5 truncate`}>
                                                            {notif.film_title}
                                                        </p>
                                                        <p className={`text-sm leading-tight ${!notif.read_at ? 'text-foreground font-bold' : 'text-foreground/90 font-medium'}`}>
                                                            {notifTitle}
                                                        </p>
                                                    </div>
                                                    {!notif.read_at && (
                                                        <div className="h-2 w-2 rounded-full bg-primary mt-1.5 flex-shrink-0 animate-pulse" />
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                                    {notif.message.replace(/^[^\s]+ /, '')} {/* Remove emoji for cleaner look if title handles it */}
                                                </p>
                                                <p className="text-[10px] text-muted-foreground/50 mt-2 font-medium">
                                                    {getRelativeTime(notif.created_at)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
                <div className="p-2 border-t border-border/20 bg-muted/20 text-center">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-[10px] text-muted-foreground uppercase tracking-widest w-full hover:bg-primary/10 hover:text-primary transition-all"
                        onClick={() => navigate('/campaigns')}
                    >
                        Ver todas las campañas
                    </Button>
                </div>
            </Card>
        </div>
    );
};

export default GlobalNotificationWidget;
