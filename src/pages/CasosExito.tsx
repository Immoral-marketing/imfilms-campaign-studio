import { ArrowLeft, Target, TrendingUp, Users, Calendar, DollarSign, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const CasosExito = () => {
  const casos = [
    {
      id: 1,
      type: 'Estreno Limitado',
      title: 'Drama Indie Español',
      genre: 'Drama',
      investment: '8.500€',
      platforms: ['Instagram', 'Facebook', 'YouTube'],
      results: {
        reach: '520.000',
        clicks: '5.700',
        ctr: '1.1%',
        avgOccupancy: '58%',
      },
      strategy: 'Campaña hiperenfocada en audiencia cinéfila urbana 25-45 años. Peso fuerte en pre-estreno para generar anticipación y primeras críticas positivas.',
      learnings: [
        'Stories de Instagram con quotes de críticas funcionaron excepcionalmente bien',
        'YouTube Pre-roll en canales de cine arthouse generó el CTR más alto',
        'El público respondió mejor a creativos con premios y menciones de festivales',
      ],
    },
    {
      id: 2,
      type: 'Estreno Mediano',
      title: 'Comedia Familiar',
      genre: 'Comedia',
      investment: '22.000€',
      platforms: ['Instagram', 'TikTok', 'YouTube', 'Facebook'],
      results: {
        reach: '2.2M',
        clicks: '26.400',
        ctr: '1.2%',
        avgOccupancy: '69%',
      },
      strategy: 'Estrategia multi-generacional con creativos diferentes por plataforma. TikTok para teens, Instagram para padres 30-45, Facebook para abuelos.',
      learnings: [
        'TikTok con challenges y humor funcionó para captar audiencia joven',
        'Los anuncios en YouTube pre-fin de semana generaron picos de reservas',
        'Creativos mostrando escenas familiares tuvieron 60% más engagement',
      ],
    },
    {
      id: 3,
      type: 'Estreno Masivo',
      title: 'Thriller de Acción',
      genre: 'Acción/Thriller',
      investment: '85.000€',
      platforms: ['Instagram', 'TikTok', 'YouTube', 'Facebook', 'Twitter'],
      results: {
        reach: '7.6M',
        clicks: '95.000',
        ctr: '1.25%',
        avgOccupancy: '78%',
      },
      strategy: 'Campaña de alta intensidad con múltiples oleadas. Pre-campaña para awareness, pico en fin de semana de estreno, retargeting post-estreno para alargar recorrido.',
      learnings: [
        'Videos verticales de 6-9 segundos en TikTok e Instagram generaron mayor viralidad',
        'El retargeting post-estreno prolongó ocupación 2 semanas más de lo esperado',
        'Colaboraciones con micro-influencers generaron conversaciones orgánicas',
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/40">
        <div className="container mx-auto px-4 py-6">
          <Link to="/">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
          </Link>
          <div className="space-y-2">
            <h1 className="font-cinema text-5xl text-primary cinema-glow">
              Casos de Éxito
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl">
              Así es como trabajamos en imfilms. Estrategias reales, resultados reales.
            </p>
          </div>
        </div>
      </div>

      {/* Casos */}
      <div className="container mx-auto px-4 py-12">
        <div className="space-y-12">
          {casos.map((caso, index) => (
            <Card key={caso.id} className="p-8 bg-card/50 backdrop-blur-sm border-border/40">
              <div className="space-y-6">
                {/* Header del caso */}
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div>
                    <div className="inline-block px-3 py-1 bg-primary/10 rounded-full mb-3">
                      <span className="text-sm font-cinema text-primary">{caso.type}</span>
                    </div>
                    <h2 className="font-cinema text-3xl text-foreground">
                      {caso.title}
                    </h2>
                    <p className="text-muted-foreground mt-1">
                      {caso.genre}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Inversión total</div>
                    <div className="font-cinema text-3xl text-primary cinema-glow">
                      {caso.investment}
                    </div>
                  </div>
                </div>

                {/* Plataformas */}
                <div>
                  <div className="text-sm text-muted-foreground mb-2">Plataformas utilizadas</div>
                  <div className="flex gap-2 flex-wrap">
                    {caso.platforms.map((platform) => (
                      <span
                        key={platform}
                        className="px-3 py-1 bg-muted/50 rounded-md text-sm"
                      >
                        {platform}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Estrategia */}
                <div className="bg-muted/20 rounded-lg p-4 border border-border/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-5 w-5 text-primary" />
                    <h3 className="font-cinema text-lg">Estrategia</h3>
                  </div>
                  <p className="text-muted-foreground">{caso.strategy}</p>
                </div>

                {/* Resultados */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    <h3 className="font-cinema text-lg">Resultados</h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-muted/20 rounded-lg">
                      <Users className="h-6 w-6 text-primary mx-auto mb-2" />
                      <div className="font-cinema text-2xl text-foreground">
                        {caso.results.reach}
                      </div>
                      <div className="text-xs text-muted-foreground">Alcance</div>
                    </div>
                    <div className="text-center p-4 bg-muted/20 rounded-lg">
                      <Play className="h-6 w-6 text-primary mx-auto mb-2" />
                      <div className="font-cinema text-2xl text-foreground">
                        {caso.results.clicks}
                      </div>
                      <div className="text-xs text-muted-foreground">Clics</div>
                    </div>
                    <div className="text-center p-4 bg-muted/20 rounded-lg">
                      <Target className="h-6 w-6 text-primary mx-auto mb-2" />
                      <div className="font-cinema text-2xl text-foreground">
                        {caso.results.ctr}
                      </div>
                      <div className="text-xs text-muted-foreground">CTR</div>
                    </div>
                    <div className="text-center p-4 bg-muted/20 rounded-lg">
                      <Calendar className="h-6 w-6 text-primary mx-auto mb-2" />
                      <div className="font-cinema text-2xl text-foreground">
                        {caso.results.avgOccupancy}
                      </div>
                      <div className="text-xs text-muted-foreground">Ocupación media</div>
                    </div>
                  </div>
                </div>

                {/* Aprendizajes */}
                <div>
                  <h3 className="font-cinema text-lg mb-3">Aprendizajes clave</h3>
                  <ul className="space-y-2">
                    {caso.learnings.map((learning, i) => (
                      <li key={i} className="flex items-start gap-3 text-muted-foreground">
                        <span className="text-primary mt-1">•</span>
                        <span>{learning}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* CTA Final */}
        <div className="mt-16 text-center space-y-6 max-w-2xl mx-auto">
          <h2 className="font-cinema text-4xl text-foreground">
            ¿Listo para tu próximo estreno?
          </h2>
          <p className="text-lg text-muted-foreground">
            Estas estrategias funcionan. Ahora es tu turno de conseguir resultados así.
          </p>
          <div className="flex gap-4 justify-center">
            <Link to="/demo">
              <Button size="lg" variant="outline">
                Probar Demo
              </Button>
            </Link>
            <Link to="/wizard">
              <Button size="lg" className="cinema-glow">
                Crear mi campaña
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CasosExito;
