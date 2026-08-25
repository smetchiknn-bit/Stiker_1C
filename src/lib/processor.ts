import type * as ExcelJS from "exceljs";
import { getExcelJS } from "./excel";

/* ============================================================================
 *  СВОД → 1С: точный перенос VBA-макроса «Стикер_1С» в браузер.
 *  Последовательность (как в макросе):
 *    1) анализ донора: лист «Свод», значение «Стикер» (J2), наличие «ГР» в колонке K;
 *    2) Нумерация_1С — иерархическая нумерация по уровням О,К,С,У,Э,Л1..Л4,ГР,
 *       разбиение строк «КЕР» на две, перенос значений;
 *    3) удаление служебных колонок (исходные H,I,J,M,N,O,P,Q,R);
 *    4) Сквозные_формулы_1С — ROUND(кол-во × цена) и итоги SUMPRODUCT/SUM;
 *    5) Формат_1С — заливки, границы, числовые форматы;
 *    6) группировка_1С — уровни структуры по числу точек в «ИД 1С»;
 *    7) новый файл: лист «Свод», контрольные суммы (Стикер против итога 1С).
 * ==========================================================================*/

export type Raw = string | number | boolean | Date | null;

/* ---------- цветовые константы макроса ---------- */
export const FILL_RED = "FF0000"; // Interior.Color = 255 (колонка G)
export const FILL_GREEN = "92D050"; // Interior.Color = 5296274 (колонки 8-9)
export const FILL_GOLD = "FFC000"; // 49407 — верхняя строка КЕР
export const FILL_YELLOW = "FFFF00"; // 65535 — строка ТМЦ и нижняя строка КЕР
export const FILL_GR = { theme: 4, tint: 0.599993896298105 }; // Accent1 Lighter 60%
export const FILL_L3 = { theme: 9, tint: 0.799981688894314 }; // Accent6 Lighter 80%
export const FILL_GR_HEX = "DEEBF7"; // для превью (тема Office по умолчанию)
export const FILL_L3_HEX = "E2EFDA";
export const BORDER_GRAY = { theme: 1, tint: -0.349986266670736 };

/* исходные колонки, удаляемые в конце Нумерация_1С:
   трижды Columns(8).Delete → H,I,J; затем 6 раз Columns(10).Delete → M,N,O,P,Q,R */
const DELETED = new Set([8, 9, 10, 13, 14, 15, 16, 17, 18]);

/* ---------- типы ---------- */
interface CellData {
  v: Raw;
  style?: any;
  fill?: string; // макрос-заливка (hex)
  fillT?: { theme: number; tint: number }; // макрос-заливка (тема)
  gBorder?: boolean; // серая тонкая граница (колонки 8-9)
  numFmt?: string;
  hAlign?: "left";
  f?: string; // формула (A1-стиль, без "=")
  fr?: number; // закэшированный результат формулы
}
type Row = Map<number, CellData>;

export interface MergeRect {
  r1: number;
  c1: number;
  r2: number;
  c2: number;
}

export interface Analysis {
  fileName: string;
  baseName: string;
  outName: string;
  sheetNames: string[];
  dataRows: number;
  stikerRaw: Raw;
  stikerNum: number | null;
  hasGR: boolean;
  levelCounts: Record<string, number>;
}

export interface PreviewCell {
  v: string;
  fill?: string;
  b?: boolean;
  border?: boolean;
}
export interface PreviewRow {
  n: number;
  level: number;
  cells: PreviewCell[];
}

export interface Outcome {
  analysis: Analysis;
  outWorkbook: ExcelJS.Workbook;
  totalNum: number;
  diff: number | null;
  match: boolean | null;
  rows: PreviewRow[];
  cols: number[];
  stats: {
    totalRows: number;
    insertedRows: number;
    groups: number;
    ker: number;
    tmz: number;
  };
}

/* ---------- утилиты ---------- */
const round2 = (x: number) => Math.round((x + Number.EPSILON) * 100) / 100;

