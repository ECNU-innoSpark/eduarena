#!/usr/bin/env bash

set -euo pipefail

cd "$(dirname "$0")"

node --input-type=module -e "import('./src/qualitativeUtils.js').then((mod) => mod.runExamples())"
