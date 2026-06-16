import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import WizardProgress from '@/components/WizardProgress';
import { ArrowLeft, Sparkles, Lock, Star } from 'lucide-react';
import { toast } from 'sonner';
import StrategyRecommender from '@/components/StrategyRecommender';
import type { ReleaseSize, Genre } from '@/hooks/useStrategyRecommender';

const DemoWizard = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;

  // Pre-filled demo data — fechas siempre futuras, relativas a hoy
  const buildDemoDates = () => {
    const today = new Date();
    // Estreno: ~10 semanas desde hoy
    const releaseDate = new Date(today);
    releaseDate.setDate(today.getDate() + 70);

    // Pre-campaña: 1 mes antes del estreno
    const preStartDate = new Date(releaseDate);
    preStartDate.setDate(releaseDate.getDate() - 30);
    const preEndDate = new Date(releaseDate);
    preEndDate.setDate(releaseDate.getDate() - 1);

    // Fin de semana de estreno
    const premiereWeekendStart = new Date(releaseDate);
    const premiereWeekendEnd = new Date(releaseDate);
    premiereWeekendEnd.setDate(releaseDate.getDate() + 6);

    // Campaña completa: desde pre-campaña hasta fin del fin de semana estreno
    const campaignEnd = new Date(premiereWeekendEnd);

    // Entrega de report: 2 semanas después del estreno
    const reportDate = new Date(releaseDate);
    reportDate.setDate(releaseDate.getDate() + 14);

    const fmt = (d: Date) => d.toISOString().split('T')[0];
    return {
      releaseDate: fmt(releaseDate),
      preStartDate: fmt(preStartDate),
      preEndDate: fmt(preEndDate),
      premiereWeekendStart: fmt(premiereWeekendStart),
      premiereWeekendEnd: fmt(premiereWeekendEnd),
      campaignStart: fmt(preStartDate),
      campaignEnd: fmt(campaignEnd),
      reportDate: fmt(reportDate),
    };
  };

  const demoDates = buildDemoDates();

  const demoData = {
    filmTitle: 'Película Demo',
    genre: 'drama' as Genre,
    releaseDate: demoDates.releaseDate,
    releaseSize: 'mediano' as ReleaseSize,
    targetAudience: 'Público adulto 25-45 años, interesado en cine de autor y dramas contemporáneos',
    platforms: ['Instagram', 'TikTok', 'YouTube', 'Facebook'],
    investment: 15000,
    preStartDate: demoDates.preStartDate,
    preEndDate: demoDates.preEndDate,
    premiereWeekendStart: demoDates.premiereWeekendStart,
    premiereWeekendEnd: demoDates.premiereWeekendEnd,
    campaignStart: demoDates.campaignStart,
    campaignEnd: demoDates.campaignEnd,
    reportDate: demoDates.reportDate,
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      // Show CTA modal
      toast.info('Este es el modo demo. Crea tu cuenta para configurar tu campaña real.', {
        duration: 5000,
      });
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="font-cinema text-3xl text-foreground mb-2">Información de la película</h2>
              <p className="text-muted-foreground">
                Estos datos están pre-rellenados para que explores cómo funciona la herramienta.
              </p>
            </div>

            <Card className="p-6 space-y-4 bg-card/50 backdrop-blur-sm">
              <div>
                <label className="text-sm font-medium mb-2 block">Título de la película</label>
                <div className="p-3 bg-muted/20 rounded-md text-muted-foreground">
                  {demoData.filmTitle}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Género</label>
                  <div className="p-3 bg-muted/20 rounded-md text-muted-foreground capitalize">
                    {demoData.genre}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Fecha de estreno</label>
                  <div className="p-3 bg-muted/20 rounded-md text-muted-foreground">
                    {new Date(demoData.releaseDate).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Tamaño del estreno</label>
                <div className="p-3 bg-muted/20 rounded-md text-muted-foreground capitalize">
                  {demoData.releaseSize}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Público objetivo</label>
                <div className="p-3 bg-muted/20 rounded-md text-muted-foreground">
                  {demoData.targetAudience}
                </div>
              </div>
            </Card>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="font-cinema text-3xl text-foreground mb-2">
                Recomendación estratégica
              </h2>
              <p className="text-muted-foreground">
                Basándonos en tu película, esto es lo que recomendamos.
              </p>
            </div>

            <StrategyRecommender
              releaseSize={demoData.releaseSize}
              genre={demoData.genre}
              targetAudience={demoData.targetAudience}
              investmentOverrides={{ conservador: 5000, estandar: 15000, agresivo: 30000 }}
            />
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="font-cinema text-3xl text-foreground mb-2">Plataformas y calendario</h2>
              <p className="text-muted-foreground">Configuración de medios y timing.</p>
            </div>

            <Card className="p-6 space-y-4 bg-card/50 backdrop-blur-sm">
              <div>
                <label className="text-sm font-medium mb-2 block">Plataformas seleccionadas</label>
                <div className="flex gap-2 flex-wrap">
                  {demoData.platforms.map((platform) => (
                    <span
                      key={platform}
                      className="px-4 py-2 bg-primary/10 text-primary rounded-md border border-primary/20"
                    >
                      {platform}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Pre-campaña</label>
                  <div className="p-3 bg-muted/20 rounded-md text-muted-foreground">
                    {new Date(demoData.preStartDate).toLocaleDateString('es-ES')} –{' '}
                    {new Date(demoData.preEndDate).toLocaleDateString('es-ES')}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Fin de semana estreno</label>
                  <div className="p-3 bg-muted/20 rounded-md text-muted-foreground">
                    {new Date(demoData.premiereWeekendStart).toLocaleDateString('es-ES')} –{' '}
                    {new Date(demoData.premiereWeekendEnd).toLocaleDateString('es-ES')}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Campaña completa</label>
                  <div className="p-3 bg-muted/20 rounded-md text-muted-foreground">
                    {new Date(demoData.campaignStart).toLocaleDateString('es-ES')} –{' '}
                    {new Date(demoData.campaignEnd).toLocaleDateString('es-ES')}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Entrega de report</label>
                  <div className="p-3 bg-muted/20 rounded-md text-muted-foreground">
                    {new Date(demoData.reportDate).toLocaleDateString('es-ES')}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="font-cinema text-3xl text-foreground mb-2">
                Escenarios de inversión
              </h2>
              <p className="text-muted-foreground">
                Compara tres niveles de inversión y elige el que mejor se adapte a tus objetivos.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Escenario Conversadora */}
              <Card className="p-6 space-y-4 bg-card/50 backdrop-blur-sm hover:border-primary/40 transition-colors">
                <div className="text-center">
                  <div className="inline-block px-3 py-1 bg-muted/20 rounded-full text-xs font-semibold text-muted-foreground mb-3">
                    CONVERSADORA
                  </div>
                  <div className="font-cinema text-4xl text-primary cinema-glow">
                    5.000€
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Inversión publicitaria
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between p-2 bg-muted/10 rounded">
                    <span className="text-muted-foreground">Fee variable (20%)</span>
                    <span>1.000€</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted/10 rounded">
                    <span className="text-muted-foreground">Fee setup (4 plataformas, 1ª gratis)</span>
                    <span>600€</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted/10 rounded">
                    <span className="text-muted-foreground">Fee fijo de gestión</span>
                    <span>0€</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-border/40">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Total</span>
                    <span className="font-cinema text-2xl text-primary">
                      6.600€
                    </span>
                  </div>
                </div>
              </Card>

              {/* Escenario Mediano */}
              <Card className="p-6 space-y-4 bg-primary/5 border-primary/30 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg">
                  RECOMENDADO
                </div>
                <div className="text-center">
                  <div className="inline-block px-3 py-1 bg-primary/20 rounded-full text-xs font-semibold text-primary mb-3">
                    ESTÁNDAR
                  </div>
                  <div className="font-cinema text-5xl text-primary cinema-glow">
                    15.000€
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Inversión publicitaria
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between p-2 bg-background/50 rounded">
                    <span className="text-muted-foreground">Fee variable (15%)</span>
                    <span>2.250€</span>
                  </div>
                  <div className="flex justify-between p-2 bg-background/50 rounded">
                    <span className="text-muted-foreground">Fee setup (4 plataformas, 1ª gratis)</span>
                    <span>600€</span>
                  </div>
                  <div className="flex justify-between p-2 bg-background/50 rounded">
                    <span className="text-muted-foreground">Fee fijo de gestión</span>
                    <span>0€</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-primary/40">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Total</span>
                    <span className="font-cinema text-2xl text-primary">
                      17.850€
                    </span>
                  </div>
                </div>
              </Card>

              {/* Escenario Grande */}
              <Card className="p-6 space-y-4 bg-card/50 backdrop-blur-sm hover:border-primary/40 transition-colors">
                <div className="text-center">
                  <div className="inline-block px-3 py-1 bg-cinema-yellow/20 rounded-full text-xs font-semibold text-cinema-yellow mb-3">
                    AGRESIVA
                  </div>
                  <div className="font-cinema text-4xl text-cinema-yellow cinema-glow">
                    30.000€
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Inversión publicitaria
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between p-2 bg-muted/10 rounded">
                    <span className="text-muted-foreground">Fee variable (12%)</span>
                    <span>3.600€</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted/10 rounded">
                    <span className="text-muted-foreground">Fee setup (4 plataformas, 1ª gratis)</span>
                    <span>600€</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted/10 rounded">
                    <span className="text-muted-foreground">Fee fijo de gestión</span>
                    <span>0€</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-border/40">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Total</span>
                    <span className="font-cinema text-2xl text-cinema-yellow">
                      34.200€
                    </span>
                  </div>
                </div>
              </Card>
            </div>

          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="font-cinema text-3xl text-foreground mb-2">
                Resultados proyectados por escenario
              </h2>
              <p className="text-muted-foreground">
                A mayor inversión, mayor alcance y mejores resultados. Compara las proyecciones.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Resultados Pequeño */}
              <Card className="p-6 space-y-4 bg-card/50 backdrop-blur-sm">
                <div className="text-center border-b border-border/40 pb-4">
                  <div className="inline-block px-3 py-1 bg-muted/20 rounded-full text-xs font-semibold text-muted-foreground mb-2">
                    INVERSIÓN 5.000€
                  </div>
                  <div className="font-cinema text-xl text-primary">
                    Conversadora
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-center p-3 bg-muted/10 rounded-lg">
                    <div className="font-cinema text-2xl text-primary">300K-450K</div>
                    <div className="text-xs text-muted-foreground mt-1">Alcance estimado</div>
                  </div>
                  <div className="text-center p-3 bg-muted/10 rounded-lg">
                    <div className="font-cinema text-2xl text-primary">10K-15K</div>
                    <div className="text-xs text-muted-foreground mt-1">Clics esperados</div>
                  </div>
                  <div className="text-center p-3 bg-muted/10 rounded-lg">
                    <div className="font-cinema text-2xl text-primary">3.2%</div>
                    <div className="text-xs text-muted-foreground mt-1">CTR medio</div>
                  </div>
                  <div className="text-center p-3 bg-muted/10 rounded-lg">
                    <div className="font-cinema text-2xl text-primary">55-65%</div>
                    <div className="text-xs text-muted-foreground mt-1">Ocupación estimada</div>
                  </div>
                </div>

                <div className="pt-3 text-center">
                  <p className="text-xs text-muted-foreground italic">
                    Ideal para estrenos de nicho y cine de autor con distribución limitada
                  </p>
                </div>
              </Card>

              {/* Resultados Mediano */}
              <Card className="p-6 space-y-4 bg-primary/5 border-primary/30 relative">
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg">
                  ÓPTIMO
                </div>
                <div className="text-center border-b border-primary/40 pb-4">
                  <div className="inline-block px-3 py-1 bg-primary/20 rounded-full text-xs font-semibold text-primary mb-2">
                    INVERSIÓN 15.000€
                  </div>
                  <div className="font-cinema text-xl text-primary">
                    Estándar
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-center p-3 bg-background/50 rounded-lg">
                    <div className="font-cinema text-2xl text-primary">1M-1.5M</div>
                    <div className="text-xs text-muted-foreground mt-1">Alcance estimado</div>
                  </div>
                  <div className="text-center p-3 bg-background/50 rounded-lg">
                    <div className="font-cinema text-2xl text-primary">40K-60K</div>
                    <div className="text-xs text-muted-foreground mt-1">Clics esperados</div>
                  </div>
                  <div className="text-center p-3 bg-background/50 rounded-lg">
                    <div className="font-cinema text-2xl text-primary">4.0%</div>
                    <div className="text-xs text-muted-foreground mt-1">CTR medio</div>
                  </div>
                  <div className="text-center p-3 bg-background/50 rounded-lg">
                    <div className="font-cinema text-2xl text-primary">70-78%</div>
                    <div className="text-xs text-muted-foreground mt-1">Ocupación estimada</div>
                  </div>
                </div>

                <div className="pt-3 text-center">
                  <p className="text-xs text-primary/80 italic font-semibold">
                    El equilibrio perfecto entre inversión y retorno para distribución nacional
                  </p>
                </div>
              </Card>

              {/* Resultados Grande */}
              <Card className="p-6 space-y-4 bg-card/50 backdrop-blur-sm border-cinema-yellow/30">
                <div className="text-center border-b border-border/40 pb-4">
                  <div className="inline-block px-3 py-1 bg-cinema-yellow/20 rounded-full text-xs font-semibold text-cinema-yellow mb-2">
                    INVERSIÓN 30.000€
                  </div>
                  <div className="font-cinema text-xl text-cinema-yellow">
                    Agresiva
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-center p-3 bg-muted/10 rounded-lg">
                    <div className="font-cinema text-2xl text-cinema-yellow">2.5M-3.5M</div>
                    <div className="text-xs text-muted-foreground mt-1">Alcance estimado</div>
                  </div>
                  <div className="text-center p-3 bg-muted/10 rounded-lg">
                    <div className="font-cinema text-2xl text-cinema-yellow">100K-140K</div>
                    <div className="text-xs text-muted-foreground mt-1">Clics esperados</div>
                  </div>
                  <div className="text-center p-3 bg-muted/10 rounded-lg">
                    <div className="font-cinema text-2xl text-cinema-yellow">4.5%</div>
                    <div className="text-xs text-muted-foreground mt-1">CTR medio</div>
                  </div>
                  <div className="text-center p-3 bg-muted/10 rounded-lg">
                    <div className="font-cinema text-2xl text-cinema-yellow">82-90%</div>
                    <div className="text-xs text-muted-foreground mt-1">Ocupación estimada</div>
                  </div>
                </div>

                <div className="pt-3 text-center">
                  <p className="text-xs text-muted-foreground italic">
                    Máxima visibilidad para grandes producciones y estrenos comerciales
                  </p>
                </div>
              </Card>
            </div>

            <Card className="p-4 bg-yellow-500/10 border border-yellow-500/20">
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                <strong>Nota:</strong> Estas cifras son proyecciones basadas en nuestra experiencia
                con campañas similares. El rendimiento real puede variar según la creatividad, la
                competencia, el género, y el comportamiento del público objetivo.
              </p>
            </Card>

            <Card className="p-6 bg-gradient-to-r from-primary/10 via-primary/5 to-cinema-yellow/10 border-primary/20">
              <div className="space-y-4">
                <h3 className="font-cinema text-2xl text-primary text-center">
                  ¿Qué hemos aprendido?
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="text-center p-4 bg-background/50 rounded-lg">
                    <div className="text-3xl mb-2">💰</div>
                    <p className="text-cinema-ivory">
                      <strong>Mayor inversión</strong> = más alcance y mejor posicionamiento en redes
                    </p>
                  </div>
                  <div className="text-center p-4 bg-background/50 rounded-lg">
                    <div className="text-3xl mb-2">📈</div>
                    <p className="text-cinema-ivory">
                      <strong>Mejor CTR</strong> = audiencias más cualificadas y mejor conversión
                    </p>
                  </div>
                  <div className="text-center p-4 bg-background/50 rounded-lg">
                    <div className="text-3xl mb-2">🎯</div>
                    <p className="text-cinema-ivory">
                      <strong>Más ocupación</strong> = mayor retorno de inversión y éxito comercial
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* CTA Card */}
            <Card className="p-8 bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20">
              <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-cinema text-3xl text-foreground">
                  ¿Listo para tu próximo estreno?
                </h3>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Estos son solo escenarios de ejemplo. Crea tu cuenta y configuraremos una campaña personalizada según tus necesidades y objetivos reales.
                </p>
                <div className="flex gap-4 justify-center pt-4">
                  <Link to="/wizard">
                    <Button size="lg" className="cinema-glow">
                      Crear mi campaña real
                    </Button>
                  </Link>
                  <Link to="/casos-exito">
                    <Button size="lg" variant="outline">
                      Ver casos de éxito
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/40 bg-card/30 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <Link to="/">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Salir del demo
            </Button>
          </Link>
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full border border-primary/20">
                <Lock className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">MODO DEMO</span>
              </div>
              <h1 className="font-cinema text-3xl text-foreground">
                Configurador de Campaña - Película Demo
              </h1>
            </div>
            <Link to="/quick-wizard">
              <Button size="sm" className="cinema-glow gap-2 font-semibold">
                <Star className="h-4 w-4" />
                Registra tu estreno
              </Button>
            </Link>
          </div>
          <WizardProgress
            currentStep={currentStep}
            totalSteps={totalSteps}
            steps={[
              { title: 'Película', subtitle: 'Datos del film' },
              { title: 'Recomendación', subtitle: 'Estrategia IA' },
              { title: 'Plataformas', subtitle: 'Canales y fechas' },
              { title: 'Inversión', subtitle: 'Escenarios' },
              { title: 'Resultados', subtitle: 'Proyecciones' },
            ]}
          />
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {renderStep()}

          {/* Navigation */}
          <div className="flex gap-4 mt-8">
            {currentStep > 1 && (
              <Button onClick={handleBack} variant="outline" size="lg">
                Anterior
              </Button>
            )}
            <Button onClick={handleNext} size="lg" className="ml-auto cinema-glow">
              {currentStep === totalSteps ? 'Ver resumen final' : 'Siguiente'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemoWizard;
