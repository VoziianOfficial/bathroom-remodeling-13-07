<?php

declare(strict_types=1);

/**
 * BathNice contact-form endpoint.
 *
 * Responsibilities:
 * - accept POST requests from the Contact page;
 * - return JSON for AJAX requests and HTML for native submissions;
 * - validate and normalize all submitted fields;
 * - reject cross-origin requests and oversized submissions;
 * - use a honeypot and lightweight rate limiting;
 * - prevent immediate duplicate submissions;
 * - send a plain-text UTF-8 email through the server mail transport.
 *
 * Hosting note:
 * PHP mail delivery must be configured by the hosting provider.
 * The recipient and sender can be changed through environment variables:
 *
 * BATHNICE_CONTACT_RECIPIENT=hello@bathnice.com
 * BATHNICE_MAIL_FROM=no-reply@bathnice.com
 */

const BATHNICE_MAX_POST_BYTES = 65536;
const BATHNICE_RATE_WINDOW = 600;
const BATHNICE_RATE_MAX_REQUESTS = 6;
const BATHNICE_DUPLICATE_WINDOW = 180;

/* =========================================================
   Security Headers
   ========================================================= */

header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

/* =========================================================
   General Helpers
   ========================================================= */

/**
 * Escape text for HTML output.
 */
function escapeHtml(string $value): string
{
    return htmlspecialchars(
        $value,
        ENT_QUOTES | ENT_SUBSTITUTE,
        'UTF-8'
    );
}

/**
 * Determine whether the request expects JSON.
 */
function expectsJsonResponse(): bool
{
    $accept = strtolower(
        (string) ($_SERVER['HTTP_ACCEPT'] ?? '')
    );

    $requestedWith = strtolower(
        (string) ($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '')
    );

    return (
        strpos($accept, 'application/json') !== false ||
        $requestedWith === 'xmlhttprequest'
    );
}

/**
 * Return a JSON or regular HTML response.
 *
 * @param array<string, mixed> $payload
 */
function respond(
    int $statusCode,
    array $payload
): void {
    http_response_code($statusCode);

    if (expectsJsonResponse()) {
        header(
            'Content-Type: application/json; charset=UTF-8'
        );

        $json = json_encode(
            $payload,
            JSON_UNESCAPED_SLASHES |
                JSON_UNESCAPED_UNICODE
        );

        if ($json === false) {
            echo '{"success":false,"message":"Unable to encode the server response."}';
        } else {
            echo $json;
        }

        exit;
    }

    header('Content-Type: text/html; charset=UTF-8');

    $success = ($payload['success'] ?? false) === true;

    $title = $success
        ? 'Request received'
        : 'Request not submitted';

    $eyebrow = $success
        ? 'Thank you'
        : 'Review required';

    $message = isset($payload['message'])
        ? (string) $payload['message']
        : 'The request could not be processed.';

    $errors = [];

    if (
        isset($payload['errors']) &&
        is_array($payload['errors'])
    ) {
        foreach ($payload['errors'] as $error) {
            if (is_string($error) && $error !== '') {
                $errors[] = $error;
            }
        }
    }

    $buttonLabel = $success
        ? 'Return to BathNice'
        : 'Return to the Request Form';

    $buttonUrl = $success
        ? 'index.html'
        : 'contact.html#project-request-form';

?>
    <!DOCTYPE html>
    <html lang="en">

    <head>
        <meta charset="UTF-8">
        <meta
            name="viewport"
            content="width=device-width, initial-scale=1">

        <title>
            <?= escapeHtml($title); ?> | BathNice
        </title>

        <meta name="robots" content="noindex, nofollow">
        <meta name="theme-color" content="#1A1B18">

        <link
            rel="icon"
            href="assets/images/favicon.svg"
            type="image/svg+xml">

        <link
            rel="preconnect"
            href="https://fonts.googleapis.com">

        <link
            rel="preconnect"
            href="https://fonts.gstatic.com"
            crossorigin>

        <link
            href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&amp;family=Manrope:wght@400;500;600;700&amp;display=swap"
            rel="stylesheet">

        <link
            rel="stylesheet"
            href="assets/css/global.css">
    </head>

    <body>
        <main
            class="section section--paper"
            id="main-content">
            <div class="container-editorial">
                <span class="eyebrow">
                    <?= escapeHtml($eyebrow); ?>
                </span>

                <h1>
                    <?= escapeHtml($title); ?>
                </h1>

                <p class="lead">
                    <?= escapeHtml($message); ?>
                </p>

                <?php if ($errors !== []): ?>
                    <ul>
                        <?php foreach ($errors as $error): ?>
                            <li>
                                <?= escapeHtml($error); ?>
                            </li>
                        <?php endforeach; ?>
                    </ul>
                <?php endif; ?>

                <p class="platform-notice">
                    BathNice is an independent provider-matching platform.
                    Submitting a request does not create a remodeling agreement.
                </p>

                <a
                    class="button button--primary"
                    href="<?= escapeHtml($buttonUrl); ?>">
                    <?= escapeHtml($buttonLabel); ?>
                </a>
            </div>
        </main>
    </body>

    </html>
<?php

    exit;
}

