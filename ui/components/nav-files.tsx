"use client"

import {
    MoreHorizontal,
    Trash2,
    Play,
    Pencil,
    type LucideIcon,
    Plus,
} from "lucide-react"
import { Button } from "@/components/button"

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/dropdown-menu"
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuAction,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@/components/sidebar"

export function NavFiles({
    title,
    files,
    icon: Icon,
    onFileClick,
    onAdd,
}: {
    title: string
    files: {
        id?: string
        name: string
        url?: string
    }[]
    icon?: React.ComponentType<{ className?: string }>
    onFileClick?: (file: any) => void
    onAdd?: () => void
}) {
    return (
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
            <div className="flex items-center justify-between px-2 py-1.5">
                <div className="flex items-center gap-2">
                    {Icon && <Icon className="size-4" />}
                    <SidebarGroupLabel className="p-0 h-auto">{title}</SidebarGroupLabel>
                </div>
                {onAdd && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors"
                        onClick={(e) => {
                            e.stopPropagation();
                            onAdd();
                        }}
                    >
                        <Plus className="size-3.5" />
                    </Button>
                )}
            </div>
            <SidebarMenu>
                {files.map((item) => (
                    <SidebarMenuItem key={item.id || item.name}>
                        <SidebarMenuButton
                            onClick={() => onFileClick?.(item)}
                            className="cursor-pointer"
                            title={item.id || item.name} // Full path as tooltip
                        >
                            <span>{item.name.replace(/\.[^/.]+$/, "")}</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                ))}
            </SidebarMenu>
        </SidebarGroup>
    )
}