export function money(n: number | null | undefined): string {
  if (n == null || !isFinite(n)) return "—";
  const abs = new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(n));
  return (n < 0 ? "-" : "") + abs;
}

export function num(v: Raw): number {
  if (typeof v === "number") return isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = parseFloat(v.replace(/\s|\u00a0/g, "").replace(",", "."));
    return isFinite(n) ? n : 0;
  }
  return 0;
}

function toNumericOrNull(v: Raw): number | null {
  // аналог VBA IsNumeric для отчёта
  if (typeof v === "number") return isFinite(v) ? v : null;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v.trim().replace(/\s|\u00a0/g, "").replace(",", "."));
    return isFinite(n) ? n : null;
  }
  return null;
}

function effectiveValue(v: ExcelJS.CellValue | null | undefined): Raw {
  if (v == null) return null;
  if (v instanceof Date) return v;
  if (typeof v === "object") {
    const o = v as any;
    if ("formula" in o || "sharedFormula" in o) return effectiveValue(o.result);
    if ("richText" in o && Array.isArray(o.richText))
      return o.richText.map((t: any) => t.text).join("");
    if ("error" in o) return String(o.error);
    if ("text" in o) return typeof o.text === "string" ? o.text : null;
    return null;
  }
  return v;
}

function isEmptyV(v: Raw | undefined): boolean {
  return v == null || v === "";
}

export function disp(v: Raw): string {
  if (v == null || v === "") return "";
  if (v instanceof Date)
    return v.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
  if (typeof v === "number")
    return v.toLocaleString("ru-RU", { maximumFractionDigits: 2 });
  if (typeof v === "boolean") return v ? "ИСТИНА" : "ЛОЖЬ";
  return String(v);
}

const OFFICE_THEME = [
  "FFFFFF", "000000", "E7E6E6", "44546A", "4472C4",
  "ED7D31", "A5A5A5", "FFC000", "5B9BD5", "70AD47",
];
function themeToHex(idx: number, tint?: number): string {
  const base = OFFICE_THEME[idx] ?? "FFFFFF";
  if (!tint) return base;
  const c = [0, 2, 4].map((i) => parseInt(base.slice(i, i + 2), 16));
  const target = tint > 0 ? 255 : 0;
  const t = Math.abs(tint);
  return c.map((x) => Math.round(x + (target - x) * t).toString(16).padStart(2, "0")).join("").toUpperCase();
}

function styleFillHex(style: any): string | undefined {
  const f = style?.fill;
  if (!f || f.pattern !== "solid" || !f.fgColor) return undefined;
  if (f.fgColor.argb) {
    const a = String(f.fgColor.argb);
    return (a.length === 8 ? a.slice(2) : a).toUpperCase();
  }
  if (typeof f.fgColor.theme === "number") return themeToHex(f.fgColor.theme, f.fgColor.tint);
  return undefined;
}

function findSheet(wb: ExcelJS.Workbook, name: string): ExcelJS.Worksheet | undefined {
  const lower = name.trim().toLowerCase();
  let found: ExcelJS.Worksheet | undefined;
  wb.eachSheet((ws) => {
    if (!found && ws.name.trim().toLowerCase() === lower) found = ws;
  });
  return found;
}

function baseNameOf(fileName: string): string {
  const i = fileName.lastIndexOf(".");
  return i > 0 ? fileName.slice(0, i) : fileName;
}

