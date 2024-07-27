import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { isAuthenticRequest } from './libs/authentication';
import {
    getEventType,
    getTransactionId,
    getTransactionById,
    isIgnorableTransaction,
    EventType,
    transformTransactionToSplitwiseExpense,
} from './libs/up';
import { createExpense } from './libs/splitwise';

/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 *
 */

export const main = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        //Ensure the request is from Up
        if (isAuthenticRequest(event) === false) {
            return createResponse(200, { message: 'Request is not from Up' });
        }

        // No body is received
        if (event.body === null) {
            return createResponse(200, { message: 'No body received in request' });
        }

        let webhookData = JSON.parse(event.body).data;
        let eventType = getEventType(webhookData);

        // Event Type is a PING. Return successful response
        if (eventType === EventType.Ping) {
            return createResponse(200, { message: 'Successfully Pinged Webhook' });
        }

        // Event Type isn't a created transaction. Discard
        if (eventType !== EventType.TransactionCreated) {
            return createResponse(200, { message: 'Not a new transaction' });
        }

        // Get Transaction Data
        let transactionId = getTransactionId(webhookData);
        let transaction = await getTransactionById(transactionId);

        // Ignore if transaction isn't relevant
        if (isIgnorableTransaction(transaction)) {
            return createResponse(200, { message: 'Ignorable Transaction' });
        }

        // Create Expense
        let expenseData = transformTransactionToSplitwiseExpense(transaction);
        let createExpenseResponse = await createExpense(expenseData);
        return createResponse(200, { id: createExpenseResponse.expenses[0].id });
    } catch (err) {
        return createResponse(500, { message: 'An error occured' });
    }
};

/**
 * Helper funciton to create the API response
 *
 * @param statusCode
 * @param body
 * @returns A result with the given status code and body
 */
const createResponse = (statusCode: number, body: any): APIGatewayProxyResult => ({
    statusCode,
    body: JSON.stringify(body),
});
