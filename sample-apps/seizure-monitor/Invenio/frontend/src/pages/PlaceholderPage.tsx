import React from 'react'

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="p-12 text-center space-y-4">
      <h1 className="text-2xl font-bold">{title} View</h1>
      <p className="text-muted-foreground">This specialized view is under construction for Phase 6. Data is accessible via Context Inspector.</p>
    </div>
  )
}
