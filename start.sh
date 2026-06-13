#!/bin/sh
node server/index.cjs &
npx vite --host 0.0.0.0 --port 5000
