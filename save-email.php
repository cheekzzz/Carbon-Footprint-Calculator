<?php
header('Content-Type: application/json');

// ensure method is POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Only POST allowed']);
    exit;
}

// read raw body
$body = file_get_contents('php://input');
$data = json_decode($body, true);

if (!$data || !isset($data['email'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing email']);
    exit;
}

$email = trim($data['email']);

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid email format']);
    exit;
}

// build record including optional data
$record = ['email' => $email, 'timestamp' => date(DATE_ATOM)];
foreach (['scores','level','tons','text','tips'] as $key) {
    if (isset($data[$key])) {
        $record[$key] = $data[$key];
    }
}

// append JSON to file
$file = __DIR__ . '/emails.txt';
$entry = json_encode($record) . "\n";

if (file_put_contents($file, $entry, FILE_APPEND | LOCK_EX) === false) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to save email']);
    exit;
}

echo json_encode(['success' => true]);