/**
 * Normalize a single-line value.
 */
function normalizeSingleLine(string $value): string
{
    $value = strip_tags($value);

    $value = preg_replace(
        '/[\x00-\x1F\x7F]+/u',
        ' ',
        $value
    ) ?? $value;

    $value = preg_replace(
        '/\s+/u',
        ' ',
        $value
    ) ?? $value;

    return trim($value);
}

/**
 * Normalize a multiline message while preserving line breaks.
 */
function normalizeMultiline(string $value): string
{
    $value = strip_tags($value);

    $value = str_replace(
        ["\r\n", "\r"],
        "\n",
        $value
    );

    $value = preg_replace(
        '/[^\P{C}\n\t]+/u',
        '',
        $value
    ) ?? $value;

    $lines = explode("\n", $value);
    $normalizedLines = [];

    foreach ($lines as $line) {
        $line = preg_replace(
            '/[ \t]+/u',
            ' ',
            $line
        ) ?? $line;

        $normalizedLines[] = trim($line);
    }

    $value = implode("\n", $normalizedLines);

    $value = preg_replace(
        "/\n{3,}/",
        "\n\n",
        $value
    ) ?? $value;

    return trim($value);
}

/**
 * UTF-8-safe string length where possible.
 */
function stringLength(string $value): int
{
    if (function_exists('mb_strlen')) {
        return mb_strlen($value, 'UTF-8');
    }

    return strlen($value);
}

/**
 * Read a submitted string safely.
 */
function postString(string $fieldName): string
{
    $value = $_POST[$fieldName] ?? '';

    if (is_array($value)) {
        return '';
    }

    return (string) $value;
}

/**
 * Return the current server host without a port.
 */
function currentHost(): string
{
    $host = strtolower(
        trim((string) ($_SERVER['HTTP_HOST'] ?? ''))
    );

    return (string) preg_replace(
        '/:\d+$/',
        '',
        $host
    );
}

/**
 * Verify Origin or Referer when the browser supplies one.
 */
function isSameOriginRequest(): bool
{
    $currentHost = currentHost();

    if ($currentHost === '') {
        return true;
    }

    $origin = trim(
        (string) ($_SERVER['HTTP_ORIGIN'] ?? '')
    );

    $referer = trim(
        (string) ($_SERVER['HTTP_REFERER'] ?? '')
    );

    $source = $origin !== '' ? $origin : $referer;

    if ($source === '' || strtolower($source) === 'null') {
        return true;
    }

    $sourceHost = parse_url($source, PHP_URL_HOST);

    if (!is_string($sourceHost) || $sourceHost === '') {
        return false;
    }

    return strtolower($sourceHost) === $currentHost;
}

/**
 * Initialize a secure session when sessions are available.
 */
