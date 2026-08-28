<?php
/**
 * Ruhvi Customer Context Controller
 *
 * Proxies the Ruhvi context API so the EspoCRM UI can display customer/order
 * information inside a Case panel without exposing the shared secret to the
 * browser. Called by the custom detail view panel.
 *
 * Route: /RuhviContext/action/getContext?ticketId=xxx
 */

namespace Espo\Custom\Controllers;

use Espo\Core\Api\Request;
use Espo\Core\Exceptions\Forbidden;
use Espo\Core\Exceptions\NotFound;
use Espo\Custom\Utils\RuhviConfig;

class RuhviContext
{
    private string $ruhviBaseUrl;
    private string $apiKey;

    public function __construct()
    {
        $this->ruhviBaseUrl = RuhviConfig::getRuhviBaseUrl();
        $this->apiKey = RuhviConfig::getApiKey();
    }

    /**
     * GET /RuhviContext/action/getContext?ticketId=xxx
     * Fetches customer context from the Ruhvi API and returns it as JSON.
     */
    public function actionGetContext(Request $request): array
    {
        $ticketId = $request->getQueryParam('ticketId') ?? '';
        $email = $request->getQueryParam('email') ?? '';
        $customerId = $request->getQueryParam('customerId') ?? '';

        if (!$ticketId && !$email && !$customerId) {
            throw new NotFound('Provide ticketId, email, or customerId');
        }

        $params = [];
        if ($ticketId)    $params['ticketId'] = $ticketId;
        if ($email)       $params['email'] = $email;
        if ($customerId)  $params['customerId'] = $customerId;

        $queryString = http_build_query($params);
        $url = "{$this->ruhviBaseUrl}/api/integrations/espo/context?{$queryString}";

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 10,
            CURLOPT_HTTPHEADER     => [
                'X-Api-Key: ' . $this->apiKey,
                'Accept: application/json',
            ],
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error) {
            throw new \RuntimeException("Ruhvi context API error: {$error}");
        }

        if ($httpCode !== 200) {
            throw new \RuntimeException("Ruhvi context API HTTP {$httpCode}");
        }

        return json_decode($response, true) ?? [];
    }
}