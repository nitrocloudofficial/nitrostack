$body = @{
    prompt = "Hi! I would like you to please kindly write a Python function. Could you please make it so that it takes a list of numbers and I am trying to have it return the top 3 largest values sorted in descending order. Thank you! I was wondering if you could also handle edge cases like empty lists and lists with fewer than 3 elements. Thanks in advance!"
    userId = "demo-user"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:3001/api/optimize" -Method Post -Body $body -ContentType "application/json"
$response | ConvertTo-Json -Depth 5
