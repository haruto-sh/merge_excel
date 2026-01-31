
import * as XLSX from 'xlsx';
import { SheetNames } from '../types';

/**
 * 自然順序ソート（1, 2, 10...）
 */
const naturalSort = (a: string, b: string) => {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
};

/**
 * ファイル名のリストから共通の接頭辞を見つける
 */
export function findCommonPrefix(names: string[]): string {
  if (names.length === 0) return 'merged_result';
  if (names.length === 1) return names[0].replace(/\.[^/.]+$/, "");

  let sorted = [...names].sort();
  let first = sorted[0];
  let last = sorted[sorted.length - 1];
  let i = 0;
  while (i < first.length && first.charAt(i) === last.charAt(i)) {
    i++;
  }
  
  let prefix = first.substring(0, i).trim();
  prefix = prefix.replace(/[_\- ]+$/, "");
  
  return prefix.length > 0 ? prefix : 'merged_result';
}

export async function mergeExcelFiles(files: File[]): Promise<Blob> {
  // 大問番号ごとに「行のリスト」を保持するマップ
  const koseiGroups: Map<string, any[][]> = new Map();
  const naiyoGroups: Map<string, any[][]> = new Map();
  
  let koseiHeaders: any[] = [];
  let naiyoHeaders: any[] = [];
  let masterTempre: XLSX.WorkSheet | null = null;

  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { cellDates: true });

    // --- 「構成」シートの処理 (E列: インデックス4) ---
    const koseiSheet = workbook.Sheets[SheetNames.KOSEI];
    if (koseiSheet) {
      const data: any[][] = XLSX.utils.sheet_to_json(koseiSheet, { header: 1, defval: "" });
      if (data.length > 0) {
        if (koseiHeaders.length === 0) koseiHeaders = data[0];
        
        const rows = data.slice(1);
        let currentQNum = "";
        for (const row of rows) {
          // 行が完全に空でないか確認
          if (!row.some(cell => cell !== "")) continue;
          
          // E列に値があれば更新、なければ直前の大問番号を継続（Forward Fill）
          const qVal = String(row[4] || "").trim();
          if (qVal !== "") {
            currentQNum = qVal;
          }

          if (currentQNum !== "") {
            if (!koseiGroups.has(currentQNum)) koseiGroups.set(currentQNum, []);
            koseiGroups.get(currentQNum)!.push(row);
          }
        }
      }
    }

    // --- 「内容」シートの処理 (A列: インデックス0) ---
    const naiyoSheet = workbook.Sheets[SheetNames.NAIYO];
    if (naiyoSheet) {
      const data: any[][] = XLSX.utils.sheet_to_json(naiyoSheet, { header: 1, defval: "" });
      if (data.length > 0) {
        if (naiyoHeaders.length === 0) naiyoHeaders = data[0];
        
        const rows = data.slice(1);
        let currentQNum = "";
        for (const row of rows) {
          if (!row.some(cell => cell !== "")) continue;
          
          // A列に値があれば更新
          const qVal = String(row[0] || "").trim();
          if (qVal !== "") {
            currentQNum = qVal;
          }

          if (currentQNum !== "") {
            if (!naiyoGroups.has(currentQNum)) naiyoGroups.set(currentQNum, []);
            naiyoGroups.get(currentQNum)!.push(row);
          }
        }
      }
    }

    // 「テンプレ」シートの保持
    if (!masterTempre && workbook.Sheets[SheetNames.TEMPRE]) {
      masterTempre = workbook.Sheets[SheetNames.TEMPRE];
    }
  }

  // 大問番号を自然順でソートして、各グループの全行を順番に連結
  const sortedKoseiNums = Array.from(koseiGroups.keys()).sort(naturalSort);
  const finalKoseiData = [koseiHeaders];
  for (const num of sortedKoseiNums) {
    const groupRows = koseiGroups.get(num)!;
    finalKoseiData.push(...groupRows);
  }

  const sortedNaiyoNums = Array.from(naiyoGroups.keys()).sort(naturalSort);
  const finalNaiyoData = [naiyoHeaders];
  for (const num of sortedNaiyoNums) {
    const groupRows = naiyoGroups.get(num)!;
    finalNaiyoData.push(...groupRows);
  }

  const newWb = XLSX.utils.book_new();

  // 構成シート作成
  const finalKoseiSheet = XLSX.utils.aoa_to_sheet(finalKoseiData);
  XLSX.utils.book_append_sheet(newWb, finalKoseiSheet, SheetNames.KOSEI);

  // 内容シート作成
  const finalNaiyoSheet = XLSX.utils.aoa_to_sheet(finalNaiyoData);
  XLSX.utils.book_append_sheet(newWb, finalNaiyoSheet, SheetNames.NAIYO);

  // テンプレシート作成
  if (masterTempre) {
    XLSX.utils.book_append_sheet(newWb, masterTempre, SheetNames.TEMPRE);
  }

  const wbOut = XLSX.write(newWb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbOut], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
