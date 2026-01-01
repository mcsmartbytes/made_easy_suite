'use client';

import { Briefcase, Users, CheckSquare } from 'lucide-react';
import type { CalendarItem } from '@/types/scheduling';

interface CalendarEventProps {
  item: CalendarItem;
  onClick?: (item: CalendarItem) => void;
  compact?: boolean;
}

const typeConfig = {
  job: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    border: 'border-blue-200',
    icon: Briefcase,
  },
  crew: {
    bg: 'bg-purple-100',
    text: 'text-purple-700',
    border: 'border-purple-200',
    icon: Users,
  },
  task: {
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    border: 'border-amber-200',
    icon: CheckSquare,
  },
};

export function CalendarEvent({ item, onClick, compact = false }: CalendarEventProps) {
  const config = typeConfig[item.type];
  const Icon = config.icon;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick?.(item);
  };

  if (compact) {
    return (
      <button
        onClick={handleClick}
        className={`w-full text-left px-1.5 py-0.5 rounded text-xs truncate ${config.bg} ${config.text} hover:opacity-80 transition-opacity`}
        title={`${item.title}${item.subtitle ? ` - ${item.subtitle}` : ''}`}
      >
        {item.title}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={`w-full text-left px-2 py-1 rounded-md border ${config.bg} ${config.text} ${config.border} hover:opacity-80 transition-opacity flex items-center gap-1.5 ${
        item.priority === 'high' ? 'border-l-2 border-l-red-500' : ''
      }`}
    >
      <Icon className="w-3 h-3 flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium truncate">{item.title}</p>
        {item.subtitle && (
          <p className="text-xs opacity-70 truncate">{item.subtitle}</p>
        )}
      </div>
    </button>
  );
}
