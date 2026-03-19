#!/usr/bin/env bash

set -euo pipefail

cd "$(dirname "$0")"
open -a "Google Chrome" 'chrome://inspect/#devices'

exec node --inspect-brk --input-type=module -e "import('./src/qualitativeUtils.js').then((mod) => mod.runExamples())"