/* ---------- 1. анализ донора ---------- */
export function analyzeDonor(wb: ExcelJS.Workbook, fileName: string): Analysis {
  const sheetNames = wb.worksheets.map((w) => w.name);
  const ws = findSheet(wb, "Свод");
  if (!ws) {
    const err: any = new Error(
      `Лист «Свод» не найден в файле-доноре.${
        sheetNames.length ? " Листы в файле: " + sheetNames.join(", ") + "." : " В книге нет листов."
      }`
    );
    err.kind = "no-sheet";
    throw err;
  }

  const lastRowK = lastNonEmptyRowOf(ws, 11);
  const lastRowA = lastNonEmptyRowOf(ws, 1);

  const stikerRaw = effectiveValue(ws.getCell(2, 10).value); // J2

  let hasGR = false;
  const levelCounts: Record<string, number> = {};
  for (let r = 2; r <= lastRowK; r++) {
    const v = effectiveValue(ws.getCell(r, 11).value);
    if (typeof v === "string" && v !== "") {
      levelCounts[v] = (levelCounts[v] || 0) + 1;
      if (v === "ГР") hasGR = true;
    }
  }

  return {
    fileName,
    baseName: baseNameOf(fileName),
    outName: baseNameOf(fileName) + "_1С.xlsx",
    sheetNames,
    dataRows: Math.max(lastRowA - 1, 0),
    stikerRaw,
    // как в макросе: пустой J2 считается нулём
    stikerNum: stikerRaw == null || stikerRaw === "" ? 0 : toNumericOrNull(stikerRaw),
    hasGR,
    levelCounts,
  };
}

function lastNonEmptyRowOf(ws: ExcelJS.Worksheet, col: number): number {
  let last = 1;
  const total = ws.rowCount;
  for (let r = 1; r <= total; r++) {
    if (!isEmptyV(effectiveValue(ws.getCell(r, col).value))) last = r;
  }
  return last;
}

/* ---------- доступ к сетке ---------- */
function cell(row: Row | undefined, c: number): CellData | undefined {
  return row?.get(c);
}
function val(grid: Row[], r: number, c: number): Raw {
  return cell(grid[r - 1], c)?.v ?? null;
}
function setV(row: Row, c: number, v: Raw): CellData {
  const ex = row.get(c);
  if (ex) {
    ex.v = v;
    return ex;
  }
  const cd: CellData = { v };
  row.set(c, cd);
  return cd;
}
function fillRow(row: Row, hex: string) {
  for (let c = 1; c <= 7; c++) {
    const cd = row.get(c) ?? row.set(c, { v: null }).get(c)!;
    cd.fill = hex;
    cd.fillT = undefined;
  }
}
function fillRowTheme(row: Row, t: { theme: number; tint: number }) {
  for (let c = 1; c <= 7; c++) {
    const cd = row.get(c) ?? row.set(c, { v: null }).get(c)!;
    cd.fillT = t;
    cd.fill = undefined;
  }
}
function lastNonEmpty(grid: Row[], c: number): number {
  let last = 1;
  for (let r = 0; r < grid.length; r++) {
    if (!isEmptyV(cell(grid[r], c)?.v)) last = r + 1;
  }
  return last;
}

/* ---------- 2. Нумерация_1С ---------- */
const HIERARCHY: { code: string; resets: string[] }[] = [
  { code: "О", resets: ["К", "С", "У", "Э", "Л1", "Л2", "Л3", "Л4", "ГР", "КЕР", "ТМЦ"] },
  { code: "К", resets: ["С", "У", "Э", "Л1", "Л2", "Л3", "Л4", "ГР", "КЕР", "ТМЦ"] },
  { code: "С", resets: ["У", "Э", "Л1", "Л2", "Л3", "Л4", "ГР", "КЕР", "ТМЦ"] },
  { code: "У", resets: ["Э", "Л1", "Л2", "Л3", "Л4", "ГР", "КЕР", "ТМЦ"] },
  { code: "Э", resets: ["Л1", "Л2", "Л3", "Л4", "ГР", "КЕР", "ТМЦ"] },
  { code: "Л1", resets: ["Л2", "Л3", "Л4", "ГР", "КЕР", "ТМЦ"] },
  { code: "Л2", resets: ["Л3", "Л4", "ГР", "КЕР", "ТМЦ"] },
  { code: "Л3", resets: ["Л4", "ГР", "КЕР", "ТМЦ"] },
  { code: "Л4", resets: ["ГР", "КЕР", "ТМЦ"] },
  { code: "ГР", resets: ["КЕР", "ТМЦ"] },
];

