import { useState } from "react";
import type { Outcome, PreviewRow } from "../lib/processor";
import { money } from "../lib/processor";
import {
  IconDownload, IconRefresh, IconExternal, IconCopy, IconCheck, IconEye, OneCLogo,
} from "./Icons";

/* «предметные» цвета предпросмотра (дизайн-система КС-6) */
const SUBJECT_MAP: Record<string, string> = {
  FFFF00: "E2EFD9", // ТМЦ / нижняя КЕР → зелёный ТМЦ
  DEEBF7: "FFD965", // ГР → золотистый ГР
  FFC000: "FFD965", // верхняя КЕР → золотистый
  E2EFDA: "E2EFD9", // Л3 → зелёный ТМЦ
};
const mapFill = (f?: string) => (f ? SUBJECT_MAP[f] ?? f : undefined);

const COLS = "ABCDEFGHIJKL".split("");

/* ================= шаг 4 · файл 1С: суммы и скачивание ================= */
export function FileCard({
  o,
  outName,
  blobUrl,
  onDownload,
  onRebuild,
  onReset,
  downloading,
}: {
  o: Outcome;
  outName: string;
  blobUrl: string | null;
  onDownload: () => void;
  onRebuild: () => void;
  onReset: () => void;
  downloading: boolean;
}) {
  const stamp =
    o.match === true
      ? { text: "СХОДИТСЯ", cls: "text-green" }
      : o.match === false
        ? { text: "РАСХОЖДЕНИЕ", cls: "text-red" }
        : { text: "БЕЗ СТИКЕРА", cls: "text-ink-soft" };

  return (
    <section id="card-file" className="card card-hover rise scroll-mt-6 overflow-hidden" style={{ ["--d" as any]: "0.15s" }}>
      <header className="flex flex-wrap items-center gap-3.5 border-b border-line bg-green-mist px-5 py-4">
        <OneCLogo size={46} />
        <div className="min-w-0">
          <p className="label-caps">шаг 04 · файл 1С</p>
          <p className="mt-0.5 truncate font-mono text-[15px] font-semibold text-ink">{outName}</p>
          <p className="font-mono text-[11.5px] text-ink-soft">лист «Свод» · ширины колонок 11 / 50 / 11…11</p>
        </div>
        <span className={`stamp anim-stamp ml-auto ${stamp.cls}`}>{stamp.text}</span>
      </header>

      {/* контрольные суммы */}
      <div className="grid gap-px border-b border-line bg-line sm:grid-cols-3">
        {[
          { label: "Стикер · J2", val: o.analysis.stikerNum, note: "из файла-донора" },
          { label: "1С · итог", val: o.totalNum, note: "Σ СМР + Σ ТМЦ (K + L)" },
          { label: "Проверка", val: o.diff, note: o.diff == null ? "невозможно вычислить" : "Стикер − 1С", hot: true },
        ].map((b) => (
          <div key={b.label} className="bg-white px-5 py-4">
            <p className="label-caps">{b.label}</p>
            <p
              className={[
                "tnum mt-1.5 font-mono text-[23px] font-bold leading-none",
                b.hot ? (o.match === false ? "text-red" : o.match ? "text-green" : "text-ink-soft") : "text-ink",
              ].join(" ")}
            >
              {money(b.val)}
              <span className="ml-1.5 text-[11.5px] font-medium text-ink-soft">руб.</span>
            </p>
            <p className="mt-1.5 font-mono text-[11px] text-ink-soft">{b.note}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2.5 px-5 py-4">
        <button type="button" onClick={onDownload} disabled={downloading || !blobUrl} className="btn btn-primary pulse-download">
          <IconDownload size={17} /> Скачать файл
        </button>
        {blobUrl && (
          <a
            href={blobUrl}
            target="_blank"
            rel="noreferrer"
            download={outName}
            className="btn btn-ghost"
          >
            <IconExternal size={15} /> открыть в новой вкладке
          </a>
        )}
        <div className="ml-auto flex gap-2.5">
          <button type="button" onClick={onRebuild} className="btn btn-ghost btn-sm" title="Перечитать источник и собрать файл заново — результат не дублируется">
            <IconRefresh size={14} /> Пересобрать
          </button>
          <button type="button" onClick={onReset} className="btn btn-ghost btn-sm">
            Другой донор
          </button>
        </div>
      </div>
      <p className="border-t border-dashed border-line bg-green-mist px-5 py-2.5 font-mono text-[11.5px] text-ink-soft">
        ◆ повторная сборка перечитывает исходник и не дублирует результат · формулы пересчитаются при открытии в Excel
      </p>
    </section>
  );
}

/* ================= мини-Excel предпросмотр ================= */
function MiniPreview({ rows, flashKey }: { rows: PreviewRow[]; flashKey: string }) {
  return (
    <div className="scroll-slim max-h-[340px] overflow-auto rounded-[8px] border border-line">
      <table key={flashKey} className="w-full border-collapse font-mono text-[11px]">
        <thead className="sticky top-0 z-10">
          <tr>
            <th className="sticky left-0 z-20 border-b border-r border-[#b9c2b9] bg-[#d8d8d8] px-1.5 py-1 text-[10px] font-semibold text-ink-soft">
              #
            </th>
            {COLS.map((c) => (
              <th key={c} className="border-b border-r border-[#b9c2b9] bg-[#d8d8d8] px-2 py-1 text-left text-[10px] font-semibold text-ink-soft">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.n} className="group/row">
              <td
                className="tnum sticky left-0 z-10 border-b border-r border-line bg-paper px-1.5 py-[3px] text-right text-[10px] text-ink-soft group-hover/row:bg-green-soft"
                title={r.level ? `уровень структуры ${r.level}` : undefined}
              >
                {r.level > 0 && <span className="mr-0.5 text-green">{"·".repeat(r.level)}</span>}
                {r.n}
              </td>
              {r.cells.map((c, i) => {
                const fill = mapFill(c.fill);
                return (
                  <td
                    key={i}
                    className="cellflash whitespace-nowrap border-b border-r border-line/70 px-2 py-[3px]"
                    style={{
                      backgroundColor: fill ? "#" + fill : undefined,
                      boxShadow: c.border ? "inset 0 0 0 1px #A6A6A6" : undefined,
                      color: fill === "FF0000" ? "#fff" : undefined,
                      fontWeight: c.b ? 700 : undefined,
                      ["--d" as any]: `${Math.min((r.n * 12 + i) * 14, 700)}ms`,
                    }}
                  >
                    {c.v}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const LEGEND = [
  ["#D8D8D8", "заголовок листа"],
  ["#FFD965", "ГР · группы работ"],
  ["#E2EFD9", "ТМЦ · материалы"],
  ["#FF0000", "колонка G · коды"],
  ["#92D050", "колонки 8–9 · служебные"],
];

export function PreviewSidebar({ o, outName }: { o: Outcome | null; outName: string }) {
  return (
    <div className="card p-4">
      <header className="mb-3 flex items-center gap-2">
        <IconEye size={17} className="text-green" />
        <div>
          <p className="font-display text-[13px] font-semibold leading-tight tracking-tight text-ink">
            Предпросмотр листа
          </p>
          <p className="font-mono text-[10.5px] text-ink-soft">{o ? outName + " · «Свод»" : "появится после обработки"}</p>
        </div>
      </header>

      {o ? (
        <>
          <MiniPreview rows={o.rows} flashKey={outName + o.stats.totalRows} />
          <p className="mt-2 font-mono text-[10.5px] leading-relaxed text-ink-soft">
            первые {o.rows.length} строк из {o.stats.totalRows + 3} · группировка: {o.stats.groups} групп
          </p>
        </>
      ) : (
        <div className="grid h-[180px] place-items-center rounded-[8px] border border-dashed border-line bg-green-mist text-center">
          <div>
            <p className="font-mono text-[12px] text-ink-soft">A1:L…</p>
            <p className="mt-1 text-[12px] text-ink-soft">сетка перерисуется</p>
            <p className="text-[12px] text-ink-soft">и «вспыхнет» после шага 03</p>
          </div>
        </div>
      )}

      <div className="mt-3 border-t border-dashed border-line pt-3">
        <p className="label-caps mb-2">Легенда заливок</p>
        <ul className="grid gap-1.5">
          {LEGEND.map(([c, t]) => (
            <li key={c} className="flex items-center gap-2 text-[11.5px] text-ink-soft">
              <i className="h-3.5 w-5 shrink-0 rounded-[3px] border border-ink/15" style={{ backgroundColor: c }} />
              {t}
              <b className="ml-auto font-mono text-[10px] font-medium text-ink-soft/80">{c}</b>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ================= карточки формул с копированием ================= */
async function copyText(t: string) {
  try {
    await navigator.clipboard.writeText(t);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = t;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
}

export function FormulaCards({ o }: { o: Outcome }) {
  const [copied, setCopied] = useState<string | null>(null);
  const n = o.stats.totalRows;
  const t = n + 2;
  const items = [
    { key: "smr", name: "СМР по строке", count: n, addr: `K2:K${n + 1}`, f: "=ROUND(D2*E2;2)" },
    { key: "tmz", name: "ТМЦ по строке", count: n, addr: `L2:L${n + 1}`, f: "=ROUND(D2*F2;2)" },
    { key: "sp", name: "Итог по ценам", count: 2, addr: `E${t} · F${t}`, f: `=SUMPRODUCT(D2:D${n};E2:E${n})` },
    { key: "sum", name: "Суммы колонок", count: 2, addr: `K${t} · L${t}`, f: `=SUM(K2:K${n})` },
    { key: "grand", name: "Общий итог", count: 1, addr: `L${t + 1}`, f: `=K${t}+L${t}` },
  ];
  const onCopy = async (key: string, f: string) => {
    await copyText(f);
    setCopied(key);
    window.setTimeout(() => setCopied((c) => (c === key ? null : c)), 1200);
  };
  return (
    <section className="card card-hover rise p-4" style={{ ["--d" as any]: "0.2s" }}>
      <header className="mb-3 flex items-center gap-2">
        <p className="font-display text-[13px] font-semibold tracking-tight text-ink">Формулы файла</p>
        <span className="chip-mono ml-auto">Σ {n * 2 + 5}</span>
      </header>
      <ul className="grid gap-2">
        {items.map((it) => (
          <li key={it.key} className="rounded-[8px] border border-line bg-white px-3 py-2.5 transition-colors hover:border-green/50">
            <div className="flex items-center gap-2">
              <span className="text-[12.5px] font-semibold text-ink">{it.name}</span>
              <span className="chip-mono !px-1.5 !py-0 !text-[10.5px]">×{it.count}</span>
              <span className="ml-auto font-mono text-[10.5px] text-ink-soft">{it.addr}</span>
              <button
                type="button"
                onClick={() => void onCopy(it.key, it.f)}
                aria-label={`Скопировать ${it.f}`}
                className={[
                  "grid h-6 w-6 place-items-center rounded-[6px] border transition-all",
                  copied === it.key
                    ? "border-green bg-green text-white"
                    : "border-line text-ink-soft hover:border-green hover:text-green",
                ].join(" ")}
              >
                {copied === it.key ? <IconCheck size={12} /> : <IconCopy size={12} />}
              </button>
            </div>
            <p className="mt-1 font-mono text-[11.5px] text-green-deep">{it.f}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ================= нижние справочные секции ================= */
const MACRO_PALETTE = [
  ["#FF0000", "Interior.Color = 255", "колонка G — «Код ССР, ИД КЕР, ИД ТМЦ»"],
  ["#92D050", "Interior.Color = 5296274", "колонки 8–9 — уровень и «Всего» + серая граница"],
  ["#DEEBF7", "Accent1, светлее 60%", "строки «ГР» — группы работ"],
  ["#E2EFDA", "Accent6, светлее 80%", "строки «Л3»"],
  ["#FFC000", "Interior.Color = 49407", "верхняя строка «КЕР»"],
  ["#FFFF00", "Interior.Color = 65535", "нижняя строка «КЕР» и строки «ТМЦ»"],
];

export function PaletteSection() {
  return (
    <section className="card card-hover reveal p-6">
      <p className="label-caps">Формат_1С · палитра макроса</p>
      <h3 className="mt-1.5 font-display text-[18px] font-semibold tracking-tight text-ink">
        Заливки — один в один с VBA
      </h3>
      <p className="mt-1.5 max-w-[62ch] text-[13px] leading-relaxed text-ink-soft">
        В скачиваемый файл записываются точные цвета макроса, включая тематические цвета Excel для «ГР» и «Л3».
        В предпросмотре справа они показаны предметной палитрой дизайн-системы.
      </p>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {MACRO_PALETTE.map(([c, code, t]) => (
          <li key={c} className="flex items-center gap-3 rounded-[8px] border border-line bg-white px-3.5 py-2.5 transition-colors hover:border-green/50">
            <i className="h-7 w-10 shrink-0 rounded-[5px] border border-ink/15" style={{ backgroundColor: c }} />
            <span className="min-w-0">
              <b className="block truncate text-[12.5px] text-ink">{t}</b>
              <span className="font-mono text-[10.5px] text-ink-soft">{code}</span>
            </span>
            <b className="ml-auto font-mono text-[10.5px] text-ink-soft">{c}</b>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function RequirementsSection() {
  return (
    <section className="card card-hover reveal p-6" style={{ transitionDelay: "0.1s" }}>
      <p className="label-caps">входные данные</p>
      <h3 className="mt-1.5 font-display text-[18px] font-semibold tracking-tight text-ink">
        Что должно быть в доноре
      </h3>
      <ul className="mt-4 space-y-3.5">
        {[
          ["Лист «Свод»", "берётся в работу; остальные листы книги не трогаются"],
          ["J2 — «Стикер»", "контрольная сумма: сверяется с итогом Σ СМР + Σ ТМЦ"],
          ["K — уровни", "О, К, С, У, Э, Л1…Л4, ГР, КЕР, ТМЦ задают иерархию «1.2.3…»"],
          ["D, E, F", "количество и цены СМР / ТМЦ за единицу — основа формул ROUND"],
          [".xlsx / .xlsm", "готовый файл — «ИмяДонора_1С.xlsx», лист «Свод»"],
        ].map(([t, d], i) => (
          <li key={t} className="flex gap-3">
            <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-[6px] bg-green font-display text-[11px] font-semibold text-white">
              {i + 1}
            </span>
            <span className="min-w-0">
              <b className="block text-[13.5px] text-ink">{t}</b>
              <span className="text-[12.5px] leading-snug text-ink-soft">{d}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
