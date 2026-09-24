#!/bin/bash
set -e
cd "$(dirname "$0")/.."

echo "Docker Optimization Script"
echo "========================="

echo "Cleaning up unused Docker resources..."
docker system prune -f
docker volume prune -f
docker network prune -f

echo "Building optimized images..."
docker build --target runner -t sda-training:latest ./server

echo "Analyzing image size..."
docker images sda-training:latest

echo "Performance test..."
docker run --rm -d --name perf-test sda-training:latest
sleep 10
docker stats perf-test --no-stream || true
docker stop perf-test || true

echo "Optimization complete!"
