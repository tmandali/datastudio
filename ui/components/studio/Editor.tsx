import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { useTheme } from "next-themes";
import { ProjectFile, ViewMode } from './types';

interface IMonacoEditor {
    getValue: () => string;
    setValue: (val: string) => void;
    layout: () => void;
    dispose: () => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getModel: () => any;
    getSelection: () => any;
    onDidChangeModelContent: (cb: () => void) => void;
}

export interface EditorHandle {
    getSelection: () => string;
}

interface EditorProps {
    activeFile: ProjectFile;
    viewMode: ViewMode;
    onContentChange: (newContent: string) => void;
    onRunCode?: (code: string) => void;
}

export const Editor = forwardRef<EditorHandle, EditorProps>(({ activeFile, viewMode, onContentChange, onRunCode }, ref) => {
    const editorContainerRef = useRef<HTMLDivElement>(null);
    const monacoEditorRef = useRef<IMonacoEditor | null>(null);
    const isMonacoLoaded = useRef<boolean>(false);

    // Theme support
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = React.useState(false);
    const currentWorkspaceRef = useRef<string | null>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Update workspace ref whenever active file changes
    useEffect(() => {
        const path = activeFile.path || activeFile.id;
        if (path && path.includes('.datastudio/')) {
            currentWorkspaceRef.current = path.split('.datastudio/')[1].split('/')[0];
        } else {
            currentWorkspaceRef.current = null;
        }
    }, [activeFile]);

    const onContentChangeRef = useRef(onContentChange);
    useEffect(() => {
        onContentChangeRef.current = onContentChange;
    }, [onContentChange]);

    const onRunCodeRef = useRef(onRunCode);
    useEffect(() => {
        onRunCodeRef.current = onRunCode;
    }, [onRunCode]);

    useImperativeHandle(ref, () => ({
        getSelection: () => {
            if (monacoEditorRef.current) {
                const selection = monacoEditorRef.current.getSelection();
                if (selection && !selection.isEmpty()) {
                    const model = monacoEditorRef.current.getModel();
                    return model.getValueInRange(selection);
                }
            }
            return "";
        }
    }));

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

                // Register and define .env language
                win.monaco.languages.register({ id: 'env' });
                win.monaco.languages.setMonarchTokensProvider('env', {
                    tokenizer: {
                        root: [
                            [/^\s*#.*$/, 'comment'],
                            [/^([^=]+)(=)(.*)$/, ['variable', 'operator', 'string']],
                        ]
                    }
                });

                // Register and define requirements.txt language
                win.monaco.languages.register({ id: 'pip-requirements' });
                win.monaco.languages.setMonarchTokensProvider('pip-requirements', {
                    tokenizer: {
                        root: [
                            [/^\s*#.*$/, 'comment'],
                            [/^(-[a-zA-Z]+|--[a-zA-Z-]+)/, 'keyword'],
                            [/^([a-zA-Z0-9._-]+)/, 'variable'],
                            [/([<>=!~]+)/, 'operator'],
                            [/([a-zA-Z0-9._-]+)$/, 'string'],
                        ]
                    }
                });

                // Helper to get workspace from Ref
                const getWsName = () => currentWorkspaceRef.current;

                const API_BASE = typeof window !== 'undefined'
                    ? `${window.location.protocol}//${window.location.hostname}:8000`
                    : (process.env.NEXT_PUBLIC_WEBSOCKET_URL || "ws://localhost:8000").replace("ws://", "http://").replace("wss://", "https://").split('/ws')[0];

                // Inlay Hints Provider for pip-requirements
                win.monaco.languages.registerInlayHintsProvider('pip-requirements', {
                    provideInlayHints: async (model: any) => {
                        const wsName = getWsName();
                        if (!wsName) return { hints: [] };

                        try {
                            const res = await fetch(`${API_BASE}/api/workspaces/${wsName}/packages`);
                            const pkgVersions = await res.json();
                            if (!pkgVersions || pkgVersions.error) return { hints: [] };

                            const hints: any[] = [];
                            const lines = model.getLinesContent();

                            lines.forEach((line: string, i: number) => {
                                const trimmed = line.trim();
                                if (trimmed && !trimmed.startsWith('#') && !trimmed.includes('=') && !trimmed.includes('<') && !trimmed.includes('>')) {
                                    const pkgName = trimmed.toLowerCase();
                                    const version = pkgVersions[pkgName];
                                    if (version) {
                                        hints.push({
                                            label: `==${version}`,
                                            tooltip: `Şu an yüklü versiyon: ${version}`,
                                            position: { lineNumber: i + 1, column: line.length + 1 },
                                            kind: 1,
                                            paddingLeft: true
                                        });
                                    }
                                }
                            });
                            return { hints, dispose: () => { } };
                        } catch (e) {
                            return { hints: [] };
                        }
                    }
                });

                // popular python packages for IntelliSense
                const POPULAR_PYTHON_PACKAGES = [
                    "pandas", "numpy", "matplotlib", "seaborn", "scikit-learn", "scipy", "plotly", "duckdb",
                    "sqlalchemy", "requests", "beautifulsoup4", "fastapi", "uvicorn", "pydantic", "flask",
                    "django", "pytest", "torch", "tensorflow", "keras", "transformers", "nltk", "spacy",
                    "openpyxl", "python-dotenv", "tqdm", "boto3", "pyyaml", "pillow", "opencv-python",
                    "redis", "pymongo", "psycopg2-binary", "mysql-connector-python", "pyarrow", "rich",
                    "click", "typer", "black", "isort", "alembic", "celery", "redis", "lxml", "selenium"
                ];

                // Autocomplete Provider for pip-requirements
                win.monaco.languages.registerCompletionItemProvider('pip-requirements', {
                    provideCompletionItems: async (model: any, position: any) => {
                        const word = model.getWordUntilPosition(position);
                        const range = {
                            startLineNumber: position.lineNumber,
                            endLineNumber: position.lineNumber,
                            startColumn: word.startColumn,
                            endColumn: word.endColumn
                        };

                        const content = model.getValue();
                        // Simple regex to find all package names already in the file
                        // Matches start of line or space, followed by package name chars, until end of name (operator or space or end of line)
                        const existingPackages = new Set(
                            content.split(/\n/)
                                .map((l: string) => l.trim().split(/[=<>]|==/)[0].trim().toLowerCase())
                                .filter((l: string) => l && !l.startsWith('#'))
                        );

                        // 1. Start with static popular packages
                        let suggestions: any[] = POPULAR_PYTHON_PACKAGES
                            .filter(pkg => !existingPackages.has(pkg.toLowerCase()))
                            .map(pkg => ({
                                label: pkg,
                                kind: win.monaco.languages.CompletionItemKind.Class,
                                insertText: pkg,
                                range: range,
                                detail: "Popüler Paket"
                            }));

                        // 2. Add currently installed packages from workspace
                        const wsName = getWsName();
                        if (wsName) {
                            try {
                                const res = await fetch(`${API_BASE}/api/workspaces/${wsName}/packages`);
                                const pkgVersions = await res.json();
                                if (pkgVersions && !pkgVersions.error) {
                                    Object.keys(pkgVersions).forEach(pkg => {
                                        const pkgLower = pkg.toLowerCase();
                                        if (!POPULAR_PYTHON_PACKAGES.includes(pkg) && !existingPackages.has(pkgLower)) {
                                            suggestions.push({
                                                label: pkg,
                                                kind: win.monaco.languages.CompletionItemKind.Module,
                                                insertText: pkg,
                                                range: range,
                                                detail: `Sistemde Yüklü (${pkgVersions[pkg]})`
                                            });
                                        }
                                    });
                                }
                            } catch (e) { }
                        }

                        return { suggestions };
                    }
                });

                // SQL Folding Provider - Statement level folding (enhanced with Regex)
                win.monaco.languages.registerFoldingRangeProvider('sql', {
                    provideFoldingRanges: (model: any) => {
                        const ranges: any[] = [];
                        const lines = model.getLinesContent();
                        let currentStart = -1;

                        for (let i = 0; i < lines.length; i++) {
                            const line = lines[i];
                            const trimmed = line.trim();

                            // 1. Identify valid statement start
                            if (trimmed !== '' && !trimmed.startsWith('--') && currentStart === -1) {
                                currentStart = i + 1;
                            }

                            // 2. Detect end-of-statement semicolon using Regex
                            // Matches a semicolon followed by optional spaces and/or a comment till end of line
                            if (/;\s*(?:--.*)?$/.test(trimmed)) {
                                if (currentStart !== -1 && i + 1 > currentStart) {
                                    ranges.push({
                                        start: currentStart,
                                        end: i + 1,
                                        kind: win.monaco.languages.FoldingRangeKind.Region
                                    });
                                }
                                currentStart = -1;
                            }
                        }

                        return ranges;
                    }
                });

                const editor = win.monaco.editor.create(editorContainerRef.current, {
                    value: activeFile.content,
                    language: activeFile.name === '.env' ? 'env' :
                        activeFile.name === 'requirements.txt' ? 'pip-requirements' :
                            (activeFile.language === 'jupyter' ? 'json' : activeFile.language),
                    theme: resolvedTheme === 'dark' ? 'midnight' : 'vs',
                    automaticLayout: true,
                    fontSize: 13,
                    minimap: { enabled: false },
                    folding: true,
                    foldingHighlight: true,
                    foldingStrategy: 'auto',
                    showFoldingControls: 'always',
                    padding: { top: 12 },
                    scrollBeyondLastLine: false,
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                    lineNumbers: "on",
                    renderLineHighlight: "all",
                    unicodeHighlight: { ambiguousCharacters: false },
                    // Explicitly enable inlay hints
                    "editor.inlayHints.enabled": "on",
                    "editor.inlayHints.fontSize": 11,
                    "editor.inlayHints.fontFamily": "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                } as any);
                // Command to run statement
                const runStatementCommandId = (editor as any).addCommand(0, (_accessor: any, code: string) => {
                    onRunCodeRef.current?.(code);
                });

                // SQL CodeLens Provider - Statement level "Run" buttons
                win.monaco.languages.registerCodeLensProvider('sql', {
                    provideCodeLenses: (model: any) => {
                        const lenses: any[] = [];
                        const lines = model.getLinesContent();
                        let currentStart = -1;

                        for (let i = 0; i < lines.length; i++) {
                            const line = lines[i];
                            const trimmed = line.trim();

                            if (trimmed !== '' && !trimmed.startsWith('--') && currentStart === -1) {
                                currentStart = i + 1;
                            }

                            if (/;\s*(?:--.*)?$/.test(trimmed)) {
                                if (currentStart !== -1) {
                                    const statementCode = model.getValueInRange({
                                        startLineNumber: currentStart,
                                        startColumn: 1,
                                        endLineNumber: i + 1,
                                        endColumn: line.length + 1
                                    });

                                    lenses.push({
                                        range: {
                                            startLineNumber: currentStart,
                                            startColumn: 1,
                                            endLineNumber: currentStart,
                                            endColumn: 1
                                        },
                                        command: {
                                            id: runStatementCommandId,
                                            title: "▶ Sorguyu Çalıştır",
                                            arguments: [statementCode]
                                        }
                                    });
                                }
                                currentStart = -1;
                            }
                        }
                        return { lenses, dispose: () => { } };
                    }
                });

                const editorInstance = editor as IMonacoEditor;
                monacoEditorRef.current = editorInstance;

                editor.onDidChangeModelContent(() => {
                    const val = editor.getValue() || "";
                    onContentChangeRef.current(val);
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
                const lang = activeFile.name === '.env' ? 'env' :
                    activeFile.name === 'requirements.txt' ? 'pip-requirements' :
                        (activeFile.language === 'jupyter' ? 'json' : activeFile.language);
                win.monaco.editor.setModelLanguage(model, lang);
            }
        }
    }, [viewMode, activeFile.id, activeFile.content, activeFile.language, activeFile.name]);

    return (
        <div ref={editorContainerRef} className="w-full h-full bg-white dark:bg-[#0a0c10] outline-none" />
    );
});

Editor.displayName = "Editor";
