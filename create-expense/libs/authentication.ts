import { APIGatewayProxyEvent } from 'aws-lambda';
import { createHmac } from 'crypto';
const { UpWebhookSecret } = process.env;

export const isAuthenticRequest = (event: APIGatewayProxyEvent): Boolean => {
    if (!UpWebhookSecret || !event.body || !event.headers['X-Up-Authenticity-Signature']) return false;
    const receivedSignature = event.headers['X-Up-Authenticity-Signature'];
    const hmac = createHmac('sha256', UpWebhookSecret);
    const data = hmac.update(event.body);
    const signature = data.digest('hex');
    return signature === receivedSignature;
};
