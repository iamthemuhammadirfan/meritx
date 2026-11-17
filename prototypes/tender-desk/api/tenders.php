<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: public, max-age=60, must-revalidate');

if (!in_array($_SERVER['REQUEST_METHOD'] ?? 'GET', ['GET', 'HEAD'], true)) {
    http_response_code(405);
    header('Allow: GET, HEAD');
    echo json_encode(['error' => 'Use GET to read the tender feed.']);
    exit;
}

// Collector state and credentials never live in the public document root.
$snapshot = dirname(__DIR__, 2) . '/.meritx-tender-engine/data/feed.json';
if (!is_file($snapshot) || !is_readable($snapshot) || filesize($snapshot) > 12000000) {
    http_response_code(503);
    header('Retry-After: 300');
    echo json_encode(['error' => 'The tender feed is not ready. Please try again shortly.']);
    exit;
}

$content = file_get_contents($snapshot);
$feed = $content !== false ? json_decode($content, true) : null;
if (!is_array($feed) || ($feed['schemaVersion'] ?? null) !== 1
    || !is_array($feed['sources'] ?? null) || !is_array($feed['tenders'] ?? null)) {
    http_response_code(503);
    echo json_encode(['error' => 'The tender feed could not be read. Please try again shortly.']);
    exit;
}

// The snapshot is a public catalog, separate from any future tenant/company data.
$result = array_intersect_key($feed, array_flip([
    'schemaVersion', 'generatedAt', 'schedule', 'coverageNote', 'sources', 'tenders',
]));
$lastAttempt = strtotime((string) ($feed['generatedAt'] ?? ''));
$result['stale'] = !$lastAttempt || time() - $lastAttempt > 36 * 3600;

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'HEAD') {
    echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
}
