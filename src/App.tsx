import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type * as ExcelJS from "exceljs";
import { getExcelJS } from "./lib/excel";
import { analyzeDonor, processWorkbook, money } from "./lib/processor";
import type { Analysis, Outcome } from "./lib/processor";
import { buildSampleDonor, SAMPLE_FILE_NAME } from "./lib/sample";
import {
  WizardRail, BookCard, ControlCard, JournalCard, ErrorPanel,
  WIZARD_ICONS,
} from "./components/Workflow";
import type { Stage, ErrorInfo, WizardStep } from "./components/Workflow";
import {
  FileCard, PreviewSidebar, FormulaCards, PaletteSection, RequirementsSection,
} from "./components/Results";
import { DonorLogo, OneCLogo, IconGlobe } from "./components/Icons";

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

export function errText(e: unknown): string {
  const msg = (e as any)?.message ? String((e as any).message) : String(e ?? "Неизвестная ошибка");
  const stack = (e as any)?.stack ? String((e as any).stack) : "";
  const tail = stack && !stack.includes(msg) ? "\n" + stack.split("\n").slice(1, 4).join("\n") : "";
  return (msg + tail).slice(0, 600);
}

/* страховка от «белого экрана» */
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
          <div className="card max-w-xl p-7">
            <p className="font-display text-[17px] font-semibold tracking-tight text-red">Интерфейс споткнулся</p>
            <p className="mt-2 break-words font-mono text-[12.5px] leading-relaxed text-ink-soft">{this.state.err}</p>
            <button type="button" onClick={() => location.reload()} className="btn btn-primary btn-sm mt-5">
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

const sanitizeName = (v: string) => v.trim().replace(/\.xlsx$/i, "") + ".xlsx";

