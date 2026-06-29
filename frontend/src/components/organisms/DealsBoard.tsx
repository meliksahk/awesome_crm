'use client';
// src/components/organisms/DealsBoard.tsx — Kanban (stage sütunları + sürükle-bırak taşıma).
import { useState } from 'react';
import { Badge } from '../atoms/Badge';
import type { Board, Deal } from '@/types';

function stageTone(stage: { isWon: boolean; isLost: boolean }) {
  if (stage.isWon) return 'green' as const;
  if (stage.isLost) return 'red' as const;
  return 'blue' as const;
}

export function DealsBoard({
  board,
  onSelect,
  onMove,
}: {
  board: Board;
  onSelect?: (deal: Deal) => void;
  onMove?: (dealId: string, toStageId: string) => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<string | null>(null);

  const drop = (stageId: string) => {
    if (dragId && onMove) onMove(dragId, stageId);
    setDragId(null);
    setOverStage(null);
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {board.stages.map((stage) => (
        <div
          key={stage.id}
          onDragOver={(e) => {
            if (onMove) {
              e.preventDefault();
              setOverStage(stage.id);
            }
          }}
          onDragLeave={() => setOverStage((s) => (s === stage.id ? null : s))}
          onDrop={() => drop(stage.id)}
          className={`w-72 flex-shrink-0 rounded-lg p-1 transition ${
            overStage === stage.id ? 'bg-brand-50 ring-2 ring-brand-300' : ''
          }`}
        >
          <div className="mb-2 flex items-center justify-between px-1">
            <h3 className="text-sm font-semibold text-gray-700">{stage.name}</h3>
            <Badge tone={stageTone(stage)}>{stage.deals.length}</Badge>
          </div>
          <div className="space-y-2">
            {stage.deals.map((deal) => (
              <div
                key={deal.id}
                draggable={!!onMove}
                onDragStart={() => setDragId(deal.id)}
                onDragEnd={() => setDragId(null)}
                onClick={() => onSelect?.(deal)}
                className={`cursor-pointer rounded-lg border border-gray-200 bg-white p-3 text-left shadow-sm transition hover:border-brand-300 hover:shadow ${
                  dragId === deal.id ? 'opacity-50' : ''
                }`}
              >
                <p className="text-sm font-medium text-gray-900">{deal.title}</p>
                {deal.company && (
                  <p className="text-xs text-gray-500">{deal.company}</p>
                )}
                {deal.value && (
                  <p className="mt-1 text-xs font-medium text-brand-700">
                    {deal.value} {deal.currency}
                  </p>
                )}
              </div>
            ))}
            {stage.deals.length === 0 && (
              <p className="rounded-lg border border-dashed border-gray-200 p-3 text-center text-xs text-gray-400">
                boş
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
