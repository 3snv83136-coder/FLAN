/** Dates planning en Europe/Paris (lundi → dimanche). */

export type PlanningVue = "semaine" | "mois";

export function parisYmd(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function addDaysYmd(ymd: string, days: number): string {
  const dt = parseYmd(ymd);
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/** 1 = lundi … 7 = dimanche */
export function isoWeekdayFromYmd(ymd: string): number {
  const utcDay = parseYmd(ymd).getUTCDay(); // 0 dim … 6 sam
  return utcDay === 0 ? 7 : utcDay;
}

export function startOfWeekMonday(ymd: string): string {
  const wd = isoWeekdayFromYmd(ymd);
  return addDaysYmd(ymd, 1 - wd);
}

export function startOfMonth(ymd: string): string {
  return `${ymd.slice(0, 7)}-01`;
}

export function daysInRange(fromYmd: string, toYmdInclusive: string): string[] {
  const out: string[] = [];
  let cur = fromYmd;
  while (cur <= toYmdInclusive) {
    out.push(cur);
    cur = addDaysYmd(cur, 1);
  }
  return out;
}

export function planningWindow(
  vue: PlanningVue,
  anchorYmd: string,
): { from: string; to: string; days: string[] } {
  if (vue === "mois") {
    const from = startOfMonth(anchorYmd);
    const nextMonth = addDaysYmd(from, 32).slice(0, 7) + "-01";
    const to = addDaysYmd(nextMonth, -1);
    return { from, to, days: daysInRange(from, to) };
  }
  const from = startOfWeekMonday(anchorYmd);
  const to = addDaysYmd(from, 6);
  return { from, to, days: daysInRange(from, to) };
}

export function formatDayLabel(ymd: string): string {
  const dt = parseYmd(ymd);
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "UTC",
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(dt);
}

export function timeToIsoOnDay(ymd: string, hhmm: string): string {
  const t = hhmm.length >= 5 ? hhmm.slice(0, 5) : hhmm;
  const [h, min] = t.split(":").map(Number);
  const utcNoon = Date.parse(`${ymd}T12:00:00.000Z`);
  const parisHourAtUtcNoon = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Paris",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(new Date(utcNoon)),
  );
  const offsetHours = parisHourAtUtcNoon - 12;
  const utcMs =
    Date.parse(`${ymd}T00:00:00.000Z`) +
    (h * 60 + min) * 60_000 -
    offsetHours * 3_600_000;
  return new Date(utcMs).toISOString();
}

export function hoursBetweenTimes(startHhmm: string, endHhmm: string): number {
  const toMin = (s: string) => {
    const [h, m] = s.slice(0, 5).split(":").map(Number);
    return h * 60 + m;
  };
  return (toMin(endHhmm) - toMin(startHhmm)) / 60;
}