function AppInner() {
  const [stage, setStage] = useState<Stage>("idle");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [error, setError] = useState<ErrorInfo | null>(null);
  const [step, setStep] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [demoBusy, setDemoBusy] = useState(false);
  const [fileMeta, setFileMeta] = useState<{ name: string; size: number } | null>(null);
  const [outName, setOutName] = useState("");
  const [grAnswer, setGrAnswer] = useState<null | "yes">(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
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

  const revokeBlob = useCallback((url: string | null) => {
    if (url) setTimeout(() => URL.revokeObjectURL(url), 4000);
  }, []);

  const reset = useCallback(() => {
    wbRef.current = null;
    setAnalysis(null);
    setOutcome(null);
    setError(null);
    setStep(0);
    setFileMeta(null);
    setOutName("");
    setGrAnswer(null);
    setBlobUrl((u) => {
      revokeBlob(u);
      return null;
    });
    setStage("idle");
  }, [revokeBlob]);

  const runProcessing = useCallback(
    async (a: Analysis, name: string) => {
      setStage("processing");
      setStep(0);
      await nextFrame();
      await delay(380);
      let out: Outcome;
      try {
        out = await processWorkbook(wbRef.current!, a);
        out.analysis = { ...out.analysis, outName: name };
        const buf = await out.outWorkbook.xlsx.writeBuffer();
        const blob = new Blob([buf], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        const url = URL.createObjectURL(blob);
        setBlobUrl((old) => {
          revokeBlob(old);
          return url;
        });
      } catch (e: any) {
        // eslint-disable-next-line no-console
        console.error("СВОД→1С: сбой при обработке файла", e);
        setError({
          title: "Сбой на этапе «обработка»",
          detail: errText(e) + "\n\nЕсли лист «Свод» точно на месте — текст выше поможет найти причину.",
        });
        setStage("error");
        return;
      }
      setOutcome(out);
      for (let s = 0; s < 4; s++) {
        setStep(s);
        await delay(460);
      }
      setStep(4);
      setStage("done");
    },
    [revokeBlob]
  );

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setOutcome(null);
      setGrAnswer(null);
      setBlobUrl((u) => {
        revokeBlob(u);
        return null;
      });
      if (!/\.(xlsx|xlsm)$/i.test(file.name)) {
        setError({
          title: "Неподходящий формат файла",
          detail: `«${file.name}»: нужен .xlsx или .xlsm. Старые .xls и .xlsb браузерная библиотека не читает — пересохраните книгу в Excel как .xlsx.`,
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
        setFileMeta({ name: file.name, size: file.size });
        setOutName(a.outName);
        setStage("review");
      } catch (e: any) {
        // eslint-disable-next-line no-console
        console.error("СВОД→1С: не удалось открыть файл", e);
        if (e?.kind === "no-sheet") {
          setError({ title: "Лист «Свод» не найден", detail: String(e.message) });
        } else {
          setError({
            title: "Не удалось открыть книгу",
            detail: "Файл повреждён, защищён паролём или не является книгой Excel (.xlsx/.xlsm).\nТехнические детали: " + errText(e),
          });
        }
        setStage("error");
      }
    },
    [revokeBlob]
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

  const handleDownload = useCallback(() => {
    if (!blobUrl || !outName || downloading) return;
    setDownloading(true);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = sanitizeName(outName);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => setDownloading(false), 700);
  }, [blobUrl, outName, downloading]);

  /* ---------- журнал ---------- */
  const journalLines = useMemo(() => {
    if (!analysis) return [] as string[];
    const base = [
      `книга: ${analysis.fileName} · лист «Свод» · ${analysis.dataRows} строк данных`,
      `стикер: J2 = ${analysis.stikerNum != null ? money(analysis.stikerNum) : String(analysis.stikerRaw)} руб.`,
    ];
    if (!outcome) return base;
    const s = outcome.stats;
    return [
      ...base,
      `Нумерация_1С: ${s.totalRows} строк · +${s.insertedRows} вставок «КЕР»`,
      `колонки: удалены H, I, J, M…R`,
      `Сквозные_формулы_1С: ${s.totalRows * 2 + 5} формул · ROUND / SUMPRODUCT / SUM`,
      `Формат_1С: заливки G · 8–9 · серая граница · «0_ ;-0 »`,
      `Группировка_1С: ${s.groups} групп · сводка сверху`,
      `сборка: ${sanitizeName(outName)} · лист «Свод» · ОК`,
    ];
  }, [analysis, outcome, outName]);

  const journalVisible = stage === "done" ? journalLines.length : Math.min(2 + step, journalLines.length);

  /* ---------- рельса ---------- */
  const currentIdx =
    stage === "idle" || stage === "loading" ? 0 : stage === "review" ? 1 : stage === "processing" ? 2 : stage === "error" ? (analysis ? (outcome ? 3 : 2) : 0) : 3;
  const steps: WizardStep[] = useMemo(
    () =>
      [
        { id: "card-book", n: "01", title: "Книга", desc: "файл-донор Excel", icon: WIZARD_ICONS.IconSheet },
        { id: "card-control", n: "02", title: "Контроль", desc: "Стикер, уровни, имя файла", icon: WIZARD_ICONS.IconShield },
        { id: "card-journal", n: "03", title: "Обработка", desc: "журнал операций макроса", icon: WIZARD_ICONS.IconSigma },
        { id: "card-file", n: "04", title: "Файл 1С", desc: "суммы и скачивание", icon: WIZARD_ICONS.IconDownload },
      ].map((s, i) => ({
        ...s,
        state: (i < currentIdx || stage === "done" ? "done" : i === currentIdx ? "current" : "locked") as WizardStep["state"],
      })),
    [currentIdx, stage]
  );
  const onJump = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const showControl = !!analysis && (stage === "review" || stage === "processing" || stage === "done");
  const showJournal = stage === "processing" || stage === "done";

  return (
    <div className="relative min-h-screen overflow-x-clip">
      <div className="bg-lights" aria-hidden />

      {/* ======= шапка ======= */}
      <header className="relative z-10 border-b-2 border-ink/85 bg-paper/70">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-5 py-3.5">
          <DonorLogo size={38} />
          <div className="min-w-0">
            <p className="font-display text-[19px] font-bold leading-none tracking-tight text-ink">
              Стикер в <span className="text-green">1С</span>
            </p>
            <p className="mt-1 text-[11.5px] leading-none text-ink-soft">
              мастер конвертации сметного листа · перенос макроса «Стикер_1С»
            </p>
          </div>
          <OneCLogo size={38} />
          <span className="ml-auto inline-flex items-center gap-2 rounded-[8px] border border-line bg-white px-3 py-2 font-mono text-[11.5px] text-ink-soft shadow-[2px_3px_0_rgba(21,38,32,0.06)]">
            <IconGlobe size={15} className="text-green" />
            всё считается локально — файлы не покидают компьютер
          </span>
        </div>
      </header>

      {/* ======= каркас: рельса · карточки · предпросмотр ======= */}
      <main className="relative z-10 mx-auto max-w-6xl px-5 pb-16 pt-7">
        <div className="grid gap-6 lg:grid-cols-[218px_minmax(0,1fr)] xl:grid-cols-[218px_minmax(0,1fr)_292px]">
          {/* рельса мастера */}
          <aside className="order-2 lg:order-1">
            <div className="card p-4 lg:sticky lg:top-5">
              <p className="label-caps mb-3.5">Мастер · 4 шага</p>
              <WizardRail steps={steps} onJump={onJump} />
            </div>
          </aside>

          {/* карточки этапов */}
          <div className="order-1 space-y-5 lg:order-2">
            <BookCard
              stage={stage}
              fileMeta={fileMeta}
              analysis={analysis}
              onFile={(f) => void handleFile(f)}
              onDemo={() => void handleDemo()}
              busy={demoBusy}
              onReplace={reset}
            />

            {showControl && analysis && (
              <ControlCard
                a={analysis}
                stage={stage}
                outName={outName}
                onOutName={setOutName}
                grAnswer={grAnswer}
                onGrYes={() => setGrAnswer("yes")}
                onGrNo={reset}
                onStart={() => void runProcessing(analysis, sanitizeName(outName))}
              />
            )}

            {showJournal && (
              <JournalCard lines={journalLines} visible={journalVisible} running={stage === "processing"} />
            )}

            {stage === "done" && outcome && (
              <>
                <FileCard
                  o={outcome}
                  outName={sanitizeName(outName)}
                  blobUrl={blobUrl}
                  onDownload={handleDownload}
                  onRebuild={() => void runProcessing(analysis!, sanitizeName(outName))}
                  onReset={reset}
                  downloading={downloading}
                />
                {/* предпросмотр под карточками на экранах без сайдбара */}
                <div className="xl:hidden">
                  <PreviewSidebar o={outcome} outName={sanitizeName(outName)} />
                </div>
                <FormulaCards o={outcome} />
              </>
            )}

            {stage === "error" && error && <ErrorPanel error={error} onRetry={reset} />}
          </div>

          {/* sticky-предпросмотр */}
          <aside className="order-3 hidden xl:block">
            <div className="sticky top-5 space-y-4">
              <PreviewSidebar o={outcome} outName={sanitizeName(outName)} />
            </div>
          </aside>
        </div>

        {/* ======= справка ======= */}
        <div className="mt-14 space-y-5">
          <div className="reveal">
            <p className="label-caps">внутренности</p>
            <h2 className="mt-1 font-display text-[22px] font-semibold tracking-tight text-ink">
              Как в макросе — до последней заливки
            </h2>
            <p className="mt-2 max-w-[72ch] text-[13.5px] leading-relaxed text-ink-soft">
              Алгоритм перенесён построчно: те же счётчики уровней, тот же порядок удаления служебных колонок
              (H, I, J и M…R), те же формулы <span className="font-mono text-[12.5px] text-ink">=ROUND(кол-во×цена;2)</span>,{" "}
              <span className="font-mono text-[12.5px] text-ink">SUMPRODUCT</span> и итоги, та же группировка по числу
              точек в «ИД 1С» — вплоть до диалога «не найдено ГР, продолжить?». Ширины колонок готового файла: 11 · 50 · 11…11.
            </p>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <PaletteSection />
            <RequirementsSection />
          </div>
        </div>
      </main>

      {/* ======= подвал ======= */}
      <footer className="relative z-10 border-t border-line bg-paper/80 py-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-5 font-mono text-[11.5px] text-ink-soft">
          <span className="inline-flex items-center gap-2">
            <DonorLogo size={22} />
            <b className="font-display text-[12px] tracking-tight text-ink">Стикер в 1С</b>
            <OneCLogo size={22} />
          </span>
          <span>перенос макроса «Стикер_1С» (VBA) · React + ExcelJS</span>
          <span className="ml-auto">
            готовый файл — <b className="text-green-deep">ИмяДонора_1С.xlsx</b>, лист «Свод»
          </span>
        </div>
      </footer>
    </div>
  );
}
