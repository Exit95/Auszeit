import { defineMiddleware } from 'astro/middleware';

export const onRequest = defineMiddleware(async (context, next) => {
    const response = await next();

    // Basic Security Headers
    response.headers.set('X-Frame-Options', 'SAMEORIGIN');
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
        "frame-ancestors 'self'",
        "form-action 'self'",
        "base-uri 'self'",
        "object-src 'none'",
        "upgrade-insecure-requests",
    ].join('; ');
    response.headers.set('Content-Security-Policy', csp);

    // Cross-Origin Policies
    response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');
    response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
    response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
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
