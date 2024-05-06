# suprsend-node-sdk

This package can be included in a node project to easily integrate with SuprSend platform.

## Installation

```shell
npm install @suprsend/node-sdk@latest
```

## Initialization

```javascript
const { Suprsend } = require("@suprsend/node-sdk");

const supr_client = new Suprsend("workspace_key", "workspace_secret");
```

## [Trigger workflow from API](https://docs.suprsend.com/docs/node-trigger-workflow-from-api)

It is a unified API to trigger workflow and doesn't require user creation before hand. If you are using our frontend SDK's to configure notifications and passing events and user properties from third-party data platforms like Segment, then [event-based trigger](https://docs.suprsend.com/docs/node-send-event-data) would be a better choice.

```javascript
const { Suprsend, WorkflowTriggerRequest } = require("@suprsend/node-sdk");

const supr_client = new Suprsend("workspace_key", "workspace_secret");

// workflow payload
const body = {
  workflow: "_workflow_slug_",
  actor: {
    distinct_id: "0fxxx8f74-xxxx-41c5-8752-xxxcb6911fb08",
    name: "actor_1",
  },
  recipients: [
    {
      distinct_id: "0gxxx9f14-xxxx-23c5-1902-xxxcb6912ab09",
      $email: ["abc@example.com"],
      name: "recipient_1",
    },
  ],
  data: {
    first_name: "User",
    invoice_amount: "$5000",
    invoice_id: "Invoice-1234",
  },
};

const wf = new WorkflowTriggerRequest(body, {
  tenant_id: "tenant_id",
  idempotency_key: "_unique_request_identifier",
});

const response = supr_client.workflows.trigger(wf); // trigger workflow
response.then((res) => console.log("response", res));
```

| Property           | Type                               | Description                                                                                                                                                                                                                                                                                                                                    |
| :----------------- | :--------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| workflow           | string                             | Slug of designed workflow on SuprSend dashboard. You'll get the slug from workflow settings.                                                                                                                                                                                                                                                   |
| actor (_optional_) | string / object                    | Includes distinct_id and properties of the user who performed the action. You can use it for [cross-user notifications](https://docs.suprsend.com/docs/node-trigger-workflow-from-api#sending-cross-user-notifications) where you need to include actor properties in notification template. Actor properties can be added as `$actor.<prop>`. |
| recipients         | array of string / array of objects | List of users who need to be notified. You can add upto 100 recipients in a workflow trigger. You can either pass recipients as an array of `distinct_ID` (if user is pre-synced in SuprSend database) or [define recipient information inline](https://docs.suprsend.com/docs/node-trigger-workflow-from-api#identifying-recipients-inline).  |
| data               | object                             | variable data required to render dynamic template content or workflow properties such as dynamic delay or channel override in send node.                                                                                                                                                                                                       |
| tenant_id          | string                             | trigger workflow for specific tenant/brand.                                                                                                                                                                                                                                                                                                    |
| idempotency_key    | string                             | unique identifier of the request. We'll be returning idempotency_key in our [outbound webhook response](https://docs.suprsend.com/docs/outbound-webhook). You can use it to map notification statuses and replies in your system.                                                                                                              |

### Response structure

```javascript
{
  "success": boolean,
  "status": "success/fail",
  "status_code": status_code
  "message": "message_string"
}
```

### Sending notification to anonymous user

You can send notifications to anonymous users by passing `"is_transient": true` in your recipient object. This approach is recommended for scenarios where you need to send notifications to unregistered users without creating them in the SuprSend platform. The same way, you can pass `"is_transient": true` in your actor object to use actor properties in template without creating user profile.

```javascript
// workflow payload
const workflow_body = {
  workflow: "_workflow_slug_",
  actor: {
    is_transient: true, // for anonymous actor
    name: "actor_1",
  },
  recipients: [
    {
      is_transient: true, // for anonymous recipient
      $email: ["abc@example.com"],
      name: "recipient_1",
    },
  ],
  data: {
    first_name: "User",
    invoice_amount: "$5000",
    invoice_id: "Invoice-1234",
  },
};
```

### Trigger Multile workflows in bulk

```javascript
const { Suprsend, WorkflowTriggerRequest } = require("@suprsend/node-sdk");

const supr_client = new Suprsend("workspace_key", "workspace_secret");

const wf1 = new WorkflowTriggerRequest(body1, {
  tenant_id: "tenant_id1",
  idempotency_key: "_unique_identifier_of_the_request_",
}); // workflow 1 request

const wf2 = new WorkflowTriggerRequest(body2); // workflow 2 request
// add as many workflow requests as you want

const bulk_ins = supr_client.workflows.bulk_trigger_instance(); // create bulk instance

bulk_ins.append(wf1, wf2); // add workflow instances to bulk instance

const response = bulk_ins.trigger(); // trigger workflows
response.then((res) => console.log("response", res));
```

#### Bulk API Response

```javascript
{
  status: "success/fail/partial",
  total: 10,
  success: 10,
  failure: 0,
  failed_records: [{"record": {...}, "error": "error_str", "code": "<status_code>"}],
  warnings: []
}
```

### Add file attachments (for email)

To add one or more attachments to a notification (viz. Email), call `wf_instance.add_attachment()` for each file with local-path or attachment url. Ensure that file_path is proper and public (if remote url), otherwise error will be raised..

```javascript
wf_instance.add_attachment("/home/user/billing.pdf");
wf_instance.add_attachment("https://www.adobe.com/sample_file.pdf");
```

> 🚧
> A single workflow body size (including attachment) must not exceed 100KB (100 x 1024 bytes).

## [Updating User Profile](https://docs.suprsend.com/docs/node-create-user-profile)

```javascript
const user = supr_client.user.get_instance("__uniq_distinct_id__");

// user methods mentioned below

const response = user.save();
response.then((res) => console.log("response", res));
```

### Response

```javascript
{
  "success": boolean,
  "status": "success/fail",
  "status_code": status_code
  "message": "message_string"
}
```

### Add Channels

Use `user.add_*` method(s) to add user channels in a profile

```javascript
user.add_email("user@example.com"); // add Email

user.add_sms("+15555555555"); // add SMS

user.add_whatsapp("+15555555555"); // to add Whatsapp

user.add_androidpush("__android_push_fcm_token__"); // add fcm push token

// set the optional provider value [fcm/xiaomi/oppo] if its not a fcm-token
user.add_androidpush("__android_push_xiaomi_token__", provider);

user.add_iospush("__iospush_token__"); // add apns push token

// add Slack using email
user.add_slack({
  email: "user@example.com",
  access_token: "xoxb-XXXXXXXX",
});

// add Slack if slack member_id is known
user.add_slack({
  user_id: "U03XXXXXXXX",
  access_token: "xoxb-XXXXXXXX",
});

// add Slack channel
user.add_slack({
  channel_id: "CXXXXXXXX",
  access_token: "xoxb-XXXXXXXX",
});

// add Slack incoming webhook
user.add_slack({
  incoming_webhook: {
    url: "https://hooks.slack.com/services/TXXXXXXXXX/BXXXXXXXX/XXXXXXXXXXXXXXXXXXX",
  },
});

// add MS teams user or channel using conversation_id
user.add_ms_teams({
  tenant_id: "c1981ab2-9aaf-xxxx-xxxx",
  service_url: "https://smba.trafficmanager.net/amer",
  conversation_id: "19:c1524d7c-a06f-456f-8abe-xxxx",
});

// add MS teams user using user_id
user.add_ms_teams({
  tenant_id: "c1981ab2-9aaf-xxxx-xxxx",
  service_url: "https://smba.trafficmanager.net/amer",
  user_id: "29:1nsLcmJ2RKtYH6Cxxxx-xxxx",
});

// add MS teams using incoming webhook
user.add_ms_teams({
  incoming_webhook: {
    url: "https://wnk1z.webhook.office.com/webhookb2/XXXXXXXXX",
  },
});
```

### Remove Channels

Use `user.remove_*` method(s) to remove channels from a user profile. This method will detach provided value from the user profile specified channel.

```javascript
user.remove_email("user@example.com"); // remove Email

user.remove_sms("+15555555555"); // remove SMS

user.remove_whatsapp("+15555555555"); // remove Whatsapp

user.remove_androidpush("__android_push_fcm_token__"); // remove fcm push token

// set the optional provider value [fcm/xiaomi/oppo] if its not a fcm-token
user.remove_androidpush("__android_push_xiaomi_token__", provider);

user.remove_iospush("__iospush_token__"); // add apns push token

// remove Slack email
user.remove_slack({
  email: "user@example.com",
  access_token: "xoxb-XXXXXXXX",
});

// remove Slack if slack member_id is known
user.remove_slack({
  user_id: "U03XXXXXXXX",
  access_token: "xoxb-XXXXXXXX",
});

// remove Slack channel
user.remove_slack({
  channel_id: "CXXXXXXXX",
  access_token: "xoxb-XXXXXXXX",
});

// remove Slack incoming webhook
user.remove_slack({
  incoming_webhook: {
    url: "https://hooks.slack.com/services/TXXXXXXXXX/BXXXXXXXX/XXXXXXXXXXXXXXXXXXX",
  },
});

// remove MS teams user or channel using conversation_id
user.remove_ms_teams({
  tenant_id: "c1981ab2-9aaf-xxxx-xxxx",
  service_url: "https://smba.trafficmanager.net/amer",
  conversation_id: "19:c1524d7c-a06f-456f-8abe-xxxx",
});

// remove MS teams user using user_id
user.remove_ms_teams({
  tenant_id: "c1981ab2-9aaf-xxxx-xxxx",
  service_url: "https://smba.trafficmanager.net/amer",
  user_id: "29:1nsLcmJ2RKtYH6Cxxxx-xxxx",
});

// remove MS teams using incoming webhook
user.remove_ms_teams({
  incoming_webhook: {
    url: "https://wnk1z.webhook.office.com/webhookb2/XXXXXXXXX",
  },
});
```

### Remove User Channels in bulk

Call `user.unset()` method if you need to delete/unset all values of a user channel (ex: remove all emails attached to user).

```javascript
user.unset("$email");
user.unset(["$email", "$sms", "$whatsapp"]);

// what value to pass to unset channels
// for email:                $email
// for whatsapp:             $whatsapp
// for SMS:                  $sms
// for androidpush tokens:   $androidpush
// for iospush tokens:       $iospush
// for webpush tokens:       $webpush
// for slack:                $slack
// for ms_teams:             $ms_teams
```

### Other user methods

```javascript
// 2-letter language code in "ISO 639-1 Alpha-2" format e.g. en (for English), es (for Spanish), fr (for French) etc.
user.set_preferred_language("en");

// set timezone property at user level in IANA timezone format
user.set_timezone("America/Los_Angeles");

// set custom properties on user
user.set(key, value); // key:string, value:any
user.set({ key1: "value1", key2: "value2" });

// similar to set but overriding value is not possible for this keys
user.set_once(key, value); // key:string, value:any
user.set_once({ key1: "value1", key2: "value2" });

// append a value to the list for a given property
user.append(key, value); // key:string, value:any
user.append({ key1: "value1", key2: "value2" });

// remove a value from the list for a given property
user.remove(key, value); // key:string, value:any
user.remove({ key1: "value1", key2: "value2" });

// add the given number(+/-) to an existing property
user.increment(key, value); // key:string, value:number
user.increment({ key1: "value1", key2: "value2" });

// remove a property permanently from user properties
user.unset(key); // key:string
user.unset(["key1", "key2"]);
```

### Bulk user update

```javascript
const { Suprsend } = require("@suprsend/node-sdk");

const supr_client = new Suprsend("workspace_key", "workspace_secret");

const bulk_ins = supr_client.bulk_users.new_instance(); // create bulk instance

const user1 = supr_client.user.get_instance("distinct_id_1"); // create user 1 instance
user1.add_email("u1@example.com");

const user2 = supr_client.user.get_instance("distinct_id_2"); // create user 2 instance
user2.add_email("u2@example.com");

// adding users instance to bulk instance
bulk_ins.append(user1);
bulk_ins.append(user2);
// OR
bulk_ins.append(user1, user2);

const response = bulk_ins.save(); // trigger request
response.then((res) => console.log("response", res));
```

#### Bulk API Response

```javascript
{
  status: "success/fail/partial",
  total: 10,
  success: 10,
  failure: 0,
  failed_records: [{"record": {...}, "error": "error_str", "code": "<status_code>"}],
  warnings: []
}
```

## [Trigger Events](https://docs.suprsend.com/docs/node-send-event-data)

You can send event to Suprsend platform by using the `supr_client.track_event` method. If there is any workflow attached to that event, suprsend will trigger that workflow internally with data provided in the event. You can configure event to workflow from SuprSend Dashboard -> Workflows.

```javascript
const { Suprsend, Event } = require("@suprsend/node-sdk");

const supr_client = new Suprsend("workspace_key", "workspace_secret");

// dictionary containing variables or info about event, If none use {}
const properties = {
  "key1":"value1",
  "key2":"value2"
}

const event = new Event(distinct_id, event_name, properties, {tenant_id : "your_tenant_id", idempotency_key="__uniq_request_id__"})

const response  = supr_client.track_event(event)
response.then((res) => console.log("response", res));
```

| Parameter                  | Description                                                                                                                                         |
| :------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------- |
| distinct_id                | unique id of subscriber performing the event                                                                                                        |
| event_name                 | string identifier for the event like `product_purchased`                                                                                            |
| properties                 | information about event like `first_name`. Event properties will be used to pass template variables. Properties keys cannot start with `ss_` or `$` |
| tenant_id (optional)       | tenant id of the tenant                                                                                                                             |
| idempotency_key (optional) | unique key in the request call for [idempotent requests](https://docs.suprsend.com/docs/node-send-event-data#idempotent-requests)                   |

### Response structure

```javascript
{
  "success": boolean,
  "status": "success/fail",
  "status_code": status_code
  "message": "message_string"
}
```

### Trigger multiple events in bulk

```javascript
const { Suprsend, Event } = require("@suprsend/node-sdk");

const supr_client = new Suprsend("_workspace_key_", "_workspace_secret_");

const bulk_ins = supr_client.bulk_events.new_instance(); // create bulk instance

const event1 = new Event("distinct_id1", "event_name1", { k1: "v1" }); // create event 1
const event2 = new Event("distinct_id2", "event_name2", { k2: "v2" }); // create event 2

// add event instance to bulk instance
bulk_ins.append(event1);
bulk_ins.append(event2);
// OR
bulk_ins.append(event1, event2);

const response = bulk_ins.trigger(); // trigger request
response.then((res) => console.log("response", res));
```

#### Bulk API Response

```javascript
{
  status: "success/fail/partial",
  total: 10,
  success: 10,
  failure: 0,
  failed_records: [{"record": {...}, "error": "error_str", "code": "<status_code>"}],
  warnings: []
}
```

### Add file attachments (for email)

To add one or more attachments to a notification (viz. Email), call `event.add_attachment()` for each file with local path or remote url. Ensure that file_path is proper and public (if remote url), otherwise error will be raised.

```javascript
event.add_attachment("/home/user/billing.pdf");
event.add_attachment("https://www.adobe.com/sample_file.pdf");
```

> 🚧
> A single event instance size (including attachment) must not exceed 100KB (100 x 1024 bytes).

## [Tenants/Brands](https://docs.suprsend.com/docs/node-brands)

By default, SuprSend creates a tenant with tenant_id="default" (representing your organization) in each of your workspaces. You can create more tenants using one of our backend SDKs. After creating tenants you can use the `tenant_id` field in `Event` and `WorkflowTriggerRequest` to trigger notifications to specific tenant.

### Tenant data structure

```json
{
  "tenant_id": "br-01",
  "tenant_name": "Awesome Brand",
  "logo": "https://ik.imagekit.io/l0quatz6utm/suprsend/staging/media/suprsend-only-logo_c8aa27faef118418e8c5bd7b31a1cafc74e09200.png",
  "primary_color": "#ff0000",
  "secondary_color": "#00ff00",
  "tertiary_color": "#0000ff",
  "social_links": {
    "website": "https://suprsend.com",
    "facebook": "",
    "linkedin": "",
    "twitter": "",
    "instagram": "",
    "medium": "",
    "discord": "",
    "telegram": "",
    "youtube": ""
  },
  "embedded_preference_url": "",
  "hosted_preference_domain": "",
  "properties": {
    "prop1": "value1",
    "prop2": "value2"
  }
}
```

### Tenant methods

```javascript
const { Suprsend } = require("@suprsend/node-sdk");

const supr_client = new Suprsend("workspace_key", "workspace_secret");

// create or update tenant
const response = supr_client.tenants.upsert(tenant_id, tenant_payload);

// get specific tenant details
const response = supr_client.tenants.get(tenant_id);

// get tenants list
const response = supr_client.tenants.list({ limit: 20, offset: 0 });

response.then((res) => console.log("response", res));
```

## [Lists](https://docs.suprsend.com/docs/node-lists)

Lists lets you create a list of subscribers. You can then send bulk messages to all the subscribers in the list with a single API call.

```javascript
const { Suprsend } = require("@suprsend/node-sdk");

const supr_client = new Suprsend("workspace_key", "workspace_secret");

// create list
const response = supr_client.subscriber_lists.create({
  list_id: "_list_id_",
  list_name: "_list_name_",
  list_description: "_some sample descritpion for list_",
});

// get list details
const response = supr_client.subscriber_lists.get("_list_id_");

// get list of lists
const response = supr_client.subscriber_lists.get_all({ limit: 20, offset: 0 });

// add subscriber to the list
const response = supr_client.subscriber_lists.add("_list_id_", [
  "_distinct_id1_",
  "_distinct_id2_",
]);

// remove subscribers from list
const response = supr_client.subscriber_lists.remove("_list_id_", [
  "_distinct_id1_",
  "_distinct_id2_",
]);

response.then((res) => console.log("response", res));
```

### [Trigger broadcast notifications to list](https://docs.suprsend.com/docs/node-broadcast)

```javascript
const { Suprsend, SubscriberListBroadcast } = require("@suprsend/node-sdk");

const supr_client = new Suprsend("workspace_key", "workspace_secret");

// prepare payload
const broadcast_body = {
  list_id: "_list_id_",
  template: "_template_slug_",
  notification_category: "_",
  channels: [],
  delay: "_time_delay_",
  trigger_at: "_ISO_timestamp_",
  data: {
    key1: "value1",
    key2: "value2",
  },
};

const broadcast_instance = new SubscriberListBroadcast(broadcast_body, {tenant_id : "your_tenant_id", idempotency_key="__uniq_request_id__"}); // create broadcast instance

const response = supr_client.subscriber_lists.broadcast(inst); // trigger broadcast
response.then((res) => console.log("response", res));
```

#### Add file attachments in broadcast (for email)

To add one or more attachments to a notification (viz. Email), call `broadcast_instance.add_attachment()` for each file with local-path or attachment url. Ensure that file_path is proper and public (if remote url), otherwise error will be raised.

```javascript
broadcast_instance.add_attachment("/home/user/billing.pdf");
broadcast_instance.add_attachment("https://www.adobe.com/sample_file.pdf");
```

> 🚧
> A single broadcast instance size (including attachment) must not exceed 100KB (100 x 1024 bytes).
