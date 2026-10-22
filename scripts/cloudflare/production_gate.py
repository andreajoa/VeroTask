#!/usr/bin/env python3
"""Read-only production and D1 smoke gate. Never triggers payments or mutates data.

Passing this gate is necessary but NOT sufficient for release: payment webhooks,
transactional email and live bookings require separately authenticated E2E tests.
"""
import concurrent.futures
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

PROD = 'https://www.verotask.online'
STAGING = 'https://verotask-d1-staging.andrealmeidashop.workers.dev'
TARGETS = [
    ('website', PROD + '/'),
    ('health', PROD + '/api/health'),
    ('readiness', PROD + '/api/ready'),
    ('stripe_monitor_unauthenticated', PROD + '/api/monitoring/stripe-webhook'),
    ('stripe_webhook_get', PROD + '/api/stripe/webhook'),
    ('dashboard_login_redirect', PROD + '/dashboard'),
    ('admin_login_redirect', PROD + '/admin'),
    ('sitemap', PROD + '/sitemap.xml'),
    ('d1_staging_health', STAGING + '/health'),
]


def check(entry):
    key, url = entry
    command = ['/usr/bin/curl', '--silent', '--show-error', '--max-time', '18',
               '-w', '\n%{http_code}', '--include', url]
    result = subprocess.run(command, capture_output=True, text=True)
    if result.returncode:
        return key, {'ok': False, 'error': 'connection_failed', 'details': result.stderr[:160]}
    try:
        raw, code = result.stdout.rsplit('\n', 1)
        code = int(code)
    except (ValueError, TypeError):
        return key, {'ok': False, 'error': 'invalid_http_response'}
    body = raw.split('\r\n\r\n', 1)[-1].split('\n\n', 1)[-1]
    try:
        data = json.loads(body)
    except json.JSONDecodeError:
        data = {}
    if key == 'health':
        ok = code == 200 and data.get('ok') is True
    elif key == 'readiness':
        ok = code == 200 and data.get('ok') is True and data.get('status') == 'ready'
    elif key == 'd1_staging_health':
        ok = code == 200 and data.get('ok') is True and data.get('tables') == 43 and data.get('production') is False
    elif key == 'stripe_monitor_unauthenticated':
        ok = code == 401 and data.get('error') == 'unauthorized'
    elif key == 'stripe_webhook_get':
        ok = code == 405
    elif key in ('dashboard_login_redirect', 'admin_login_redirect'):
        ok = code in (302, 303, 307, 308)
    else:
        ok = code == 200
    output = {'ok': ok, 'http': code}
    if key == 'readiness':
        output['checks'] = data.get('checks', {})
    return key, output


with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
    reports = dict(pool.map(check, TARGETS))
summary = {'verified_at_utc': datetime.now(timezone.utc).isoformat(),
           'overall': 'GO' if all(x.get('ok') for x in reports.values()) else 'NO_GO',
           'note': 'HTTP smoke tests only. GO does not replace live payment and migration reconciliation tests.',
           'checks': reports}
print(json.dumps(summary, ensure_ascii=False, indent=2, sort_keys=True))
sys.exit(0 if summary['overall'] == 'GO' else 1)
