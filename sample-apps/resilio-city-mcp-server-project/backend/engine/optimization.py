from ortools.algorithms.python import knapsack_solver

def optimize_budget(edges, budget_limit):
    solver = knapsack_solver.KnapsackSolver(
        knapsack_solver.SolverType.KNAPSACK_MULTIDIMENSION_BRANCH_AND_BOUND_SOLVER,
        'KnapsackExample'
    )
    
    values = []
    weights = [[]]
    edge_ids = []
    
    for edge in edges:
        if edge["failure_probability"] > 0.2:
            value = int(edge["criticality"] * edge["failure_probability"] * 1000)
            weight = int(edge["upgrade_cost"])
            
            values.append(value)
            weights[0].append(weight)
            edge_ids.append(edge["id"])
            
    if not values:
        return {"investments": [], "total_cost": 0, "expected_improvement": 0}
        
    capacities = [int(budget_limit)]
    
    solver.init(values, weights, capacities)
    computed_value = solver.solve()
    
    investments = []
    total_cost = 0
    
    for i in range(len(values)):
        if solver.best_solution_contains(i):
            investments.append(edge_ids[i])
            total_cost += weights[0][i]
            
    expected_improvement = (total_cost / max(1, budget_limit)) * 100
    
    return {
        "investments": investments,
        "total_cost": total_cost,
        "expected_improvement": min(expected_improvement, 100)
    }
