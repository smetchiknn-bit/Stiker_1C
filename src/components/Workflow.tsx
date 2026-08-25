import { useRef, useState } from "react";
import type { Analysis } from "../lib/processor";
import { money } from "../lib/processor";
import {
  IconCheck, IconUpload, IconWarn, IconX, IconArrow,
  IconTree, IconSigma, IconPaint, IconGroup, IconSheet, IconRefresh,
} from "./Icons";

export type Stage = "idle" | "loading" | "confirm" | "processing" | "done" | "error";

export interface ErrorInfo {
  title: string;
  detail: string;
}

/* ================= вертикальный конвейер ================= */
export function Pipeline({ stage, outName }: { stage: Stage; outName: string }) {
  const active =
    stage === "idle" || stage === "loading" ? 0 : stage === "confirm" ? 1 : stage === "processing" ? 2 : 3;
  const steps = [
    { n: "01", t: "Файл-донор", d: "Загрузка книги Excel в браузер" },
    { n: "02", t: "Контроль листа «Свод»", d: "Стикер (J2), уровни в колонке K, «ГР»" },
    { n: "03", t: "Обработка по макросу", d: "Нумерация · формулы · формат · группировка" },
    { n: "04", t: "Отчёт и скачивание", d: outName || "Имя_донора_1С.xlsx" },
  ];
  return (
    <ol className="relative">
      <span aria-hidden className="absolute left-[19px] top-3 bottom-3 w-px bg-line" />
      {steps.map((s, i) => {
        const done = stage === "done" || i < active;
        const isActive = i === active && stage !== "done";
        return (
          <li key={s.n} className="relative flex gap-4 pb-7 last:pb-0">
            <span
              className={[
                "relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full border font-display text-[13px] transition-all duration-300",
                done
                  ? "border-brand-deep bg-brand text-ink"
                  : isActive
                    ? "border-ink bg-ink text-brand"
                    : "border-line bg-card text-ink-faint",
              ].join(" ")}
              style={isActive ? { animation: "pulse-ring 1.6s ease-out infinite" } : undefined}
            >
              {done ? <IconCheck size={18} /> : s.n}
            </span>
            <span className="pt-0.5">
              <span
                className={[
                  "block font-display text-[15px] leading-tight tracking-wide transition-colors",
                  done || isActive ? "text-ink" : "text-ink-faint",
                ].join(" ")}
              >
                {s.t}
              </span>
              <span className="mt-1 block text-[13px] leading-snug text-ink-faint">{s.d}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/* ================= зона загрузки ================= */
export function Dropzone({
  onFile,
  onDemo,
  busy,
}: {
  onFile: (f: File) => void;
  onDemo: () => void;
  busy: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Загрузить файл-донор"
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onFile(f);
      }}
      className={[
        "group relative cursor-pointer overflow-hidden rounded-xl border-2 border-dashed bg-card px-8 py-12 text-center outline-none transition-all duration-300",
        drag
          ? "-translate-y-1 border-brand-deep bg-brand/15 shadow-[0_18px_44px_-18px_rgba(20,38,58,0.45)]"
          : "border-ink/25 hover:-translate-y-0.5 hover:border-ink/50 hover:shadow-[0_14px_36px_-20px_rgba(20,38,58,0.4)]",
      ].join(" ")}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xlsm"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -right-7 -top-9 select-none font-display text-[120px] leading-none text-ink/[0.05] transition-transform duration-500 group-hover:-rotate-6"
      >
        ССР
      </span>
      <span
        className={[
          "mx-auto grid h-16 w-16 place-items-center rounded-full border transition-all duration-300",
          drag ? "scale-110 border-brand-deep bg-brand text-ink" : "border-ink/15 bg-paper text-blue group-hover:scale-105",
        ].join(" ")}
      >
        <IconUpload size={30} />
      </span>
      <p className="mt-5 font-display text-xl tracking-wide text-ink">
        {drag ? "Отпускайте — начнём обработку" : "Перетащите файл-донор сюда"}
      </p>
      <p className="mt-2 text-[14px] text-ink-faint">
        Формат <b className="font-mono text-ink-soft">.xlsx / .xlsm</b> · нужен лист{" "}
        <b className="text-ink-soft">«Свод»</b> · обработка идёт локально, файл никуда не отправляется
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-4" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-lg bg-brand px-6 py-3 font-display text-[14px] tracking-wide text-ink shadow-[0_10px_24px_-10px_rgba(232,185,0,0.8)] transition-all hover:-translate-y-0.5 hover:bg-brand-deep active:translate-y-0 active:scale-[0.98]"
        >
          Выбрать файл <IconArrow size={17} />
        </button>
        <button
          type="button"
          onClick={onDemo}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg border border-ink/20 bg-card px-5 py-3 text-[14px] font-medium text-ink-soft transition-all hover:border-blue hover:text-blue disabled:opacity-60"
        >
          <IconSheet size={17} /> Демо-пример донора
        </button>
      </div>
    </div>
  );
}

/* ================= каретка донора ================= */
export function DonorSummary({ a, warnNoGR }: { a: Analysis; warnNoGR?: boolean }) {
  const codes = Object.entries(a.levelCounts);
  return (
    <section className="anim-rise overflow-hidden rounded-xl border border-line bg-card">
      <header className="flex flex-wrap items-center gap-3 border-b border-line bg-paper/70 px-5 py-3.5">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-ink text-brand">
          <IconSheet size={19} />
        </span>
        <div className="min-w-0">
          <p className="truncate font-mono text-[14px] font-semibold text-ink">{a.fileName}</p>
          <p className="text-[12px] text-ink-faint">
            Листы: {a.sheetNames.join(", ")} · строк с данными: {a.dataRows}
          </p>
        </div>
        <span className="ml-auto rounded-full border border-ok/30 bg-ok-soft px-3 py-1 text-[12px] font-semibold text-ok">
          лист «Свод» найден
        </span>
      </header>

      <div className="grid gap-4 px-5 py-4 sm:grid-cols-[1fr_auto]">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
            Уровни иерархии в колонке K
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {codes.length === 0 && <span className="text-[13px] text-ink-faint">коды уровней не найдены</span>}
            {codes.map(([k, n]) => (
              <span
                key={k}
                className={[
                  "rounded-md border px-2 py-1 font-mono text-[12px] font-semibold",
                  k === "ГР"
                    ? "border-[#9dc3e6] bg-[#DEEBF7] text-blue-deep"
                    : k === "КЕР"
                      ? "border-[#e3c078] bg-[#FFF2CC] text-[#7a5b00]"
                      : k === "ТМЦ"
                        ? "border-[#e0d36a] bg-[#FFFFCC] text-[#6b6200]"
                        : "border-line bg-paper text-ink-soft",
                ].join(" ")}
              >
                {k} × {n}
              </span>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-line bg-paper px-4 py-3 text-right">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
            Стикер · ячейка J2
          </p>
          <p className="tnum mt-1 font-mono text-[22px] font-extrabold leading-none text-ink">
            {a.stikerNum != null ? money(a.stikerNum) : String(a.stikerRaw)}
          </p>
          {(a.stikerRaw == null || a.stikerRaw === "") && (
            <p className="mt-1 text-[11px] text-ink-faint">пустая ячейка — макрос принял бы её за 0</p>
          )}
        </div>
      </div>

      {warnNoGR && (
        <div className="flex items-start gap-3 border-t border-[#f0d9a8] bg-warn-soft px-5 py-4">
          <span className="mt-0.5 text-warn">
            <IconWarn size={22} />
          </span>
          <div>
            <p className="font-display text-[14px] tracking-wide text-[#6b4a00]">
              В колонке K (11) не найдено ни одной группы «ГР»
            </p>
            <p className="mt-1 text-[13px] leading-snug text-[#8a6a1f]">
              Макрос в этом месте спрашивает разрешение. Решите, продолжать ли обработку файла.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

/* ================= предупреждение / ошибка ================= */
export function ConfirmNoGR({
  onYes,
  onNo,
}: {
  onYes: () => void;
  onNo: () => void;
}) {
  return (
    <div className="anim-rise flex flex-wrap items-center gap-4 rounded-xl border-2 border-[#e3b95c] bg-card px-5 py-4">
      <p className="text-[14px] text-ink-soft">
        <b className="text-ink">Продолжить обработку?</b> Файл будет обработан без групп «ГР» — как если бы вы
        ответили «Да» в диалоге макроса.
      </p>
      <div className="ml-auto flex gap-3">
        <button
          type="button"
          onClick={onYes}
          className="rounded-lg bg-brand px-5 py-2.5 font-display text-[13px] tracking-wide text-ink transition-all hover:-translate-y-0.5 hover:bg-brand-deep active:translate-y-0"
        >
          Да, продолжить
        </button>
        <button
          type="button"
          onClick={onNo}
          className="inline-flex items-center gap-2 rounded-lg border border-ink/20 px-5 py-2.5 text-[14px] font-medium text-ink-soft transition-colors hover:border-bad hover:text-bad"
        >
          <IconX size={15} /> Отмена
        </button>
      </div>
    </div>
  );
}

export function ErrorCard({ error, onReset }: { error: ErrorInfo; onReset: () => void }) {
  return (
    <div className="anim-rise rounded-xl border-2 border-bad/40 bg-card p-6">
      <div className="flex items-start gap-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-bad-soft text-bad">
          <IconX size={22} />
        </span>
        <div className="min-w-0">
          <p className="font-display text-lg tracking-wide text-bad">{error.title}</p>
          <p className="mt-1.5 text-[14px] leading-relaxed text-ink-soft">{error.detail}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onReset}
        className="mt-5 inline-flex items-center gap-2 rounded-lg bg-ink px-5 py-2.5 font-display text-[13px] tracking-wide text-brand transition-all hover:-translate-y-0.5 hover:bg-blue-deep"
      >
        <IconRefresh size={16} /> Выбрать другой файл
      </button>
    </div>
  );
}

/* ================= панель обработки ================= */
const SUBSTEPS = [
  { t: "Нумерация иерархии", d: "О · К · С · У · Э · Л1–Л4 · ГР · КЕР · ТМЦ", icon: IconTree },
  { t: "Сквозные формулы", d: "ROUND(кол-во × цена), SUMPRODUCT, итоги", icon: IconSigma },
  { t: "Форматирование", d: "Заливки строк, колонка G — красная, 8–9 — зелёные", icon: IconPaint },
  { t: "Группировка строк", d: "Уровни структуры по числу точек в «ИД 1С»", icon: IconGroup },
];

export function ProcessingPanel({ step }: { step: number }) {
  const pct = Math.min(100, Math.round(((step + 0.6) / SUBSTEPS.length) * 100));
  return (
    <section className="anim-rise rounded-xl border border-line bg-card p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="font-display text-lg tracking-wide text-ink">Обрабатываем лист…</h3>
          <p className="mt-1 text-[13px] text-ink-faint">Тот же алгоритм, что и в макросе «Стикер_1С»</p>
        </div>
        <span className="tnum font-mono text-2xl font-extrabold text-blue">{pct}%</span>
      </div>
      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-paper">
        <div className="stripe-live h-full rounded-full transition-all duration-500" style={{ width: pct + "%" }} />
      </div>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {SUBSTEPS.map((s, i) => {
          const st = i < step ? "done" : i === step ? "run" : "wait";
          const Icon = s.icon;
          return (
            <li
              key={s.t}
              className={[
                "flex items-center gap-3.5 rounded-lg border px-4 py-3.5 transition-all duration-300",
                st === "done" ? "border-ok/30 bg-ok-soft" : st === "run" ? "border-blue/40 bg-[#e8f1f9]" : "border-line bg-paper/60 opacity-70",
              ].join(" ")}
            >
              <span
                className={[
                  "grid h-10 w-10 shrink-0 place-items-center rounded-lg transition-colors",
                  st === "done" ? "bg-ok text-white" : st === "run" ? "bg-blue text-white" : "bg-line/70 text-ink-faint",
                ].join(" ")}
              >
                {st === "done" ? <IconCheck size={19} /> : <Icon size={20} />}
              </span>
              <span>
                <span className="block text-[14px] font-semibold text-ink">{s.t}</span>
                <span className="block text-[12px] text-ink-faint">{s.d}</span>
              </span>
              {st === "run" && (
                <span className="ml-auto flex gap-1" aria-label="выполняется">
                  {[0, 1, 2].map((d) => (
                    <i
                      key={d}
                      className="h-1.5 w-1.5 rounded-full bg-blue"
                      style={{ animation: `blink-dot 0.9s ${d * 0.18}s infinite` }}
                    />
                  ))}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
