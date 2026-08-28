<?php
/**
 * Ruhvi Webhook Hook — Case AfterSave
 *
 * Sends Case create/update events to the Ruhvi Next.js webhook endpoint so the
 * Supabase ticket (source of truth) stays in sync with agent actions in
 * EspoCRM (status, priority, notes).
 *
 * The payload is signed with HMAC-SHA256 using ESPO_WEBHOOK_SECRET.
 */

namespace Espo\Custom\Hooks\Case;

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

        if (!$entity->get('id')) {
            return;
        }

        $payload = [
            'entityType' => 'Case',
            'eventType'  => ($entity->isNew()) ? 'case.create' : 'case.update',
            'id'         => $entity->get('id'),
            'timestamp'  => gmdate('c'),
            'payload'    => [
                'id'                   => $entity->get('id'),
                'name'                 => $entity->get('name'),
                'description'          => $entity->get('description'),
                'status'               => $entity->get('status'),
                'priority'             => $entity->get('priority'),
                'assignedUserId'       => $entity->get('assignedUserId'),
                'assignedUserName'     => $entity->get('assignedUserName'),
                'ruhviTicketId_c'      => $entity->get('ruhviTicketId_c'),
                'ruhviStatus_c'        => $entity->get('ruhviStatus_c'),
                'ruhviCustomerEmail_c' => $entity->get('ruhviCustomerEmail_c'),
                'ruhviCustomerName_c'  => $entity->get('ruhviCustomerName_c'),
                'ruhviCustomerPhone_c' => $entity->get('ruhviCustomerPhone_c'),
                'createdAt'            => $entity->get('createdAt'),
                'modifiedAt'           => $entity->get('modifiedAt'),
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
            $this->log->error("Ruhvi webhook error: {$error}");
        }
    }
}