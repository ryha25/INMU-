#!/bin/sh
node server/index.cjs &
./node_modules/.bin/vite --host 0.0.0.0 --port 5000
