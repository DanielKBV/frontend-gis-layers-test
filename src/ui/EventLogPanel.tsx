import { useSyncExternalStore } from "react";
import type { EventLog, LogEntry, LogEvent } from "../core/eventLog";
import { Hint, LogLine, LogList } from "./styled";

const LABELS: Record<LogEvent, { readonly text: string; readonly tone?: "info" | "ok" | "err" }> = {
  started: { text: "старт" },
  cancelled: { text: "ОТМЕНЁН", tone: "info" },
  dropped: { text: "ОТВЕТ ОТБРОШЕН", tone: "err" },
  success: { text: "успех", tone: "ok" },
  error: { text: "ошибка", tone: "err" },
};

const time = (at: number): string => {
  const d = new Date(at);
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
};

const line = (e: LogEntry): string =>
  `${time(e.at)}  ${e.id.padEnd(12)}  запрос #${e.n} → ${LABELS[e.event].text}`;

export function EventLogPanel({ log }: { readonly log: EventLog }) {
  const entries = useSyncExternalStore(log.subscribe, log.getEntries);

  if (entries.length === 0) return <Hint>Журнал пуст — включите слой.</Hint>;
  return (
    <LogList>
      {entries.map((e) => (
        <LogLine key={`${e.at}-${e.id}-${e.n}-${e.event}`} $tone={LABELS[e.event].tone}>
          {line(e)}
        </LogLine>
      ))}
    </LogList>
  );
}
