#!/bin/bash
# Render sets the PORT environment variable strictly, but sometimes not PORT env. 
# We default to 10000 if not set.
PORT=${PORT:-10000}
exec gunicorn -w 4 -k uvicorn.workers.UvicornWorker backend.main:app --bind 0.0.0.0:$PORT
