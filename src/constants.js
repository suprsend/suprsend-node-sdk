//  Default urls
export const DEFAULT_URL = "https://hub.suprsend.com/";

//  an Event should not have apparent body size of more than 100KB
export const SINGLE_EVENT_MAX_APPARENT_SIZE_IN_BYTES = 100 * 1024; // 100 * 1024
export const SINGLE_EVENT_MAX_APPARENT_SIZE_IN_BYTES_READABLE = "100KB";

// a API call should not have apparent body size of more than 800KB
export const BODY_MAX_APPARENT_SIZE_IN_BYTES = 800 * 1024; // 800 * 1024
export const BODY_MAX_APPARENT_SIZE_IN_BYTES_READABLE = "800KB";

// in general url-size wont exceed 2048 chars or 2048 utf-8 bytes
export const ATTACHMENT_URL_POTENTIAL_SIZE_IN_BYTES = 2100;

// few keys added in-flight, amounting to almost 200 bytes increase per workflow-body
export const WORKFLOW_RUNTIME_KEYS_POTENTIAL_SIZE_IN_BYTES = 200;

// max workflow-records in one bulk api call.
export const MAX_WORKFLOWS_IN_BULK_API = 100;
// max event-records in one bulk api call
export const MAX_EVENTS_IN_BULK_API = 100;

export const ALLOW_ATTACHMENTS_IN_BULK_API = true;
export const ATTACHMENT_UPLOAD_ENABLED = false;

// -- single Identity event limit
export const IDENTITY_SINGLE_EVENT_MAX_APPARENT_SIZE_IN_BYTES = 10 * 1024;
export const IDENTITY_SINGLE_EVENT_MAX_APPARENT_SIZE_IN_BYTES_READABLE = "10KB";

export const MAX_IDENTITY_EVENTS_IN_BULK_API = 400;
