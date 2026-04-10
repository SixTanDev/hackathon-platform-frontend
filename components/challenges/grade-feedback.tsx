'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Trophy,
  Star,
  MessageSquareText,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import type { GradeResult } from '@/types/api';

interface GradeFeedbackProps {
  grade: GradeResult;
}

function ScoreCircle({ score, maxScore }: { score: number; maxScore: number }) {
  const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
  const isPerfect = pct >= 100;
  const isGood = pct >= 70;
  const colorClass = isPerfect
    ? 'text-green-500'
    : isGood
      ? 'text-primary'
      : 'text-amber-500';

  return (
    <div className="flex flex-col items-center justify-center py-6">
      <div className="relative w-28 h-28">
        {/* Background circle */}
        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
          <circle
            cx="18" cy="18" r="15.915"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-muted/30"
          />
          <circle
            cx="18" cy="18" r="15.915"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeDasharray={`${pct} ${100 - pct}`}
            strokeLinecap="round"
            className={colorClass}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-bold tabular-nums ${colorClass}`}>
            {score}
          </span>
          <span className="text-xs text-muted-foreground">/{maxScore}</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        {isPerfect ? '¡Puntuación perfecta!' : isGood ? 'Buen trabajo' : 'Puedes mejorar'}
      </p>
      {isPerfect ? (
        <div className="flex items-center gap-1 text-green-500 text-xs mt-1">
          <Trophy className="w-3.5 h-3.5" /> Excelente
        </div>
      ) : null}
    </div>
  );
}

function CriterionRow({
  name,
  score,
  maxScore,
  comment,
}: {
  name: string;
  score: number;
  maxScore: number;
  comment: string | null;
}) {
  const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
  const isFull = pct >= 100;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">{name}</span>
        <span className="text-xs tabular-nums">
          <span className={isFull ? 'text-green-500 font-bold' : 'font-medium'}>{score}</span>
          <span className="text-muted-foreground">/{maxScore}</span>
        </span>
      </div>
      <Progress
        value={pct}
        className={`h-1.5 ${isFull ? '[&>div]:bg-green-500' : pct >= 70 ? '[&>div]:bg-primary' : '[&>div]:bg-amber-500'}`}
      />
      {comment ? (
        <p className="text-[11px] text-muted-foreground leading-relaxed pl-2 border-l-2 border-border/50">
          {comment}
        </p>
      ) : null}
    </div>
  );
}

export function GradeFeedback({ grade }: GradeFeedbackProps) {
  return (
    <Card className="border-green-500/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-500" />
          Retroalimentación
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Total Score */}
        <ScoreCircle score={grade.total_score} maxScore={grade.max_score} />

        {/* Criteria Breakdown */}
        {grade.criteria_results && grade.criteria_results.length > 0 ? (
          <div className="space-y-3">
            <h4 className="text-xs font-semibold flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-unad-gold" />
              Desglose por criterio
            </h4>
            {grade.criteria_results.map((cr, i) => (
              <CriterionRow
                key={cr.criterion_id ?? i}
                name={cr.criterion_name}
                score={cr.score}
                maxScore={cr.max_score}
                comment={cr.comment}
              />
            ))}
          </div>
        ) : null}

        {/* Overall Feedback */}
        {grade.overall_feedback ? (
          <>
            <Separator />
            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold flex items-center gap-1.5">
                <MessageSquareText className="w-3.5 h-3.5 text-primary" />
                Comentario general
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {grade.overall_feedback}
              </p>
            </div>
          </>
        ) : null}

        {/* Graded timestamp */}
        {grade.graded_at ? (
          <p className="text-[10px] text-muted-foreground/60 text-right">
            Calificado el {new Date(grade.graded_at).toLocaleDateString('es-CO', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
