import {
  is_string,
  SuprsendError,
  has_special_char,
  uuid,
  epoch_milliseconds,
  validate_track_event_schema,
  get_apparent_event_size,
  InputValueError,
} from "./utils";
import get_request_signature from "./signature";
import axios from "axios";
import get_attachment_json from "./attachment";
import {
  SINGLE_EVENT_MAX_APPARENT_SIZE_IN_BYTES,
  SINGLE_EVENT_MAX_APPARENT_SIZE_IN_BYTES_READABLE,
} from "./constants";

const RESERVED_EVENT_NAMES = [
  "$identify",
  "$notification_delivered",
  "$notification_dismiss",
  "$notification_clicked",
  "$app_launched",
  "$user_login",
  "$user_logout",
];

export default class Event {
  constructor(distinct_id, event_name, properties, kwargs = {}) {
    this.distinct_id = distinct_id;
    this.event_name = event_name;
    this.properties = properties;
    this.idempotency_key = kwargs?.idempotency_key;
    this.tenant_id = kwargs?.tenant_id;
    this.brand_id = kwargs?.brand_id;

    // default values
    if (!this.properties) {
      this.properties = {};
    }
  }

  __validate_distinct_id() {
    if (typeof this.distinct_id !== "string") {
      throw new InputValueError(
        "distinct_id must be a string. an Id which uniquely identify a user in your app"
      );
    }
    const distinct_id = this.distinct_id.trim();
    if (!distinct_id) {
      throw new InputValueError("distinct_id missing");
    }
    this.distinct_id = distinct_id;
  }

  __validate_properties() {
    if (!(this.properties instanceof Object)) {
      throw new InputValueError("properties must be a dictionary");
    }
  }

  __check_event_prefix(event_name) {
    if (!RESERVED_EVENT_NAMES.includes(event_name)) {
      if (has_special_char(event_name)) {
        throw new InputValueError(
          "event_names starting with [$,ss_] are reserved by SuprSend"
        );
      }
    }
  }

  __validate_event_name() {
    if (!is_string(this.event_name)) {
      throw new InputValueError("event_name must be a string");
    }
    const event_name = this.event_name.trim();
    if (!event_name) {
      throw new InputValueError("event_name missing");
    }
    this.__check_event_prefix(event_name);
    this.event_name = event_name;
  }

  add_attachment(file_path, kwargs = {}) {
    const file_name = kwargs?.file_name;
    const ignore_if_error = kwargs?.ignore_if_error ?? false;

    // if properties is not a dict, not raising error while adding attachment.
    if (!(this.properties instanceof Object)) {
      console.log(
        "WARNING: attachment cannot be added. please make sure properties is a dictionary. Event" +
          JSON.stringify(this.as_json())
      );
      return;
    }

    const attachment = get_attachment_json(
      file_path,
      file_name,
      ignore_if_error
    );

    if (!attachment) {
      return;
    }
    // --- add the attachment to properties->$attachments
    if (!this.properties["$attachments"]) {
      this.properties["$attachments"] = [];
    }
    this.properties["$attachments"].push(attachment);
  }

  get_final_json(config, is_part_of_bulk = false) {
    // --- validate
    this.__validate_distinct_id();
    this.__validate_event_name();
    this.__validate_properties();

    const super_props = { $ss_sdk_version: config.user_agent };
    let event_dict = {
      $insert_id: uuid(),
      $time: epoch_milliseconds(),
      event: this.event_name,
      env: config.workspace_key,
      distinct_id: this.distinct_id,
      properties: { ...this.properties, ...super_props },
    };
    if (this.idempotency_key) {
      event_dict["$idempotency_key"] = this.idempotency_key;
    }
    if (this.tenant_id) {
      event_dict["tenant_id"] = this.tenant_id;
    }
    if (this.brand_id) {
      event_dict["brand_id"] = this.brand_id;
    }
    event_dict = validate_track_event_schema(event_dict);
    const apparent_size = get_apparent_event_size(event_dict, is_part_of_bulk);
    if (apparent_size > SINGLE_EVENT_MAX_APPARENT_SIZE_IN_BYTES) {
      throw new InputValueError(
        `Event size too big - ${apparent_size} Bytes,must not cross ${SINGLE_EVENT_MAX_APPARENT_SIZE_IN_BYTES_READABLE}`
      );
    }
    return [event_dict, apparent_size];
  }

  as_json() {
    const event_dict = {
      event: this.event_name,
      distinct_id: this.distinct_id,
      properties: this.properties,
    };
    if (this.idempotency_key) {
      event_dict["$idempotency_key"] = this.idempotency_key;
    }
    if (this.tenant_id) {
      event_dict["tenant_id"] = this.tenant_id;
    }
    if (this.brand_id) {
      event_dict["brand_id"] = this.brand_id;
    }
    return event_dict;
  }
}

export class EventCollector {
  constructor(config) {
    this.config = config;
    this.__url = this.__get_url();
    this.__headers = this.__common_headers();
  }

  __get_url() {
    return `${this.config.base_url}event/`;
  }

  __common_headers() {
    return {
      "Content-Type": "application/json; charset=utf-8",
      "User-Agent": this.config.user_agent,
    };
  }
  __dynamic_headers() {
    return {
      Date: new Date().toUTCString(),
    };
  }

  collect(event) {
    const [event_dict, event_size] = event.get_final_json(this.config, false);
    return this.send(event_dict);
  }

  async send(event) {
    const headers = { ...this.__headers, ...this.__dynamic_headers() };
    const content_text = JSON.stringify(event);
    const signature = get_request_signature(
      this.__url,
      "POST",
      content_text,
      headers,
      this.config.workspace_secret
    );
    headers["Authorization"] = `${this.config.workspace_key}:${signature}`;

    try {
      const response = await axios.post(this.__url, content_text, { headers });
      const ok_response = Math.floor(response.status / 100) == 2;
      if (ok_response) {
        return {
          success: true,
          status: "success",
          status_code: response.status,
          message: response.statusText,
        };
      } else {
        return {
          success: false,
          status: "fail",
          status_code: response.status,
          message: response.statusText,
        };
      }
    } catch (err) {
      return {
        success: false,
        status: "fail",
        status_code: err.status || 500,
        message: err.message,
      };
    }
  }
}
