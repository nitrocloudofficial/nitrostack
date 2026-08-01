# Full audit test - capture raw JSON output
$body = @{
    prompt = "I need to analyze quarterly sales data across 5 regions, identify trends, forecast Q4 revenue, and create a 2-slide executive summary. I have 6 months of historical data in CSV format."
    userId = "audit-user-001"
} | ConvertTo-Json

$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3001/api/optimize" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 15
    $stopwatch.Stop()
    Write-Host "=== RAW RESPONSE (elapsed: $($stopwatch.ElapsedMilliseconds)ms) ==="
    $response | ConvertTo-Json -Depth 10
} catch {
    $stopwatch.Stop()
    Write-Host "FAILED ($($stopwatch.ElapsedMilliseconds)ms): $($_.Exception.Message)"
}
