<?php
/**
 * Add an email address to a Mailchimp audience and tag it.
 *
 * Requires the following constants to be defined:
 *   MAILCHIMP_API_KEY (e.g. 'xxxx-usX')
 *   MAILCHIMP_LIST_ID  (the audience ID)
 *
 * @param string $email
 * @return array ['success'=>bool, 'error'=>string|null, 'response'=>mixed]
 */
function addToMailchimp(string $email): array {
    if (!defined('MAILCHIMP_API_KEY') || !defined('MAILCHIMP_LIST_ID')) {
        return ['success' => false, 'error' => 'Mailchimp configuration missing', 'response' => null];
    }

    $dc = substr(MAILCHIMP_API_KEY, strpos(MAILCHIMP_API_KEY, '-') + 1); // data center code
    $url = "https://{$dc}.api.mailchimp.com/3.0/lists/" . MAILCHIMP_LIST_ID . "/members";

    $body = [
        'email_address' => $email,
        'status_if_new' => 'subscribed',
        'tags' => ['carbon_calculator_user'],
    ];

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_USERPWD, "user:" . MAILCHIMP_API_KEY);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PUT');
    // use hashed email as id so repeated calls update
    $subscriberHash = md5(strtolower($email));
    curl_setopt($ch, CURLOPT_URL, $url . "/" . $subscriberHash);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));

    $response = curl_exec($ch);
    $errno = curl_errno($ch);
    $error = curl_error($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($errno) {
        return ['success' => false, 'error' => $error, 'response' => null];
    }

    $decoded = json_decode($response, true);
    if ($status >= 200 && $status < 300) {
        return ['success' => true, 'error' => null, 'response' => $decoded];
    } else {
        $errMsg = isset($decoded['detail']) ? $decoded['detail'] : 'Unknown error';
        return ['success' => false, 'error' => $errMsg, 'response' => $decoded];
    }
}
