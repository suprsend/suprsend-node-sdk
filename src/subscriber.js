import {
  is_object,
  SuprsendError,
  epoch_milliseconds,
  uuid,
  is_empty,
  is_string,
  get_apparent_identity_event_size,
  InputValueError,
} from "./utils";
import get_request_signature from "./signature";
import axios from "axios";
import _IdentityEventInternalHelper from "./subscriber_helper";
import {
  IDENTITY_SINGLE_EVENT_MAX_APPARENT_SIZE_IN_BYTES,
  IDENTITY_SINGLE_EVENT_MAX_APPARENT_SIZE_IN_BYTES_READABLE,
} from "./constants";
import _SubscriberInternalHelper from "./subscriber_helper";

export default class SubscriberFactory {
  constructor(config) {
    this.config = config;
  }

  new_user(distinct_id) {
    return this.get_instance(distinct_id);
  }

  get_instance(distinct_id) {
    if (!is_string(distinct_id)) {
      throw new InputValueError(
        "distinct_id must be a string. an Id which uniquely identify a user in your app"
      );
    }
    distinct_id = distinct_id.trim();
    if (!distinct_id) {
      throw new InputValueError("distinct_id must be passed");
    }
    return new Subscriber(this.config, distinct_id);
  }
}

export class Subscriber {
  constructor(config, distinct_id) {
    this.config = config;
    this.distinct_id = distinct_id;
    this.__url = this.__get_url();
    this.__super_props = this.__super_properties();

    this.__errors = [];
    this.__info = [];
    this.user_operations = [];
    this._helper = new _SubscriberInternalHelper();
    this.__warnings_list = [];
  }

  __get_url() {
    return `${this.config.base_url}event/`;
  }

  __get_headers() {
    return {
      "Content-Type": "application/json; charset=utf-8",
      Date: new Date().toUTCString(),
      "User-Agent": this.config.user_agent,
    };
  }

  __super_properties() {
    return {
      $ss_sdk_version: this.config.user_agent,
    };
  }

  get_events() {
    return {
      $schema: "2",
      $insert_id: uuid(),
      $time: epoch_milliseconds(),
      env: this.config.workspace_key,
      distinct_id: this.distinct_id,
      $user_operations: this.user_operations,
      properties: this.__super_props,
    };
  }

  as_json() {
    const event_dict = {
      distinct_id: this.distinct_id,
      $user_operations: this.user_operations,
      warnings: this.__warnings_list,
    };

    return event_dict;
  }

  validate_event_size(event_dict) {
    const apparent_size = get_apparent_identity_event_size(event_dict);
    if (apparent_size > IDENTITY_SINGLE_EVENT_MAX_APPARENT_SIZE_IN_BYTES) {
      throw new InputValueError(
        `User Event size too big - ${apparent_size} Bytes, must not cross ${IDENTITY_SINGLE_EVENT_MAX_APPARENT_SIZE_IN_BYTES_READABLE}`
      );
    }
    return [event_dict, apparent_size];
  }

  validate_body(is_part_of_bulk = false) {
    this.__warnings_list = [];
    if (!is_empty(this.__info)) {
      const msg = `[distinct_id: ${this.distinct_id}]${this.__info.join("\n")}`;
      this.__warnings_list.push(msg);
      console.log(`WARNING: ${msg}`);
    }
    if (!is_empty(this.__errors)) {
      const msg = `[distinct_id: ${this.distinct_id}] ${this.__errors.join(
        "\n"
      )}`;
      this.__warnings_list.push(msg);
      const err_msg = `ERROR: ${msg}`;
      if (is_part_of_bulk) {
        console.log(err_msg);
      } else {
        throw new InputValueError(err_msg);
      }
    }
    return this.__warnings_list;
  }