function runNumbering(grid: Row[], inserts: number[]): { inserted: number; nElemets: number } {
  const cnt: Record<string, number> = {
    О: 0, К: 0, С: 0, У: 0, Э: 0, Л1: 0, Л2: 0, Л3: 0, Л4: 0, ГР: 0, КЕР: 0, ТМЦ: 0,
  };
  const r: string[] = new Array(12).fill("");
  let inserted = 0;

  const lastRowA0 = lastNonEmpty(grid, 1);
  let y = 0;
  for (let rr = 2; rr <= lastRowA0; rr++) {
    if (val(grid, rr, 11) === "КЕР") y++;
  }
  const nElemets = lastRowA0 + y + 1; // как в макросе: nElemets = nElemets + y + 1

  for (let i = 1; i <= nElemets; i++) {
    const g = i; // индекс сетки для строки Excel i+1
    while (grid.length <= g) grid.push(new Map());
    const row = grid[g];

    // Cells(i+1, 7) = Cells(i+1, 1) — исходный код уходит в колонку G
    setV(row, 7, cell(row, 1)?.v ?? null);

    const code = cell(row, 11)?.v;
    const codeS = typeof code === "string" ? code : null;
    if (!codeS) continue;

    const h = HIERARCHY.find((x) => x.code === codeS);
    if (h) {
      cnt[codeS] += 1;
      const idx = HIERARCHY.indexOf(h);
      r[idx] = cnt[codeS] + ".";
      for (const rc of h.resets) cnt[rc] = 0;
      const hasB = !isEmptyV(cell(row, 2)?.v);
      if (hasB) setV(row, 1, r.slice(0, idx + 1).join(""));
      if (codeS === "Л3") fillRowTheme(row, FILL_L3);
      if (codeS === "ГР") fillRowTheme(row, FILL_GR);
    } else if (codeS === "КЕР") {
      cnt["ТМЦ"] = 0;
      // Rows(i+1).Insert — новая строка выше исходной строки КЕР
      grid.splice(g, 0, new Map());
      inserts.push(g + 1); // номер новой строки в терминах Excel
      inserted++;
      const top = grid[g];
      const src = grid[g + 1];
      setV(top, 2, cell(src, 2)?.v ?? null); // B
      setV(top, 3, cell(src, 3)?.v ?? null); // C
      cnt["КЕР"] += 1;
      r[10] = cnt["КЕР"] + ".";
      setV(top, 1, r.slice(0, 11).join(""));
      fillRow(top, FILL_GOLD);
      i++; // следующая итерация цикла обработает исходную строку
      while (grid.length <= g + 1) grid.push(new Map());
      cnt["ТМЦ"] += 1;
      setV(src, 1, r.slice(0, 11).join("") + cnt["ТМЦ"]);
      setV(src, 6, ""); // Cells(i+1, 6) = ""
      fillRow(src, FILL_YELLOW);
    } else if (codeS === "ТМЦ") {
      cnt["ТМЦ"] += 1;
      setV(row, 1, r.slice(0, 11).join("") + cnt["ТМЦ"]);
      setV(row, 4, cell(row, 5)?.v ?? ""); // D = E
      setV(row, 5, ""); // E = ""
      fillRow(row, FILL_YELLOW);
    }
  }
  return { inserted, nElemets } as any;
}

/* ---------- 3. удаление служебных колонок ---------- */
function deletedBefore(c: number): number {
  let n = 0;
  DELETED.forEach((d) => {
    if (d < c) n++;
  });
  return n;
}
function mapCol(c: number): number {
  return c - deletedBefore(c);
}

function deleteColumns(grid: Row[], widths: any[], merges: MergeRect[], inserts: number[]) {
  for (const row of grid) {
    const entries = [...row.entries()].filter(([c]) => !DELETED.has(c));
    row.clear();
    for (const [c, cd] of entries) row.set(mapCol(c), cd);
  }
  const newWidths: any[] = [];
  widths.forEach((w, i) => {
    const c = i + 1;
    if (!DELETED.has(c)) newWidths[mapCol(c)] = w;
  });
  widths.length = 0;
  widths.push(...newWidths);
  for (const m of merges) {
    for (const ins of inserts) {
      if (m.r1 >= ins) m.r1++;
      if (m.r2 >= ins) m.r2++;
    }
  }
}

