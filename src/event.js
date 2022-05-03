import {
  is_object,
  is_string,
  SuprsendError,
  has_special_char,
  uuid,
  epoch_milliseconds,
} from "./utils";
import get_request_signature from "./signature";
import { Validator } from "jsonschema";
import axios from "axios";

const event_schema = require("./request_json/event.json");

const RESERVED_EVENT_NAMES = [
  "$identify",
  "$notification_delivered",
  "$notification_dismiss",
  "$notification_clicked",
  "$app_launched",
  "$user_login",
  "$user_logout",
];

class EventCollector {
  constructor(config) {
    this.config = config;
    this.__url = this.__get_url();
    this.__headers = this.__common_headers();
    this.__supr_props = this.__super_properties();
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

  __super_properties() {
    return {
      $ss_sdk_version: this.config.user_agent,
    };
  }

  __check_event_prefix(event_name) {
    if (!RESERVED_EVENT_NAMES.includes(event_name)) {
      if (has_special_char(event_name)) {
        throw new SuprsendError(
          "event_names starting with [$,ss_] are reserved"
        );
      }
    }
  }

  __validate_event_name(event_name) {
    if (!is_string(event_name)) {
      throw new SuprsendError("event_name must be a string");
    }
    event_name = event_name.trim();
    this.__check_event_prefix(event_name);
    return event_name;
  }

  validate_track_event_schema(data) {
    if (!data["properties"]) {
      data["properties"] = {};
    }
    const schema = event_schema;
    var v = new Validator();
    const validated_data = v.validate(data, schema);
    if (validated_data.valid) {
      return data;
    } else {
      const error_obj = validated_data.errors[0];
      const error_msg = `${error_obj.property} ${error_obj.message}`;
      throw new SuprsendError(error_msg);
    }
  }

  collect(distinct_id, event_name, properties = {}) {
    event_name = this.__validate_event_name(event_name);
    if (!is_object(properties)) {
      throw new SuprsendError("properties must be a dictionary");
    }
    properties = { ...properties, ...this.__supr_props };
    let event = {
      $insert_id: uuid(),
      $time: epoch_milliseconds(),
      event: event_name,
      env: this.config.env_key,
      distinct_id: distinct_id,
      properties: properties,
    };
    event = this.validate_track_event_schema(event);
    return this.send(event);
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
        this.config.env_secret
      );
      headers["Authorization"] = `${this.config.env_key}:${signature}`;
    }
    try {
      const response = await axios.post(this.__url, content_text, {
        headers,
      });
      return {
        status_code: response.status,
        success: true,
        message: response.statusText,
      };
    } catch (err) {
      return {
        status_code: 400,
        success: false,
        message: err.message,
      };
    }
  }
}

export default EventCollector;
