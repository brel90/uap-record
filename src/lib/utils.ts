import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface DateFields {
  date_start?: string | null
  date_end?: string | null
  date_year_start?: number | null
  date_year_end?: number | null
  date_precision?: string | null
}

export function formatDate(event: DateFields): string {
  if (event.date_start) {
    try {
      const d = new Date(event.date_start)
      if (event.date_precision === 'day') return format(d, 'MMM d, yyyy')
      if (event.date_precision === 'month') return format(d, 'MMM yyyy')
      if (event.date_precision === 'year_range') {
        if (event.date_end) return `${format(d, 'yyyy')}–${format(new Date(event.date_end), 'yyyy')}`
        return format(d, 'yyyy')
      }
      return format(d, 'yyyy')
    } catch {
      return event.date_start.slice(0, 10)
    }
  }
  if (event.date_year_start && event.date_year_end && event.date_year_end !== event.date_year_start)
    return `${event.date_year_start}–${event.date_year_end}`
  if (event.date_year_start) return `${event.date_year_start}`
  return 'Date unknown'
}
