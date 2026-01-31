import React, { useState, useEffect } from 'react';
import { 
  Upload, 
  FileText, 
  Trash2, 
  Download, 
  AlertCircle, 
  Loader2, 
  CheckCircle2, 
  ChevronRight, 
  FileJson, 
  Layers,
  ShieldCheck,
  Info,
  ExternalLink
} from 'lucide-react';
import { ExcelFile, ProcessingStatus } from './types.ts';
import { mergeExcelFiles, findCommonPrefix } from './services/excelService.ts';

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
        error: '処理中にエラーが発生しました。シート名が「構成」「内容」となっているか、正しい形式のExcelファイルか確認してください。',
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
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navigation / Header */}
      <nav className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-slate-800 tracking-tight">Excel Merger Pro</span>
          </div>
          <div className="flex items-center space-x-4 text-xs font-medium text-slate-500">
            <div className="flex items-center text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
              <ShieldCheck className="w-3.5 h-3.5 mr-1" />
              セキュア接続 (ブラウザ内処理)
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-grow py-10 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          {/* Main Card */}
          <div className="bg-white shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden border border-slate-200">
            {/* Steps Guide */}
            <div className="bg-slate-900 p-8 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 p-12 opacity-10">
                <FileText className="w-32 h-32 rotate-12" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Excelファイルのスマート結合</h1>
              <p className="text-slate-400 text-sm mb-6 max-w-md">
                複数のファイルをアップロードし、大問番号（構成:E列 / 内容:A列）に基づいて並べ替え・結合を行います。
              </p>
              
              <div className="grid grid-cols-3 gap-4 relative z-10">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-bold mb-2 shadow-lg shadow-indigo-500/30">1</div>
                  <span className="text-[10px] text-slate-300 font-medium">ファイル選択</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold mb-2">2</div>
                  <span className="text-[10px] text-slate-300 font-medium">大問順に並べ替え</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold mb-2">3</div>
                  <span className="text-[10px] text-slate-300 font-medium">一括ダウンロード</span>
                </div>
              </div>
            </div>

            <div className="p-8">
              {/* Security Banner */}
              <div className="mb-8 flex items-start p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                <Info className="w-5 h-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-blue-900 leading-none mb-1">プライバシーについて</h4>
                  <p className="text-xs text-blue-700 leading-relaxed">
                    選択されたデータはあなたのパソコン内でのみ処理されます。外部サーバーに送信されることはないため、機密データも安全に処理可能です。
                  </p>
                </div>
              </div>

              {/* Upload Area */}
              <div className="relative group">
                <label className={`
                  flex flex-col items-center justify-center w-full h-56 border-2 border-dashed rounded-2xl cursor-pointer
                  transition-all duration-300 transform
                  ${files.length > 0 ? 'bg-slate-50 border-indigo-200 scale-[0.99]' : 'bg-white border-slate-200 hover:border-indigo-400 hover:bg-slate-50 hover:shadow-inner'}
                `}>
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <div className="bg-indigo-50 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform">
                      <Upload className="w-8 h-8 text-indigo-600" />
                    </div>
                    <p className="mb-2 text-sm text-slate-700 font-bold">ここにExcelファイルをドロップ</p>
                    <p className="text-xs text-slate-400">または クリックしてフォルダから選択</p>
                  </div>
                  <input type="file" className="hidden" multiple accept=".xlsx" onChange={onFileChange} />
                </label>
              </div>

              {/* Result Preview Filename */}
              {files.length > 0 && !status.resultUrl && (
                <div className="mt-6 flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                   <div className="flex items-center space-x-2">
                     <FileJson className="w-4 h-4 text-indigo-500" />
                     <span className="text-xs font-semibold text-slate-500">出力名:</span>
                     <span className="text-xs font-bold text-slate-800">{outputFileName}.xlsx</span>
                   </div>
                   <button onClick={() => setFiles([])} className="text-[10px] font-bold text-red-500 hover:underline">やり直す</button>
                </div>
              )}

              {/* File List */}
              {files.length > 0 && !status.resultUrl && (
                <div className="mt-6">
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {files.map((file) => (
                      <div key={file.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center space-x-3 truncate">
                          <FileText className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                          <div className="truncate">
                            <p className="text-sm font-bold text-slate-700 truncate">{file.name}</p>
                            <p className="text-[10px] text-slate-400">{formatSize(file.size)}</p>
                          </div>
                        </div>
                        <button onClick={() => removeFile(file.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Processing Loader */}
              {status.isProcessing && (
                <div className="mt-8 py-10 flex flex-col items-center justify-center space-y-4">
                  <div className="relative">
                    <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
                    <Layers className="w-5 h-5 text-indigo-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <p className="text-indigo-900 font-bold animate-pulse">データを大問ごとに整理しています...</p>
                </div>
              )}

              {/* Error Display */}
              {status.error && (
                <div className="mt-8 p-4 bg-red-50 rounded-2xl flex items-start space-x-3 border border-red-100">
                  <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <span className="text-red-800 text-sm font-medium">{status.error}</span>
                </div>
              )}

              {/* Success View */}
              {status.resultUrl && (
                <div className="mt-8 p-10 bg-emerald-50 rounded-3xl border border-emerald-100 text-center animate-in zoom-in-95 duration-500">
                  <div className="bg-emerald-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-200">
                    <CheckCircle2 className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-black text-emerald-900 mb-2">結合完了！</h3>
                  <p className="text-emerald-700 text-sm mb-8">
                    大問ブロックを昇順に並べ替えました。<br/>以下のボタンからダウンロードできます。
                  </p>
                  <a href={status.resultUrl} download={`${outputFileName}.xlsx`}
                    className="group inline-flex items-center px-12 py-5 bg-emerald-600 text-white font-black rounded-2xl shadow-2xl hover:bg-emerald-700 transition-all hover:scale-105 active:scale-95 space-x-4">
                    <Download className="w-6 h-6 group-hover:bounce" />
                    <span className="text-lg">Excelを保存する</span>
                  </a>
                  <button onClick={() => {setFiles([]); setStatus(prev => ({ ...prev, resultUrl: null }));}} 
                    className="block mx-auto mt-8 text-emerald-600 text-xs font-bold hover:underline">
                    別のファイルを処理する
                  </button>
                </div>
              )}

              {/* Action Button */}
              {!status.isProcessing && !status.resultUrl && (
                <div className="mt-10">
                  <button onClick={handleMerge} disabled={files.length === 0}
                    className={`
                      w-full py-5 rounded-2xl font-black text-lg transition-all shadow-2xl flex items-center justify-center space-x-3
                      ${files.length > 0 
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-200 active:scale-[0.98]' 
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'}
                    `}>
                    <Layers className="w-5 h-5" />
                    <span>並べ替えて結合を開始</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Footer Guide */}
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-8 px-4">
            <div className="flex space-x-4">
              <div className="bg-white p-3 rounded-xl shadow-sm h-fit">
                <ChevronRight className="w-5 h-5 text-indigo-500" />
              </div>
              <div>
                <h5 className="font-bold text-slate-800 mb-1">構成シートのルール</h5>
                <p className="text-xs text-slate-500 leading-relaxed">E列にある大問番号を読み取ります。番号が空欄の行は、直前の大問に含まれるものとして扱われます。</p>
              </div>
            </div>
            <div className="flex space-x-4">
              <div className="bg-white p-3 rounded-xl shadow-sm h-fit">
                <ChevronRight className="w-5 h-5 text-indigo-500" />
              </div>
              <div>
                <h5 className="font-bold text-slate-800 mb-1">内容シートのルール</h5>
                <p className="text-xs text-slate-500 leading-relaxed">A列にある大問番号を読み取り、ブロック単位で順番を入れ替えて一つにまとめます。</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Page Footer */}
      <footer className="py-8 px-4 border-t border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between text-[10px] text-slate-400 font-medium">
          <p>© 2025 Excel Merger Pro - インストール不要のセキュアツール</p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a href="#" className="hover:text-slate-600 transition-colors">利用規約</a>
            <a href="#" className="hover:text-slate-600 transition-colors">プライバシーポリシー</a>
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="flex items-center hover:text-slate-600 transition-colors">
              技術詳細 <ExternalLink className="w-2.5 h-2.5 ml-1" />
            </a>
          </div>
        </div>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .bounce { animation: bounce 1s infinite; }
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
      `}</style>
    </div>
  );
};

export default App;