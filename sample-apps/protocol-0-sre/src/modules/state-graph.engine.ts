export class StateGraph<State> {
  private nodes: Map<string, (state: State) => Promise<Partial<State> | void>> =
    new Map();
  private edges: Map<string, string> = new Map();
  private conditionalEdges: Map<
    string,
    (state: State) => string | Promise<string>
  > = new Map();

  addNode(name: string, fn: (state: State) => Promise<Partial<State> | void>) {
    this.nodes.set(name, fn);
    return this;
  }

  addEdge(from: string, to: string) {
    this.edges.set(from, to);
    return this;
  }

  addConditionalEdges(
    from: string,
    conditionFn: (state: State) => string | Promise<string>,
  ) {
    this.conditionalEdges.set(from, conditionFn);
    return this;
  }

  async execute(initialState: State, startNode: string): Promise<State> {
    let currentState = { ...initialState };
    let currentNode = startNode;
    const visited = new Set<string>();

    while (currentNode) {
      if (visited.has(currentNode)) {
        break;
      }
      visited.add(currentNode);

      const nodeFn = this.nodes.get(currentNode);
      if (!nodeFn) break;

      const update = await nodeFn(currentState);
      if (update) {
        currentState = { ...currentState, ...update };
      }

      if (this.edges.has(currentNode)) {
        currentNode = this.edges.get(currentNode)!;
      } else if (this.conditionalEdges.has(currentNode)) {
        const condFn = this.conditionalEdges.get(currentNode)!;
        currentNode = await condFn(currentState);
      } else {
        break;
      }
    }

    return currentState;
  }
}