/* ---------- 4. Сквозные_формулы_1С ---------- */
function setFormula(grid: Row[], r: number, c: number, f: string, fr: number) {
  while (grid.length < r) grid.push(new Map());
  const row = grid[r - 1];
  const cd = row.get(c) ?? { v: null };
  cd.v = null;
  cd.f = f;
  cd.fr = round2(fr);
  row.set(c, cd);
}

function runFormulas(grid: Row[], nElement: number) {
  let sumK = 0, sumL = 0, sumKE = 0, sumKF = 0;
  for (let r = 2; r <= nElement + 1; r++) {
    const d = num(val(grid, r, 4));
    const e = num(val(grid, r, 5));
    const f = num(val(grid, r, 6));
    const k = round2(d * e);
    const l = round2(d * f);
    setFormula(grid, r, 11, `ROUND(D${r}*E${r},2)`, k);
    setFormula(grid, r, 12, `ROUND(D${r}*F${r},2)`, l);
    if (r <= nElement) {
      sumK += k;
      sumL += l;
      sumKE += d * e;
      sumKF += d * f;
    }
  }
  const t = nElement + 2;
  setFormula(grid, t, 5, `SUMPRODUCT(D2:D${nElement},E2:E${nElement})`, sumKE);
  setFormula(grid, t, 6, `SUMPRODUCT(D2:D${nElement},F2:F${nElement})`, sumKF);
  setFormula(grid, t, 11, `SUM(K2:K${nElement})`, sumK);
  setFormula(grid, t, 12, `SUM(L2:L${nElement})`, sumL);
  setFormula(grid, t + 1, 12, `K${t}+L${t}`, sumK + sumL);
  return { sumK: round2(sumK), sumL: round2(sumL), grand: round2(sumK + sumL), totalRow: t + 1 };
}

/* ---------- 5. Формат_1С ---------- */
function runFormat(grid: Row[], nElemets: number) {
  for (let r = 1; r <= nElemets; r++) {
    while (grid.length < r) grid.push(new Map());
    const row = grid[r - 1];
    const g7 = row.get(7) ?? row.set(7, { v: null }).get(7)!;
    g7.fill = FILL_RED;
    g7.fillT = undefined;
    if (!g7.numFmt) g7.numFmt = "@"; // Columns(7).NumberFormat = "@"
    for (const c of [8, 9]) {
      const cd = row.get(c) ?? row.set(c, { v: null }).get(c)!;
      cd.fill = FILL_GREEN;
      cd.fillT = undefined;
      cd.gBorder = true;
    }
    const b = row.get(2) ?? row.set(2, { v: null }).get(2)!;
    b.numFmt = "0_ ;-0 ";
    if (r >= 2) b.hAlign = "left";
  }
}

/* ---------- 6. группировка_1С ---------- */
function runGrouping(grid: Row[], nElement: number) {
  const lastRow = nElement;
  const dots: number[] = new Array(lastRow + 1).fill(0);
  for (let r = 2; r <= lastRow; r++) {
    const v = val(grid, r, 1);
    const s = v == null ? "" : String(v);
    dots[r] = s.length - s.split(".").join("").length;
  }
  const levels = new Array(lastRow + 1).fill(0);
  let groups = 0;
  for (let level = 10; level >= 3; level--) {
    let i = 2;
    while (i <= lastRow) {
      if (dots[i] === level) {
        const y0 = i;
        i++;
        while (i <= lastRow) {
          const isGR = val(grid, i, 11) === "ГР";
          if (dots[i] > level - 1 || isGR) i++;
          else break;
        }
        if (y0 < i) {
          groups++;
          for (let rr = y0; rr <= i - 1; rr++) levels[rr] = Math.min(7, levels[rr] + 1);
        }
      } else i++;
    }
  }
  return { levels, groups };
}

/* ---------- 7. сборка выходной книги ---------- */
const GRAY_BORDER = { style: "thin", color: BORDER_GRAY } as any;

