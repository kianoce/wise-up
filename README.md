# WiseUP - An Up Transaction to Splitwise Expense Integration

## Quick Links

- [Project Overview](#project-overview)
- [Setup Guide](#setup-guide)
- [Running Locally](#running-locally)
- [API Reference](#api-reference)

## Project Overview
This project involves creating a serverless function using AWS SAM (Serverless Application Model) that listens to a webhook from Up (My favourite bank) and automatically creates expenses in Splitwise based on the transaction data received.

I was inspired to create this project while traveling through South America with my partner. We decided to split expenses and set up a Splitwise group to track our spending over the next couple of months. I quickly found this task tedious, as I had to review transactions at the end of each day, add the relevant ones to the Splitwise group, include a title and description, and convert the transaction amounts from AUD to CAD (our agreed currency, as I would be moving to Canada after South America). Having always wanted to use the Up API to build something, I thought this would be the perfect project. I could utilize the power of Up's webhooks to receive notifications of new transactions, use their API to fetch transaction details, and automatically create new expenses in Splitwise. This not only eliminated the manual work but also added transactions to Splitwise in real-time.

## Design and Architecture
### Architecture Overview
- **Serverless Framework**: The project utilizes AWS SAM to manage the serverless infrastructure.
- **Function Flow**: 
  1. Up triggers a webhook on new transactions.
  2. The serverless function receives the webhook data and fetches the relevant transaction data.
  3. The function processes the data and creates a corresponding expense in Splitwise.

### Technology Stack
- **Backend**: Node.js
- **Cloud Provider**: AWS
- **Services**: AWS Lambda, API Gateway, Systems Manager (Parameter Store)
- **Third-party Integrations**: Up API, Splitwise API

## Security
### Webhook Security
To ensure that webhook events are securely received and processed, the Up API includes a verification mechanism using the `X-Up-Authenticity-Signature` header. This header contains a signature that can be used to verify the authenticity of the incoming webhook event requests.

#### Verification Process
The verification process involves the following steps:

1. **Obtain the Secret Key**: A shared `secretKey` is provided upon the creation of the webhook. This key is only known to your application and Up.

2. **Compute the Signature**: 
   - Take the raw, unparsed webhook event request body.
   - Compute the SHA-256 HMAC signature of the request body using the shared `secretKey`.

3. **Compare Signatures**: Compare the computed SHA-256 HMAC signature with the value of the `X-Up-Authenticity-Signature` header provided in the request.

If the computed signature matches the `X-Up-Authenticity-Signature` header, the request is confirmed to be from Up and can be safely processed. This verification step helps prevent unauthorized or malicious attempts to trigger your webhook.

### Secure API Access
- **API Key Management**: The Splitwise API Key, Up API Key and Up Webhook Secret are stored using AWS Parameter Store. While the Secrets Manager would provide better security, personally the Parameters Store is sufficient for this use case as this application is hosted on a private AWS account.
- **Permission Management**: The serverless function has restricted IAM roles to minimize access to only necessary resources.

## Features
### Automatic Expense Creation
- **Creation**: The function maps Up transaction data to create a Splitwise expense.
- **Expense Categorization**: Categorizes expenses based on the transaction category.
- **Ignore Transactions**: Ability to ignore transactions based on the Up transaction description.

## Learning Outcomes
### Challenges
- **Data Matching**: Mapping of Up transaction data to Splitwise expense data.
- **API Key Security**: By making this project public it was important to ensure keys and secrets stayed private when uploading to a repository. AWS paramter store ended up being an easy and appropriate solution. 

### Skills Acquired
- **AWS Serverless Application Model (SAM)**: Gained experience in building and deploying serverless functions using AWS SAM.
- **Webhooks**: Understanding of building a serverless function that responds to a webhook event
- **API Integration**: Reinforced understanding of integrating with third-party APIs securely and efficiently.

## Conclusion
This project was not only fun to build but successfully automated my needs of adding travel expenses to a splitwise group based on my card transactions in real time. I got to work with some new technologies such as AWS SAM and webhooks. I got to enjoy travelling South America with my partner, not worry about expenses and now I can't wait to use this again for our next trip.

### Future Improvements
- **Multi Splitwise Group Support**: Extend functionality to support multiple splitwise groups and create expenses within a group depending on the transaction.
- **User Notifications**: Optional notifications can be sent to users via email or SMS when a new expense is created.
- **Monitoring**: AWS CloudWatch Metrics and Alarms are set up for monitoring function performance and alerting on failures.
- **Testing**: Build out unit testing
- **Custom Authorizer**: Move the authorization check out of the create expense lambda and into a custom authorizer attached to the API Gateway
- **CI/CD**: Investigate extending this project and building a CI/CD pipeline


## Setup Guide
This guide will walk you through setting up the WiseUp project, which integrates the Up bank API with Splitwise to automate expense tracking.

### Prerequisites
- AWS CLI installed and configured with appropriate permissions.
- SAM CLI installed.
- AWS Parameter Store permissions set up for storing API keys and secrets.

### Steps
#### 1. Set Up AWS Parameter Store

First, you need to store your API keys and secrets in AWS Parameter Store. You will need the following parameters:

- **Up API Key**: `/wiseup/UpApiKey`
- **Splitwise API Key**: `/wiseup/SplitwiseApiKey`
- **Up Webhook Secret**: `/wiseup/UpWebhookSecret` (use a dummy value initially, as you'll set the actual value after creating the webhook)

To store these parameters, use the following AWS CLI commands:

```bash
aws ssm put-parameter --name "/wiseup/UpApiKey" --value "<Your_Up_API_Key>" --type "String"
aws ssm put-parameter --name "/wiseup/SplitwiseApiKey" --value "<Your_Splitwise_API_Key>" --type "String"
aws ssm put-parameter --name "/wiseup/UpWebhookSecret" --value "dummy_value" --type "String"
```

#### 2. Set Your Splitwise Group ID

Find your Splitwise group ID and set it in the project. Open the file `libs/splitwise.ts` and update the `GROUP_ID` constant with your Splitwise group ID:

```typescript
export const GROUP_ID = "<Your_Splitwise_Group_ID>";
```

#### 3. Define your Ignorable Transactions

You may not want every transaction to be created in splitwise. You have the ability to ignore transactions based on the description. For example I didn't want any personal expenses such as aws, spotify, phone bills to be included.

Set your ignorable transactions by opening the file `libs/up.ts` and update the `IGNORABLE_DESCRIPTIONS` array. Make sure your descriptions are all in lowercase.

Now if a new transaction matches one of the descriptions in that array it will be ignored and not created in Splitwise.

#### 4. Build and Deploy the Project

To build and deploy the project, use the SAM CLI with the following commands:

```bash
sam build
sam deploy --guided
```

Follow the prompts to configure your deployment. During the deployment process, SAM will provide an API Gateway URL. Make sure to note this URL, as you will need it to set up the webhook with the Up API in the next step.

#### 5. Create a Webhook with Up API

After the deployment is complete, you need to create a webhook with the Up API to send transaction data to your API Gateway. Use the API Gateway URL obtained from the deployment.

To create the webhook:

1. Go to the Up API documentation or use a tool like Postman.
2. Send a POST request to the Up API endpoint for creating webhooks. The request should include the API Gateway URL as the `webhookUrl`.
3. The webhook URL should be in the format: `https://<your-api-id>.execute-api.<region>.amazonaws.com/Prod/create-expense`.

An example of the payload to the Up create webhook api should look similar to the following:
```json
{
    "data": {
      "attributes": {
        "url": "https://<your-api-id>.execute-api.<region>.amazonaws.com/Prod/create-expense/",
        "description": "Wise Up Webhook"
      }
    }
  }
```

Make sure to replace `<your-api-id>`, `<region>` with your specific deployment details. Once the webhook is created, Up will start sending transaction events to your API Gateway.

#### 6. Update Webhook Secret in AWS Parameter Store

Upon successfully creating the webhook, Up will provide a `secretKey` associated with the webhook. This `secretKey` is crucial for verifying the authenticity of incoming webhook events. Update the `UpWebhookSecret` parameter in AWS Parameter Store with this value:

```bash
aws ssm put-parameter --name "/wiseup/UpWebhookSecret" --value "<Your_Webhook_Secret_Key>" --type "String" --overwrite
```

Replace <Your_Webhook_Secret_Key> with the actual secret key provided by Up. This key will be used in your application to verify the webhook events authenticity.

#### 7. Complete

Your setup is now complete. You can enjoy automated expense tracking with minimal manual effort. Your transactions will now be logged and categorized in Splitwise based on your Up transactions in real time.


## Running Locally
To test your Lambda function locally, you can use the AWS SAM CLI command `sam local start-api`. This command will run your API Gateway locally and allow you to invoke your Lambda function as if it were deployed on AWS.

### Steps to Run Locally

#### 1. Prepare Environment Variables:

Before running the API locally, you need to set up your environment variables. Create a file named `env.json` in the root of your project directory. This file should include all the API keys and secrets needed for the application to run. An example `env.json` looks like this:

```json
{
  "Parameters": {
    "UpApiKey": "<Your_Up_API_Key>",
    "UpWebhookSecret": "<Your_Webhook_Secret_Key>",
    "SplitwiseApiKey": "<Your_Splitwise_API_Key>"
  }
}
```

Replace the placeholder values (<Your_Up_API_Key>, <Your_Webhook_Secret_Key>, <Your_Splitwise_API_Key>) with your actual keys and secrets.

> [!WARNING]  
> Remember, the env.json file is for local testing only. When deploying to production, your environment variables should be securely stored in AWS Parameter Store or AWS Secrets Manager. Also ensure you don't upload the env.json file to your repository (it should be ignored by default)

#### 2. Start the Local API

Once your `env.json` file is set up, you can start the local API by running the following command:

```bash
sam local start-api
```

You do not need to specify the `--env-vars` parameter as the file is specified in the `samconfig.toml`

#### 3. Testing Locally
With the local API running, you can test your endpoints using your preferred API client or curl, or directly from your browser. This allows you to debug and verify your function's behavior before deploying changes to AWS.

## API Reference
The official documentation for the API's used in this project can be found here
  * [Up Documentation](https://developer.up.com.au/)
  * [Splitwise Documentation](https://dev.splitwise.com/)
