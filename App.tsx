
import React, { useState, useEffect } from 'react';
import { Upload, FileText, Trash2, Download, AlertCircle, Loader2, CheckCircle2, ChevronRight, FileJson, Layers } from 'lucide-react';
import { ExcelFile, ProcessingStatus } from './types';
import { mergeExcelFiles, findCommonPrefix } from './services/excelService';

const App: React.FC = () => {
  const [files, setFiles] = useState<ExcelFile[]>([]);
  const [outputFileName, setOutputFileName] = useState<string>('merged_result');
  const [status, setStatus] = useState<ProcessingStatus>({
    isProcessing: false,
    progress: 0,
    error: null,
    resultUrl: null,
  });

  useEffect(() => {
    if (files.length > 0) {
      const names = files.map(f => f.name);
      setOutputFileName(findCommonPrefix(names));
    } else {
      setOutputFileName('merged_result');
    }
  }, [files]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles: ExcelFile[] = Array.from(e.target.files).map((file: File) => ({
        id: Math.random().toString(36).substring(2, 11),
        name: file.name,
        size: file.size,
        lastModified: file.lastModified,
        file: file,
      }));
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    if (status.resultUrl) {
      URL.revokeObjectURL(status.resultUrl);
      setStatus(prev => ({ ...prev, resultUrl: null }));
    }
  };

  const handleMerge = async () => {
    if (files.length === 0) return;

    setStatus({
      isProcessing: true,
      progress: 0,
      error: null,
      resultUrl: null,
    });

    try {
      const rawFiles = files.map(f => f.file);
      const mergedBlob = await mergeExcelFiles(rawFiles);
      const url = URL.createObjectURL(mergedBlob);
      
      setStatus({
        isProcessing: false,
        progress: 100,
        error: null,
        resultUrl: url,
      });
    } catch (err) {
      console.error(err);
      setStatus({
        isProcessing: false,
        progress: 0,
        error: '処理中にエラーが発生しました。シート構成（構成・内容・テンプレ）を確認してください。',
        resultUrl: null,
      });
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <div className="bg-indigo-600 p-3 rounded-2xl shadow-lg shadow-indigo-200">
              <Layers className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
            Excel Merger Pro
          </h1>
          <p className="mt-3 text-lg text-slate-600">
            大問番号のブロックを維持したまま、昇順に結合します。
          </p>
        </div>

        <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-slate-200">
          <div className="bg-indigo-50 p-6 border-b border-slate-200">
            <h2 className="text-sm font-semibold text-indigo-900 uppercase tracking-wider mb-3 font-bold text-center">コピー仕様</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
              <div className="space-y-2">
                <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest">構成シート (E列ソート)</p>
                <li className="flex items-start text-sm text-indigo-800 list-none">
                  <ChevronRight className="w-4 h-4 mt-0.5 mr-1 text-indigo-500 flex-shrink-0" />
                  <span>大問番号が書かれた行とその下の空欄行を1ブロックとしてコピー</span>
                </li>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest">内容シート (A列ソート)</p>
                <li className="flex items-start text-sm text-indigo-800 list-none">
                  <ChevronRight className="w-4 h-4 mt-0.5 mr-1 text-indigo-500 flex-shrink-0" />
                  <span>大問番号順に、各ファイルの全行（2行目以降）を順次連結</span>
                </li>
              </div>
            </div>
          </div>

          <div className="p-8">
            {files.length > 0 && (
              <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center space-x-3">
                <FileJson className="w-5 h-5 text-indigo-500" />
                <div className="flex-1">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-tight">自動設定されたファイル名</p>
                  <p className="text-sm font-bold text-slate-800">{outputFileName}.xlsx</p>
                </div>
              </div>
            )}

            <div className="relative group">
              <label className={`
                flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-xl cursor-pointer
                transition-all duration-200 
                ${files.length > 0 ? 'bg-slate-50 border-indigo-300' : 'bg-white border-slate-300 hover:border-indigo-400 hover:bg-slate-50'}
              `}>
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-12 h-12 mb-3 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                  <p className="mb-2 text-sm text-slate-700 font-semibold text-indigo-600">Excelファイルを一括選択</p>
                  <p className="text-xs text-slate-500">ドラッグ＆ドロップでも追加可能</p>
                </div>
                <input type="file" className="hidden" multiple accept=".xlsx" onChange={onFileChange} />
              </label>
            </div>

            {files.length > 0 && (
              <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-800">処理対象 ({files.length})</h3>
                  <button onClick={() => setFiles([])} className="text-sm text-red-500 hover:text-red-700 font-medium">クリア</button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                  {files.map((file) => (
                    <div key={file.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
                      <div className="flex items-center space-x-3 truncate">
                        <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <p className="text-sm font-medium text-slate-700 truncate">{file.name}</p>
                      </div>
                      <button onClick={() => removeFile(file.id)} className="p-1.5 text-slate-300 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {status.isProcessing && (
              <div className="mt-8 p-6 bg-indigo-50 rounded-xl flex flex-col items-center space-y-3 border border-indigo-100">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                <span className="text-indigo-900 font-bold">大問ブロックを整理して結合中...</span>
              </div>
            )}

            {status.error && (
              <div className="mt-8 p-4 bg-red-50 rounded-xl flex items-start space-x-3 border border-red-100">
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                <span className="text-red-800 text-sm font-medium">{status.error}</span>
              </div>
            )}

            {status.resultUrl && (
              <div className="mt-8 p-8 bg-emerald-50 rounded-xl border border-emerald-100 animate-in zoom-in-95 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-emerald-900 mb-2">結合に成功しました</h3>
                <a href={status.resultUrl} download={`${outputFileName}.xlsx`}
                  className="inline-flex items-center px-10 py-4 bg-emerald-600 text-white font-bold rounded-xl shadow-lg hover:bg-emerald-700 transition-all space-x-3">
                  <Download className="w-6 h-6" />
                  <span>ファイルを保存する</span>
                </a>
              </div>
            )}

            {!status.isProcessing && !status.resultUrl && (
              <div className="mt-10">
                <button onClick={handleMerge} disabled={files.length === 0}
                  className={`w-full py-5 rounded-xl font-bold text-lg transition-all shadow-xl ${files.length > 0 ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
                  大問順に並べ替えて結合
                </button>
              </div>
            )}
          </div>
        </div>
        <p className="mt-8 text-center text-slate-400 text-[10px]">
          ※各ファイルの大問番号（構成：E列、内容：A列）を起点に、後続の空欄行を含めて1つの問題ブロックとして結合します。
        </p>
      </div>
    </div>
  );
};

export default App;