  async save() {
    const is_part_of_bulk = false;
    this.validate_body(is_part_of_bulk);
    const headers = this.__get_headers();
    const event = this.get_events();
    const [validated_ev, size] = this.validate_event_size(event);
    const content_text = JSON.stringify(validated_ev);

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

  _collect_event() {
    const resp = this._helper.get_identity_events();
    if (!is_empty(resp["errors"])) {
      this.__errors = [...this.__errors, ...resp["errors"]];
    }
    if (!is_empty(resp["info"])) {
      this.__info = [...this.__info, ...resp["info"]];
    }
    if (!is_empty(resp["event"])) {
      this.user_operations.push(resp["event"]);
    }
  }

  append(key, value) {
    const caller = "append";
    if (!is_string(key) && !is_object(key)) {
      this.__errors.push(`[${caller}] arg1 must be either string or a dict`);
      return;
    }
    if (is_string(key)) {
      if (!value) {
        this.__errors.push(
          `[${caller}] if arg1 is a string, then arg2 must be passed`
        );
        return;
      } else {
        this._helper._append_kv(key, value, {}, caller);
        this._collect_event();
      }
    } else {
      for (let item in key) {
        this._helper._append_kv(item, key[item], key, caller);
      }
      this._collect_event();
    }
  }

  set(key, value) {
    const caller = "set";
    if (!is_string(key) && !is_object(key)) {
      this.__errors.push(`[${caller}] arg1 must be either string or a dict`);
      return;
    }
    if (is_string(key)) {
      if (value === null || value === undefined) {
        this.__errors.push(
          `[${caller}] if arg1 is a string, then arg2 must be passed`
        );
        return;
      } else {
        this._helper._set_kv(key, value, {}, caller);
        this._collect_event();
      }
    } else {
      for (let item in key) {
        this._helper._set_kv(item, key[item], key, caller);
      }
      this._collect_event();
    }
  }

  set_once(key, value) {
    const caller = "set_once";
    if (!is_string(key) && !is_object(key)) {
      this.__errors.push(`[${caller}] arg1 must be either string or a dict`);
      return;
    }
    if (is_string(key)) {
      if (value === null || value === undefined) {
        this.__errors.push(
          `[${caller}] if arg1 is a string, then arg2 must be passed`
        );
        return;
      } else {
        this._helper._set_once_kv(key, value, {}, caller);
        this._collect_event();
      }
    } else {
      for (let item in key) {
        this._helper._set_once_kv(item, key[item], key, caller);
      }
      this._collect_event();
    }
  }

  increment(key, value) {
    const caller = "increment";
    if (!is_string(key) && !is_object(key)) {
      this.__errors.push(`[${caller}] arg1 must be either string or a dict`);
      return;
    }
    if (is_string(key)) {
      if (value === null || value === undefined) {
        this.__errors.push(
          `[${caller}] if arg1 is a string, then arg2 must be passed`
        );
        return;
      } else {
        this._helper._increment_kv(key, value, {}, caller);
        this._collect_event();
      }
    } else {
      for (let item in key) {
        this._helper._increment_kv(item, key[item], key, caller);
      }
      this._collect_event();
    }
  }

  remove(key, value) {
    const caller = "remove";
    if (!is_string(key) && !is_object(key)) {
      this.__errors.push(`[${caller}] arg1 must be either string or a dict`);
      return;
    }
    if (is_string(key)) {
      if (!value) {
        this.__errors.push(
          `[${caller}] if arg1 is a string, then arg2 must be passed`
        );
        return;
      } else {
        this._helper._remove_kv(key, value, {}, caller);
        this._collect_event();
      }
    } else {
      for (let item in key) {
        this._helper._remove_kv(item, key[item], key, caller);
      }
      this._collect_event();
    }
  }

  unset(key) {
    const caller = "unset";
    if (!is_string(key) && !Array.isArray(key)) {
      this.__errors.push(`[${caller}] key must be either string or array`);
      return;
    }
    if (is_string(key)) {
      this._helper._unset_k(key, caller);
      this._collect_event();
    } else {
      for (let item of key) {
        this._helper._unset_k(item, caller);
      }
      this._collect_event();
    }
  }

  set_preferred_language(lang_code) {
    const caller = "set_preferred_language";
    this._helper._set_preferred_language(lang_code, caller);
    this._collect_event();
  }

  set_timezone(timezone) {
    const caller = "set_timezone";
    this._helper._set_timezone(timezone, caller);
    this._collect_event();
  }

  add_email(email) {
    const caller = "add_email";
    this._helper._add_email(email, caller);
    this._collect_event();
  }

  remove_email(email) {
    const caller = "remove_email";
    this._helper._remove_email(email, caller);
    this._collect_event();
  }

  add_sms(mobile_no) {
    const caller = "add_sms";
    this._helper._add_sms(mobile_no, caller);
    this._collect_event();
  }

  remove_sms(mobile_no) {
    const caller = "remove_sms";
    this._helper._remove_sms(mobile_no, caller);
    this._collect_event();
  }

  add_whatsapp(mobile_no) {
    const caller = "add_whatsapp";
    this._helper._add_whatsapp(mobile_no, caller);
    this._collect_event();
  }

  remove_whatsapp(mobile_no) {
    const caller = "remove_whatsapp";
    this._helper._remove_whatsapp(mobile_no, caller);
    this._collect_event();
  }

  add_androidpush(push_token, provider = "fcm") {
    const caller = "add_androidpush";
    this._helper._add_androidpush(push_token, provider, caller);
    this._collect_event();
  }

  remove_androidpush(push_token, provider = "fcm") {
    const caller = "remove_androidpush";
    this._helper._remove_androidpush(push_token, provider, caller);
    this._collect_event();
  }

  add_iospush(push_token, provider = "apns") {
    const caller = "add_iospush";
    this._helper._add_iospush(push_token, provider, caller);
    this._collect_event();
  }

  remove_iospush(push_token, provider = "apns") {
    const caller = "remove_iospush";
    this._helper._remove_iospush(push_token, provider, caller);
    this._collect_event();
  }

  add_webpush(push_token, provider = "vapid") {
    const caller = "add_webpush";
    this._helper._add_webpush(push_token, provider, caller);
    this._collect_event();
  }

  remove_webpush(push_token, provider = "vapid") {
    const caller = "remove_webpush";
    this._helper._remove_webpush(push_token, provider, caller);
    this._collect_event();
  }

  add_slack(value) {
    const caller = "add_slack";
    this._helper._add_slack(value, caller);
    this._collect_event();
  }

  remove_slack(value) {
    const caller = "remove_slack";
    this._helper._remove_slack(value, caller);
    this._collect_event();
  }

  add_ms_teams(value) {
    const caller = "add_ms_teams";
    this._helper._add_ms_teams(value, caller);
    this._collect_event();
  }

  remove_ms_teams(value) {
    const caller = "remove_ms_teams";
    this._helper._remove_ms_teams(value, caller);
    this._collect_event();
  }

  add_slack_email(value) {
    console.warn(
      "add_slack_email() method has been deprecated. use add_slack() instead"
    );
    const caller = "add_slack_email";
    this._helper._add_slack({ email: value }, caller);
    this._collect_event();
  }

  remove_slack_email(value) {
    console.warn(
      "remove_slack_email() method has been deprecated. use remove_slack() instead"
    );
    const caller = "remove_slack_email";
    this._helper._remove_slack({ email: value }, caller);
    this._collect_event();
  }

  add_slack_userid(value) {
    console.warn(
      "add_slack_userid() method has been deprecated. use add_slack() instead"
    );
    const caller = "add_slack_userid";
    this._helper._add_slack({ user_id: value }, caller);
    this._collect_event();
  }

  remove_slack_userid(value) {
    console.warn(
      "remove_slack_userid() method has been deprecated. use remove_slack() instead"
    );
    const caller = "remove_slack_userid";
    this._helper._remove_slack({ user_id: value }, caller);
    this._collect_event();
  }
}
