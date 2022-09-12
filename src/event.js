import {
  is_object,
  is_string,
  SuprsendError,
  has_special_char,
  uuid,
  epoch_milliseconds,
  validate_track_event_schema,
  get_apparent_event_size,
} from "./utils";
import get_request_signature from "./signature";
import axios from "axios";
import get_attachment_json_for_file from "./attachment";
import {
  BODY_MAX_APPARENT_SIZE_IN_BYTES,
  BODY_MAX_APPARENT_SIZE_IN_BYTES_READABLE,
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
  constructor(distinct_id, event_name, properties) {
    this.distinct_id = distinct_id;
    this.event_name = event_name;
    this.properties = properties;
    // --- validate
    this.__validate_distinct_id();
    this.__validate_event_name();
    this.__validate_properties();
  }

  __validate_distinct_id() {
    if (this.distinct_id instanceof String) {
      throw new SuprsendError(
        "distinct_id must be a string. an Id which uniquely identify a user in your app"
      );
    }
    const distinct_id = this.distinct_id.trim();
    if (!distinct_id) {
      throw new SuprsendError("distinct_id missing");
    }
    this.distinct_id = distinct_id;
  }

  __validate_properties() {
    if (!this.properties) {
      this.properties = {};
    }
    if (!(this.properties instanceof Object)) {
      throw new SuprsendError("properties must be a dictionary");
    }
  }

  __check_event_prefix(event_name) {
    if (!RESERVED_EVENT_NAMES.includes(event_name)) {
      if (has_special_char(event_name)) {
        throw new SuprsendError(
          "event_names starting with [$,ss_] are reserved by SuprSend"
        );
      }
    }
  }

  __validate_event_name() {
    if (!is_string(this.event_name)) {
      throw new SuprsendError("event_name must be a string");
    }
    const event_name = this.event_name.trim();
    this.__check_event_prefix(event_name);
    this.event_name = event_name;
  }

  add_attachment(file_path) {
    const attachment = get_attachment_json_for_file(file_path);
    // --- add the attachment to body->data->$attachments
    if (!this.properties["$attachments"]) {
      this.properties["$attachments"] = [];
    }
    this.properties["$attachments"].push(attachment);
  }

  get_final_json(config, is_part_of_bulk = false) {
    const super_props = { $ss_sdk_version: config.user_agent };
    let event_dict = {
      $insert_id: uuid(),
      $time: epoch_milliseconds(),
      event: this.event_name,
      env: config.workspace_key,
      distinct_id: this.distinct_id,
      properties: { ...this.properties, ...super_props },
    };
    event_dict = validate_track_event_schema(event_dict);
    const apparent_size = get_apparent_event_size(event_dict, is_part_of_bulk);
    if (apparent_size > BODY_MAX_APPARENT_SIZE_IN_BYTES) {
      throw new SuprsendError(
        `Event properties too big - ${apparent_size} Bytes,must not cross ${BODY_MAX_APPARENT_SIZE_IN_BYTES_READABLE}`
      );
    }
    return [event_dict, apparent_size];
  }
}

export class EventCollector {
  constructor(config) {
    this.config = config;
    this.__url = this.__get_url();
    this.__headers = this.__common_headers();
  }

  __get_url() {
    let url_template = "event/";
    if (this.config.include_signature_param) {
      if (this.config.auth_enabled) {
        url_template = url_template + "?verify=true";
      } else {
        url_template = url_template + "?verify=false";
      }
    }
    return `${this.config.base_url}${url_template}`;
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
    if (this.config.auth_enabled) {
      const signature = get_request_signature(
        this.__url,
        "POST",
        content_text,
        headers,
        this.config.workspace_secret
      );
      headers["Authorization"] = `${this.config.workspace_key}:${signature}`;
    }
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
