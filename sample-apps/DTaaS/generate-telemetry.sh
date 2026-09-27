#!/bin/bash

# Configuration
TB_URL="https://thingsboard.cloud"
ACCESS_TOKEN="c9xVWS5OYg8nIbXXmOxq"
INTERVAL_SECONDS=5

echo "Starting telemetry generator for ThingsBoard device..."
echo "Target URL: $TB_URL/api/v1/$ACCESS_TOKEN/telemetry"
echo "Sending data every $INTERVAL_SECONDS seconds. Press [CTRL+C] to stop."
echo "--------------------------------------------------"

battery=100.0

while true; do
    # Generate random telemetry values
    temperature=$(echo "scale=2; 20.0 + $RANDOM % 100 / 10" | bc)
    humidity=$(echo "scale=2; 50.0 + $RANDOM % 200 / 10" | bc)
    
    # Decrease battery slowly, reset if low
    battery=$(echo "scale=2; $battery - 0.1" | bc)
    if (( $(echo "$battery < 10.0" | bc -l) )); then
        battery=100.0
    fi

    # Create JSON payload
    payload="{\"temperature\": $temperature, \"humidity\": $humidity, \"battery\": $battery}"
    
    echo "Sending: $payload"

    # Send POST request to ThingsBoard telemetry endpoint
    response=$(curl -s -o /dev/null -w "%{http_code}" \
        -X POST \
        -H "Content-Type: application/json" \
        -d "$payload" \
        "$TB_URL/api/v1/$ACCESS_TOKEN/telemetry")

    if [ "$response" -eq 200 ]; then
        echo "Status: Success (200)"
    else
        echo "Status: Failed with response code $response"
    fi

    sleep $INTERVAL_SECONDS
done
