# Test through the Vite proxy (simulating what the frontend does)
$body = @{
    prompt = "Hi! I would like you to please kindly write me a Python function that takes a list of numbers and returns the top 3 largest values sorted in descending order. Could you please also handle edge cases like empty lists?"
    userId = "demo-user"
} | ConvertTo-Json

Write-Host "=== Testing via Vite Proxy (port 3000) ==="
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/optimize" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 10
    Write-Host "SUCCESS: Vite proxy forwarded to backend correctly!"
    Write-Host ""
    Write-Host "Original Prompt: $($response.originalPrompt.Substring(0, [Math]::Min(80, $response.originalPrompt.Length)))..."
    Write-Host "Optimized Prompt: $($response.optimizedPrompt.Substring(0, [Math]::Min(80, $response.optimizedPrompt.Length)))..."
    Write-Host "Token Savings: $($response.tokenSavingsPercentage)%"
    Write-Host "Original Tokens: $($response.originalTokens)"
    Write-Host "Optimized Tokens: $($response.optimizedTokens)"
    Write-Host "Recommended Model: $($response.recommendedModel.model) ($($response.recommendedModel.provider))"
    Write-Host "Monthly Savings: `$$($response.monthlySavingsEstimate)"
    Write-Host "Cost Savings Percent: $($response.costComparison.percentageSaved)%"
    Write-Host "Confidence: $($response.confidenceScore)%"
    Write-Host ""
    Write-Host "=== FULL E2E FLOW VERIFIED ==="
} catch {
    Write-Host "FAILED: $($_.Exception.Message)"
}