function initializeSession(): void
{
    if (
        session_status() !== PHP_SESSION_NONE ||
        headers_sent()
    ) {
        return;
    }

    $isSecure = (
        !empty($_SERVER['HTTPS']) &&
        strtolower((string) $_SERVER['HTTPS']) !== 'off'
    );

    session_name('bathnice_request');

    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => $isSecure,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);

    @session_start();
}

/**
 * Obtain the direct client address.
 *
 * Proxy headers are intentionally not trusted here.
 */
function clientAddress(): string
{
    $address = trim(
        (string) ($_SERVER['REMOTE_ADDR'] ?? '')
    );

    return $address !== '' ? $address : 'unknown';
}

/* =========================================================
   Lightweight Rate Limiting
   ========================================================= */

/**
 * Check and record an IP-based attempt in the system temp directory.
 *
 * A storage failure does not block legitimate form use.
 */
function rateLimitAllowsRequest(): bool
{
    $directory = rtrim(
        sys_get_temp_dir(),
        DIRECTORY_SEPARATOR
    ) . DIRECTORY_SEPARATOR . 'bathnice-contact-rate';

    if (
        !is_dir($directory) &&
        !@mkdir($directory, 0700, true) &&
        !is_dir($directory)
    ) {
        return true;
    }

    $key = hash(
        'sha256',
        clientAddress()
    );

    $filePath = $directory .
        DIRECTORY_SEPARATOR .
        $key .
        '.json';

    $handle = @fopen($filePath, 'c+');

    if ($handle === false) {
        return true;
    }

    $allowed = true;

    try {
        if (!flock($handle, LOCK_EX)) {
            return true;
        }

        rewind($handle);
        $contents = stream_get_contents($handle);

        $stored = [];

        if (is_string($contents) && $contents !== '') {
            $decoded = json_decode($contents, true);

            if (is_array($decoded)) {
                $stored = $decoded;
            }
        }

        $now = time();
        $minimumTimestamp = $now - BATHNICE_RATE_WINDOW;

        $attempts = [];

        foreach ($stored as $timestamp) {
            if (
                is_int($timestamp) &&
                $timestamp >= $minimumTimestamp
            ) {
                $attempts[] = $timestamp;
            }
        }

        if (
            count($attempts) >=
            BATHNICE_RATE_MAX_REQUESTS
        ) {
            $allowed = false;
        } else {
            $attempts[] = $now;

            rewind($handle);
            ftruncate($handle, 0);

            fwrite(
                $handle,
                (string) json_encode($attempts)
            );

            fflush($handle);
        }

        flock($handle, LOCK_UN);
    } finally {
        fclose($handle);
    }

    return $allowed;
}

/* =========================================================
   Duplicate Protection
   ========================================================= */

/**
 * Build a non-reversible fingerprint of the submitted request.
 */
function submissionFingerprint(
    string $email,
    string $phone,
    string $service,
    string $message
): string {
    return hash(
        'sha256',
        strtolower($email) .
            '|' .
            preg_replace('/\D+/', '', $phone) .
            '|' .
            strtolower($service) .
            '|' .
            $message
    );
}

/**
 * Detect a recently successful duplicate submission.
 */
function isRecentDuplicate(string $fingerprint): bool
{
    if (session_status() !== PHP_SESSION_ACTIVE) {
        return false;
    }

    $lastFingerprint = (string) (
        $_SESSION['bathnice_last_fingerprint'] ?? ''
    );

    $lastTime = (int) (
        $_SESSION['bathnice_last_submission_time'] ?? 0
    );

    return (
        $lastFingerprint !== '' &&
        hash_equals($lastFingerprint, $fingerprint) &&
        $lastTime > 0 &&
        (time() - $lastTime) < BATHNICE_DUPLICATE_WINDOW
    );
}

/**
 * Record a successful form submission.
 */
