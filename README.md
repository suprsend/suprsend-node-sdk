# suprsend-node-sdk
This package can be included in a node project to easily integrate with `Suprsend` platform.

Refer full documentation [here](https://docs.suprsend.com/docs/node)

We're working towards creating SDK in other languages as well.

### Suprsend SDKs available in following languages
* node (`suprsend-node-sdk`)
* python3 >= 3.7 (`suprsend-py-sdk`)

### Installation
`suprsend-node-sdk` is available as npm package. You can install using npm or yarn.

Using npm:
```bash
npm install @suprsend/node-sdk
```
Using yarn:
```bash
yarn add @suprsend/node-sdk
```

### Usage
Initialize the Suprsend SDK
```node
const Suprsend = require("@suprsend/node-sdk");

// Initialize SDK
const supr_client = new Suprsend("env_key", "env_secret");
```

Following example shows a sample request for triggering a workflow.
It triggers a notification to a user with id: `distinct_id`,
email: `user@example.com` & androidpush-token: `__android_push_token__`
using template `purchase-made` and notification_category `system`

```node
// Prepare Workflow body
const workflow_body = {
    "name": "Purchase Workflow",
    "template": "purchase-made",
    "notification_category": "system",
    "delay": "15m",
    "users": [
        {
            "distinct_id": "0f988f74-6982-41c5-8752-facb6911fb08",
            "$email": ["user@example.com"],
            "$androidpush": ["__android_push_token__"],
        }
    ],
    "data": {
        "template": {
            "first_name": "User",
            "spend_amount": "$10"
        },
    }
}

// Trigger workflow
const response = supr_client.trigger_workflow(workflow_body); // returns promise
response.then((res) => console.log("response", res));
```

When you call `supr_client.trigger_workflow`, the SDK internally makes an HTTP call to SuprSend
Platform to register this request, and you'll receive a promise which resolve to response indicating
the acceptance status.

Note: The actual processing/execution of workflow happens asynchronously.

```node
// If the call succeeds, response will looks like:
{
    "success": true,
    "status_code": 202,
    "message": "Accepted",
}

// In case the call fails. You will receive a response with success=false
{
    "success": false,
    "status": 400,
    "message": "error message",
}
```

### Add attachments

To add one or more Attachments to a Notification (viz. Email, Whatsapp),
call `supr_client.add_attachment(...)` for each file.
Ensure that file_path is proper, otherwise it will raise error.
```node
// this snippet can be used to add attachment to workflow_body.
const file_path = "/home/user/billing.pdf"
supr_client.add_attachment(workflow_body, file_path);
```

#### Attachment structure
The `add_attachment(...)` call appends below structure to `data->'$attachments'`

```json
{
    "filename": "billing.pdf",
    "contentType": "application/pdf",
    "data": "Q29uZ3JhdHVsYXRpb25zLCB5b3UgY2FuIGJhc2U2NCBkZWNvZGUh",
}
```
Where
* `filename` - name of file.
* `contentType` - MIME-type of file content.
* `data` - base64-encoded content of file.
