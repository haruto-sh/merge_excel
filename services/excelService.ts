import * as XLSX from 'xlsx';
import { SheetNames } from '../types.ts';

/**
 * 自然順序ソート（1, 2, 10...）
 */
const naturalSort = (a: string, b: string) => {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
};

/**
 * ファイル名からグループ名（末尾の _数字 を除いたもの）を抽出する
 */
export function getGroupKey(filename: string): string {
  // 拡張子を除去
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");
  // 末尾の _1, _01, -1 などのパターンにマッチさせて除去
  const match = nameWithoutExt.match(/^(.*)[_\-]\d+$/);
  return match ? match[1] : nameWithoutExt;
}

export async function mergeExcelFiles(files: File[]): Promise<Blob> {
  const koseiGroups: Map<string, any[][]> = new Map();
  const naiyoGroups: Map<string, any[][]> = new Map();
  
  let koseiHeaders: any[] = [];
  let naiyoHeaders: any[] = [];
  let masterTempre: XLSX.WorkSheet | null = null;

  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { cellDates: true });

    // --- 「構成」シート ---
    const koseiSheet = workbook.Sheets[SheetNames.KOSEI];
    if (koseiSheet) {
      const data: any[][] = XLSX.utils.sheet_to_json(koseiSheet, { header: 1, defval: "" });
      if (data.length > 0) {
        if (koseiHeaders.length === 0) koseiHeaders = data[0];
        const rows = data.slice(1);
        let currentQNum = "";
        for (const row of rows) {
          if (!row.some(cell => cell !== "")) continue;
          const qVal = String(row[4] || "").trim();
          if (qVal !== "") currentQNum = qVal;
          if (currentQNum !== "") {
            if (!koseiGroups.has(currentQNum)) koseiGroups.set(currentQNum, []);
            koseiGroups.get(currentQNum)!.push(row);
          }
        }
      }
    }

    // --- 「内容」シート ---
    const naiyoSheet = workbook.Sheets[SheetNames.NAIYO];
    if (naiyoSheet) {
      const data: any[][] = XLSX.utils.sheet_to_json(naiyoSheet, { header: 1, defval: "" });
      if (data.length > 0) {
        if (naiyoHeaders.length === 0) naiyoHeaders = data[0];
        const rows = data.slice(1);
        let currentQNum = "";
        for (const row of rows) {
          if (!row.some(cell => cell !== "")) continue;
          const qVal = String(row[0] || "").trim();
          if (qVal !== "") currentQNum = qVal;
          if (currentQNum !== "") {
            if (!naiyoGroups.has(currentQNum)) naiyoGroups.set(currentQNum, []);
            naiyoGroups.get(currentQNum)!.push(row);
          }
        }
      }
    }

    if (!masterTempre && workbook.Sheets[SheetNames.TEMPRE]) {
      masterTempre = workbook.Sheets[SheetNames.TEMPRE];
    }
  }

  const sortedKoseiNums = Array.from(koseiGroups.keys()).sort(naturalSort);
  const finalKoseiData = [koseiHeaders];
  for (const num of sortedKoseiNums) {
    finalKoseiData.push(...koseiGroups.get(num)!);
  }

  const sortedNaiyoNums = Array.from(naiyoGroups.keys()).sort(naturalSort);
  const finalNaiyoData = [naiyoHeaders];
  for (const num of sortedNaiyoNums) {
    finalNaiyoData.push(...naiyoGroups.get(num)!);
  }

  const newWb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(newWb, XLSX.utils.aoa_to_sheet(finalKoseiData), SheetNames.KOSEI);
  XLSX.utils.book_append_sheet(newWb, XLSX.utils.aoa_to_sheet(finalNaiyoData), SheetNames.NAIYO);
  if (masterTempre) XLSX.utils.book_append_sheet(newWb, masterTempre, SheetNames.TEMPRE);

  const wbOut = XLSX.write(newWb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbOut], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
