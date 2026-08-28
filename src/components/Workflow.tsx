import { useRef, useState } from "react";
import type { Analysis } from "../lib/processor";
import { money } from "../lib/processor";
import {
  IconCheck, IconUpload, IconWarn, IconX, IconArrow, IconLock, IconSheet,
  IconShield, IconSigma, IconDownload, IconRefresh, DonorLogo,
} from "./Icons";

export type Stage = "idle" | "loading" | "review" | "processing" | "done" | "error";

export interface ErrorInfo {
  title: string;
  detail: string;
}

export function fmtSize(bytes: number): string {
  if (bytes < 1024) return bytes + " Б";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1).replace(".", ",") + " КБ";
  return (bytes / 1024 / 1024).toFixed(2).replace(".", ",") + " МБ";
}

/* ================= рельса мастера: 4 шага ================= */
export interface WizardStep {
  id: string;
  n: string;
  title: string;
  desc: string;
  icon: (p: { size?: number; className?: string }) => React.ReactNode;
  state: "done" | "current" | "locked";
}

export function WizardRail({ steps, onJump }: { steps: WizardStep[]; onJump: (id: string) => void }) {
  return (
    <ol className="relative">
      <span aria-hidden className="absolute bottom-4 left-[19px] top-4 w-px bg-line" />
      {steps.map((s, i) => {
        const Icon = s.icon as any;
        return (
          <li key={s.id} className="relative flex gap-3.5 pb-6 last:pb-0">
            <button
              type="button"
              onClick={() => s.state === "done" && onJump(s.id)}
              disabled={s.state === "locked"}
              title={s.state === "done" ? "Перейти к шагу" : undefined}
              className={[
                "relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 transition-all duration-200",
                s.state === "done"
                  ? "cursor-pointer border-green bg-green text-[#f2f9f5] hover:-translate-y-0.5"
                  : s.state === "current"
                    ? "border-green bg-white text-green shadow-[0_0_0_4px_rgba(30,113,69,0.14)]"
                    : "border-line bg-white text-line",
              ].join(" ")}
            >
              {s.state === "done" ? <IconCheck size={17} /> : s.state === "locked" ? <IconLock size={15} /> : <Icon size={17} />}
            </button>
            <span className="pt-0.5">
              <span className="label-caps block !text-[10px]">шаг {s.n}</span>
              <span
                className={[
                  "mt-0.5 block font-display text-[13.5px] font-semibold leading-tight tracking-tight transition-colors",
                  s.state === "locked" ? "text-ink-soft/50" : "text-ink",
                ].join(" ")}
              >
                {s.title}
              </span>
              <span className="mt-0.5 block text-[12px] leading-snug text-ink-soft">{s.desc}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export const WIZARD_ICONS = { IconSheet, IconShield, IconSigma, IconDownload };

/* ================= шаг 1 · книга ================= */
function Dropzone({ onFile, onDemo, busy }: { onFile: (f: File) => void; onDemo: () => void; busy: boolean }) {
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
      className={["dropzone cursor-pointer px-6 py-9 text-center outline-none", drag ? "drag" : ""].join(" ")}
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
      {/* парящий лист */}
      <div className="pointer-events-none flex justify-center">
        <div className="anim-floaty grid h-[104px] w-[86px] place-items-center rounded-[10px] border border-line bg-white shadow-[5px_6px_0_rgba(21,38,32,0.10)]">
          <DonorLogo size={58} />
        </div>
      </div>
      <p className="mt-5 font-display text-[19px] font-semibold tracking-tight text-ink">
        {drag ? "Отпускайте — прочитаем книгу" : "Перетащите файл-донор"}
      </p>
      <p className="mt-1.5 font-mono text-[12px] text-ink-soft">
        .xlsx / .xlsm · лист «Свод» · обработка локально
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={() => inputRef.current?.click()} className="btn btn-primary">
          <IconUpload size={17} /> Выбрать файл
        </button>
        <button type="button" onClick={onDemo} disabled={busy} className="btn btn-ghost">
          Демо-пример донора
        </button>
      </div>
    </div>
  );
}

export function BookCard({
  stage,
  fileMeta,
  analysis,
  onFile,
  onDemo,
  busy,
  onReplace,
}: {
  stage: Stage;
  fileMeta: { name: string; size: number } | null;
  analysis: Analysis | null;
  onFile: (f: File) => void;
  onDemo: () => void;
  busy: boolean;
  onReplace: () => void;
}) {
  return (
    <section id="card-book" className="card card-hover rise scroll-mt-6 p-5">
      <header className="mb-4 flex items-center gap-2.5">
        <span className="label-caps">шаг 01 · книга</span>
        <span className="ml-auto chip-mono">Excel → браузер</span>
      </header>

      {stage === "idle" && <Dropzone onFile={onFile} onDemo={onDemo} busy={busy} />}

      {stage === "loading" && (
        <div className="grid place-items-center rounded-[10px] border border-dashed border-line bg-green-mist px-6 py-10 text-center">
          <span className="relative grid h-12 w-12 place-items-center">
            <i className="absolute inset-0 rounded-full border-[3px] border-line" />
            <i className="anim-spin absolute inset-0 rounded-full border-[3px] border-transparent border-t-green" />
            <IconSheet size={18} className="text-green" />
          </span>
          <p className="mt-4 font-display text-[15px] font-semibold text-ink">Читаем книгу Excel…</p>
          <p className="mt-1 font-mono text-[12px] text-ink-soft">ищем лист «Свод» и «Стикер» в J2</p>
        </div>
      )}

      {(stage === "review" || stage === "processing" || stage === "done" || stage === "error") && analysis && fileMeta && (
        <div className="flex flex-wrap items-center gap-4 rounded-[10px] border border-line bg-green-mist px-4 py-3.5">
          <DonorLogo size={46} />
          <div className="min-w-0">
            <p className="truncate font-mono text-[14px] font-semibold text-ink">{fileMeta.name}</p>
            <p className="mt-0.5 font-mono text-[11.5px] text-ink-soft">
              листов: {analysis.sheetNames.length} · строк данных: {analysis.dataRows} · {fmtSize(fileMeta.size)}
            </p>
          </div>
          <span className="chip-mono">лист «Свод» ✓</span>
          <button type="button" onClick={onReplace} disabled={stage === "processing"} className="btn btn-ghost btn-sm ml-auto">
            <IconRefresh size={15} /> Заменить
          </button>
        </div>
      )}

      {stage === "error" && !analysis && (
        <Dropzone onFile={onFile} onDemo={onDemo} busy={busy} />
      )}
    </section>
  );
}

/* ================= шаг 2 · контроль (авто-определение → подтверждение) ================= */
export function ControlCard({
  a,
  stage,
  outName,
  onOutName,
  grAnswer,
  onGrYes,
  onGrNo,
  onStart,
}: {
  a: Analysis;
  stage: Stage;
  outName: string;
  onOutName: (v: string) => void;
  grAnswer: null | "yes";
  onGrYes: () => void;
  onGrNo: () => void;
  onStart: () => void;
}) {
  const running = stage === "processing";
  const done = stage === "done";
  const nameOk = outName.trim().length > 0;
  const grOk = a.hasGR || grAnswer === "yes";
  const canStart = nameOk && grOk && !running && !done;
  const reason = !nameOk
    ? "Укажите имя готового файла."
    : !grOk
      ? "Ответьте на вопрос про «ГР» ниже."
      : "";

  return (
    <section id="card-control" className="card card-hover rise scroll-mt-6 p-5" style={{ ["--d" as any]: "0.05s" }}>
      <header className="mb-4 flex flex-wrap items-center gap-2.5">
        <span className="label-caps">шаг 02 · контроль</span>
        <span className="chip-mono">авто-определение</span>
        {done && <span className="chip-mono ml-auto">✓ выполнено</span>}
      </header>

      <h2 className="font-display text-[17px] font-semibold tracking-tight text-ink">
        Параметры листа «Свод»
      </h2>
      <p className="mt-1 text-[13px] text-ink-soft">
        Всё определено автоматически из донора — проверьте и, если нужно, поправьте имя файла.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {/* Стикер */}
        <div className="rounded-[10px] border border-line bg-white p-3.5">
          <p className="label-caps">Стикер · ячейка J2</p>
          <p className="tnum mt-1.5 font-mono text-[22px] font-bold leading-none text-green-deep">
            {a.stikerNum != null ? money(a.stikerNum) : String(a.stikerRaw)}
            <span className="ml-1.5 text-[12px] font-medium text-ink-soft">руб.</span>
          </p>
          <p className="mt-1.5 font-mono text-[11px] text-ink-soft">
            {a.stikerRaw == null || a.stikerRaw === "" ? "пустая ячейка → макрос примет за 0" : "определена автоматически"}
          </p>
        </div>

        {/* имя файла — override */}
        <div className="rounded-[10px] border border-line bg-white p-3.5">
          <p className="label-caps">Имя готового файла</p>
          <input
            className={["field mt-1.5", !nameOk ? "!border-red" : ""].join(" ")}
            value={outName}
            disabled={running || done}
            onChange={(e) => onOutName(e.target.value)}
            spellCheck={false}
            aria-label="Имя готового файла"
          />
          <p className="mt-1.5 font-mono text-[11px] text-ink-soft">
            определено: <b className="text-ink">{a.outName}</b> · можно исправить
          </p>
        </div>

        {/* уровни */}
        <div className="rounded-[10px] border border-line bg-white p-3.5 sm:col-span-2">
          <p className="label-caps">Уровни иерархии · колонка K</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {Object.entries(a.levelCounts).length === 0 && (
              <span className="font-mono text-[12px] text-ink-soft">коды уровней не найдены</span>
            )}
            {Object.entries(a.levelCounts).map(([k, n]) => (
              <span
                key={k}
                className={[
                  "chip-mono",
                  k === "ГР" ? "!border-[#c9a94e] !bg-[#fdf0c8] !text-[#6b4a00]" : "",
                  k === "ТМЦ" ? "!border-[#9cbf8a] !bg-[#e2efd9] !text-[#3c5a2c]" : "",
                  k === "КЕР" ? "!border-amber/40 !bg-amber-soft !text-amber" : "",
                ].join(" ")}
              >
                {k} × {n}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* inline-вопрос вместо модалки */}
      {!a.hasGR && grAnswer == null && (
        <div className="rise mt-4 flex flex-wrap items-start gap-3 rounded-[10px] border border-amber/40 bg-amber-soft px-4 py-3.5">
          <IconWarn size={22} className="mt-0.5 shrink-0 text-amber" />
          <div className="min-w-[220px] flex-1">
            <p className="text-[13.5px] font-semibold text-amber">
              В колонке K (11) не найдено ни одной группы «ГР»
            </p>
            <p className="mt-0.5 text-[12.5px] text-ink-soft">
              Макрос на этом месте спрашивает разрешение. Продолжить обработку?
            </p>
            <div className="mt-3 flex gap-2.5">
              <button type="button" onClick={onGrYes} className="btn btn-primary btn-sm">
                Да, продолжить
              </button>
              <button type="button" onClick={onGrNo} className="btn btn-ghost btn-sm">
                <IconX size={13} /> Нет, отмена
              </button>
            </div>
          </div>
        </div>
      )}
      {!a.hasGR && grAnswer === "yes" && (
        <p className="mt-3 font-mono text-[12px] text-green">
          ◆ ответ записан: продолжаем без «ГР»
        </p>
      )}

      {/* запуск */}
      {!done && (
        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-dashed border-line pt-4">
          {running ? (
            <span className="inline-flex items-center gap-2.5 font-mono text-[13px] text-green">
              <i className="anim-spin inline-block h-4 w-4 rounded-full border-2 border-green-soft border-t-green" />
              выполняется обработка…
            </span>
          ) : (
            <>
              <button type="button" onClick={onStart} disabled={!canStart} className="btn btn-primary">
                Начать обработку <IconArrow size={16} />
              </button>
              {reason && <span className="font-mono text-[12px] text-amber">◆ {reason}</span>}
            </>
          )}
        </div>
      )}
    </section>
  );
}

/* ================= шаг 3 · журнал обработки ================= */
export function JournalCard({
  lines,
  visible,
  running,
}: {
  lines: string[];
  visible: number;
  running: boolean;
}) {
  const shown = lines.slice(0, visible);
  return (
    <section id="card-journal" className="rise scroll-mt-6" style={{ ["--d" as any]: "0.1s" }}>
      <div className="journal">
        {running && <div className="film" aria-hidden />}
        <header className="flex items-center gap-2.5 px-4 pb-2 pt-3.5">
          <span className="label-caps !text-[#9fcdb2]">шаг 03 · журнал обработки</span>
          <span
            className={[
              "ml-auto inline-flex items-center gap-1.5 font-mono text-[11.5px]",
              running ? "text-[#ffd965]" : "text-[#9fcdb2]",
            ].join(" ")}
          >
            <i className="h-1.5 w-1.5 rounded-full bg-current" style={{ animation: "blink 1.4s infinite" }} />
            {running ? "выполняется" : "завершено"}
          </span>
        </header>
        <ul className="pb-2">
          {shown.map((l, i) => (
            <li key={l + i} className="log-line" style={{ animationDelay: `${i * 90}ms` }}>
              <span className="mr-2 text-[#7fc79a]">▸</span>
              {l}
            </li>
          ))}
          {running && (
            <li className="log-line text-[#9fcdb2]">
              <span className="mr-2 text-[#7fc79a]">▸</span>
              выполняется операция
              <i className="ml-1 inline-block h-[13px] w-[7px] translate-y-[2px] bg-[#9fcdb2]" style={{ animation: "blink 0.8s infinite" }} />
            </li>
          )}
        </ul>
      </div>
    </section>
  );
}

/* ================= панель ошибки ================= */
export function ErrorPanel({ error, onRetry }: { error: ErrorInfo; onRetry: () => void }) {
  return (
    <section className="card rise !border-red/40 p-5">
      <div className="flex items-start gap-3.5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-red-soft text-red">
          <IconX size={20} />
        </span>
        <div className="min-w-0">
          <p className="font-display text-[16px] font-semibold tracking-tight text-red">{error.title}</p>
          <p className="mt-1.5 whitespace-pre-wrap font-mono text-[12.5px] leading-relaxed text-ink-soft">
            {error.detail}
          </p>
        </div>
      </div>
      <div className="mt-4 flex gap-2.5 border-t border-dashed border-line pt-4">
        <button type="button" onClick={onRetry} className="btn btn-primary btn-sm">
          <IconRefresh size={15} /> Повторить
        </button>
        <span className="self-center font-mono text-[11.5px] text-ink-soft">
          ◆ источник будет перечитан заново
        </span>
      </div>
    </section>
  );
}
