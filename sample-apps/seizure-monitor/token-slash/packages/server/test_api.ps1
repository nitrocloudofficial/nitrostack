$body = @{
    prompt = "Write a Python function that takes a list of numbers and returns the top 3 largest values sorted in descending order."
    userId = "demo-user"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:3001/api/optimize" -Method Post -Body $body -ContentType "application/json"
$response | ConvertTo-Json -Depth 5
