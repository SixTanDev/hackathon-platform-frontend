'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Trophy, Star, MessageSquareText, CheckCircle2, AlertCircle, Clock,
} from 'lucide-react';
import type { GradeResult } from '@/types/api';

interface StudentGradeReviewProps {
  grade: GradeResult;
}

function ScoreGauge({ percent }: { percent: number }) {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  const color = percent >= 70 ? '#4ade80' : percent >= 40 ? '#fbbf24' : '#f87171';
  const label = percent >= 70 ? 'Excelente' : percent >= 40 ? 'Aceptable' : 'Por mejorar';

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-28 h-28">
        <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="currentColor" className="text-border" strokeWidth="8" />
          <circle
            cx="50" cy="50" r={radius} fill="none" stroke={color} strokeWidth="8"
            strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold" style={{ color }}>{percent}%</span>
        </div>
      </div>
      <Badge variant="outline" style={{ borderColor: color, color }}>{label}</Badge>
    </div>
  );
}

export function StudentGradeReview({ grade }: StudentGradeReviewProps) {
  const percent = useMemo(() => {
    if (!grade.max_score || grade.max_score === 0) return 0;
    return Math.round((grade.total_score / grade.max_score) * 100);
  }, [grade.total_score, grade.max_score]);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header with score gauge */}
      <Card className="border-primary/20">
        <CardContent className="py-6">
          <div className="flex items-center gap-6">
            <ScoreGauge percent={percent} />
            <div className="flex-1">
              <h3 className="text-lg font-bold">Resultado de Calificación</h3>
              <p className="text-3xl font-bold mt-1">
                <span className={percent >= 70 ? 'text-green-400' : percent >= 40 ? 'text-amber-400' : 'text-red-400'}>{grade.total_score}</span>
                <span className="text-lg text-muted-foreground"> / {grade.max_score}</span>
              </p>
              {grade.graded_at && (
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Calificado: {new Date(grade.graded_at).toLocaleString('es-CO')}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Criteria breakdown */}
      {grade.criteria_results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="h-4 w-4 text-unad-gold" />
              Desglose por Criterio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {grade.criteria_results.map((cr, idx) => {
              const crPercent = cr.max_score > 0 ? Math.round((cr.score / cr.max_score) * 100) : 0;
              const barColor = crPercent >= 70 ? 'bg-green-500' : crPercent >= 40 ? 'bg-amber-500' : 'bg-red-500';

              return (
                <div key={cr.criterion_id || idx} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">{cr.criterion_name}</h4>
                    <span className="text-sm font-mono">
                      <span className={crPercent >= 70 ? 'text-green-400' : crPercent >= 40 ? 'text-amber-400' : 'text-red-400'}>{cr.score}</span>
                      <span className="text-muted-foreground">/{cr.max_score}</span>
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${crPercent}%` }} />
                  </div>
                  {cr.comment && (
                    <div className="flex items-start gap-2 bg-muted/20 rounded-lg p-3">
                      <MessageSquareText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <p className="text-xs text-muted-foreground">{cr.comment}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Overall feedback */}
      {grade.overall_feedback && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquareText className="h-4 w-4 text-secondary" />
              Retroalimentación General
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{grade.overall_feedback}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