function rememberSuccessfulSubmission(
    string $fingerprint
): void {
    if (session_status() !== PHP_SESSION_ACTIVE) {
        return;
    }

    $_SESSION['bathnice_last_fingerprint'] =
        $fingerprint;

    $_SESSION['bathnice_last_submission_time'] =
        time();
}

/* =========================================================
   Request Requirements
   ========================================================= */

if (
    strtoupper(
        (string) ($_SERVER['REQUEST_METHOD'] ?? '')
    ) !== 'POST'
) {
    header('Allow: POST');

    respond(405, [
        'success' => false,
        'message' => 'This endpoint accepts POST requests only.',
    ]);
}

$contentLength = (int) (
    $_SERVER['CONTENT_LENGTH'] ?? 0
);

if ($contentLength > BATHNICE_MAX_POST_BYTES) {
    respond(413, [
        'success' => false,
        'message' => 'The submitted request is too large.',
    ]);
}

if (
    $contentLength > 0 &&
    $_POST === []
) {
    respond(413, [
        'success' => false,
        'message' => 'The submitted request could not be read.',
    ]);
}

if (!isSameOriginRequest()) {
    respond(403, [
        'success' => false,
        'message' => 'The form request did not come from an allowed origin.',
    ]);
}

initializeSession();

if (!rateLimitAllowsRequest()) {
    header('Retry-After: ' . BATHNICE_RATE_WINDOW);

    respond(429, [
        'success' => false,
        'message' => 'Too many requests were submitted. Please wait a few minutes and try again.',
    ]);
}

/* =========================================================
   Honeypot
   ========================================================= */

$honeypot = normalizeSingleLine(
    postString('company')
);

if ($honeypot !== '') {
    /*
     * Return a neutral success response to automated submissions
     * without sending an email.
     */
    respond(200, [
        'success' => true,
        'message' => 'Your project request has been submitted. Thank you for contacting BathNice.',
    ]);
}

/* =========================================================
   Normalize Submitted Values
   ========================================================= */

$fullName = normalizeSingleLine(
    postString('fullName')
);

$email = strtolower(
    normalizeSingleLine(
        postString('email')
    )
);

$phone = normalizeSingleLine(
    postString('phone')
);

$service = normalizeSingleLine(
    postString('service')
);

$message = normalizeMultiline(
    postString('message')
);

$privacyConsent = postString(
    'privacyConsent'
);

$sourcePage = normalizeSingleLine(
    postString('sourcePage')
);

/* =========================================================
   Validation
   ========================================================= */

/** @var array<string, string> $fieldErrors */
$fieldErrors = [];

if ($fullName === '') {
    $fieldErrors['fullName'] =
        'Enter your full name.';
} elseif (stringLength($fullName) < 2) {
    $fieldErrors['fullName'] =
        'Enter at least 2 characters.';
} elseif (stringLength($fullName) > 100) {
    $fieldErrors['fullName'] =
        'The name must not exceed 100 characters.';
}

if ($email === '') {
    $fieldErrors['email'] =
        'Enter your email address.';
} elseif (
    stringLength($email) > 160 ||
    filter_var($email, FILTER_VALIDATE_EMAIL) === false
) {
    $fieldErrors['email'] =
        'Enter a valid email address.';
}

$phoneDigits = preg_replace(
    '/\D+/',
    '',
    $phone
) ?? '';

if ($phone === '') {
    $fieldErrors['phone'] =
        'Enter your phone number.';
} elseif (
    preg_match('/^[+\d\s().\/-]+$/u', $phone) !== 1 ||
    strlen($phoneDigits) < 7 ||
    strlen($phoneDigits) > 20 ||
    stringLength($phone) > 40
) {
    $fieldErrors['phone'] =
        'Enter a valid phone number with the area code.';
}

$allowedServices = [
    'Full Bathroom Remodeling',
    'Shower Remodeling',
    'Bathtub Replacement',
    'Tile Installation',
    'Bathroom Vanities',
    'Accessible Bathrooms',
];

