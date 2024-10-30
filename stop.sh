#!/bin/bash

if [ -f "app.pid" ]; then
  PID=$(cat app.pid)
  echo "Stopping the app (PID: $PID)..."
  kill $PID
  rm app.pid
  echo "App stopped successfully."
else
  echo "The app is not currently running."
fi