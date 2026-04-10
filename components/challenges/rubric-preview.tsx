'use client';

import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Star,
} from 'lucide-react';
import type { RubricJson, RubricCriterion } from '@/types/api';

interface RubricPreviewProps {
  rubricJson: RubricJson | null | undefined;
}

function ScoringLevels({ levels }: { levels: { label: string; points: number; description: string }[] }) {
  return (
    <div className="mt-2 space-y-1">
      {levels.map((level, i) => (
        <div
          key={i}
          className="flex items-start gap-2 text-[11px] p-1.5 rounded bg-muted/20"
        >
          <Badge variant="outline" className="text-[9px] shrink-0 mt-0.5">
            {level.points} pts
          </Badge>
          <div className="min-w-0">
            <span className="font-medium">{level.label}</span>
            {level.description ? (
              <span className="text-muted-foreground"> — {level.description}</span>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function CriterionCard({ criterion, index }: { criterion: RubricCriterion; index: number }) {
  const [showLevels, setShowLevels] = useState(false);
  const hasLevels = criterion.scoring_levels && criterion.scoring_levels.length > 0;

  return (
    <div className="p-3 rounded-lg border border-border/50 bg-card/50">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-primary">{index + 1}.</span>
            <h4 className="text-xs font-semibold">{criterion.name}</h4>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
            {criterion.description}
          </p>
        </div>
        <Badge className="shrink-0 text-[10px] bg-primary/10 text-primary border-0">
          {criterion.max_points} pts
        </Badge>
      </div>

      {hasLevels ? (
        <>
          <button
            onClick={() => setShowLevels(!showLevels)}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground mt-2 transition-colors"
          >
            {showLevels ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {showLevels ? 'Ocultar niveles' : 'Ver niveles de puntuación'}
          </button>
          {showLevels ? <ScoringLevels levels={criterion.scoring_levels!} /> : null}
        </>
      ) : null}
    </div>
  );
}

export function RubricPreview({ rubricJson }: RubricPreviewProps) {
  const [expanded, setExpanded] = useState(false);

  if (!rubricJson || !rubricJson.criteria || rubricJson.criteria.length === 0) {
    return null;
  }

  const totalPoints = rubricJson.total_points ?? rubricJson.criteria.reduce((s, c) => s + c.max_points, 0);

  return (
    <div className="border border-border/50 rounded-lg">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 text-sm hover:bg-muted/30 transition-colors"
      >
        <span className="flex items-center gap-2 font-medium">
          <ClipboardList className="w-4 h-4 text-secondary" />
          Rúbrica de Evaluación
          <Badge variant="secondary" className="text-[10px]">
            {rubricJson.criteria.length} criterios · {totalPoints} pts
          </Badge>
        </span>
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {expanded ? (
        <div className="px-3 pb-3 space-y-2">
          {rubricJson.criteria.map((c, i) => (
            <CriterionCard key={c.id ?? i} criterion={c} index={i} />
          ))}
          <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs">
            <span className="text-muted-foreground">Puntuación total</span>
            <span className="font-bold text-primary">{totalPoints} puntos</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
