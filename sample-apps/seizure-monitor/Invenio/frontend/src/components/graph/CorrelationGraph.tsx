import { useState, useCallback, useEffect } from 'react'
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  ConnectionMode,
  MarkerType,
  MiniMap,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import * as d3 from 'd3-force'

import { IGraphNode, IGraphEdge } from '@/types'
import { customNodeTypes } from './CustomNodes'
import { EvidenceDrawer } from './EvidenceDrawer'

interface CorrelationGraphProps {
  nodes: IGraphNode[]
  edges: IGraphEdge[]
  onNodeSelect?: (node: IGraphNode | null) => void
}

export function CorrelationGraph({ nodes: rawNodes, edges: rawEdges, onNodeSelect }: CorrelationGraphProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  
  const [selectedEdge, setSelectedEdge] = useState<IGraphEdge | null>(null)

  // Apply d3-force layout when rawNodes/rawEdges change
  useEffect(() => {
    if (!rawNodes.length) return

    // Initialize layout positions
    const simulationNodes = rawNodes.map((n) => ({
      ...n,
      x: Math.random() * 800,
      y: Math.random() * 600,
    }))

    const simulationEdges = rawEdges.map((e) => ({
      ...e,
      source: e.source,
      target: e.target,
    }))

    const simulation = d3
      .forceSimulation(simulationNodes)
      .force('charge', d3.forceManyBody().strength(-2000))
      .force('center', d3.forceCenter(400, 300))
      .force(
        'link',
        d3
          .forceLink(simulationEdges)
          .id((d: any) => d.id)
          .distance((d: any) => 150 - (d.weight * 100)) // Stronger weight = closer
      )
      .stop()

    // Run simulation synchronously
    for (let i = 0; i < 300; i++) {
      simulation.tick()
    }

    const flowNodes: Node[] = simulationNodes.map((n) => ({
      id: n.id,
      type: n.group,
      position: { x: n.x, y: n.y },
      data: { label: n.label, group: n.group, properties: n.properties },
      draggable: true,
    }))

    const flowEdges: Edge[] = rawEdges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: `${(e.weight * 100).toFixed(0)}%`,
      type: 'smoothstep',
      animated: e.weight > 0.5,
      style: { stroke: 'hsl(var(--primary))', strokeWidth: e.weight * 3 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: 'hsl(var(--primary))',
      },
      data: { raw: e }
    }))

    setNodes(flowNodes)
    setEdges(flowEdges)
  }, [rawNodes, rawEdges, setNodes, setEdges])

  const onNodeClick = useCallback((_: any, node: Node) => {
    if (onNodeSelect) {
      const raw = rawNodes.find(n => n.id === node.id)
      onNodeSelect(raw || null)
    }
    setSelectedEdge(null)
  }, [onNodeSelect, rawNodes])

  const onEdgeClick = useCallback((_: any, edge: Edge) => {
    setSelectedEdge(edge.data?.raw as IGraphEdge)
    if (onNodeSelect) onNodeSelect(null)
  }, [onNodeSelect])

  const onPaneClick = useCallback(() => {
    if (onNodeSelect) onNodeSelect(null)
    setSelectedEdge(null)
  }, [onNodeSelect])

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        nodeTypes={customNodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        className="bg-background"
        minZoom={0.2}
      >
        <Background color="hsl(var(--muted-foreground))" gap={16} size={1} />
        <Controls className="!bg-card !border-border !fill-foreground" />
        <MiniMap 
          className="!bg-card !border-border rounded-lg shadow-sm"
          maskColor="hsl(var(--muted) / 0.5)"
          nodeColor="hsl(var(--primary))"
        />
      </ReactFlow>

      {/* Evidence Drawer */}
      {selectedEdge && (
        <EvidenceDrawer 
          edge={selectedEdge} 
          onClose={() => setSelectedEdge(null)} 
        />
      )}
    </div>
  )
}
