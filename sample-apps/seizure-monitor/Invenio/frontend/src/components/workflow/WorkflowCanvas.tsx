import { useMemo } from 'react'
import {
  ReactFlow,
  Controls,
  Background,
  Node,
  Edge,
  MarkerType,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { IWorkflowNodeState } from '@/types'
import { WorkflowNode } from './WorkflowNode'

interface WorkflowCanvasProps {
  nodesState: IWorkflowNodeState[]
}

const nodeTypes = {
  workflowNode: WorkflowNode,
}

export function WorkflowCanvas({ nodesState }: WorkflowCanvasProps) {
  
  // Arrange nodes in a vertical directed graph (pipeline)
  const { nodes, edges } = useMemo(() => {
    const flowNodes: Node[] = []
    const flowEdges: Edge[] = []
    
    nodesState.forEach((state, i) => {
      flowNodes.push({
        id: state.id,
        type: 'workflowNode',
        position: { x: 250, y: 100 + i * 150 },
        data: state as unknown as Record<string, unknown>,
        draggable: false,
      })
      
      if (i > 0) {
        const prev = nodesState[i - 1]
        
        // Edge styling depends on status
        let strokeColor = 'hsl(var(--muted-foreground))'
        let animated = false
        
        if (state.status === 'running') {
          strokeColor = 'hsl(var(--primary))'
          animated = true
        } else if (state.status === 'completed') {
          strokeColor = 'hsl(142 71% 45%)' // green
        } else if (state.status === 'failed' || prev.status === 'failed') {
          strokeColor = 'hsl(var(--destructive))'
        }
        
        flowEdges.push({
          id: `edge_${prev.id}_${state.id}`,
          source: prev.id,
          target: state.id,
          animated,
          style: { stroke: strokeColor, strokeWidth: 2, transition: 'stroke 0.3s' },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: strokeColor,
          },
        })
      }
    })
    
    return { nodes: flowNodes, edges: flowEdges }
  }, [nodesState])

  return (
    <div className="flex-1 w-full h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.5 }}
        minZoom={0.5}
        maxZoom={1.5}
        className="bg-background"
        proOptions={{ hideAttribution: true }}
      >
        <Background color="hsl(var(--muted-foreground))" gap={16} size={1} />
        <Controls className="!bg-card !border-border !fill-foreground" />
      </ReactFlow>
    </div>
  )
}
