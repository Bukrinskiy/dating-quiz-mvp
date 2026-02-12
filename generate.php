<?php

declare(strict_types=1);

$FK_MERCHANT_ID = 'YOUR_MERCHANT_ID';
$FK_SECRET_1    = 'YOUR_SECRET_WORD_1';
$FK_CURRENCY    = 'USD';
$FK_PAY_URL     = 'https://pay.fk.money/';
$AMOUNT         = '9.99';

// Принимаем ClickID. Поддерживаем оба варианта параметра на случай разных трекеров.
$clickId = trim((string)($_GET['click_id'] ?? $_GET['clickid'] ?? ''));

if ($clickId === '') {
    http_response_code(400);
    exit('Missing click_id');
}

// Используем ClickID как order ID, оставляем только безопасные символы.
$orderId = preg_replace('/[^a-zA-Z0-9_.-]/', '', $clickId) ?? '';

if ($orderId === '') {
    http_response_code(400);
    exit('Invalid click_id');
}

// Подпись Free-Kassa: m:oa:secret_1:currency:o
$sign = md5($FK_MERCHANT_ID . ':' . $AMOUNT . ':' . $FK_SECRET_1 . ':' . $FK_CURRENCY . ':' . $orderId);

$params = [
    'm'        => $FK_MERCHANT_ID,
    'oa'       => $AMOUNT,
    'currency' => $FK_CURRENCY,
    'o'        => $orderId,
    's'        => $sign,
];

header('Location: ' . $FK_PAY_URL . '?' . http_build_query($params), true, 302);
exit;
