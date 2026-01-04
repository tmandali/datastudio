"use client"

import React, { useMemo, useCallback, useState } from "react"
import DataEditor, {
    GridColumn,
    GridCell,
    GridCellKind,
    Theme,
    CompactSelection,
    Item
} from "@glideapps/glide-data-grid"
import "@glideapps/glide-data-grid/dist/index.css"
import { useTheme } from "next-themes"

interface TableData {
    columns: string[]
    data: Record<string, unknown>[]
}

interface DataGridProps {
    tableData: TableData
}

export function DataGrid({ tableData }: DataGridProps) {
    const { theme, resolvedTheme } = useTheme()
    const [mounted, setMounted] = useState(false)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    const isDark = mounted && (resolvedTheme === "dark" || (theme === "dark" && !resolvedTheme))

    const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})

    const columns = useMemo<GridColumn[]>(() => {
        return tableData.columns.map((col) => ({
            id: col,
            title: col,
            width: columnWidths[col] || 150,
            grow: 1,
        }))
    }, [tableData.columns, columnWidths])

    const getCellContent = useCallback(
        (cell: Item): GridCell => {
            const [colIndex, rowIndex] = cell
            const columnId = tableData.columns[colIndex]
            if (!columnId) return { kind: GridCellKind.Text, data: "", displayData: "", allowOverlay: false }

            const rowData = tableData.data[rowIndex]
            const value = rowData[columnId]

            if (value === null || value === undefined) {
                return {
                    kind: GridCellKind.Text,
                    data: "",
                    displayData: "NULL",
                    allowOverlay: false,
                    contentAlign: "left",
                    themeOverride: {
                        textLight: isDark ? "#4b5563" : "#9ca3af",
                        textDark: isDark ? "#4b5563" : "#9ca3af",
                    },
                }
            }

            const stringValue = String(value)

            return {
                kind: GridCellKind.Text,
                allowOverlay: true,
                displayData: stringValue,
                data: stringValue,
            }
        },
        [tableData, isDark]
    )

    const onColumnResize = useCallback((column: GridColumn, newSize: number) => {
        setColumnWidths(prev => ({ ...prev, [column.id || ""]: newSize }))
    }, [])

    const customTheme = useMemo<Partial<Theme>>(() => {
        return {
            accentColor: "#10b981", // Emerald-500 matching the checkmark
            accentLight: isDark ? "rgba(16, 185, 129, 0.1)" : "rgba(16, 185, 129, 0.05)",
            textDark: isDark ? "#fafafa" : "#171717",
            textMedium: isDark ? "#a3a3a3" : "#525252",
            textLight: isDark ? "#737373" : "#737373",
            bgCell: isDark ? "#0a0c10" : "#ffffff",
            bgHeader: isDark ? "#141820" : "#f5f5f5",
            bgHeaderHovered: isDark ? "#1c212b" : "#ebebeb",
            bgHeaderHasFocus: isDark ? "#1c212b" : "#ebebeb",
            borderColor: isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.1)",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            textHeader: isDark ? "#e5e5e5" : "#404040",
            headerIconColor: isDark ? "#a3a3a3" : "#737373",
            headerFontStyle: "600 12px",
            baseFontStyle: "12px",
        }
    }, [isDark])

    return (
        <div className="w-full h-full overflow-hidden border border-border/40 rounded-sm bg-background/50">
            <DataEditor
                width="100%"
                height="100%"
                columns={columns}
                rows={tableData.data.length}
                getCellContent={getCellContent}
                onColumnResize={onColumnResize}
                theme={customTheme}
                rowMarkers="number"
                headerHeight={28}
                rowHeight={26}
                gridSelection={{
                    columns: CompactSelection.empty(),
                    rows: CompactSelection.empty(),
                    current: undefined
                }}
                onGridSelectionChange={() => { }}
                getCellsForSelection={true}
                smoothScrollX={true}
                smoothScrollY={true}
            />
        </div>
    )
}
