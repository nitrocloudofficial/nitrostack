import React, { useState } from 'react'
import { MoreVertical, GripVertical, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EditableBlockProps {
  children: React.ReactNode
  className?: string
}

export function EditableBlock({ children, className }: EditableBlockProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div 
      className={cn("group flex items-start -ml-12 pl-12 py-1 relative", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Notion-style Left Action Menu */}
      <div 
        className={cn(
          "absolute left-0 top-1.5 flex items-center gap-1 text-muted-foreground transition-opacity duration-200",
          isHovered ? "opacity-100" : "opacity-0"
        )}
      >
        <button className="p-0.5 hover:bg-muted rounded-sm">
          <Plus className="w-4 h-4" />
        </button>
        <button className="p-0.5 hover:bg-muted rounded-sm cursor-grab active:cursor-grabbing">
          <GripVertical className="w-4 h-4" />
        </button>
      </div>
      
      {/* Block Content */}
      <div className="flex-1">
        {children}
      </div>
    </div>
  )
}
