#!/bin/sh
# usage: hl.sh <tool> '<json args>'
curl -s -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' https://hairlineui.com/api/mcp \
  -d "{\"jsonrpc\":\"2.0\",\"id\":3,\"method\":\"tools/call\",\"params\":{\"name\":\"$1\",\"arguments\":${2:-{\}}}}" \
 | python -I -c "import sys,json,re;sys.stdout.reconfigure(encoding='utf-8');t=sys.stdin.buffer.read().decode('utf-8');d=json.loads(re.search(r'\{.*\}',t,re.S).group(0));print('\n'.join(c.get('text','') for c in d['result']['content']))"