function writeCell(target: ExcelJS.Cell, cd: CellData) {
  if (cd.f) {
    target.value = { formula: cd.f, result: cd.fr ?? 0 } as any;
  } else if (cd.v != null && cd.v !== "") {
    target.value = cd.v as any;
  }
  if (cd.style) {
    try {
      target.style = JSON.parse(JSON.stringify(cd.style));
    } catch {
      /* стиль не критичен */
    }
  }
  if (cd.fillT) {
    target.fill = { type: "pattern", pattern: "solid", fgColor: { ...cd.fillT } } as any;
  } else if (cd.fill) {
    target.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + cd.fill } } as any;
  }
  if (cd.gBorder) {
    target.border = { top: GRAY_BORDER, left: GRAY_BORDER, bottom: GRAY_BORDER, right: GRAY_BORDER };
  }
  if (cd.numFmt) target.numFmt = cd.numFmt;
  if (cd.hAlign) target.alignment = { ...(target.alignment ?? {}), horizontal: cd.hAlign } as any;
}

function buildWorkbook(
  E: any,
  grid: Row[],
  heights: (number | undefined)[],
  widths: any[],
  merges: MergeRect[],
  levels: number[]
): ExcelJS.Workbook {
  const wb = new E.Workbook();
  wb.creator = "СВОД → 1С (браузерный конвертер)";
  (wb as any).calcProperties = { fullCalcOnLoad: true };
  const ws = wb.addWorksheet("Свод");
  (ws.properties as any).outlineProperties = { summaryBelow: false, summaryRight: false };
  ws.getColumn(7).numFmt = "@"; // Columns(7).NumberFormat = "@"

  widths.forEach((w, i) => {
    if (!w) return;
    const col = ws.getColumn(i + 1);
    if (typeof w.w === "number") col.width = w.w;
    if (w.hidden) col.hidden = true;
  });

  grid.forEach((row, gi) => {
    const r = gi + 1;
    const lvl = levels[r] ?? 0;
    if (row.size === 0 && !heights[gi] && lvl === 0) return;
    const orow = ws.getRow(r);
    if (heights[gi]) orow.height = heights[gi];
    if (lvl > 0) orow.outlineLevel = lvl;
    row.forEach((cd, c) => writeCell(orow.getCell(c), cd));
    orow.commit();
  });

  for (const m of merges) {
    if (m.r1 < 1 || m.c1 < 1) continue;
    try {
      ws.mergeCells(m.r1, m.c1, m.r2, m.c2);
    } catch {
      /* конфликт объединений — пропускаем, как On Error Resume Next */
    }
  }
  return wb;
}

/* ---------- превью ---------- */
function previewFillHex(cd: CellData): string | undefined {
  if (cd.fillT) return cd.fillT.theme === 4 ? FILL_GR_HEX : FILL_L3_HEX;
  if (cd.fill) return cd.fill;
  return styleFillHex(cd.style);
}

function buildPreview(grid: Row[], levels: number[], upto: number): PreviewRow[] {
  const rows: PreviewRow[] = [];
  const maxR = Math.min(grid.length, upto);
  for (let r = 1; r <= maxR; r++) {
    const row = grid[r - 1];
    const cells: PreviewCell[] = [];
    for (let c = 1; c <= 12; c++) {
      const cd = row.get(c);
      if (!cd) {
        cells.push({ v: "" });
        continue;
      }
      const v = cd.f ? (cd.fr ?? 0) : cd.v;
      cells.push({
        v: disp(v),
        fill: previewFillHex(cd),
        b: !!cd.style?.font?.bold,
        border: !!cd.gBorder,
      });
    }
    rows.push({ n: r, level: levels[r] ?? 0, cells });
  }
  return rows;
}

/* превью не должно блокировать результат: любая ошибка → пустая таблица и запись в консоль */
function safePreview(grid: Row[], levels: number[], upto: number): PreviewRow[] {
  try {
    return buildPreview(grid, levels, upto);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("СВОД→1С: не удалось построить превью листа", e);
    return [];
  }
}

