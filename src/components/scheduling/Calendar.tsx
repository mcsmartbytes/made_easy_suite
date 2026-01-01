'use client';

import { useMemo, useState } from 'react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  addMonths,
  subMonths,
  isSameDay,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CalendarDay } from './CalendarDay';
import type { CalendarItem } from '@/types/scheduling';

interface CalendarProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  items: CalendarItem[];
  onEventClick?: (item: CalendarItem) => void;
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function Calendar({
  currentDate,
  onDateChange,
  items,
  onEventClick,
}: CalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Generate calendar days for the month view
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate]);

  // Split days into weeks
  const weeks = useMemo(() => {
    const result: Date[][] = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      result.push(calendarDays.slice(i, i + 7));
    }
    return result;
  }, [calendarDays]);

  const handlePrevMonth = () => {
    onDateChange(subMonths(currentDate, 1));
  };

  const handleNextMonth = () => {
    onDateChange(addMonths(currentDate, 1));
  };

  const handleToday = () => {
    onDateChange(new Date());
    setSelectedDate(new Date());
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h2 className="text-lg font-semibold text-gray-900 min-w-[160px] text-center">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <button
            onClick={handleNextMonth}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        <button
          onClick={handleToday}
          className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        >
          Today
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-gray-100">
        {WEEKDAY_LABELS.map(day => (
          <div
            key={day}
            className="py-2 text-center text-sm font-medium text-gray-500 border-r border-gray-100 last:border-r-0"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {weeks.map((week, weekIndex) =>
          week.map((date, dayIndex) => (
            <CalendarDay
              key={`${weekIndex}-${dayIndex}`}
              date={date}
              currentMonth={currentDate}
              items={items}
              isSelected={selectedDate ? isSameDay(date, selectedDate) : false}
              onClick={handleDayClick}
              onEventClick={onEventClick}
            />
          ))
        )}
      </div>
    </div>
  );
}
