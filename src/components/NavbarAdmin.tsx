import { useNavigate, useLocation } from "react-router-dom";
import logoImfilms from "@/assets/logo-imfilms.png";
import { useEffect, useState } from "react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, User, Settings, Users, LayoutDashboard, MessageSquare, Bell, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useChatCampaigns } from "@/hooks/useChatCampaigns";
import { useGlobalNotifications } from "@/hooks/useGlobalNotifications";

export const NavbarAdmin = () => {
    const navigate = useNavigate();
    const [scrolled, setScrolled] = useState(false);
    const [user, setUser] = useState<any>(null);

    const location = useLocation();
    const { totalUnread: chatUnread } = useChatCampaigns();
    const { totalUnread: notificationsUnread } = useGlobalNotifications();

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };
        window.addEventListener("scroll", handleScroll);

        // Get current user
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => {
            window.removeEventListener("scroll", handleScroll);
            subscription.unsubscribe();
        };
    }, []);

    const handleLogout = async () => {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            toast.success("Sesión cerrada correctamente");
            navigate("/");
        } catch (error: any) {
            console.error("Error signing out:", error);
            toast.error("Error al cerrar sesión");
        }
    };

    const toggleChat = () => {
        window.dispatchEvent(new CustomEvent('toggle-global-chat'));
    };

    const toggleNotifications = () => {
        window.dispatchEvent(new CustomEvent('toggle-global-notifications'));
    };

    return (
        <nav
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-6 py-4 flex items-center justify-between ${scrolled ? "bg-black/80 backdrop-blur-md border-b border-white/10" : "bg-transparent"
                }`}
        >
            <div className="flex items-center">
                <img
                    src={logoImfilms}
                    alt="Imfilms"
                    className="h-10 md:h-12 w-auto object-contain cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => navigate("/")}
                />
            </div>

            <div className="flex items-center gap-2 md:gap-4">
                {/* Global Notifications Button */}
                <div className="relative">
                    <Button
                        id="global-notifications-toggle"
                        variant="ghost"
                        size="icon"
                        onClick={toggleNotifications}
                        className="text-cinema-ivory hover:text-primary hover:bg-white/5 relative"
                    >
                        <Bell className="h-6 w-6" />
                        {notificationsUnread > 0 && (
                            <span className="absolute -top-1 -right-1 h-5 w-5 bg-primary text-black text-[10px] font-bold rounded-full border-2 border-[#1a1a1c] flex items-center justify-center">
                                {notificationsUnread > 9 ? '9+' : notificationsUnread}
                            </span>
                        )}
                    </Button>
                </div>

                {/* Global Chat Button */}
                <div className="relative">
                    <Button
                        id="global-chat-toggle"
                        variant="ghost"
                        size="icon"
                        onClick={toggleChat}
                        className="text-cinema-ivory hover:text-primary hover:bg-white/5 relative"
                    >
                        <MessageSquare className="h-6 w-6" />
                        {chatUnread > 0 && (
                            <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-[#1a1a1c] flex items-center justify-center">
                                {chatUnread > 9 ? '9+' : chatUnread}
                            </span>
                        )}
                    </Button>
                </div>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-2.5 px-2 py-1.5 rounded-full hover:bg-white/5 transition-colors cursor-pointer outline-none">
                            <Avatar className="h-9 w-9 border-2 border-primary/20 hover:border-primary/50 transition-colors">
                                <AvatarImage src={user?.user_metadata?.avatar_url || ''} />
                                <AvatarFallback className="bg-primary/10 text-primary">
                                    <User className="h-5 w-5" />
                                </AvatarFallback>
                            </Avatar>
                            <div className="hidden md:flex flex-col items-start">
                                <span className="text-sm font-medium text-cinema-ivory leading-tight">
                                    {user?.user_metadata?.full_name || user?.user_metadata?.contact_name || user?.email?.split('@')[0] || 'Usuario'}
                                </span>
                            </div>
                            <ChevronDown className="h-4 w-4 text-muted-foreground hidden md:block" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 bg-[#1f1f22] border-[#ebc453]/20 text-cinema-ivory">
                        <DropdownMenuLabel className="font-cinema text-primary uppercase tracking-wider">
                            Mi Cuenta
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-white/10" />
                        <DropdownMenuItem
                            onClick={() => navigate("/campaigns")}
                            className="hover:bg-primary hover:text-black focus:bg-primary focus:text-black cursor-pointer gap-2"
                        >
                            <LayoutDashboard className="h-4 w-4" />
                            <span>Campañas</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => navigate("/team")}
                            className="hover:bg-primary hover:text-black focus:bg-primary focus:text-black cursor-pointer gap-2"
                        >
                            <Users className="h-4 w-4" />
                            <span>Equipo</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => navigate("/settings")}
                            className="hover:bg-primary hover:text-black focus:bg-primary focus:text-black cursor-pointer gap-2"
                        >
                            <Settings className="h-4 w-4" />
                            <span>Ajustes</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-white/10" />
                        <DropdownMenuItem
                            onClick={handleLogout}
                            className="hover:bg-red-500 hover:text-white focus:bg-red-500 focus:text-white cursor-pointer gap-2 text-red-500"
                        >
                            <LogOut className="h-4 w-4" />
                            <span>Cerrar sesión</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </nav>
    );
};
