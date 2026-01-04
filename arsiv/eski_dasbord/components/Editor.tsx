import React, { useEffect, useRef } from 'react';
import { useTheme } from "next-themes";
import { ProjectFile, ViewMode } from './types';

interface IMonacoEditor {
    getValue: () => string;
    setValue: (val: string) => void;
    layout: () => void;
    dispose: () => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getModel: () => any;
    onDidChangeModelContent: (cb: () => void) => void;
}

interface EditorProps {
    activeFile: ProjectFile;
    viewMode: ViewMode;
    onContentChange: (newContent: string) => void;
}

export function Editor({ activeFile, viewMode, onContentChange }: EditorProps) {
    const editorContainerRef = useRef<HTMLDivElement>(null);
    const monacoEditorRef = useRef<IMonacoEditor | null>(null);
    const isMonacoLoaded = useRef<boolean>(false);

    // Theme support
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = React.useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // --- MONACO KURULUMU ---
    useEffect(() => {
        if (monacoEditorRef.current) return;

        const initMonaco = () => {
            const win = window as any;
            if (!win.require) return;

            win.require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.34.1/min/vs' } });
            win.require(['vs/editor/editor.main'], () => {
                if (!editorContainerRef.current) return;
                if (monacoEditorRef.current) return;

                // Define custom theme matching "Midnight Slate"
                win.monaco.editor.defineTheme('midnight', {
                    base: 'vs-dark',
                    inherit: true,
                    rules: [],
                    colors: {
                        'editor.background': '#0a0c10',
                        'editor.lineHighlightBackground': '#141820',
                        'editorLineNumber.foreground': '#4b5563',
                        'editorLineNumber.activeForeground': '#9ca3af',
                        'editorIndentGuide.background': '#1f2937',
                        'editor.selectionBackground': '#264f78',
                        'editor.inactiveSelectionBackground': '#3a3d41'
                    }
                });

                const editor = win.monaco.editor.create(editorContainerRef.current, {
                    value: activeFile.content,
                    language: activeFile.language,
                    theme: resolvedTheme === 'dark' ? 'midnight' : 'vs',
                    automaticLayout: true,
                    fontSize: 13,
                    minimap: { enabled: false },
                    padding: { top: 12 },
                    scrollBeyondLastLine: false,
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                    lineNumbers: "on",
                    renderLineHighlight: "all",
                });
                monacoEditorRef.current = editor as IMonacoEditor;

                editor.onDidChangeModelContent(() => {
                    const val = editor.getValue() || "";
                    onContentChange(val);
                });
                isMonacoLoaded.current = true;
            });
        };

        const win = window as any;
        if (win.monaco) {
            initMonaco();
        } else {
            const scriptId = 'monaco-loader-script';
            let loaderScript = document.getElementById(scriptId) as HTMLScriptElement;
            if (!loaderScript) {
                loaderScript = document.createElement('script');
                loaderScript.id = scriptId;
                loaderScript.src = "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.34.1/min/vs/loader.js";
                loaderScript.async = true;
                document.head.appendChild(loaderScript);
            }

            const handleLoad = () => initMonaco();
            loaderScript.addEventListener('load', handleLoad);

            const interval = setInterval(() => {
                if (win.require) {
                    clearInterval(interval);
                    loaderScript.removeEventListener('load', handleLoad);
                    initMonaco();
                }
            }, 100);

            return () => {
                clearInterval(interval);
                loaderScript.removeEventListener('load', handleLoad);
            }
        }

        return () => {
            monacoEditorRef.current?.dispose();
            monacoEditorRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Update theme when it changes
    useEffect(() => {
        const win = window as any;
        if (isMonacoLoaded.current && win.monaco) {
            win.monaco.editor.setTheme(resolvedTheme === 'dark' ? 'midnight' : 'vs');
        }
    }, [resolvedTheme]);

    // Editor senkronu
    useEffect(() => {
        const win = window as any;
        if (monacoEditorRef.current && win.monaco && viewMode === 'editor') {
            const model = monacoEditorRef.current.getModel();
            if (model) {
                // Sadece içerik gerçekten farklıysa güncelle (sonsuz döngüyü önle)
                if (monacoEditorRef.current.getValue() !== activeFile.content) {
                    monacoEditorRef.current.setValue(activeFile.content);
                }
                win.monaco.editor.setModelLanguage(model, activeFile.language);
            }
        }
    }, [viewMode, activeFile.id, activeFile.content, activeFile.language]);

    return (
        <div ref={editorContainerRef} className="w-full h-full bg-white dark:bg-[#0a0c10] outline-none" />
    );
}
