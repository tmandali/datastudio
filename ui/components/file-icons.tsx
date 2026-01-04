import { cn } from "@/lib/utils"
import { BookOpen, FileText, FileJson } from "lucide-react"

export const PythonIcon = ({ className }: { className?: string }) => (
    <img
        src="/python.png"
        alt="Python"
        className={cn("size-4 object-contain", className)}
    />
)




export const SqlIcon = ({ className }: { className?: string }) => (
    <svg
        viewBox="0 0 24 24"
        className={cn("size-4", className)}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
    >
        <path
            d="M12 2C6.48 2 2 4.02 2 6.5S6.48 11 12 11s10-2.02 10-4.5S17.52 2 12 2Z"
            className="fill-pink-500/20 stroke-pink-500/50"
            strokeWidth="0.5"
        />
        <path
            d="M12 2C6.48 2 2 4.02 2 6.5v11c0 2.48 4.48 4.5 10 4.5s10-2.02 10-4.5v-11C22 4.02 17.52 2 12 2Z"
            stroke="#EC4899"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path
            d="M2 6.5C2 8.98 6.48 11 12 11s10-2.02 10-4.5"
            stroke="#EC4899"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path
            d="M2 12C2 14.48 6.48 16.5 12 16.5s10-2.02 10-4.5"
            stroke="#EC4899"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
)

export const JupyterIcon = ({ className }: { className?: string }) => (
    <BookOpen className={cn("size-4 text-orange-500", className)} />
)

export const MarkdownIcon = ({ className }: { className?: string }) => (
    <FileText className={cn("size-4 text-blue-400", className)} />
)

export const JsonIcon = ({ className }: { className?: string }) => (
    <FileJson className={cn("size-4 text-yellow-500", className)} />
)

export const PackageIcon = ({ className }: { className?: string }) => (
    <svg
        viewBox="0 0 24 24"
        className={cn("size-4", className)}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="m7.5 4.27 9 5.15" />
        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
        <path d="m3.3 7 8.7 5 8.7-5" />
        <path d="M12 22V12" />
    </svg>
)

export const RequirementsIcon = PackageIcon;

export const EnvIcon = ({ className }: { className?: string }) => (
    <svg
        viewBox="0 0 24 24"
        className={cn("size-4", className)}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        <circle cx="12" cy="12" r="3" />
    </svg>
)

export const StudioLogo = ({ className }: { className?: string }) => (
    <svg
        viewBox="0 0 32 32"
        className={cn("size-8", className)}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
    >
        <defs>
            <linearGradient id="studio-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#818cf8" />
                <stop offset="100%" stopColor="#60a5fa" />
            </linearGradient>
        </defs>

        {/* Main Hexagon Frame - High Contrast */}
        <path
            d="M16 4L27 10.35V21.65L16 28L5 21.65V10.35L16 4Z"
            stroke="url(#studio-grad)"
            strokeWidth="2.5"
            strokeLinejoin="round"
        />

        {/* Network lines */}
        <path
            d="M16 4V16M5 10.35L16 16M27 10.35L16 16M5 21.65L16 16M27 21.65L16 16M16 28V16"
            stroke="url(#studio-grad)"
            strokeWidth="1"
            strokeOpacity="0.5"
        />

        {/* Nodes - Glowing effect through solid bright colors */}
        <circle cx="16" cy="16" r="3" fill="white" />
        <circle cx="16" cy="16" r="1.5" fill="#4f46e5" />

        <circle cx="16" cy="4" r="2" fill="#818cf8" />
        <circle cx="16" cy="28" r="2" fill="#60a5fa" />
        <circle cx="5" cy="10.35" r="2" fill="#818cf8" />
        <circle cx="27" cy="10.35" r="2" fill="#818cf8" />
        <circle cx="5" cy="21.65" r="2" fill="#60a5fa" />
        <circle cx="27" cy="21.65" r="2" fill="#60a5fa" />
    </svg>
)
