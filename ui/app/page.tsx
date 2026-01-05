"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/card"
import { Input } from "@/components/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/dialog"
import { Loader2, Plus, Trash2, Folder, Terminal, Box } from "lucide-react"

interface Workspace {
  name: string
  path: string
  created_at: number
}

const API_BASE = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:8000`
  : (process.env.NEXT_PUBLIC_WEBSOCKET_URL || "ws://localhost:8000").replace("ws://", "http://").replace("wss://", "https://").split('/ws')[0];

export default function WorkspaceManager() {
  const router = useRouter()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newWsName, setNewWsName] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const fetchWorkspaces = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/workspaces`)
      const data = await res.json()
      if (data.workspaces) {
        setWorkspaces(data.workspaces)
      }
    } catch (e) {
      console.error("Failed to fetch workspaces", e)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchWorkspaces()
  }, [])

  const handleCreateWorkspace = async () => {
    if (!newWsName.trim()) return

    setIsCreating(true)
    try {
      const res = await fetch(`${API_BASE}/api/workspaces`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newWsName }),
      })

      const data = await res.json()
      if (data.workspace) {
        setNewWsName("")
        setIsDialogOpen(false)
        fetchWorkspaces()
      } else {
        alert(data.error || "Failed to create workspace")
      }
    } catch (e) {
      alert("Error connecting to server")
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteWorkspace = async (e: React.MouseEvent, name: string) => {
    e.stopPropagation() // Prevent card click
    if (!confirm(`Are you sure you want to delete workspace "${name}"? This cannot be undone.`)) return

    try {
      const res = await fetch(`${API_BASE}/api/workspaces/${name}`, {
        method: "DELETE",
      })
      if (res.ok) {
        fetchWorkspaces()
      } else {
        alert("Failed to delete workspace")
      }
    } catch (e) {
      alert("Error connecting to server")
    }
  }

  const openWorkspace = (name: string) => {
    router.push(`/workspace/${name}`)
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">DataStudio Workspaces</h1>
            <p className="text-muted-foreground mt-2">Manage your isolated Python environments and project files.</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> New Workspace
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Workspace</DialogTitle>
                <DialogDescription>
                  This will create a new folder with an isolated virtual environment and Jupyter kernel.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Input
                  placeholder="Workspace Name (e.g., my-analysis)"
                  value={newWsName}
                  onChange={(e) => setNewWsName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateWorkspace()}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateWorkspace} disabled={isCreating}>
                  {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : workspaces.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed rounded-xl">
            <Box className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No workspaces found</h3>
            <p className="text-muted-foreground mb-4">Create your first workspace to get started.</p>
            <Button onClick={() => setIsDialogOpen(true)}>Create Workspace</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workspaces.map((ws) => (
              <Card
                key={ws.name}
                className="cursor-pointer hover:shadow-md transition-all border-zinc-200 dark:border-zinc-800 hover:border-primary/50 group"
                onClick={() => openWorkspace(ws.name)}
              >
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <Folder className="h-5 w-5 text-blue-500" />
                    {ws.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground mt-2 font-mono bg-zinc-100 dark:bg-zinc-900 px-2 py-1 rounded inline-block">
                    Kernel: ws_{ws.name}
                  </div>
                  <div className="flex items-center gap-2 mt-4 text-sm text-zinc-500">
                    <Terminal className="h-4 w-4" />
                    Isolated Environment
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between pt-4 border-t bg-zinc-50/50 dark:bg-zinc-900/50">
                  <div className="text-xs text-muted-foreground">
                    Created: {new Date(ws.created_at * 1000).toLocaleDateString()}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => handleDeleteWorkspace(e, ws.name)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
