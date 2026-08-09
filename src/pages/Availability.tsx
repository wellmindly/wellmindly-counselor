import React, { useState, useEffect } from 'react';
import { api } from '../api';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Lock,
  Unlock,
  Clock,
  Trash2,
  AlertCircle,
  X,
} from 'lucide-react';

interface Exception {
  id: string;
  startDate: string;
  endDate: string;
  reason?: string;
  isFullDay: boolean;
}

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17]; // 8 AM to 6 PM (1-hour slots)

export const Availability: React.FC = () => {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchExceptions = async () => {
    try {
      const res = await api.get('/counselors/me/exceptions');
      if (res.data.success) {
        setExceptions(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch exceptions:', err);
    }
  };

  useEffect(() => {
    fetchExceptions();
  }, []);

  // Calendar calculations
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  // Format selected date YYYY-MM-DD
  const dateStr = selectedDate.toISOString().split('T')[0];

  const getExceptionsForDate = (date: Date) => {
    const dStr = date.toISOString().split('T')[0];
    return exceptions.filter((ex) => {
      const exStart = new Date(ex.startDate).toISOString().split('T')[0];
      return exStart === dStr;
    });
  };

  // Helper to check if an hour slot is blocked on selected date
  const isHourBlocked = (hour: number) => {
    const slotStart = new Date(Date.UTC(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), hour, 0));
    const slotEnd = new Date(Date.UTC(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), hour + 1, 0));

    return exceptions.some((exc) => {
      const excStart = new Date(exc.startDate);
      const excEnd = new Date(exc.endDate);
      return slotStart < excEnd && slotEnd > excStart;
    });
  };

  const findExceptionForHour = (hour: number) => {
    const slotStart = new Date(Date.UTC(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), hour, 0));
    const slotEnd = new Date(Date.UTC(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), hour + 1, 0));

    return exceptions.find((exc) => {
      const excStart = new Date(exc.startDate);
      const excEnd = new Date(exc.endDate);
      return slotStart < excEnd && slotEnd > excStart;
    });
  };

  const toggleBlockHour = async (hour: number) => {
    setError(null);
    const existing = findExceptionForHour(hour);
    setSaving(true);

    if (existing) {
      // Unblock
      try {
        await api.delete(`/counselors/me/exceptions/${existing.id}`);
        await fetchExceptions();
      } catch (err) {
        setError('Failed to unblock hour. Please try again.');
      } finally {
        setSaving(false);
      }
    } else {
      // Block 1 hour (e.g. 15:00 to 16:00 UTC)
      const startDate = new Date(Date.UTC(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), hour, 0)).toISOString();
      const endDate = new Date(Date.UTC(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), hour + 1, 0)).toISOString();

      try {
        await api.post('/counselors/me/exceptions', {
          startDate,
          endDate,
          reason: `Blocked ${hour}:00 - ${hour + 1}:00`,
        });
        await fetchExceptions();
      } catch (err) {
        setError('Failed to block hour. Please try again.');
      } finally {
        setSaving(false);
      }
    }
  };

  const blockFullDay = async () => {
    setError(null);
    setSaving(true);
    const startDate = new Date(Date.UTC(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 0, 0)).toISOString();
    const endDate = new Date(Date.UTC(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 23, 59)).toISOString();

    try {
      await api.post('/counselors/me/exceptions', {
        startDate,
        endDate,
        isFullDay: true,
        reason: `Full Day Blocked (${dateStr})`,
      });
      await fetchExceptions();
    } catch (err) {
      setError('Failed to block full day. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const removeException = async (id: string) => {
    setError(null);
    setSaving(true);
    try {
      await api.delete(`/counselors/me/exceptions/${id}`);
      await fetchExceptions();
    } catch (err) {
      setError('Failed to remove blockout. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center space-x-3">
          <CalendarIcon className="w-7 h-7 text-indigo-600" />
          <span>Date-Specific Availability & Blocked Hours</span>
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Default working hours are 8:00 AM – 6:00 PM (1-hour sessions). Select any date in the calendar below to block or unblock specific hours.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Month Calendar Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6 h-fit">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-900 text-base">{monthName}</h3>
            <div className="flex space-x-1">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Days Header */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`blank-${i}`} className="h-10" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateObj = new Date(year, month, dayNum);
              const isSelected = selectedDate.toDateString() === dateObj.toDateString();
              const isToday = new Date().toDateString() === dateObj.toDateString();

              return (
                <button
                  key={dayNum}
                  onClick={() => setSelectedDate(dateObj)}
                  className={`h-10 rounded-xl font-bold text-xs transition-all flex items-center justify-center relative ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                      : isToday
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Date Hour Slots Manager */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                Selected Date
              </span>
              <h2 className="text-xl font-extrabold text-slate-900">
                {selectedDate.toLocaleDateString('default', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </h2>
            </div>

            <button
              onClick={blockFullDay}
              disabled={saving}
              className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl transition-all border border-rose-200 flex items-center space-x-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Block Entire Day</span>
            </button>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center space-x-3 text-xs text-slate-600">
            <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              Sessions are fixed at 1 hour. Default window is <strong>8:00 AM to 6:00 PM UTC</strong>. Click any slot to toggle blocking hours.
            </span>
          </div>

          {/* 1-Hour Slots Toggle Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {HOURS.map((hour) => {
              const blocked = isHourBlocked(hour);
              const formatHour = (h: number) => {
                const ampm = h >= 12 ? 'PM' : 'AM';
                const h12 = h % 12 || 12;
                return `${h12}:00 ${ampm}`;
              };

              const slotLabel = `${formatHour(hour)} - ${formatHour(hour + 1)}`;

              return (
                <div
                  key={hour}
                  onClick={() => toggleBlockHour(hour)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex justify-between items-center ${
                    blocked
                      ? 'bg-rose-50/80 border-rose-200 text-rose-800'
                      : 'bg-white border-slate-200 hover:border-indigo-400 hover:shadow-sm text-slate-800'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    {blocked ? (
                      <Lock className="w-4 h-4 text-rose-600 shrink-0" />
                    ) : (
                      <Unlock className="w-4 h-4 text-emerald-600 shrink-0" />
                    )}
                    <div>
                      <p className="font-bold text-sm">{slotLabel}</p>
                      <span className={`text-[11px] font-semibold ${blocked ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {blocked ? 'Blocked' : 'Available (1 Hr)'}
                      </span>
                    </div>
                  </div>

                  <button
                    className={`px-3 py-1 rounded-lg font-bold text-xs ${
                      blocked ? 'bg-rose-200/80 text-rose-900' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {blocked ? 'Unblock' : 'Block Slot'}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Active Exceptions List */}
          {exceptions.length > 0 && (
            <div className="pt-6 border-t border-slate-100 space-y-3">
              <h4 className="font-bold text-sm text-slate-900">Active Blocked Hours Exceptions</h4>
              <div className="space-y-2">
                {exceptions.map((exc) => (
                  <div
                    key={exc.id}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-xs text-slate-700"
                  >
                    <div>
                      <strong className="text-slate-900">{exc.reason || 'Blocked Window'}</strong>
                      <span className="block text-slate-400 text-[11px]">
                        {new Date(exc.startDate).toUTCString()} $\rightarrow$ {new Date(exc.endDate).toUTCString()}
                      </span>
                    </div>

                    <button
                      onClick={() => removeException(exc.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
