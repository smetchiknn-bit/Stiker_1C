import React, { useCallback, useEffect, useRef, useState } from "react";
import type * as ExcelJS from "exceljs";
import { getExcelJS } from "./lib/excel";
import { analyzeDonor, processWorkbook } from "./lib/processor";
import type { Analysis, Outcome } from "./lib/processor";
import { buildSampleDonor, SAMPLE_FILE_NAME } from "./lib/sample";
import {
  Pipeline, Dropzone, DonorSummary, ConfirmNoGR, ErrorCard, ProcessingPanel,
} from "./components/Workflow";
import type { Stage, ErrorInfo } from "./components/Workflow";
import { ReportPanel, SheetPreview, InfoSections } from "./components/Results";
import { LogoMark, IconGlobe, IconTree, IconSigma, IconPaint } from "./components/Icons";

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

export function errText(e: unknown): string {
  const msg = (e as any)?.message ? String((e as any).message) : String(e ?? "Неизвестная ошибка");
  const stack = (e as any)?.stack ? String((e as any).stack) : "";
  const tail = stack && !stack.includes(msg) ? "\n" + stack.split("\n").slice(1, 4).join("\n") : "";
  return (msg + tail).slice(0, 600);
}

/* страховка от «белого экрана»: любая ошибка рендера показывается явно */
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { err: string | null }> {
  state = { err: null as string | null };
  static getDerivedStateFromError(e: unknown) {
    return { err: errText(e) };
  }
  componentDidCatch(e: unknown) {
    // eslint-disable-next-line no-console
    console.error("СВОД→1С: ошибка интерфейса", e);
  }
  render() {
    if (this.state.err) {
      return (
        <div className="grid min-h-screen place-items-center px-6">
          <div className="max-w-xl rounded-xl border-2 border-bad/40 bg-card p-7">
            <p className="font-display text-lg tracking-wide text-bad">Интерфейс споткнулся</p>
            <p className="mt-2 break-words font-mono text-[12.5px] leading-relaxed text-ink-soft">
              {this.state.err}
            </p>
            <button
              type="button"
              onClick={() => location.reload()}
              className="mt-5 rounded-lg bg-ink px-5 py-2.5 font-display text-[13px] tracking-wide text-brand transition-colors hover:bg-blue-deep"
            >
              Перезапустить приложение
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppInner />
    </ErrorBoundary>
  );
}

function AppInner() {
  const [stage, setStage] = useState<Stage>("idle");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [error, setError] = useState<ErrorInfo | null>(null);
  const [step, setStep] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [demoBusy, setDemoBusy] = useState(false);
  const wbRef = useRef<ExcelJS.Workbook | null>(null);

  /* появление секций при прокрутке */
  useEffect(() => {
    const els = document.querySelectorAll(".reveal:not(.is-in)");
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.12 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [stage]);

  const reset = useCallback(() => {
    wbRef.current = null;
    setAnalysis(null);
    setOutcome(null);
    setError(null);
    setStep(0);
    setStage("idle");
  }, []);

  const runProcessing = useCallback(async (a: Analysis) => {
    setStage("processing");
    setStep(0);
    await nextFrame();
    await delay(350);
    let out: Outcome;
    try {
      out = await processWorkbook(wbRef.current!, a);
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error("СВОД→1С: сбой при обработке файла", e);
      setError({
        title: "Сбой при обработке",
        detail: errText(e) + "\n\nЕсли файл точно содержит лист «Свод», напишите об этой ошибке — текст выше поможет её починить.",
      });
      setStage("error");
      return;
    }
    setOutcome(out);
    for (let s = 0; s < 4; s++) {
      setStep(s);
      await delay(430);
    }
    setStep(4);
    setStage("done");
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setOutcome(null);
      if (!/\.(xlsx|xlsm)$/i.test(file.name)) {
        setError({
          title: "Неподходящий формат файла",
          detail: `«${file.name}»: нужен файл .xlsx или .xlsm. Старые форматы .xls и .xlsb браузерная библиотека не читает — пересохраните книгу в Excel как .xlsx и повторите.`,
        });
        setStage("error");
        return;
      }
      setStage("loading");
      try {
        const E = await getExcelJS();
        const wb = new E.Workbook();
        await wb.xlsx.load(await file.arrayBuffer());
        const a = analyzeDonor(wb, file.name);
        wbRef.current = wb;
        setAnalysis(a);
        if (!a.hasGR) setStage("confirm");
        else void runProcessing(a);
      } catch (e: any) {
        // eslint-disable-next-line no-console
        console.error("СВОД→1С: не удалось открыть файл", e);
        if (e?.kind === "no-sheet") {
          setError({ title: "Лист «Свод» не найден", detail: String(e.message) });
        } else {
          setError({
            title: "Не удалось открыть книгу",
            detail:
              "Файл повреждён, защищён паролем или не является книгой Excel (.xlsx/.xlsm).\nТехнические детали: " +
              errText(e),
          });
        }
        setStage("error");
      }
    },
    [runProcessing]
  );

  const handleDemo = useCallback(async () => {
    setDemoBusy(true);
    try {
      const wb = await buildSampleDonor();
      const buf = await wb.xlsx.writeBuffer();
      const f = new File([buf], SAMPLE_FILE_NAME, {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      setDemoBusy(false);
      void handleFile(f);
    } catch {
      setDemoBusy(false);
      setError({ title: "Демо недоступно", detail: "Не удалось собрать демонстрационный донор в этом браузере." });
      setStage("error");
    }
  }, [handleFile]);

  const handleDownload = useCallback(async () => {
    if (!outcome || downloading) return;
    setDownloading(true);
    try {
      const buf = await outcome.outWorkbook.xlsx.writeBuffer();
      const blob = new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = outcome.analysis.outName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } finally {
      setDownloading(false);
    }
  }, [outcome, downloading]);

  return (
    <div className="relative min-h-screen overflow-x-clip">
      {/* вертикальный водяной знак */}
      <span
        aria-hidden
        className="pointer-events-none fixed right-3 top-1/2 z-0 hidden select-none font-display text-[92px] leading-none tracking-tight text-ink/[0.045] xl:block"
        style={{ animation: "watermark-drift 9s ease-in-out infinite alternate" }}
      >
        1С
      </span>

      {/* ======= шапка ======= */}
      <header className="relative z-10 border-b-4 border-brand bg-ink text-paper">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-5 py-4">
          <LogoMark size={40} />
          <div>
            <p className="font-display text-[22px] leading-none tracking-wide">
              СВОД <span className="text-brand">→</span> 1С
            </p>
            <p className="mt-1 text-[12px] text-paper/60">
              конвертер сметного листа · перенос VBA-макроса «Стикер_1С» в браузер
            </p>
          </div>
          <span className="ml-auto inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[12px] font-medium text-paper/80">
            <IconGlobe size={16} className="text-brand" />
            всё считается локально — файлы не покидают компьютер
          </span>
        </div>
      </header>

      {/* ======= рабочая зона ======= */}
      <main className="relative z-10 mx-auto max-w-6xl px-5 pb-20 pt-10">
        <div className="grid gap-8 lg:grid-cols-[290px_1fr]">
          {/* конвейер слева */}
          <aside className="order-2 lg:order-1">
            <div className="rounded-xl border border-line bg-card p-5 lg:sticky lg:top-6">
              <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-ink-faint">Конвейер</p>
              <Pipeline stage={stage} outName={analysis?.outName ?? ""} />
            </div>
            <div className="mt-4 rounded-xl border border-dashed border-blue/35 bg-[#e8f1f9]/70 p-4 text-[12.5px] leading-relaxed text-blue-deep">
              <b>Совет:</b> если под рукой нет донора, нажмите «Демо-пример» — соберётся образец листа «Свод» со
              всеми уровнями, «Стикером» в J2 и сходящимися суммами.
            </div>
          </aside>

          {/* контент справа */}
          <div className="order-1 space-y-6 lg:order-2">
            {stage === "idle" && (
              <>
                <section className="anim-rise">
                  <p className="inline-flex items-center gap-2 rounded-full border border-ink/15 bg-card px-3.5 py-1.5 text-[12px] font-semibold text-ink-soft">
                    <i className="h-2 w-2 rounded-full bg-ok" style={{ animation: "blink-dot 1.8s infinite" }} />
                    Бывший макрос теперь веб-приложение — без Excel под рукой
                  </p>
                  <h1 className="mt-4 max-w-[15ch] font-display text-[38px] leading-[1.06] tracking-wide text-ink sm:text-[46px]">
                    Из листа «Свод» — в файл для <span className="relative inline-block">
                      1С
                      <i aria-hidden className="absolute -bottom-1 left-0 h-2.5 w-full -skew-x-12 bg-brand/80" />
                    </span>
                  </h1>
                  <p className="mt-4 max-w-[58ch] text-[15px] leading-relaxed text-ink-soft">
                    Загрузите файл-донор — приложение повторит макрос «Стикер_1С» шаг в шаг: пронумерует иерархию
                    О→К→С→У→Э→Л1…Л4→ГР, разложит «КЕР» на две строки, проставит формулы, заливки и группировку,
                    сверит «Стикер» с итогом и отдаст файл{" "}
                    <b className="font-mono text-[13.5px] text-ink">ИмяДонора_1С.xlsx</b>.
                  </p>
                </section>
                <Dropzone onFile={handleFile} onDemo={handleDemo} busy={demoBusy} />
                <section className="anim-rise flex flex-wrap items-stretch gap-px overflow-hidden rounded-xl border border-line bg-line" style={{ animationDelay: "0.12s" }}>
                  {[
                    { icon: IconTree, t: "Нумерация «ИД 1С»", d: "сброс счётчиков уровней, как в Нумерация_1С" },
                    { icon: IconSigma, t: "Контрольные суммы", d: "Стикер (J2) против Σ СМР + Σ ТМЦ" },
                    { icon: IconPaint, t: "Формат один в один", d: "заливки, границы, числовые форматы ячеек" },
                  ].map((x, i) => (
                    <div key={x.t} className="flex min-w-[220px] flex-1 items-center gap-3.5 bg-card px-5 py-4 transition-colors hover:bg-paper">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-ink text-brand">
                        <x.icon size={20} />
                      </span>
                      <span>
                        <b className="block text-[13.5px] text-ink">{x.t}</b>
                        <span className="mt-0.5 block text-[12px] leading-snug text-ink-faint">{x.d}</span>
                      </span>
                      <span className="ml-auto hidden font-display text-[13px] text-ink/20 sm:block">0{i + 1}</span>
                    </div>
                  ))}
                </section>
              </>
            )}

            {stage === "loading" && (
              <section className="anim-pop grid place-items-center rounded-xl border border-line bg-card px-8 py-20 text-center">
                <span className="relative grid h-16 w-16 place-items-center">
                  <i className="absolute inset-0 rounded-full border-4 border-line" />
                  <i className="absolute inset-0 rounded-full border-4 border-transparent border-t-brand-deep" style={{ animation: "spin 0.9s linear infinite" }} />
                  <LogoMark size={30} />
                </span>
                <p className="mt-5 font-display text-lg tracking-wide text-ink">Читаем книгу Excel…</p>
                <p className="mt-1 text-[13px] text-ink-faint">разбираем листы, ищем «Свод» и «Стикер» в J2</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </section>
            )}

            {(stage === "confirm" || stage === "processing" || stage === "done") && analysis && (
              <>
                <DonorSummary a={analysis} warnNoGR={stage === "confirm" && !analysis.hasGR} />
                {stage === "confirm" && (
                  <ConfirmNoGR onYes={() => void runProcessing(analysis)} onNo={reset} />
                )}
                {stage === "processing" && <ProcessingPanel step={step} />}
                {stage === "done" && outcome && (
                  <>
                    <ReportPanel
                      o={outcome}
                      onDownload={handleDownload}
                      onReset={reset}
                      downloading={downloading}
                    />
                    <SheetPreview o={outcome} />
                  </>
                )}
              </>
            )}

            {stage === "error" && error && <ErrorCard error={error} onReset={reset} />}
          </div>
        </div>

        {/* ======= справка ======= */}
        <div className="mt-20 space-y-10">
          <div className="reveal">
            <h2 className="font-display text-[26px] tracking-wide text-ink">
              Внутренности — как в макросе, до последней заливки
            </h2>
            <p className="mt-2 max-w-[70ch] text-[14.5px] leading-relaxed text-ink-soft">
              Алгоритм перенесён построчно: те же счётчики уровней, тот же порядок удаления служебных колонок
              (H, I, J и M…R), те же формулы <span className="font-mono text-[13px]">=ROUND(кол-во×цена;2)</span>,{" "}
              <span className="font-mono text-[13px]">SUMPRODUCT</span> и итоги, та же группировка по числу точек в
              «ИД 1С» — вплоть до диалога «не найдено ГР, продолжить?».
            </p>
          </div>
          <InfoSections />
        </div>
      </main>

      {/* ======= подвал ======= */}
      <footer className="relative z-10 border-t border-white/10 bg-ink py-7 text-paper/70">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-5 text-[12.5px]">
          <span className="inline-flex items-center gap-2.5">
            <LogoMark size={24} />
            <b className="font-display tracking-wide text-paper">СВОД → 1С</b>
          </span>
          <span>перенос макроса «Стикер_1С» (VBA) в браузер · React + ExcelJS</span>
          <span className="ml-auto">
            готовый файл всегда <b className="font-mono text-brand">ИмяДонора_1С.xlsx</b>, лист «Свод»
          </span>
        </div>
      </footer>
    </div>
  );
}
