import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { HelpCircle, PlayCircle, BookOpen, Loader2, MessageSquare, CheckCircle2 } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const faqs = [
  {
    question: '¿Qué hace exactamente imfilms por mí?',
    answer:
      'Nos encargamos de toda la estrategia y ejecución de tu campaña digital: definimos audiencias, planificamos momentos clave, configuramos y lanzamos los anuncios en las plataformas, optimizamos el rendimiento y te entregamos un reporte completo. Tú solo tienes que conocer tu película; nosotros la traducimos a campaña efectiva.',
  },
  {
    question: '¿Necesito conocimientos de marketing digital?',
    answer:
      'No. Tú conoces tu película y tu audiencia, nosotros nos encargamos de toda la parte técnica y estratégica del marketing digital. Solo necesitas completar el wizard con información básica de tu estreno.',
  },
  {
    question: '¿Por qué no puedo avanzar con mi configuración de campaña?',
    answer:
      'Nuestro sistema detecta cuando dos campañas competirían por la misma audiencia en fechas similares. Esto protege la efectividad de ambas campañas y evita disparar costes innecesariamente. Puedes ajustar fechas, modificar la audiencia o contactarnos para diseñar una estrategia conjunta.',
  },
  {
    question: '¿Cuándo tendré noticias sobre mi campaña?',
    answer:
      'Una vez enviada tu solicitud, nuestro equipo la revisa en 24-48h. Te notificaremos por email y en la plataforma cada vez que haya un cambio de estado. Puedes seguir el progreso en tiempo real desde tu panel de campañas.',
  },
  {
    question: '¿Qué materiales creativos necesito proporcionar?',
    answer:
      'Depende de la estrategia, pero generalmente necesitamos: trailer o teaser, póster oficial, imágenes promocionales (verticales y horizontales), y textos clave (sinopsis, tagline). Te indicaremos exactamente qué necesitamos y cuándo en tu timeline de campaña.',
  },
  {
    question: '¿Qué incluye exactamente el servicio?',
    answer:
      'El servicio incluye: definición estratégica de audiencias, planificación de momentos clave del ciclo de vida del estreno, setup técnico completo en plataformas, lanzamiento y gestión diaria de campañas, optimización continua del rendimiento, y reporte final detallado con métricas y aprendizajes.',
  },
  {
    question: '¿Puedo hacer cambios una vez enviada la campaña?',
    answer:
      'Sí, mientras la campaña esté en revisión o pendiente de aprobación puedes solicitar cambios. Una vez activa, los ajustes importantes deben coordinarse con nuestro equipo para mantener la efectividad. Usa el chat de tu campaña para comunicarte con nosotros.',
  },
  {
    question: '¿Cómo funcionan las fechas y deadlines?',
    answer:
      'Las fechas clave son: Creatives Deadline (cuando debemos recibir tus materiales), Pre-campaña (calentamiento antes del estreno), Premiere Weekend (semana de estreno con máxima intensidad), y Final Report Date (cuando recibes el análisis completo). Todas estas fechas las configuramos juntos en el wizard.',
  },
];

const glossary = [
  {
    term: 'CPM (Coste Por Mil impresiones)',
    definition:
      'Lo que pagas por cada mil veces que tu anuncio se muestra. Por ejemplo, si el CPM es 5€, pagas 5€ por cada 1.000 personas que ven tu anuncio.',
  },
  {
    term: 'CTR (Click-Through Rate)',
    definition:
      'Porcentaje de personas que hacen clic en tu anuncio después de verlo. Un CTR del 2% significa que de cada 100 personas que lo ven, 2 hacen clic.',
  },
  {
    term: 'Alcance',
    definition:
      'Número total de personas únicas que han visto tu anuncio al menos una vez. Es diferente de impresiones, que cuenta cada vez que se muestra (a la misma persona o a diferentes).',
  },
  {
    term: 'Frecuencia',
    definition:
      'Número promedio de veces que cada persona ve tu anuncio. Una frecuencia de 3 significa que, de media, cada persona en tu audiencia lo ha visto 3 veces.',
  },
  {
    term: 'Conversión',
    definition:
      'Acción deseada que realiza el usuario: ver un trailer, visitar la web, comprar una entrada, etc. La tasa de conversión mide qué porcentaje de usuarios completa esa acción.',
  },
  {
    term: 'Segmentación / Targeting',
    definition:
      'Proceso de definir exactamente a quién queremos mostrar los anuncios: edad, ubicación, intereses, comportamientos, etc. Cuanto más precisa, más efectiva suele ser la campaña.',
  },
  {
    term: 'Retargeting',
    definition:
      'Mostrar anuncios a personas que ya interactuaron con tu contenido (vieron el trailer, visitaron la web, etc.). Suele ser muy efectivo porque son personas ya interesadas.',
  },
  {
    term: 'Lookalike Audience',
    definition:
      'Audiencia creada por las plataformas que "se parece" a tus mejores clientes o fans. Útil para encontrar nuevas personas similares a las que ya mostraron interés.',
  },
];

