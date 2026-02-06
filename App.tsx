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
  FileCheck,
  Archive,
  Zap
} from 'lucide-react';
import JSZip from 'jszip';
import { ExcelFile, ProcessingStatus, MergeResult } from './types.ts';
import { mergeExcelFiles, getGroupKey } from './services/excelService.ts';

const App: React.FC = () => {
  const [files, setFiles] = useState<ExcelFile[]>([]);
  const [status, setStatus] = useState<ProcessingStatus>({
    isProcessing: false,
    isZipping: false,
    progress: 0,
    error: null,
    results: [],
  });

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
      isZipping: false,
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
        
        const mergedBlob = await mergeExcelFiles(groupFiles);
        const url = URL.createObjectURL(mergedBlob);
        
        results.push({
          groupName: key,
          url: url,
          blob: mergedBlob,
          fileCount: groupFiles.length
        });

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
        error: '処理中にエラーが発生しました。ファイル形式を確認してください。',
        results: [],
      });
    }
  };

  const handleDownloadZip = async () => {
    if (status.results.length === 0) return;
    
    setStatus(prev => ({ ...prev, isZipping: true }));
    
    try {
      const zip = new JSZip();
      status.results.forEach(res => {
        zip.file(`${res.groupName}.xlsx`, res.blob);
      });
      
      const zipContent = await zip.generateAsync({ type: 'blob' });
      const zipUrl = URL.createObjectURL(zipContent);
      
      const link = document.createElement('a');
      link.href = zipUrl;
      const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      link.download = `merged_excel_files_${timestamp}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(zipUrl);
    } catch (err) {
      console.error(err);
      alert('ZIPの作成中にエラーが発生しました。');
    } finally {
      setStatus(prev => ({ ...prev, isZipping: false }));
    }
  };

  const reset = () => {
    status.results.forEach(r => URL.revokeObjectURL(r.url));
    setFiles([]);
    setStatus({
      isProcessing: false,
      isZipping: false,
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
          <div className="bg-white shadow-2xl shadow-slate-200 rounded-[2.5rem] overflow-hidden border border-slate-100">
            <div className="bg-slate-900 p-10 text-white relative">
              <div className="absolute -right-10 -bottom-10 opacity-10">
                <FolderOpen className="w-64 h-64 rotate-12" />
              </div>
              <div className="relative z-10">
                <h2 className="text-3xl font-black mb-3">試験種ごとの自動結合</h2>
                <p className="text-slate-400 text-sm max-w-lg leading-relaxed">
                  ファイルをアップロードするだけで、試験種ごとに自動で分類し、結合・並べ替えを行います。
                </p>
              </div>
            </div>

            <div className="p-10">
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
                      <p className="text-sm text-slate-400 font-medium">ドラッグ＆ドロップ、またはクリック</p>
                    </div>
                    <input type="file" className="hidden" multiple accept=".xlsx" onChange={onFileChange} />
                  </label>
                </div>
              )}

              {/* Grouped File Display */}
              {files.length > 0 && !status.isProcessing && !status.results.length && (
                <div className="mt-10 animate-in fade-in duration-500">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                    <h3 className="font-black text-slate-800 flex items-center">
                      <FolderOpen className="w-5 h-5 mr-2 text-indigo-500" />
                      検出された試験種 ({Object.keys(groupedFiles).length})
                    </h3>
                  </div>

                  <div className="grid gap-4">
                    {Object.entries(groupedFiles).map(([key, groupFiles]) => (
                      <div key={key} className="bg-slate-50/50 rounded-2xl border border-slate-100 overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-slate-100">
                          <div className="flex items-center space-x-3">
                            <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                            <span className="font-bold text-slate-700 text-sm">{key}</span>
                          </div>
                          <button onClick={() => removeGroup(key)} className="text-slate-300 hover:text-red-500">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {groupFiles.map(f => (
                            <div key={f.id} className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-slate-100/50 text-xs">
                              <span className="text-slate-500 truncate mr-2">{f.name}</span>
                              <button onClick={() => removeFile(f.id)} className="text-slate-200 hover:text-red-400">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <button 
                    onClick={handleMergeAll}
                    className="w-full mt-10 py-6 bg-indigo-600 text-white rounded-[2rem] font-black text-xl shadow-2xl shadow-indigo-200 hover:bg-indigo-700 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center space-x-4"
                  >
                    <Zap className="w-6 h-6 fill-current" />
                    <span>結合を開始 ({Object.keys(groupedFiles).length}グループ)</span>
                  </button>
                </div>
              )}

              {/* Processing Loader */}
              {status.isProcessing && (
                <div className="mt-10 py-16 flex flex-col items-center justify-center">
                  <Loader2 className="w-16 h-16 text-indigo-600 animate-spin mb-4" />
                  <h3 className="text-xl font-black text-slate-800 mb-2">一括処理中... {status.progress}%</h3>
                  <div className="w-64 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${status.progress}%` }}></div>
                  </div>
                </div>
              )}

              {/* Error Display */}
              {status.error && (
                <div className="mt-8 p-5 bg-red-50 rounded-[1.5rem] flex items-start space-x-4 border border-red-100">
                  <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
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
                    <p className="text-slate-400 font-bold text-sm">計 {status.results.length} 個のファイルを作成しました</p>
                  </div>

                  {/* Bulk Download Button */}
                  {status.results.length > 1 && (
                    <button 
                      onClick={handleDownloadZip}
                      disabled={status.isZipping}
                      className="w-full mb-8 py-5 bg-slate-900 text-white rounded-[1.5rem] font-black flex items-center justify-center space-x-3 shadow-xl hover:bg-slate-800 transition-all disabled:opacity-50"
                    >
                      {status.isZipping ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Archive className="w-5 h-5" />
                      )}
                      <span>すべてのファイルをZIPで保存</span>
                    </button>
                  )}

                  <div className="grid gap-4 sm:grid-cols-2">
                    {status.results.map((res, i) => (
                      <div key={i} className="group bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-4">
                             <div className="p-3 bg-emerald-50 rounded-2xl">
                               <FileText className="w-6 h-6 text-emerald-600" />
                             </div>
                          </div>
                          <h4 className="font-black text-slate-800 mb-1 truncate text-sm" title={res.groupName}>{res.groupName}.xlsx</h4>
                          <p className="text-[10px] text-slate-400 font-bold mb-4">{res.fileCount} 個の元ファイルを結合</p>
                        </div>
                        <a 
                          href={res.url} 
                          download={`${res.groupName}.xlsx`}
                          className="flex items-center justify-center space-x-2 py-3 bg-emerald-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-50 hover:bg-emerald-700 transition-all"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>単体で保存</span>
                        </a>
                      </div>
                    ))}
                  </div>

                  <button 
                    onClick={reset}
                    className="mt-12 block mx-auto text-slate-400 hover:text-indigo-600 text-xs font-bold uppercase tracking-widest"
                  >
                    ← 別のファイルをアップロード
                  </button>
                </div>
              )}
            </div>
          </div>

          {!status.results.length && (
            <div>
              <div className="mt-10 p-6 bg-white rounded-3xl border border-slate-100 flex items-center space-x-4">
                <div className="bg-white p-4 rounded-3xl shadow-sm h-fit border border-slate-100">
                  <FolderOpen className="w-6 h-6 text-indigo-500" />
                </div>
                <div>
                  <h5 className="font-black text-slate-800 mb-1 leading-none text-lg">自動グルーピング</h5>
                  <p className="text-xs text-slate-400 font-medium leading-relaxed mt-2">
                    `_数字` 以外の部分が同じファイルは同じグループになります。例: `A中学_2026_小学理科_1_1` と `A中学_2026_小学理科_1_2` は `A中学_2026_小学理科_1` に結合。
                  </p>
                </div>
              </div>
              <div className="mt-10 p-6 bg-white rounded-3xl border border-slate-100 flex items-center space-x-4">
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
              <div className="mt-10 p-6 bg-white rounded-3xl border border-slate-100 flex items-center space-x-4">
                <div className="bg-white p-4 rounded-3xl shadow-sm h-fit border border-slate-100">
                  <Info className="w-6 h-6 text-indigo-500" />
                </div>
                <h5 className="font-black text-slate-800 mb-1 leading-none text-lg">一括ダウンロード対応</h5>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  複数の試験種を処理した際は、ページ上部のボタンからZIP形式で一括保存できるようになりました。
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="py-12 px-6 text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
        <p>© 2025 Excel Group Merger - Secure Browser Processing</p>
      </footer>
    </div>
  );
};

export default App;