"use client"

import * as React from "react"
import {
    FileCode,
    Search,
    Trash2,
    Database,
    Pencil,
    Plus,
    FileIcon
} from "lucide-react"

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarGroupContent,
    SidebarMenuAction,
    SidebarInput,
    SidebarSeparator
} from "@/components/sidebar"
import { Button } from "@/components/button"
import { ProjectFile } from "./types"

interface WorkspaceSidebarProps extends React.ComponentProps<typeof Sidebar> {
    files: ProjectFile[]
    activeFileId: string
    searchQuery: string
    onSearchChange: (query: string) => void
    onSelectFile: (id: string) => void
    onDeleteFile: (id: string) => void
    onAddFile: (type: 'python' | 'sql') => void
}

export function WorkspaceSidebar({
    files,
    activeFileId,
    searchQuery,
    onSearchChange,
    onSelectFile,
    onDeleteFile,
    onAddFile,
    ...props
}: WorkspaceSidebarProps) {

    const filteredFiles = React.useMemo(() =>
        files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase())),
        [files, searchQuery]
    )

    const pythonFiles = React.useMemo(() =>
        filteredFiles.filter(f => f.language === 'python'),
        [filteredFiles]
    )

    const sqlFiles = React.useMemo(() =>
        filteredFiles.filter(f => f.language === 'sql'),
        [filteredFiles]
    )

    const renderFileItem = (file: ProjectFile) => (
        <SidebarMenuItem key={file.id}>
            <SidebarMenuButton
                isActive={activeFileId === file.id}
                onClick={() => onSelectFile(file.id)}
                className="data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:font-semibold transition-all duration-200"
            >
                {file.language === 'python' ? <FileCode className="size-4 opacity-70" /> : <Database className="size-4 opacity-70" />}
                <span className="truncate">{file.name.replace(/\.[^/.]+$/, "")}</span>
                {file.isDirty && (
                    <div className="ml-auto flex items-center">
                        <div className="size-2 rounded-full bg-blue-500 animate-pulse" />
                    </div>
                )}
            </SidebarMenuButton>
            <SidebarMenuAction showOnHover onClick={() => onDeleteFile(file.id)} className="cursor-pointer">
                <Trash2 className="size-3.5" />
                <span className="sr-only">Sil</span>
            </SidebarMenuAction>
        </SidebarMenuItem>
    )

    return (
        <Sidebar collapsible="icon" {...props} className="border-r border-border/40 bg-sidebar/80 backdrop-blur-xl">
            <SidebarHeader className="h-12 border-b border-border/40 px-4 flex justify-center bg-muted/10">
                <div className="flex items-center gap-2 font-semibold">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                        <Database className="size-5" />
                    </div>
                    <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                        <span className="truncate font-semibold">Data Studio</span>
                        <span className="truncate text-xs text-muted-foreground">Workspace</span>
                    </div>
                </div>
            </SidebarHeader>

            <SidebarContent>
                <div className="p-2 group-data-[collapsible=icon]:hidden">
                    <SidebarInput
                        placeholder="Dosya ara..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                    />
                </div>

                <SidebarGroup>
                    <div className="flex items-center justify-between px-2 py-1">
                        <div className="flex items-center gap-2">
                            <FileCode className="size-3.5 text-blue-500" />
                            <SidebarGroupLabel className="p-0 h-auto">Python Scripts</SidebarGroupLabel>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all"
                            onClick={() => onAddFile('python')}
                        >
                            <Plus className="size-3.5" />
                        </Button>
                    </div>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {pythonFiles.map(renderFileItem)}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                <SidebarSeparator className="mx-2 opacity-50" />

                <SidebarGroup>
                    <div className="flex items-center justify-between px-2 py-1">
                        <div className="flex items-center gap-2">
                            <Database className="size-3.5 text-emerald-500" />
                            <SidebarGroupLabel className="p-0 h-auto">SQL Queries</SidebarGroupLabel>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all"
                            onClick={() => onAddFile('sql')}
                        >
                            <Plus className="size-3.5" />
                        </Button>
                    </div>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {sqlFiles.map(renderFileItem)}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                {filteredFiles.length === 0 && (
                    <div className="p-8 text-xs text-muted-foreground text-center group-data-[collapsible=icon]:hidden opacity-60">
                        <Search className="size-8 mx-auto mb-2 opacity-20" />
                        Dosya bulunamadı.
                    </div>
                )}

                <SidebarGroup className="mt-auto border-t border-border/20 pt-4 pb-2 group-data-[collapsible=icon]:hidden">
                    <div className="px-3">
                        <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-50 mb-3">
                            Proje Özeti
                        </div>
                        <div className="flex gap-6">
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] text-muted-foreground/60 uppercase font-medium">Scripts</span>
                                <span className="text-base font-bold text-blue-500/90">{pythonFiles.length}</span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] text-muted-foreground/60 uppercase font-medium">Queries</span>
                                <span className="text-base font-bold text-emerald-500/90">{sqlFiles.length}</span>
                            </div>
                        </div>
                    </div>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter className="border-t border-border/40 p-2">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/20">
                    <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-xs text-primary">T</div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold truncate text-foreground">Tuncay</span>
                        <span className="text-[10px] text-muted-foreground truncate">tmr@lcwaikiki.com</span>
                    </div>
                </div>
            </SidebarFooter>
        </Sidebar>
    )
}
