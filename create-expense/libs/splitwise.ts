import axios, { AxiosInstance, AxiosResponse } from 'axios';
const { SplitwiseApiKey } = process.env;

/** Splitwise Group ID to add Expenses to*/
export const GROUP_ID: number = 12345678;

/**
 * Represents the structure of a create expense resource for the Splitwise API.
 * @link Visit https://dev.splitwise.com/#tag/expenses/paths/~1create_expense/post for the official resource
 */
export interface CreateExpense {
    cost: string;
    description: string;
    details: string | null;
    repeat_interval: string;
    currency_code: string;
    category_id: number;
    group_id: number;
    split_equally: boolean;
}

interface CreateExpenseResponse {
    expenses: [
        {
            id: string;
        },
    ];
}
/** Create axios instance with Splitwise Api config */
const instance: AxiosInstance = axios.create({
    baseURL: 'https://secure.splitwise.com/api/v3.0/',
    timeout: 10000,
    headers: { Authorization: `Bearer ${SplitwiseApiKey}` },
});

/**
 * Creates an Expense with the given data using the Splitwise API.
 *
 * @param createExpenseData - The expense data.
 * @returns The transaction resource.
 */
export const createExpense = async (createExpenseData: CreateExpense): Promise<CreateExpenseResponse> => {
    const response = await instance.post<CreateExpenseResponse>('/create_expense', createExpenseData);
    return response.data;
};
