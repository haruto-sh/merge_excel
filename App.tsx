import React, { useState, useMemo } from 'react';
import { 
  Upload, 
  FileText, 
  Trash2, 
  Download, 
  AlertCircle, 
  Loader2, 
  CheckCircle2, 
  Layers,
  ShieldCheck,
  Info,
  ExternalLink,
  FolderOpen,
  ChevronDown,
  FileCheck
} from 'lucide-react';
import { ExcelFile, ProcessingStatus, MergeResult } from './types.ts';
import { mergeExcelFiles, getGroupKey } from './services/excelService.ts';

const App: React.FC = () => {
  const [files, setFiles] = useState<ExcelFile[]>([]);
  const [status, setStatus] = useState<ProcessingStatus>({
    isProcessing: false,
    progress: 0,
    error: null,
    results: [],
  });

  // グループ化されたファイルの計算
  const groupedFiles = useMemo(() => {
    const groups: Record<string, ExcelFile[]> = {};
    files.forEach(file => {
      if (!groups[file.groupKey]) groups[file.groupKey] = [];
      groups[file.groupKey].push(file);
    });
    return groups;
  }, [files]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles: ExcelFile[] = Array.from(e.target.files).map((file: File) => ({
        id: Math.random().toString(36).substring(2, 11),
        name: file.name,
        size: file.size,
        lastModified: file.lastModified,
        file: file,
        groupKey: getGroupKey(file.name),
      }));
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const removeGroup = (groupKey: string) => {
    setFiles(prev => prev.filter(f => f.groupKey !== groupKey));
  };

  const handleMergeAll = async () => {
    if (files.length === 0) return;

    setStatus({
      isProcessing: true,
      progress: 0,
      error: null,
      results: [],
    });

    try {
      const groupKeys = Object.keys(groupedFiles);
      const results: MergeResult[] = [];

      for (let i = 0; i < groupKeys.length; i++) {
        const key = groupKeys[i];
        const groupFiles = groupedFiles[key].map(f => f.file);
        
        // グループごとに結合処理を実行
        const mergedBlob = await mergeExcelFiles(groupFiles);
        const url = URL.createObjectURL(mergedBlob);
        
        results.push({
          groupName: key,
          url: url,
          fileCount: groupFiles.length
        });

        // 進捗更新
        setStatus(prev => ({
          ...prev,
          progress: Math.round(((i + 1) / groupKeys.length) * 100)
        }));
      }

      setStatus(prev => ({
        ...prev,
        isProcessing: false,
        results: results,
      }));
    } catch (err) {
      console.error(err);
      setStatus({
        isProcessing: false,
        progress: 0,
        error: '処理中にエラーが発生しました。ファイル形式やシート名を確認してください。',
        results: [],
      });
    }
  };

  const reset = () => {
    status.results.forEach(r => URL.revokeObjectURL(r.url));
    setFiles([]);
    setStatus({
      isProcessing: false,
      progress: 0,
      error: null,
      results: [],
    });
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + ['B', 'KB', 'MB'][i];
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <nav className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-200">
              <Layers className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-black text-slate-800 tracking-tight leading-none">Excel Group Merger</h1>
              <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wider">Automated Sorting Tool</p>
            </div>
          </div>
          <div className="hidden md:flex items-center text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 text-xs font-bold">
            <ShieldCheck className="w-4 h-4 mr-1.5" />
            Local Processor: No Data Leaves Your PC
          </div>
        </div>
      </nav>

      <main className="flex-grow py-10 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Main Container */}
          <div className="bg-white shadow-2xl shadow-slate-200 rounded-[2.5rem] overflow-hidden border border-slate-100">
            {/* Header Section */}
            <div className="bg-slate-900 p-10 text-white relative">
              <div className="absolute -right-10 -bottom-10 opacity-10">
                <FolderOpen className="w-64 h-64 rotate-12" />
              </div>
              <div className="relative z-10">
                <h2 className="text-3xl font-black mb-3">試験種ごとの自動結合</h2>
                <p className="text-slate-400 text-sm max-w-lg leading-relaxed">
                  ファイル名から試験種を自動判別します。`A中学_2026_1_1` と `A中学_2026_1_2` をアップロードすると、自動的に `A中学_2026_1` としてまとめられます。
                </p>
              </div>
            </div>

            <div className="p-10">
              {/* Privacy/Instruction Banner */}
              <div className="mb-10 flex items-start p-5 bg-blue-50 border border-blue-100 rounded-3xl">
                <Info className="w-6 h-6 text-blue-500 mr-4 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="text-blue-900 font-bold mb-1">使い方</p>
                  <p className="text-blue-700 leading-relaxed">
                    末尾に `_1`, `_2` と付いたファイルをまとめて選択してください。システムが自動で共通部分を抜き出し、試験種ごとにグループ化します。
                  </p>
                </div>
              </div>

              {/* Upload Dropzone */}
              {!status.results.length && (
                <div className="relative group">
                  <label className={`
                    flex flex-col items-center justify-center w-full min-h-[16rem] border-3 border-dashed rounded-[2rem] cursor-pointer
                    transition-all duration-500
                    ${files.length > 0 ? 'bg-slate-50 border-indigo-200 h-40' : 'bg-white border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30'}
                  `}>
                    <div className="flex flex-col items-center justify-center text-center px-6">
                      <div className="bg-indigo-100 p-5 rounded-3xl mb-4 group-hover:scale-110 transition-transform duration-500 shadow-sm">
                        <Upload className="w-10 h-10 text-indigo-600" />
                      </div>
                      <p className="text-lg font-black text-slate-800 mb-1">Excelファイルを一括選択</p>
                      <p className="text-sm text-slate-400 font-medium">ドラッグ＆ドロップ、またはクリックで選択</p>
                    </div>
                    <input type="file" className="hidden" multiple accept=".xlsx" onChange={onFileChange} />
                  </label>
                </div>
              )}

              {/* Grouped File Display */}
              {files.length > 0 && !status.isProcessing && !status.results.length && (
                <div className="mt-10 space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <h3 className="font-black text-slate-800 flex items-center">
                      <FolderOpen className="w-5 h-5 mr-2 text-indigo-500" />
                      検出された試験種 ({Object.keys(groupedFiles).length})
                    </h3>
                    <button onClick={() => setFiles([])} className="text-xs font-bold text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors">
                      すべて解除
                    </button>
                  </div>

                  <div className="grid gap-4">
                    {Object.entries(groupedFiles).map(([key, groupFiles]) => (
                      <div key={key} className="bg-slate-50/50 rounded-2xl border border-slate-100 overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-slate-100">
                          <div className="flex items-center space-x-3">
                            <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                            <span className="font-bold text-slate-700 text-sm">{key}</span>
                            <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md uppercase">
                              {groupFiles.length} FILES
                            </span>
                          </div>
                          <button onClick={() => removeGroup(key)} className="text-slate-300 hover:text-red-500 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {groupFiles.map(f => (
                            <div key={f.id} className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-slate-100/50 shadow-sm">
                              <span className="text-xs text-slate-500 truncate mr-2">{f.name}</span>
                              <div className="flex items-center space-x-2 flex-shrink-0">
                                <span className="text-[9px] font-bold text-slate-300 uppercase">{formatSize(f.size)}</span>
                                <button onClick={() => removeFile(f.id)} className="text-slate-200 hover:text-red-400">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Processing Loader */}
              {status.isProcessing && (
                <div className="mt-10 py-16 flex flex-col items-center justify-center">
                  <div className="relative mb-6">
                    <Loader2 className="w-16 h-16 text-indigo-600 animate-spin" />
                    <Layers className="w-6 h-6 text-indigo-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <h3 className="text-xl font-black text-slate-800 mb-2">一括処理中... {status.progress}%</h3>
                  <div className="w-64 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${status.progress}%` }}></div>
                  </div>
                </div>
              )}

              {/* Error Display */}
              {status.error && (
                <div className="mt-8 p-5 bg-red-50 rounded-[1.5rem] flex items-start space-x-4 border border-red-100">
                  <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-red-800 text-sm font-bold">{status.error}</p>
                </div>
              )}

              {/* Results Grid */}
              {status.results.length > 0 && (
                <div className="mt-10 animate-in fade-in slide-in-from-bottom-5 duration-700">
                  <div className="text-center mb-10">
                    <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl shadow-emerald-100">
                      <FileCheck className="w-10 h-10 text-white" />
                    </div>
                    <h2 className="text-3xl font-black text-slate-800">結合完了！</h2>
                    <p className="text-slate-400 font-bold text-sm">試験種ごとに {status.results.length} 個のファイルを作成しました</p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    {status.results.map((res, i) => (
                      <div key={i} className="group bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:border-emerald-200 transition-all duration-300 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-4">
                             <div className="p-3 bg-emerald-50 rounded-2xl">
                               <FileText className="w-6 h-6 text-emerald-600" />
                             </div>
                             <span className="text-[10px] font-black bg-slate-50 text-slate-400 px-2 py-1 rounded-lg">
                               {res.fileCount} SOURCES
                             </span>
                          </div>
                          <h4 className="font-black text-slate-800 mb-1 truncate" title={res.groupName}>{res.groupName}.xlsx</h4>
                          <p className="text-[11px] text-slate-400 font-bold mb-6">各シートの大問番号を昇順ソート済み</p>
                        </div>
                        <a 
                          href={res.url} 
                          download={`${res.groupName}.xlsx`}
                          className="flex items-center justify-center space-x-2 py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm shadow-lg shadow-emerald-100 group-hover:bg-emerald-700 transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                          <Download className="w-4 h-4" />
                          <span>保存する</span>
                        </a>
                      </div>
                    ))}
                  </div>

                  <button 
                    onClick={reset}
                    className="mt-12 block mx-auto text-slate-400 hover:text-indigo-600 text-xs font-bold uppercase tracking-widest transition-colors"
                  >
                    ← 別のファイルをアップロード
                  </button>
                </div>
              )}

              {/* Final Action Button */}
              {!status.isProcessing && !status.results.length && files.length > 0 && (
                <div className="mt-10">
                  <button 
                    onClick={handleMergeAll}
                    className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black text-xl shadow-2xl shadow-indigo-200 hover:bg-indigo-700 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center space-x-4"
                  >
                    <Layers className="w-6 h-6" />
                    <span>試験種ごとに結合を開始 ({Object.keys(groupedFiles).length}種)</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Guidelines Footer */}
          {!status.results.length && (
            <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8 px-6">
              <div className="flex space-x-5">
                <div className="bg-white p-4 rounded-3xl shadow-sm h-fit border border-slate-100">
                  <FolderOpen className="w-6 h-6 text-indigo-500" />
                </div>
                <div>
                  <h5 className="font-black text-slate-800 mb-1 leading-none text-lg">自動グルーピング</h5>
                  <p className="text-xs text-slate-400 font-medium leading-relaxed mt-2">
                    `_数字` 以外の部分が同じファイルは同じグループになります。例: `A中_国語_1` と `A中_国語_2` は `A中_国語` に結合。
                  </p>
                </div>
              </div>
              <div className="flex space-x-5">
                <div className="bg-white p-4 rounded-3xl shadow-sm h-fit border border-slate-100">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                </div>
                <div>
                  <h5 className="font-black text-slate-800 mb-1 leading-none text-lg">大問並べ替え対応</h5>
                  <p className="text-xs text-slate-400 font-medium leading-relaxed mt-2">
                    全グループにおいて、「構成」シートのE列、「内容」シートのA列に基づき大問ブロックを正しい順序に整列させます。
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="py-12 px-6 border-t border-slate-100 bg-white">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between text-[11px] text-slate-400 font-bold uppercase tracking-widest">
          <p>© 2025 Excel Group Merger - Precision Built for Exams</p>
          <div className="flex space-x-8 mt-6 md:mt-0">
            <a href="#" className="hover:text-indigo-600 transition-colors">Privacy</a>
            <a href="#" className="hover:text-indigo-600 transition-colors">Terms</a>
            <a href="https://ai.google.dev" className="flex items-center hover:text-indigo-600 transition-colors">
              Docs <ExternalLink className="w-3 h-3 ml-1.5" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
