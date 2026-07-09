export function formatDateISO(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function addDays(dateStr: string, delta: number): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  d.setDate(d.getDate() + delta)
  return formatDateISO(d)
}

export function formatDateLabel(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export function mondayOf(d: Date): Date {
  const day = d.getDay() // 0 = dimanche
  const delta = day === 0 ? -6 : 1 - day
  const monday = new Date(d)
  monday.setDate(d.getDate() + delta)
  return monday
}

export function formatWeekLabel(weekStart: string): string {
  const [year, month, day] = weekStart.split('-').map(Number)
  const start = new Date(year, month - 1, day)
  const end = new Date(year, month - 1, day + 6)
  const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  return `${fmt(start)} – ${fmt(end)}`
}