if ($service === '') {
    $fieldErrors['service'] =
        'Select a bathroom service.';
} elseif (!in_array($service, $allowedServices, true)) {
    $fieldErrors['service'] =
        'Select a valid bathroom service.';
}

if ($message === '') {
    $fieldErrors['message'] =
        'Describe your bathroom project.';
} elseif (stringLength($message) < 20) {
    $fieldErrors['message'] =
        'Enter at least 20 characters.';
} elseif (stringLength($message) > 3000) {
    $fieldErrors['message'] =
        'The project description must not exceed 3,000 characters.';
}

if ($privacyConsent !== '1') {
    $fieldErrors['privacyConsent'] =
        'Confirm that you agree to the privacy and provider-sharing statement.';
}

if (stringLength($sourcePage) > 500) {
    $sourcePage = substr($sourcePage, 0, 500);
}

if ($fieldErrors !== []) {
    respond(422, [
        'success' => false,
        'message' => 'Please review the highlighted fields before submitting your request.',
        'errors' => $fieldErrors,
    ]);
}

/* =========================================================
   Duplicate Request Check
   ========================================================= */

$fingerprint = submissionFingerprint(
    $email,
    $phone,
    $service,
    $message
);

if (isRecentDuplicate($fingerprint)) {
    respond(409, [
        'success' => false,
        'message' => 'This project request was already submitted recently. Please wait before sending it again.',
    ]);
}

/* =========================================================
   Email Composition
   ========================================================= */

$recipient = trim(
    (string) (
        getenv('BATHNICE_CONTACT_RECIPIENT')
        ?: 'hello@bathnice.com'
    )
);

$fromEmail = trim(
    (string) (
        getenv('BATHNICE_MAIL_FROM')
        ?: 'no-reply@bathnice.com'
    )
);

if (
    filter_var($recipient, FILTER_VALIDATE_EMAIL) === false ||
    filter_var($fromEmail, FILTER_VALIDATE_EMAIL) === false
) {
    respond(500, [
        'success' => false,
        'message' => 'The form email destination is not configured correctly.',
    ]);
}

$submittedAt = gmdate('Y-m-d H:i:s') . ' UTC';

$emailSubject = 'BathNice project request — ' . $service;

$encodedSubject =
    '=?UTF-8?B?' .
    base64_encode($emailSubject) .
    '?=';

$emailBodyLines = [
    'New BathNice bathroom project request',
    '=====================================',
    '',
    'Submitted: ' . $submittedAt,
    'Source page: ' . ($sourcePage !== '' ? $sourcePage : 'Not supplied'),
    '',
    'Homeowner details',
    '-----------------',
    'Full name: ' . $fullName,
    'Email: ' . $email,
    'Phone: ' . $phone,
    '',
    'Project category',
    '----------------',
    $service,
    '',
    'Project details',
    '---------------',
    $message,
    '',
    'Consent',
    '-------',
    'The homeowner confirmed the privacy and provider-sharing statement.',
    '',
    'Platform notice',
    '---------------',
    'BathNice is an independent provider-matching platform.',
    'Submission does not create a remodeling agreement or guarantee provider contact.',
];

$emailBody = implode(
    "\r\n",
    $emailBodyLines
);

$mailHeaders = [
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    'From: BathNice Website <' . $fromEmail . '>',
    'Reply-To: ' . $email,
    'X-Mailer: PHP/' . PHP_VERSION,
];

$mailSent = @mail(
    $recipient,
    $encodedSubject,
    $emailBody,
    implode("\r\n", $mailHeaders)
);

if (!$mailSent) {
    respond(500, [
        'success' => false,
        'message' => 'The request could not be delivered by the server. Please try again or contact BathNice by phone or email.',
    ]);
}

/* =========================================================
   Successful Response
   ========================================================= */

rememberSuccessfulSubmission($fingerprint);

respond(200, [
    'success' => true,
    'message' => 'Your project request has been submitted. Thank you for contacting BathNice.',
]);
