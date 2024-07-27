import axios, { AxiosInstance } from 'axios';
import { CreateExpense, GROUP_ID as SPLITWISE_GROUP_ID } from './splitwise';
const { UpApiKey } = process.env;
const IGNORABLE_DESCRIPTIONS = ['description 1', 'description 2'];

/**
 * Enum representing different types of events that can be received from the Up webhook.
 */
export enum EventType {
    Ping = 'PING',
    TransactionCreated = 'TRANSACTION_CREATED',
    TransactionSettled = 'TRANSACTION_SETTLED',
    TransactionDeleted = 'TRANSACTION_DELETED',
}

/**
 * Represents the structure of a webhook event resource received from the Up API.
 * @link Visit https://developer.up.com.au/#callback_post_webhookURL for the official resource
 */
export interface WebHookEventResource {
    type: string;
    id: string;
    attributes: {
        eventType: EventType;
        createdAt: string;
    };
    relationships: {
        webhook: {
            data: {
                type: string;
                id: string;
            };
            links?: {
                related: string;
            };
        };
        transaction?: {
            data: {
                type: string;
                id: string;
            };
            links?: {
                related: string;
            };
        };
    };
}

/**
 * Represents the partial structure of a transaction resource received from the Up API.
 * @link Visit https://developer.up.com.au/#get_transactions_id for the official resource
 */
export interface TransactionResource {
    type: string;
    id: string;
    attributes: {
        rawText: string | null;
        description: string;
        amount: {
            currencyCode: string;
            value: string;
            valueInBaseUnits: number;
        };
    };
    relationships: {
        transferAccount: {
            data: null | {
                type: string;
                id: string;
            };
        };
        category: {
            data: null | {
                type: string;
                id: string;
            };
        };
    };
}

/** Maps Up Category ID's to Splitwise Category ID's */
interface CategoryMapper {
    [key: string]: number;
}
const categoryMapper: CategoryMapper = {
    uncategorized: 2,
    'restaurants-and-cafes': 13,
    takeaway: 13,
    groceries: 12,
    booze: 38,
    'pubs-and-bars': 38,
    'holidays-and-travel': 47,
    'public-transport': 32,
    'taxis-and-share-cars': 36,
    'clothing-and-accessories': 41,
};

/** Create axios instance with UP Api config */
const instance: AxiosInstance = axios.create({
    baseURL: 'https://api.up.com.au/api/v1/',
    timeout: 10000,
    headers: { Authorization: `Bearer ${UpApiKey}` },
});

/**
 * Extracts the event type from a webhook event resource.
 *
 * @param data - The webhook event resource data.
 * @returns The event type.
 */
export const getEventType = (data: WebHookEventResource): EventType => {
    return data.attributes.eventType;
};

/**
 * Extracts the transaction ID from a webhook event resource.
 *
 * @param data - The webhook event resource data.
 * @returns The transaction ID.
 * @throws If no transaction data is available.
 */
export const getTransactionId = (data: WebHookEventResource): string => {
    if (!data.relationships.transaction) throw new Error('No transaction data available');
    return data.relationships.transaction.data.id;
};

/**
 * Fetches an Up transaction by its ID.
 *
 * @param id - The transaction ID.
 * @returns The transaction resource.
 */
export const getTransactionById = async (id: string): Promise<TransactionResource> => {
    const response = await instance.get<{ data: TransactionResource }>(`transactions/${id}`);
    return response.data.data;
};

/**
 * Transforms a transaction resource into a Splitwise expense object.
 *
 * @param transaction - The transaction resource.
 * @returns An object representing a Splitwise expense.
 */
export const transformTransactionToSplitwiseExpense = (transaction: TransactionResource): CreateExpense => {
    return {
        cost: convertToCAD(transaction.attributes.amount.value),
        description: transaction.attributes.description,
        details: transaction.attributes.rawText || '',
        repeat_interval: 'never',
        currency_code: 'CAD',
        category_id: categoryMapper[transaction.relationships.category.data?.id ?? 'uncategorized'],
        group_id: SPLITWISE_GROUP_ID,
        split_equally: true,
    };
};

/**
 * Checks if a transaction should be ignored based on predefined conditions.
 *
 * @param transaction - The transaction resource.
 * @returns A boolean indicating whether the transaction is ignorable.
 */
export const isIgnorableTransaction = (data: TransactionResource): boolean => {
    if (IGNORABLE_DESCRIPTIONS.includes(data.attributes.description.toLowerCase())) return true;
    if (data.attributes.amount.valueInBaseUnits >= 0) return true;
    if (data.relationships.transferAccount.data !== null) return true;
    return false;
};

/**
 * Converts the amount from AUD to CAD.
 * @todo Use an API to get current conversion rate rather than use hard coded value
 *
 * @param amount - The amount in AUD.
 * @returns The amount in CAD.
 */
const convertToCAD = (amount: string): string => {
    return (Math.abs(Number(amount)) * 0.9).toFixed(2);
};
