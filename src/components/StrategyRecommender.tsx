import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useStrategyRecommender, type ReleaseSize, type Genre, type Scenario } from '@/hooks/useStrategyRecommender';
import { TrendingUp, Target, DollarSign, Users, Play, CheckCircle } from 'lucide-react';

interface StrategyRecommenderProps {
  releaseSize?: ReleaseSize;
  genre?: Genre;
  targetAudience?: string;
  onApplyScenario?: (scenario: Scenario, investment: number, platforms: string[]) => void;
}

const StrategyRecommender = ({
  releaseSize,
  genre,
  targetAudience,
  onApplyScenario,
}: StrategyRecommenderProps) => {
  const recommendation = useStrategyRecommender({ releaseSize, genre, targetAudience });
  const [selectedScenario, setSelectedScenario] = useState<Scenario>('estandar');

  if (!recommendation) return null;

  const currentScenario = recommendation.scenarios.find((s) => s.scenario === selectedScenario);

  const scenarioLabels: Record<Scenario, string> = {
    conservador: 'Conservador',
    estandar: 'Estándar',
    agresivo: 'Agresivo',
  };

  const scenarioColors: Record<Scenario, string> = {
    conservador: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    estandar: 'bg-primary/10 text-primary border-primary/20',
    agresivo: 'bg-red-500/10 text-red-500 border-red-500/20',
  };

  return (
    <div className="space-y-6">
      {/* Reasoning */}
      <Card className="p-6 bg-primary/5 border-primary/20">
        <div className="flex items-start gap-3">
          <Target className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
          <div className="space-y-2">
            <h3 className="font-cinema text-lg text-foreground">Recomendación estratégica</h3>
            <ul className="space-y-2">
              {recommendation.reasoning.map((reason, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Card>

      {/* Scenario Selector */}
      <div>
        <h3 className="font-cinema text-lg mb-3">Compara escenarios</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {recommendation.scenarios.map((scenario) => {
            const isSelected = selectedScenario === scenario.scenario;
            return (
              <Card
                key={scenario.scenario}
                className={`p-4 cursor-pointer transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                    : 'border-border/40 hover:border-primary/40'
                }`}
                onClick={() => setSelectedScenario(scenario.scenario)}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-cinema text-lg">
                      {scenarioLabels[scenario.scenario]}
                    </span>
                    {isSelected && <CheckCircle className="h-5 w-5 text-primary" />}
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Inversión recomendada</div>
                    <div className="font-cinema text-2xl text-primary">
                      {scenario.investment.recommended.toLocaleString('es-ES')}€
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {scenario.description}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Current Scenario Details */}
      {currentScenario && (
        <Card className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-cinema text-xl">
              Escenario {scenarioLabels[selectedScenario]}
            </h3>
            <Badge className={scenarioColors[selectedScenario]}>
              {scenarioLabels[selectedScenario]}
            </Badge>
          </div>

          {/* Investment */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="h-5 w-5 text-primary" />
              <h4 className="font-cinema">Inversión</h4>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-muted/20 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Mínima</div>
                <div className="font-cinema text-lg">
                  {currentScenario.investment.min.toLocaleString('es-ES')}€
                </div>
              </div>
              <div className="text-center p-3 bg-primary/10 rounded-lg border border-primary/20">
                <div className="text-xs text-primary mb-1">Recomendada</div>
                <div className="font-cinema text-lg text-primary">
                  {currentScenario.investment.recommended.toLocaleString('es-ES')}€
                </div>
              </div>
              <div className="text-center p-3 bg-muted/20 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Máxima</div>
                <div className="font-cinema text-lg">
                  {currentScenario.investment.max.toLocaleString('es-ES')}€
                </div>
              </div>
            </div>
          </div>

          {/* Platforms */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Play className="h-5 w-5 text-primary" />
              <h4 className="font-cinema">Plataformas recomendadas</h4>
            </div>
            <div className="space-y-2">
              {currentScenario.platforms.map((platform) => (
                <div
                  key={platform.platform}
                  className="flex items-center justify-between p-3 bg-muted/20 rounded-lg"
                >
                  <div>
                    <div className="font-medium">{platform.platform}</div>
                    <div className="text-xs text-muted-foreground">{platform.reason}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-cinema text-lg text-primary">{platform.weight}%</div>
                    <div className="text-xs text-muted-foreground">del mix</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Phase Distribution */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h4 className="font-cinema">Distribución temporal</h4>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-muted/20 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Pre-estreno</div>
                <div className="font-cinema text-2xl text-primary">
                  {currentScenario.phaseWeights.pre}%
                </div>
              </div>
              <div className="text-center p-3 bg-muted/20 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Fin de semana</div>
                <div className="font-cinema text-2xl text-primary">
                  {currentScenario.phaseWeights.premiere}%
                </div>
              </div>
              <div className="text-center p-3 bg-muted/20 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Post-estreno</div>
                <div className="font-cinema text-2xl text-primary">
                  {currentScenario.phaseWeights.post}%
                </div>
              </div>
            </div>
          </div>

          {/* Expected Impact */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-5 w-5 text-primary" />
              <h4 className="font-cinema">Impacto estimado</h4>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-muted/20 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Alcance</div>
                <div className="font-cinema text-lg">{currentScenario.estimatedImpact.reach}</div>
              </div>
              <div className="text-center p-3 bg-muted/20 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Clics</div>
                <div className="font-cinema text-lg">{currentScenario.estimatedImpact.clicks}</div>
              </div>
              <div className="text-center p-3 bg-muted/20 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">CTR</div>
                <div className="font-cinema text-lg">{currentScenario.estimatedImpact.ctr}</div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3 text-center">
              Estimaciones basadas en campañas similares. El rendimiento real puede variar.
            </p>
          </div>

          {/* Apply Button */}
          {onApplyScenario && (
            <Button
              size="lg"
              className="w-full cinema-glow"
              onClick={() =>
                onApplyScenario(
                  selectedScenario,
                  currentScenario.investment.recommended,
                  currentScenario.platforms.map((p) => p.platform)
                )
              }
            >
              Aplicar escenario {scenarioLabels[selectedScenario]}
            </Button>
          )}
        </Card>
      )}
    </div>
  );
};

export default StrategyRecommender;
