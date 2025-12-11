import { useState, useEffect } from 'react';
import { Search, Play, BookOpen, MessageCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { trackEvent } from '@/utils/trackingUtils';

interface HelpCenterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialContext?: string;
}

interface HelpArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  type: 'faq' | 'article' | 'video_placeholder';
  keywords?: string[];
}

const HelpCenterEnhanced = ({ open, onOpenChange, initialContext }: HelpCenterProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<HelpArticle[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      trackEvent('help_center_opened');
      fetchArticles();
    }
  }, [open]);

  useEffect(() => {
    if (initialContext && articles.length > 0) {
      // Filter by context (category or keywords)
      const contextFiltered = articles.filter(
        a => a.category.toLowerCase().includes(initialContext.toLowerCase()) ||
             a.keywords?.some(k => k.toLowerCase().includes(initialContext.toLowerCase()))
      );
      setFilteredArticles(contextFiltered.length > 0 ? contextFiltered : articles);
    } else {
      filterArticles(searchQuery);
    }
  }, [searchQuery, articles, initialContext]);

  const fetchArticles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('help_articles')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setArticles(data as HelpArticle[]);
      setFilteredArticles(data as HelpArticle[]);
    }
    setLoading(false);
  };

  const filterArticles = (query: string) => {
    if (!query.trim()) {
      setFilteredArticles(articles);
      return;
    }

    const lowerQuery = query.toLowerCase();
    const filtered = articles.filter(
      a =>
        a.title.toLowerCase().includes(lowerQuery) ||
        a.content.toLowerCase().includes(lowerQuery) ||
        a.keywords?.some(k => k.toLowerCase().includes(lowerQuery))
    );
    setFilteredArticles(filtered);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      trackEvent('help_center_search', { query });
    }
  };

  const handleArticleClick = (article: HelpArticle) => {
    setSelectedArticle(article);
    trackEvent('help_center_article_opened', {
      articleId: article.id,
      articleTitle: article.title,
    });
  };

  const faqs = filteredArticles.filter(a => a.type === 'faq');
  const guides = filteredArticles.filter(a => a.type === 'article');
  const videos = filteredArticles.filter(a => a.type === 'video_placeholder');

  const categoryGroups = faqs.reduce((acc, faq) => {
    if (!acc[faq.category]) acc[faq.category] = [];
    acc[faq.category].push(faq);
    return acc;
  }, {} as Record<string, HelpArticle[]>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-cinema text-2xl flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-yellow-400" />
            Centro de Ayuda
          </DialogTitle>
        </DialogHeader>

        {selectedArticle ? (
          <div className="flex-1 overflow-auto space-y-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedArticle(null)}
              className="mb-2"
            >
              ← Volver
            </Button>
            <h3 className="font-cinema text-xl text-yellow-400">{selectedArticle.title}</h3>
            <div className="prose prose-invert prose-sm max-w-none">
              {selectedArticle.content.split('\n').map((paragraph, i) => (
                <p key={i} className="text-muted-foreground leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar en el centro de ayuda..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <Tabs defaultValue="faq" className="flex-1 overflow-hidden flex flex-col">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="faq">FAQ</TabsTrigger>
                <TabsTrigger value="guides">Guías</TabsTrigger>
                <TabsTrigger value="videos">Vídeos</TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-auto mt-4">
                <TabsContent value="faq" className="mt-0 space-y-4">
                  {loading ? (
                    <p className="text-muted-foreground text-center">Cargando...</p>
                  ) : Object.keys(categoryGroups).length === 0 ? (
                    <p className="text-muted-foreground text-center">
                      No se encontraron resultados para "{searchQuery}"
                    </p>
                  ) : (
                    Object.entries(categoryGroups).map(([category, items]) => (
                      <div key={category} className="space-y-2">
                        <h4 className="font-semibold text-yellow-400 text-sm">{category}</h4>
                        <Accordion type="single" collapsible className="space-y-2">
                          {items.map((faq) => (
                            <AccordionItem key={faq.id} value={faq.id} className="border border-border/50 rounded-lg px-4">
                              <AccordionTrigger className="text-sm hover:no-underline">
                                {faq.title}
                              </AccordionTrigger>
                              <AccordionContent className="text-sm text-muted-foreground">
                                {faq.content}
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      </div>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="guides" className="mt-0 space-y-3">
                  {guides.length === 0 ? (
                    <p className="text-muted-foreground text-center">
                      No se encontraron guías para "{searchQuery}"
                    </p>
                  ) : (
                    guides.map((guide) => (
                      <Card
                        key={guide.id}
                        className="p-4 hover:border-yellow-400/50 transition-colors cursor-pointer"
                        onClick={() => handleArticleClick(guide)}
                      >
                        <h4 className="font-semibold text-yellow-400 mb-2">{guide.title}</h4>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {guide.content.substring(0, 150)}...
                        </p>
                      </Card>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="videos" className="mt-0">
                  {videos.length === 0 ? (
                    <p className="text-muted-foreground text-center">
                      Próximamente vídeos explicativos
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {videos.map((video) => (
                        <Card
                          key={video.id}
                          className="overflow-hidden hover:border-yellow-400/50 transition-colors cursor-pointer group"
                          onClick={() => {
                            trackEvent('help_center_article_opened', {
                              articleId: video.id,
                              articleTitle: video.title,
                            });
                          }}
                        >
                          <div className="relative aspect-video bg-gradient-to-br from-background to-muted flex items-center justify-center">
                            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                            <Play className="h-16 w-16 text-yellow-400 relative z-10" />
                          </div>
                          <div className="p-3">
                            <h4 className="font-semibold text-sm">{video.title}</h4>
                            <p className="text-xs text-muted-foreground mt-1">{video.content}</p>
                            <p className="text-xs text-yellow-400 mt-2">
                              Próximamente: aquí verás el vídeo explicativo
                            </p>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </div>
            </Tabs>

            <div className="border-t border-border pt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>¿No encuentras lo que buscas?</span>
              <Button variant="outline" size="sm" className="gap-2">
                <MessageCircle className="h-4 w-4" />
                Contactar soporte
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default HelpCenterEnhanced;
