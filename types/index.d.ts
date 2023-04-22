declare namespace suprsend {
  interface Dictionary {
    [key: string]: any;
  }

  interface SResponse {
    success: boolean;
    status: string;
    status_code: number;
    message: string;
  }

  interface SBulkResponse {
    status: string;
    failed_records: Dictionary[];
    total: number;
    success: number;
    failure: number;
    warnings: string[];
  }

  interface Workflow {
    new (
      body: Dictionary,
      kwargs?: { idempotency_key?: string; brand_id?: string }
    ): Workflow;

    add_attachment(
      file_path: string,
      kwargs?: { file_name?: string; ignore_if_error?: boolean }
    ): void;
  }

  interface BulkWorkflows {
    append(...workflows: Workflow[]): void;

    trigger(): Promise<SBulkResponse>;
  }

  interface BulkWorkflowsFactory {
    new_instance(): BulkWorkflows;
  }

  // Events
  interface Event {
    new (
      distinct_id: any,
      event_name: string,
      properties?: Dictionary,
      kwargs?: { idempotency_key?: string; brand_id?: string }
    ): Event;

    add_attachment(
      file_path: string,
      kwargs?: { file_name?: string; ignore_if_error?: boolean }
    ): void;
  }

  interface BulkEvents {
    append(...events: Event[]): void;

    trigger(): Promise<SBulkResponse>;
  }

  interface BulkEventsFactory {
    new_instance(): BulkEvents;
  }

  // subscribers
  interface Subscriber {
    save(): Promise<SResponse>;

    append(key: string | Dictionary, value?: any): void;
    remove(key: string | Dictionary, value?: any): void;
    unset(keys: string | string[]): void;

    set_preferred_language(lang_code: string): void;

    add_email(email: string): void;
    remove_email(email: string): void;

    add_sms(mobile_no: string): void;
    remove_sms(mobile_no: string): void;

    add_whatsapp(mobile_no: string): void;
    remove_whatsapp(mobile_no: string): void;

    add_androidpush(push_token: string, provider?: string): void;
    remove_androidpush(push_token: string, provider?: string): void;

    add_iospush(push_token: string, provider?: string): void;
    remove_iospush(push_token: string, provider?: string): void;

    add_webpush(push_token: Dictionary, provider?: string): void;
    remove_webpush(push_token: Dictionary, provider?: string): void;

    add_slack(value: Dictionary): void;
    remove_slack(value: Dictionary): void;

    add_slack_email(email: string): void;
    remove_slack_email(email: string): void;

    add_slack_userid(user_id: any): void;
    remove_slack_userid(user_id: any): void;
  }

  interface SubscriberFactory {
    new_user(distinct_id: any): Subscriber;

    get_instance(distinct_id: any): Subscriber;
  }

  interface BulkSubscribersFactory {
    new_instance(): BulkSubscribers;
  }

  interface BulkSubscribers {
    append(...subscribers: Subscriber[]): void;

    trigger(): Promise<SBulkResponse>;

    save(): Promise<SBulkResponse>;
  }

  // brands
  interface BrandsApi {
    list(options?: { limit?: number; offset?: number }): Promise<Dictionary>;

    get(brand_id: any): Promise<Dictionary>;

    upsert(brand_id: any, brand_payload?: Dictionary): Promise<Dictionary>;
  }

  // lists
  interface SubscriberListBroadcast {
    new (
      body: Dictionary,
      kwargs?: { idempotency_key?: string; brand_id?: string }
    ): SubscriberListBroadcast;

    add_attachment(
      file_path: string,
      kwargs?: { file_name?: string; ignore_if_error?: boolean }
    ): void;
  }

  interface SubscriberListsApi {
    create(payload: Dictionary): Promise<Dictionary>;

    get_all(options?: { limit?: number; offset?: number }): Promise<Dictionary>;

    get(list_id: string): Promise<Dictionary>;

    add(list_id: string, distinct_ids: string[]): Promise<Dictionary>;

    remove(list_id: string, distinct_ids: string[]): Promise<Dictionary>;

    broadcast(broadcast_instance: SubscriberListBroadcast): Promise<SResponse>;
  }

  interface Suprsend {
    new (
      workspace_env: string,
      workspace_secret: string,
      config?: { is_staging?: boolean }
    ): Suprsend;

    get bulk_workflows(): BulkWorkflowsFactory;

    get bulk_events(): BulkEventsFactory;

    get user(): SubscriberFactory;

    get bulk_users(): BulkSubscribersFactory;

    brands: BrandsApi;

    subscriber_lists: SubscriberListsApi;

    add_attachment(
      body: Dictionary,
      file_path: string,
      kwargs?: { file_name?: string; ignore_if_error?: boolean }
    ): Dictionary;

    trigger_workflow(body: Workflow | Dictionary): Promise<SResponse>;

    track(
      distinct_id: any,
      event_name: string,
      properties?: Dictionary,
      kwargs?: { idempotency_key?: string; brand_id?: string }
    ): Promise<SResponse>;

    track_event(event: Event): Promise<SResponse>;
  }
}

export const Suprsend: suprsend.Suprsend;
export const Event: suprsend.Event;
export const Workflow: suprsend.Workflow;
export const SubscriberListBroadcast: suprsend.SubscriberListBroadcast;
