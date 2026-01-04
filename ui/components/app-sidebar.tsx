"use client"

import * as React from "react"
import {
  AudioWaveform,
  Command,
  Database,
  FileCode,
  GalleryVerticalEnd,
  Settings,
  ShieldCheck,
} from "lucide-react"

import { Button } from "@/components/button"
import { NavFiles } from "@/components/nav-files"
import { NavUser } from "@/components/nav-user"
import { LanguageType } from "./studio/types"
import { TeamSwitcher } from "@/components/team-switcher"
import { PythonIcon, SqlIcon, JupyterIcon, MarkdownIcon, JsonIcon, StudioLogo, PackageIcon, RequirementsIcon, EnvIcon } from "@/components/file-icons"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarGroup,
  SidebarInput,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/sidebar"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/card"

// This is sample data.
// Sample data for static parts only
const staticData = {
  user: {
    name: "Timur MANDALI",
    email: "timur.mandali@lcwaikiki.com",
    avatar: "https://github.com/shadcn.png",
  },
  teams: [
    {
      name: "Data Studio",
      logo: StudioLogo,
      plan: "Lcw Digital",
    },
  ],
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  files?: any[]
  onFileClick?: (file: any) => void
  onAddFile?: (type: LanguageType) => void
}

function SidebarProjectInfo({
  reqFile,
  envFile,
  onFileClick
}: {
  reqFile: any,
  envFile: any,
  onFileClick?: (file: any) => void
}) {
  return (
    <SidebarMenu>
      {reqFile && (
        <SidebarMenuItem>
          <SidebarMenuButton
            onClick={() => onFileClick?.(reqFile)}
            tooltip="Paketler (requirements.txt)"
          >
            <RequirementsIcon className="size-4 text-purple-500" />
            <span>Paketler</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      )}
      {envFile && (
        <SidebarMenuItem>
          <SidebarMenuButton
            onClick={() => onFileClick?.(envFile)}
            tooltip="Ortam Değişkenleri (.env)"
          >
            <EnvIcon className="size-4 text-emerald-500" />
            <span>Ortam Değişkenleri</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      )}
    </SidebarMenu>
  )
}

export function AppSidebar({ files = [], onFileClick, onAddFile, ...props }: AppSidebarProps) {
  const pythonFiles = React.useMemo(() => files.filter(f => f.language === 'python' && !['.env', 'requirements.txt'].includes(f.name)), [files]);
  const sqlFiles = React.useMemo(() => files.filter(f => f.language === 'sql'), [files]);
  const jupyterFiles = React.useMemo(() => files.filter(f => f.language === 'jupyter'), [files]);
  const packageFiles = React.useMemo(() => files.filter(f => f.name === 'requirements.txt' || f.name === '.env'), [files]);
  const reqFile = React.useMemo(() => files.find(f => f.name === 'requirements.txt'), [files]);
  const envFile = React.useMemo(() => files.find(f => f.name === '.env'), [files]);
  const otherFiles = React.useMemo(() => files.filter(f =>
    !['python', 'sql', 'jupyter'].includes(f.language) &&
    !['requirements.txt', '.env'].includes(f.name)
  ), [files]);
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={staticData.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavFiles
          title="Python Scripts"
          files={pythonFiles}
          icon={PythonIcon}
          onFileClick={onFileClick}
          onAdd={() => onAddFile?.('python')}
        />
        <NavFiles
          title="SQL Queries"
          files={sqlFiles}
          icon={SqlIcon}
          onFileClick={onFileClick}
          onAdd={() => onAddFile?.('sql')}
        />

        {otherFiles.length > 0 && (
          <NavFiles
            title="Documents"
            files={otherFiles}
            icon={MarkdownIcon}
            onFileClick={onFileClick}
          />
        )}
      </SidebarContent>
      <SidebarFooter>
        <SidebarProjectInfo
          reqFile={reqFile}
          envFile={envFile}
          onFileClick={onFileClick}
        />
        <NavUser user={staticData.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
