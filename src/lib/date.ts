const WEEKDAY_SHORT = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
const WEEKDAY_FULL = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
const TERM_START_MONDAY = new Date("2026-06-29T00:00:00+08:00");

export function parseDateParam(date?: string | null) {
  if (!date) return new Date();
  return new Date(`${date}T09:00:00+08:00`);
}

export function toDateKey(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  return formatter.format(date);
}

export function formatChinaDate(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(date);
}

export function formatTime(value: string | Date | null) {
  if (!value) return "-";
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

export function startOfChinaDay(date: Date) {
  return new Date(`${toDateKey(date)}T00:00:00+08:00`);
}

export function getMonday(date: Date) {
  const copy = startOfChinaDay(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return copy;
}

export function getSundayEnd(date: Date) {
  const sunday = getMonday(date);
  sunday.setDate(sunday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return sunday;
}

export function getWeekNumber(date: Date) {
  const monday = getMonday(date);
  const diff = monday.getTime() - TERM_START_MONDAY.getTime();
  return Math.max(1, Math.floor(diff / (7 * 24 * 60 * 60 * 1000)) + 1);
}

export function getWeekdayShort(date: Date) {
  return WEEKDAY_SHORT[date.getDay()];
}

export function getWeekdayFull(date: Date) {
  return WEEKDAY_FULL[date.getDay()];
}

export function isSameChinaDay(left: Date, right: Date) {
  return toDateKey(left) === toDateKey(right);
}

export function buildArrivalTime(dateKey: string, hhmm: string) {
  return `${dateKey}T${hhmm}:00+08:00`;
}
