import { useEffect, useRef, useState } from "react";
import type { Outcome } from "../lib/processor";
import { money } from "../lib/processor";
import { IconDownload, IconRefresh, IconShield, IconSpark } from "./Icons";

/* ---------- плавный набег числа ---------- */
function useCountUp(target: number | null, dur = 950): string {
  const [val, setVal] = useState(0);
  const done = useRef(false);
  useEffect(() => {
    if (target == null || done.current) return;
    done.current = true;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / dur);
      setVal(target * (1 - Math.pow(1 - k, 3)));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, dur]);
  if (target == null) return "—";
  return money(done.current ? val : 0);
}

const COLS = "ABCDEFGHIJKL".split("");

/* ================= отчёт по контрольным суммам ================= */
export function ReportPanel({
  o,
  onDownload,
  onReset,
  downloading,
}: {
  o: Outcome;
  onDownload: () => void;
  onReset: () => void;
  downloading: boolean;
}) {
  const stiker = useCountUp(o.analysis.stikerNum);
  const total = useCountUp(o.totalNum);
  const diff = useCountUp(o.diff);

  const stamp =
    o.match === true
      ? { text: "СХОДИТСЯ", cls: "border-[#4fd08f] text-[#4fd08f]" }
      : o.match === false
        ? { text: "РАСХОЖДЕНИЕ", cls: "border-[#ff8a7a] text-[#ff8a7a]" }
        : { text: "НЕТ СТИКЕРА", cls: "border-[#8fa3b8] text-[#8fa3b8]" };

  return (
    <section className="anim-rise overflow-hidden rounded-xl border border-blue-deep/40 bg-ink text-paper shadow-[0_24px_60px_-28px_rgba(20,38,58,0.85)]">
      <header className="flex flex-wrap items-center gap-3 border-b border-white/10 px-6 py-4">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand text-ink">
          <IconShield size={21} />
        </span>
        <div>
          <h3 className="font-display text-lg tracking-wide">Проверочные суммы</h3>
          <p className="text-[12px] text-paper/60">
            «Стикер» из J2 донора против итога обработанного листа — как в отчёте макроса
          </p>
        </div>
        <span
          className={`anim-stamp ml-auto select-none rounded border-[3px] px-3.5 py-1.5 font-display text-[15px] tracking-[0.18em] ${stamp.cls}`}
          style={{ opacity: 0 }}
        >
          {stamp.text}
        </span>
      </header>

      <div className="grid gap-px bg-white/10 sm:grid-cols-3">
        {[
          { label: "Стикер (J2 донора)", val: stiker, note: o.analysis.stikerNum == null ? "значение не число — сравнивать не с чем" : "руб., с НДС" },
          { label: "1С (итог листа)", val: total, note: "Σ СМР + Σ ТМЦ по колонкам K и L" },
          {
            label: "Проверка (разница)",
            val: o.diff == null ? "н/д" : diff,
            note: o.diff == null ? "невозможно вычислить" : o.match ? "контрольные суммы равны" : "Стикер − 1С",
            hot: true,
          },
        ].map((b) => (
          <div key={b.label} className="bg-ink px-6 py-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-paper/50">{b.label}</p>
            <p
              className={`tnum mt-2 font-mono text-[26px] font-extrabold leading-none ${
                b.hot ? (o.match === false ? "text-[#ff8a7a]" : o.match ? "text-[#4fd08f]" : "text-paper/60") : "text-brand"
              }`}
            >
              {b.val}
            </p>
            <p className="mt-2 text-[12px] leading-snug text-paper/55">{b.note}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2.5 border-t border-white/10 px-6 py-4 text-[12px] text-paper/70">
        {[
          ["Строк в листе", String(o.stats.totalRows)],
          ["Вставлено строк КЕР", String(o.stats.insertedRows)],
          ["Групп структуры", String(o.stats.groups)],
          ["Уровней ТМЦ", String(o.stats.tmz)],
        ].map(([k, v]) => (
          <span key={k} className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5">
            {k}: <b className="tnum font-mono text-brand">{v}</b>
          </span>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-4 border-t border-white/10 bg-blue-deep/40 px-6 py-5">
        <button
          type="button"
          onClick={onDownload}
          disabled={downloading}
          className="group inline-flex items-center gap-3 rounded-lg bg-brand px-7 py-3.5 font-display text-[15px] tracking-wide text-ink shadow-[0_14px_30px_-10px_rgba(255,216,77,0.55)] transition-all hover:-translate-y-0.5 hover:bg-brand-deep active:translate-y-0 active:scale-[0.98] disabled:opacity-60"
        >
          <span className="transition-transform group-hover:translate-y-0.5">
            <IconDownload size={20} />
          </span>
          Скачать {o.analysis.outName}
        </button>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-2 rounded-lg border border-white/25 px-5 py-3.5 text-[14px] font-medium text-paper/85 transition-colors hover:border-brand hover:text-brand"
        >
          <IconRefresh size={17} /> Обработать другой файл
        </button>
        <p className="ml-auto max-w-[240px] text-[12px] leading-snug text-paper/55">
          Лист в готовом файле переименован в «Свод» — точно как делает макрос
        </p>
      </div>
    </section>
  );
}

/* ================= мини-превью листа ================= */
export function SheetPreview({ o }: { o: Outcome }) {
  const rows = o.rows;
  const maxLevel = Math.max(0, ...rows.map((r) => r.level));
  return (
    <section className="anim-rise overflow-hidden rounded-xl border border-line bg-card">
      <header className="flex flex-wrap items-center gap-3 border-b border-line bg-paper/70 px-5 py-3.5">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-blue text-white">
          <IconSpark size={19} />
        </span>
        <div>
          <h3 className="font-display text-[15px] tracking-wide text-ink">Лист «Свод» готового файла — первые строки</h3>
          <p className="text-[12px] text-ink-faint">
            Заливки и группировка ({maxLevel} ур.) воспроизведены один в один · формулы пересчитаются при открытии в Excel
          </p>
        </div>
        <span className="ml-auto hidden items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1 text-[11px] font-semibold text-ink-faint sm:inline-flex">
          <i className="h-2 w-2 rounded-sm bg-[#FF0000]" /> G — коды
          <i className="ml-2 h-2 w-2 rounded-sm bg-[#92D050]" /> 8–9 — служебные
        </span>
      </header>
      {rows.length === 0 && (
        <div className="px-6 py-12 text-center text-[14px] text-ink-faint">
          Превью построить не удалось, но сам файл готов — скачайте его и откройте в Excel.
          Подробности — в консоли браузера (F12).
        </div>
      )}
      {rows.length > 0 && (
      <div className="sheet-scroll max-h-[430px] overflow-auto">
        <table className="w-full border-collapse font-mono text-[12px]">
          <thead className="sticky top-0 z-10">
            <tr>
              <th className="sticky left-0 z-20 border-b border-r border-line bg-ink px-2 py-1.5 text-[11px] font-semibold text-brand">
                #
              </th>
              {COLS.map((c) => (
                <th key={c} className="border-b border-line bg-ink px-2.5 py-1.5 text-left text-[11px] font-semibold text-paper/70">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.n} className="group/row">
                <td
                  className="tnum sticky left-0 z-10 border-b border-r border-line bg-paper px-2 py-1 text-right text-[11px] text-ink-faint group-hover/row:bg-brand/40"
                  title={r.level ? `уровень структуры ${r.level}` : undefined}
                >
                  {r.level > 0 && (
                    <span className="mr-1 inline-block text-blue">{"·".repeat(r.level)}</span>
                  )}
                  {r.n}
                </td>
                {r.cells.map((c, i) => (
                  <td
                    key={i}
                    className={[
                      "whitespace-nowrap border-b border-r border-line/70 px-2.5 py-1 transition-colors",
                      c.b ? "font-extrabold" : "",
                      i >= 3 && i !== 7 && c.v !== "" ? "text-right" : "",
                    ].join(" ")}
                    style={{
                      backgroundColor: c.fill ? "#" + c.fill : i % 2 ? "#fafbfc" : undefined,
                      boxShadow: c.border ? "inset 0 0 0 1px #A6A6A6" : undefined,
                      color: c.fill === "FF0000" ? "#fff" : undefined,
                    }}
                  >
                    {c.v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
      <footer className="flex flex-wrap items-center gap-x-6 gap-y-1 border-t border-line bg-paper/70 px-5 py-2.5 text-[12px] text-ink-faint">
        <span>
          Итоговые строки — в конце листа: SUMPRODUCT по ценам и SUM по колонкам K/L, ниже — общий итог (ячейка L).
        </span>
        {o.rows.length < o.stats.totalRows + 3 && (
          <span className="font-semibold text-blue">
            Показаны первые {o.rows.length} строк из {o.stats.totalRows + 3} — полный лист в скачиваемом файле
          </span>
        )}
      </footer>
    </section>
  );
}

/* ================= справочные секции ================= */
export function InfoSections() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
      <section className="reveal rounded-xl border border-white/10 bg-ink p-7 text-paper">
        <h3 className="font-display text-xl tracking-wide text-brand">Палитра конвертера</h3>
        <p className="mt-1.5 text-[13px] text-paper/60">
          Заливки, которые макрос «Формат_1С» и «Нумерация_1С» ставят в готовый файл — перенесены без изменений,
          включая тематические цвета Excel для «ГР» и «Л3».
        </p>
        <ul className="mt-5 grid gap-2.5">
          {[
            ["#FF0000", "Колонка G — «Код ССР, ИД КЕР, ИД ТМЦ» (исходные коды донора)"],
            ["#92D050", "Колонки 8–9 — уровень и «Всего» донора, серая тонкая граница"],
            ["#DEEBF7", "Строки «ГР» — группы работ (Accent1, светлее 60%)"],
            ["#E2EFDA", "Строки «Л3» (Accent6, светлее 80%)"],
            ["#FFC000", "Верхняя строка «КЕР» — номер «n.» с копией наименования"],
            ["#FFFF00", "Нижняя строка «КЕР» и все строки «ТМЦ»"],
          ].map(([c, t]) => (
            <li key={c} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5">
              <i className="h-6 w-9 shrink-0 rounded border border-white/25" style={{ backgroundColor: c }} />
              <span className="text-[13px] leading-snug text-paper/85">{t}</span>
              <b className="tnum ml-auto font-mono text-[11px] text-paper/45">{c}</b>
            </li>
          ))}
        </ul>
      </section>

      <section className="reveal rounded-xl border border-line bg-card p-7" style={{ transitionDelay: "0.12s" }}>
        <h3 className="font-display text-xl tracking-wide text-ink">Что должно быть в файле-доноре</h3>
        <ul className="mt-5 space-y-4">
          {[
            ["Лист «Свод»", "Именно его конвертер берёт в работу; остальные листы книги не трогаются."],
            ["Ячейка J2 — «Стикер»", "Контрольная сумма: сравнится с итогом Σ СМР + Σ ТМЦ обработанного листа."],
            ["Колонка K — уровни", "Коды О, К, С, У, Э, Л1…Л4, ГР, КЕР, ТМЦ задают иерархию нумерации «1.2.3…»."],
            ["Колонки D, E, F", "Количество, цена СМР и цена ТМЦ за единицу — по ним строятся формулы ROUND."],
            ["Формат .xlsx / .xlsm", "Готовый файл всегда сохраняется как «ИмяДонора_1С.xlsx», лист — «Свод»."],
          ].map(([t, d], i) => (
            <li key={t} className="flex gap-3.5">
              <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md bg-ink font-display text-[12px] text-brand">
                {i + 1}
              </span>
              <span>
                <b className="block text-[14px] text-ink">{t}</b>
                <span className="mt-0.5 block text-[13px] leading-snug text-ink-faint">{d}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
