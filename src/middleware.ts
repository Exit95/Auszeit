import { defineMiddleware } from 'astro/middleware';

export const onRequest = defineMiddleware(async (context, next) => {
    const url = new URL(context.request.url);

    // CORS für Brenn-API (Mobile App)
    if (url.pathname.startsWith('/api/admin/brenn')) {
        const origin = context.request.headers.get('Origin') || '';
        if (context.request.method === 'OPTIONS') {
            return new Response(null, {
                status: 204,
                headers: {
                    'Access-Control-Allow-Origin': origin,
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                    'Access-Control-Max-Age': '86400',
                },
            });
        }
    }

    const response = await next();

    // CORS-Headers für Brenn-API
    if (url.pathname.startsWith('/api/admin/brenn')) {
        const origin = context.request.headers.get('Origin') || '';
        response.headers.set('Access-Control-Allow-Origin', origin);
        response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE');
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }

    // Basic Security Headers
    // X-Frame-Options wird von CSP frame-ancestors ersetzt (ALLOW-FROM ist deprecated)
    // Nicht setzen, da es sonst iframe-Embedding auf danapfel-digital.de blockiert
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    response.headers.set('X-XSS-Protection', '1; mode=block');

    // Content Security Policy (gehärtet: kein unsafe-eval, externe Domains whitelisted)
    const csp = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' https://unpkg.com https://js.stripe.com",
        "style-src 'self' 'unsafe-inline'",
        "font-src 'self' data:",
        "img-src 'self' data: blob:",
        "connect-src 'self' https://api.stripe.com",
        "frame-src https://js.stripe.com https://www.google.com https://maps.google.com",
        "frame-ancestors 'self' https://danapfel-digital.de https://www.danapfel-digital.de https://*.danapfel-digital.de",
        "form-action 'self'",
        "base-uri 'self'",
        "object-src 'none'",
        "upgrade-insecure-requests",
    ].join('; ');
    response.headers.set('Content-Security-Policy', csp);

    // Cross-Origin Policies
    response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');
    response.headers.set('Cross-Origin-Opener-Policy', 'unsafe-none');
    response.headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
    // Note: Cross-Origin-Embedder-Policy set to 'unsafe-none' to allow external images
    response.headers.set('Cross-Origin-Embedder-Policy', 'unsafe-none');

    // Permissions Policy (formerly Feature-Policy)
    const permissionsPolicy = [
        'accelerometer=()',
        'autoplay=()',
        'camera=(self)',
        'cross-origin-isolated=()',
        'display-capture=()',
        'encrypted-media=()',
        'fullscreen=(self)',
        'geolocation=()',
        'gyroscope=()',
        'keyboard-map=()',
        'magnetometer=()',
        'microphone=()',
        'midi=()',
        'payment=()',
        'picture-in-picture=()',
        'publickey-credentials-get=()',
        'screen-wake-lock=()',
        'sync-xhr=()',
        'usb=()',
        'web-share=()',
        'xr-spatial-tracking=()',
    ].join(', ');
    response.headers.set('Permissions-Policy', permissionsPolicy);

    return response;
});
