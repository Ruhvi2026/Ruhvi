<?php
/**
 * Ruhvi Webhook Hook — Note AfterSave
 *
 * Sends Note (comment) events to the Ruhvi webhook endpoint so messages added
 * by agents in EspoCRM are recorded on the Supabase support ticket.
 */

namespace Espo\Custom\Hooks\Note;

use Espo\ORM\Entity;
use Espo\Core\Utils\Log;
use Espo\Custom\Utils\RuhviConfig;

class AfterSave
{
    private string $webhookUrl;
    private string $webhookSecret;
    private Log $log;

    public function __construct(Log $log)
    {
        $this->log = $log;
        $ruhviBaseUrl = RuhviConfig::getRuhviBaseUrl();
        $this->webhookUrl = $ruhviBaseUrl . '/api/integrations/espo/webhook';
        $this->webhookSecret = RuhviConfig::getWebhookSecret();
    }

    public function afterSave(Entity $entity, array $options): void
    {
        if (!$this->webhookSecret) {
            return;
        }

        if ($entity->get('parentType') !== 'Case') {
            return;
        }

        $payload = [
            'entityType' => 'Note',
            'eventType'  => 'note.create',
            'id'         => $entity->get('id'),
            'timestamp'  => gmdate('c'),
            'payload'    => [
                'id'            => $entity->get('id'),
                'post'          => $entity->get('post'),
                'parentType'    => $entity->get('parentType'),
                'parentId'      => $entity->get('parentId'),
                'createdById'   => $entity->get('createdById'),
                'createdByName' => $entity->get('createdByName'),
                'createdAt'     => $entity->get('createdAt'),
            ],
        ];

        $body = json_encode($payload);
        $signature = hash_hmac('sha256', $body, $this->webhookSecret);

        $ch = curl_init($this->webhookUrl);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 10,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $body,
            CURLOPT_HTTPHEADER     => [
                'Content-Type: application/json',
                'X-Ruhvi-Signature: ' . $signature,
            ],
        ]);

        $response = curl_exec($ch);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error) {
            $this->log->error("Ruhvi Note webhook error: {$error}");
        }
    }
}