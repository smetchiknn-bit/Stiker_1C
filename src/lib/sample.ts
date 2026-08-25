import type * as ExcelJS from "exceljs";
import { getExcelJS } from "./excel";

/* Пример файла-донора: лист «Свод» с иерархией О→К→С→У→Э→Л1…Л4→ГР→КЕР/ТМЦ.
   J2 = «Стикер» (контрольная сумма), K — уровни, L — «Всего» у донора.
   Итог по правилам макроса: СМР 5 673 500 + ТМЦ 615 150 = 6 288 650 —
   «Стикер» совпадает, демо показывает «СХОДИТСЯ». */

const NAVY = "FF14456F";
const LIGHT = "FFDCE6F1";

export const SAMPLE_FILE_NAME = "Демо_Свод.xlsx";

export async function buildSampleDonor(): Promise<ExcelJS.Workbook> {
  const E = await getExcelJS();
  const wb = new E.Workbook();
  wb.creator = "СВОД → 1С (демо-донор)";
  const ws = wb.addWorksheet("Свод");

  const rows: (string | number)[][] = [
    ["Код", "Структура / статья ССР", "Ед. изм.", "Кол-во", "СМР на 1 ед., руб. (с НДС)", "ТМЦ на 1 ед., руб. (с НДС)", "Примечание", "Резерв 1", "Резерв 2", "Стикер", "Уровень", "Всего, руб."],
    ["ОБ-01", "Объект: Производственный корпус № 2", "", "", "", "", "", "", "", "", "О", ""],
    ["КМ-01", "Комплекс: Подземная часть", "", "", "", "", "", "", "", "", "К", ""],
    ["СР-01", "Сооружение: Фундаментная плита", "", "", "", "", "", "", "", "", "С", ""],
    ["УЗ-01", "Узел: Бетонные работы", "", "", "", "", "", "", "", "", "У", ""],
    ["ЭЛ-01", "Элемент: Бетон В25 W6", "м3", 340, 6100, 0, "", "", "", "", "Э", 2074000],
    ["ЭЛ-02", "Элемент: Арматура класса А500С", "т", 28, 74500, 0, "", "", "", "", "Э", 2086000],
    ["Л1-01", "Локальный раздел: Опалубка щитовая", "м2", 860, 420, 0, "", "", "", "", "Л1", 361200],
    ["", "Раздел: Подготовка основания", "компл.", 4, 15000, 0, "без исходного кода", "", "", "", "Л2", 60000],
    ["Л3-01", "Позиция: Гидроизоляция обмазочная", "м2", 120, 950, 260, "", "", "", "", "Л3", 145200],
    ["ВП-01", "", "—", "", "", "", "служебная врезка", "", "", "", "Л4", ""],
    ["ГР-01", "Группа работ: Монтаж металлоконструкций", "т", 6, 120000, 45000, "", "", "", "", "ГР", 990000],
    ["КЕР-01", "Керамзитовый гравий, фр. 10–20", "м3", 85, 2100, "", "", "", "", "", "КЕР", 178500],
    ["ТМЦ-01", "Кирпич керамический М150", "шт", "", 12000, 24.5, "кол-во в колонке E", "", "", "", "ТМЦ", 294000],
    ["ГР-02", "Группа работ: Обратная засыпка песком", "м3", 210, 380, 95, "", "", "", "", "ГР", 99750],
  ];

  rows.forEach((data, i) => {
    const r = ws.getRow(i + 1);
    data.forEach((v, j) => {
      if (v !== "") r.getCell(j + 1).value = v as any;
    });
    r.commit();
  });

  // контрольная сумма «Стикер» (совпадает с итогом — как в боевом файле)
  ws.getCell("J2").value = 6288650;

  // оформление донора
  const widths = [9, 42, 9, 10, 16, 16, 18, 9, 9, 12, 9, 14];
  widths.forEach((w, i) => (ws.getColumn(i + 1).width = w));

  const head = ws.getRow(1);
  head.height = 30;
  for (let c = 1; c <= 12; c++) {
    const cell = head.getCell(c);
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10, name: "Calibri" };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  }

  for (let r = 2; r <= 15; r++) {
    const row = ws.getRow(r);
    for (let c = 1; c <= 12; c++) {
      const cell = row.getCell(c);
      cell.border = {
        top: { style: "thin", color: { argb: "FFB8C4CE" } },
        bottom: { style: "thin", color: { argb: "FFB8C4CE" } },
        left: { style: "thin", color: { argb: "FFB8C4CE" } },
        right: { style: "thin", color: { argb: "FFB8C4CE" } },
      };
      if (c === 5 || c === 6 || c === 12) cell.numFmt = "#,##0.00";
    }
    const k = ws.getCell(r, 11).value;
    if (k === "О" || k === "К" || k === "С") {
      for (let c = 1; c <= 12; c++) {
        row.getCell(c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: LIGHT } };
        if (c <= 2) row.getCell(c).font = { bold: true };
      }
    }
  }

  const j2 = ws.getCell("J2");
  j2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFD84D" } };
  j2.font = { bold: true };
  j2.numFmt = "#,##0.00";
  ws.getCell("J1").font = { bold: true, color: { argb: NAVY } };

  ws.views = [{ state: "frozen", ySplit: 1 }];
  return wb;
}
