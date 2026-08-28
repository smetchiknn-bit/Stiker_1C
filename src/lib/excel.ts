/* Ленивая загрузка ExcelJS (~1 МБ): библиотека подтягивается отдельным
   чанком только в момент первой работы с файлом. */

export type ExcelJSModule = typeof import("exceljs");

let cached: ExcelJSModule | null = null;

export async function getExcelJS(): Promise<ExcelJSModule> {
  if (!cached) {
    cached = await import("exceljs");
  }
  return cached;
}