/* ---------- главный вход ---------- */
export async function processWorkbook(wb: ExcelJS.Workbook, a: Analysis): Promise<Outcome> {
  const E = await getExcelJS();
  const ws = findSheet(wb, "Свод")!;
  const R = Math.max(ws.rowCount, 1);
  const C = Math.max(ws.columnCount, 12);

  // материализуем лист: значения (формулы donor-файла разрешаются в значения —
  // после удаления колонок ссылки всё равно были бы пересчитаны Excel в те же числа)
  const grid: Row[] = [];
  const heights: (number | undefined)[] = [];
  for (let r = 1; r <= R; r++) {
    const row = new Map<number, CellData>();
    const xrow = ws.getRow(r);
    heights.push(xrow.height);
    xrow.eachCell({ includeEmpty: false }, (xcell, col) => {
      row.set(col, {
        v: effectiveValue(xcell.value),
        style: JSON.parse(JSON.stringify(xcell.style ?? {})),
      });
    });
    grid.push(row);
  }

  const widths: any[] = [];
  for (let c = 1; c <= Math.max(C, 19); c++) {
    const col = ws.getColumn(c);
    widths.push({ w: (col as any).isCustomWidth ? col.width : undefined, hidden: !!col.hidden });
  }

  const merges: MergeRect[] = [];
  const rawMerges: string[] = ((ws.model as any)?.merges as string[]) ?? [];
  for (const s of rawMerges) {
    const parts = s.split(":");
    if (parts.length !== 2) continue;
    const p1 = new (E as any).Address(parts[0]);
    const p2 = new (E as any).Address(parts[1]);
    merges.push({ r1: p1.row, c1: p1.col, r2: p2.row, c2: p2.col });
  }

  // заголовки (макрос пишет их в строку 1, сохраняя оформление донора)
  const headers = [
    "ИД 1С",
    "Структура/Статья ССР",
    "ЕдИзм",
    "Количество",
    "СМР на 1 ед. руб. (с НДС)",
    "ТМЦ на 1 ед. руб. (с НДС)",
    "Код ССР, ИД КЕР, ИД ТМЦ",
  ];
  if (grid.length === 0) grid.push(new Map());
  headers.forEach((h, i) => setV(grid[0], i + 1, h));

  // Нумерация_1С (возвращает число вставленных строк и границу nElemets)
  const lastRowA0 = lastNonEmpty(grid, 1);
  let y = 0;
  for (let rr = 2; rr <= lastRowA0; rr++) if (val(grid, rr, 11) === "КЕР") y++;
  const inserts: number[] = [];
  const numInfo = runNumbering(grid, inserts);
  const nElemets = numInfo.nElemets; // = lastRowA0 + y + 1, как в макросе

  deleteColumns(grid, widths, merges, inserts);

  const nElement = lastNonEmpty(grid, 1);
  const sums = runFormulas(grid, nElement);
  runFormat(grid, nElemets);
  const grp = runGrouping(grid, nElement);

  // фильтруем объединения по удалённым колонкам
  const okMerges = merges
    .filter((m) => !DELETED.has(m.c1) && !DELETED.has(m.c2))
    .map((m) => ({ r1: m.r1, c1: mapCol(m.c1), r2: m.r2, c2: mapCol(m.c2) }))
    .filter((m) => m.c1 <= m.c2 && m.r1 <= m.r2);

  const outWorkbook = buildWorkbook(E, grid, heights, widths, okMerges, grp.levels);

  const totalNum = sums.grand;
  const diff = a.stikerNum != null ? round2(a.stikerNum - totalNum) : null;
  const match = diff == null ? null : Math.abs(diff) < 0.005;

  return {
    analysis: a,
    outWorkbook,
    totalNum,
    diff,
    match,
    rows: safePreview(grid, grp.levels, Math.min(sums.totalRow, 90)),
    cols: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    stats: {
      totalRows: nElement,
      insertedRows: y,
      groups: grp.groups,
      ker: y,
      tmz: a.levelCounts["ТМЦ"] ?? 0,
    },
  };
}


