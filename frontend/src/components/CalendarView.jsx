import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, isWithinInterval,
  addMonths, subMonths, format, isToday, startOfDay,
} from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import clsx from "clsx";

const EVENT_BG = {
  mariage:   "bg-pink-500",
  séminaire: "bg-blue-500",
  fête:      "bg-orange-500",
  autre:     "bg-gray-400",
};

const STATUS_OPACITY = {
  en_attente: "opacity-60",
  confirmé:   "opacity-100",
  annulé:     "opacity-30 line-through",
  terminé:    "opacity-50",
};

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function bookingOverlapsDay(booking, day) {
  const start = startOfDay(new Date(booking.start_date));
  const end = startOfDay(new Date(booking.end_date));
  return isWithinInterval(day, { start, end });
}

function BookingPill({ booking, onClick }) {
  const bg = EVENT_BG[booking.event_type] ?? EVENT_BG.autre;
  const opacity = STATUS_OPACITY[booking.status] ?? "";
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(booking); }}
      title={`${booking.event_name || booking.event_type} — ${booking.venue?.name}`}
      className={clsx(
        "w-full text-left text-white text-[10px] leading-tight px-1.5 py-0.5 rounded truncate",
        bg, opacity,
        "hover:brightness-110 transition-all"
      )}
    >
      {booking.event_name || booking.event_type}
    </button>
  );
}

export default function CalendarView({ bookings = [], onSelectBooking }) {
  const [current, setCurrent] = useState(new Date());

  const monthStart = startOfMonth(current);
  const monthEnd = endOfMonth(current);
  // week starts on Monday (weekStartsOn: 1)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  // group days into weeks
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  const bookingsForDay = (day) =>
    bookings
      .filter((b) => b.status !== "annulé" && bookingOverlapsDay(b, day))
      .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <button
          onClick={() => setCurrent(subMonths(current, 1))}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h2 className="text-base font-semibold text-gray-900 capitalize">
          {format(current, "MMMM yyyy", { locale: fr })}
        </h2>
        <button
          onClick={() => setCurrent(addMonths(current, 1))}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 px-5 py-2 bg-gray-50 border-b border-gray-100 text-xs text-gray-500">
        {Object.entries(EVENT_BG).map(([type, bg]) => (
          <span key={type} className="flex items-center gap-1.5 capitalize">
            <span className={`w-2.5 h-2.5 rounded-full ${bg}`} />
            {type}
          </span>
        ))}
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[560px]">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-gray-100">
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-2 text-center text-xs font-medium text-gray-400 uppercase tracking-wide">
                {d}
              </div>
            ))}
          </div>

          {/* Weeks */}
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 border-b border-gray-100 last:border-b-0">
              {week.map((day) => {
                const dayBookings = bookingsForDay(day);
                const visible = dayBookings.slice(0, 3);
                const overflow = dayBookings.length - visible.length;
                const isCurrentMonth = isSameMonth(day, current);
                const todayDay = isToday(day);

                return (
                  <div
                    key={day.toISOString()}
                    className={clsx(
                      "min-h-[90px] p-1.5 border-r border-gray-100 last:border-r-0 flex flex-col gap-1",
                      !isCurrentMonth && "bg-gray-50/60",
                    )}
                  >
                    {/* Day number */}
                    <div className="flex items-center justify-end mb-0.5">
                      <span
                        className={clsx(
                          "w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium",
                          todayDay
                            ? "bg-primary-600 text-white"
                            : isCurrentMonth
                            ? "text-gray-700"
                            : "text-gray-300"
                        )}
                      >
                        {format(day, "d")}
                      </span>
                    </div>

                    {/* Events */}
                    {visible.map((b) => (
                      <BookingPill key={b.id} booking={b} onClick={onSelectBooking} />
                    ))}
                    {overflow > 0 && (
                      <span className="text-[10px] text-gray-400 px-1">+{overflow} autre{overflow > 1 ? "s" : ""}</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Today button */}
      <div className="px-5 py-3 border-t border-gray-100 flex justify-end">
        <button
          onClick={() => setCurrent(new Date())}
          className="text-xs text-primary-600 hover:underline font-medium"
        >
          Aujourd'hui
        </button>
      </div>
    </div>
  );
}