const HelpCenter = () => {
  const [supportSubject, setSupportSubject] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [sendingSupport, setSendingSupport] = useState(false);
  const [supportSent, setSupportSent] = useState(false);

  const handleSendSupport = async () => {
    if (!supportSubject.trim() || !supportMessage.trim()) {
      toast.error('Por favor rellena el asunto y el mensaje');
      return;
    }
    setSendingSupport(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { error } = await supabase.functions.invoke('send-email', {
        body: {
          type: 'support_request',
          subject: supportSubject,
          message: supportMessage,
          userEmail: session?.user?.email ?? 'Usuario no identificado',
        },
      });
      if (error) throw error;
      setSupportSent(true);
      setSupportSubject('');
      setSupportMessage('');
    } catch (e: any) {
      toast.error('Error al enviar el mensaje. Inténtalo de nuevo.');
    } finally {
      setSendingSupport(false);
    }
  };

  const { data: videos = [], isLoading: videosLoading } = useQuery({
    queryKey: ['help_videos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('help_videos')
        .select('*')
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <HelpCircle className="h-4 w-4" />
          Centro de Ayuda
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-cinema text-2xl flex items-center gap-2">
            <HelpCircle className="h-6 w-6 text-primary" />
            Centro de Ayuda
          </DialogTitle>
          <DialogDescription>
            Todo lo que necesitas saber sobre imfilms y tus campañas digitales
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="faq" className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="faq">
              <BookOpen className="h-4 w-4 mr-2" />
              FAQ
            </TabsTrigger>
            <TabsTrigger value="glossary">Glosario</TabsTrigger>
            <TabsTrigger value="videos">Vídeos</TabsTrigger>
            <TabsTrigger value="support">
              <MessageSquare className="h-4 w-4 mr-2" />
              Soporte
            </TabsTrigger>
          </TabsList>

          <TabsContent value="faq" className="mt-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Preguntas frecuentes sobre el funcionamiento de imfilms
            </p>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`faq-${index}`}>
                  <AccordionTrigger className="text-left">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </TabsContent>

          <TabsContent value="glossary" className="mt-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Términos clave del marketing digital explicados de forma simple
            </p>
            <div className="space-y-4">
              {glossary.map((item, index) => (
                <div
                  key={index}
                  className="border border-border/40 rounded-lg p-4 space-y-2"
                >
                  <h4 className="font-cinema text-lg text-yellow-400">{item.term}</h4>
                  <p className="text-sm text-muted-foreground">{item.definition}</p>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="videos" className="mt-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Vídeos tutoriales para aprovechar al máximo imfilms
            </p>

            {videosLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : videos.length === 0 ? (
              <div className="border border-border/40 rounded-lg p-8 text-center space-y-2">
                <PlayCircle className="h-10 w-10 text-muted-foreground mx-auto" />
                <p className="text-muted-foreground text-sm">
                  Pronto encontrarás aquí vídeos tutoriales del equipo imfilms.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {videos.map((video: any) => (
                  <div key={video.id} className="space-y-2">
                    <h4 className="font-semibold text-foreground">{video.title}</h4>
                    {video.description && (
                      <p className="text-sm text-muted-foreground">{video.description}</p>
                    )}
                    <div
                      className="w-full rounded-lg overflow-hidden border border-border/40"
                      style={{ aspectRatio: '16/9' }}
                      dangerouslySetInnerHTML={{ __html: video.iframe_url }}
                    />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
          <TabsContent value="support" className="mt-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              ¿Tienes alguna duda o problema? Escríbenos y te respondemos en menos de 24h.
            </p>

            {supportSent ? (
              <div className="border border-green-500/30 bg-green-500/5 rounded-lg p-8 text-center space-y-3">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
                <h4 className="font-semibold text-foreground">Mensaje enviado</h4>
                <p className="text-sm text-muted-foreground">
                  Hemos recibido tu mensaje. Te responderemos en menos de 24 horas.
                </p>
                <Button variant="outline" size="sm" onClick={() => setSupportSent(false)}>
                  Enviar otro mensaje
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="support-subject">Asunto *</Label>
                  <Input
                    id="support-subject"
                    value={supportSubject}
                    onChange={e => setSupportSubject(e.target.value)}
                    placeholder="¿En qué podemos ayudarte?"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="support-message">Mensaje *</Label>
                  <Textarea
                    id="support-message"
                    value={supportMessage}
                    onChange={e => setSupportMessage(e.target.value)}
                    placeholder="Describe tu consulta o problema con el mayor detalle posible..."
                    className="mt-1"
                    rows={5}
                  />
                </div>
                <Button
                  onClick={handleSendSupport}
                  disabled={sendingSupport}
                  className="w-full gap-2"
                >
                  {sendingSupport ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <MessageSquare className="h-4 w-4" />
                  )}
                  {sendingSupport ? 'Enviando...' : 'Enviar mensaje'}
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default HelpCenter;
