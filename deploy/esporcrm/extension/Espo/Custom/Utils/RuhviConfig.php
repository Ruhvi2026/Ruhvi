<?php
namespace Espo\Custom\Utils;

class RuhviConfig
{
    private static ?array $config = null;

    private static function load(): array
    {
        if (self::$config !== null) {
            return self::$config;
        }
        $file = __DIR__ . '/../../ruhvi-config.php';
        if (file_exists($file)) {
            self::$config = require $file;
        } else {
            self::$config = [
                'ruhviBaseUrl'      => getenv('RUHVI_BASE_URL') ?: 'https://support.ruhvi.in',
                'espoWebhookSecret' => getenv('ESPO_WEBHOOK_SECRET') ?: '',
                'espoApiKey'        => getenv('ESPO_API_KEY') ?: '',
            ];
        }
        return self::$config;
    }

    public static function getWebhookSecret(): string
    {
        return self::load()['espoWebhookSecret'] ?? '';
    }

    public static function getApiKey(): string
    {
        return self::load()['espoApiKey'] ?? '';
    }

    public static function getRuhviBaseUrl(): string
    {
        return self::load()['ruhviBaseUrl'] ?? 'https://support.ruhvi.in';
    }
}