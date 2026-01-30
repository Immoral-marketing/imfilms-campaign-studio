import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Message {
  id: string;
  sender_role: 'admin' | 'distributor';
  sender_name?: string;
  message: string;
  created_at: string;
}

interface CampaignChatProps {
  campaignId: string;
  userRole: 'admin' | 'distributor';
}

const CampaignChat = ({ campaignId, userRole }: CampaignChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [userName, setUserName] = useState<string>('');

  useEffect(() => {
    fetchUserName();
  }, []);

  const fetchUserName = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Try metadata
      const metaName = user.user_metadata?.full_name || user.user_metadata?.name || user.user_metadata?.contact_name;
      if (metaName) {
        setUserName(metaName);
        return;
      }

      // 2. Try profiles table
      const { data: profile } = await supabase
        .from('profiles' as any)
        .select('contact_name')
        .eq('id', user.id)
        .maybeSingle() as any;

      if (profile?.contact_name) {
        setUserName(profile.contact_name);
        return;
      }

      // 3. Fallback
      setUserName(user.email?.split('@')[0] || 'Usuario');
    } catch (error) {
      console.error('Error fetching user name:', error);
    }
  };

  useEffect(() => {
    loadMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`campaign-chat-${campaignId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'campaign_messages',
          filter: `campaign_id=eq.${campaignId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaignId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('campaign_messages')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages((data || []) as Message[]);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Error al cargar mensajes');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    setSendingMessage(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { error } = await supabase.from('campaign_messages').insert({
        campaign_id: campaignId,
        sender_id: user.id,
        sender_role: userRole,
        sender_name: userName || 'Usuario',
        message: newMessage.trim(),
      } as any);

      if (error) throw error;

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Error al enviar mensaje');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full border border-border/40 rounded-lg overflow-hidden bg-muted/20">
      {/* Header */}
      <div className="border-b border-border/40 p-4 bg-background/50">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h3 className="font-cinema text-lg">Chat de campaña</h3>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Comunícate directamente con el equipo de imfilms
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Cargando mensajes...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-2">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto opacity-50" />
              <p className="text-muted-foreground">
                No hay mensajes aún. ¡Inicia la conversación!
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.sender_role === userRole;
            return (
              <div
                key={msg.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${isOwn
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background border border-border/40'
                    }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold">
                      {isOwn ? 'Tú' : (msg.sender_name || (msg.sender_role === 'admin' ? 'imfilms' : 'Distribuidora'))}
                    </span>
                    <span className="text-xs opacity-70">
                      {format(new Date(msg.created_at), "HH:mm", { locale: es })}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border/40 p-4 bg-background/50">
        <div className="flex gap-2">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Escribe tu mensaje..."
            className="min-h-[60px] resize-none"
            disabled={sendingMessage}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sendingMessage}
            className="px-4"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Presiona Enter para enviar, Shift+Enter para nueva línea
        </p>
      </div>
    </div>
  );
};

export default CampaignChat;
