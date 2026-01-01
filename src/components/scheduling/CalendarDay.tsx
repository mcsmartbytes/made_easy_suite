'use client';

import { isSameDay, isSameMonth, isToday, format } from 'date-fns';
import { CalendarEvent } from './CalendarEvent';
import type { CalendarItem } from '@/types/scheduling';

interface CalendarDayProps {
  date: Date;
  currentMonth: Date;
  items: CalendarItem[];
  isSelected?: boolean;
  onClick?: (date: Date) => void;
  onEventClick?: (item: CalendarItem) => void;
  maxVisibleEvents?: number;
}

export function CalendarDay({
  date,
  currentMonth,
  items,
  isSelected,
  onClick,
  onEventClick,
  maxVisibleEvents = 3,
}: CalendarDayProps) {
  const isCurrentMonth = isSameMonth(date, currentMonth);
  const isTodayDate = isToday(date);

  // Filter items that fall on this date
  const dayItems = items.filter(item => {
    if (!item.startDate) return false;
    const startDate = item.startDate;
    const endDate = item.endDate || item.startDate;
    return date >= startDate && date <= endDate ||
           isSameDay(date, startDate) ||
           isSameDay(date, endDate);
  });

  const visibleItems = dayItems.slice(0, maxVisibleEvents);
  const remainingCount = dayItems.length - maxVisibleEvents;

  return (
    <div
      onClick={() => onClick?.(date)}
      className={`min-h-[100px] p-1 border-r border-b border-gray-100 cursor-pointer transition-colors ${
        isCurrentMonth ? 'bg-white' : 'bg-gray-50'
      } ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
    >
      <div className="flex items-center justify-between mb-1">
        <span
          className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${
            isTodayDate
              ? 'bg-blue-600 text-white'
              : isCurrentMonth
              ? 'text-gray-900'
              : 'text-gray-400'
          }`}
        >
          {format(date, 'd')}
        </span>
      </div>
      <div className="space-y-0.5">
        {visibleItems.map(item => (
          <CalendarEvent
            key={item.id}
            item={item}
            onClick={onEventClick}
            compact
          />
        ))}
        {remainingCount > 0 && (
          <button className="w-full text-left px-1.5 py-0.5 text-xs text-gray-500 hover:text-gray-700">
            +{remainingCount} more
          </button>
        )}
      </div>
    </div>
  );
}
