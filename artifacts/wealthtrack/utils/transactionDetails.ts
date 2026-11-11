export function transactionDateLabel(date: string, time?: string) {
  const parsed = new Date(date + "T12:00:00");
  const day = Number.isFinite(parsed.getTime())
    ? parsed.toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : date;
  if (!time) return day + " · Time not recorded";
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return day + " · " + time;
  const hour = Number(match[1]);
  return `${day} · ${hour % 12 || 12}:${match[2]} ${hour >= 12 ? "PM" : "AM"}`;
}
