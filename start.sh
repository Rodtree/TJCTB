#!/bin/bash

if [ -f "app.pid" ]; then
  echo "The app is already running. PID: $(cat app.pid)"
else
  echo "Starting your app..."
  node index.js > app.log 2>&1 &
  echo $! > app.pid
  echo "App started successfully. PID: $(cat app.pid)"
fi
#estoy enamorado de 4 babys
