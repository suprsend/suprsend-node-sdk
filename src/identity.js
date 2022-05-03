import {
  is_object,
  SuprsendError,
  epoch_milliseconds,
  uuid,
  is_empty,
  is_string,
} from "./utils";
import get_request_signature from "./signature";
import axios from "axios";
import _IdentityEventInternalHelper from "./identity_helper";

export default class UserIdentityFactory {
  constructor(config) {
    this.config = config;
  }

  new_user(distinct_id) {
    if (!is_string(distinct_id)) {
      throw new SuprsendError(
        "distinct_id must be a string. an Id which uniquely identify a user in your app"
      );
    }
    distinct_id = distinct_id.trim();
    if (!distinct_id) {
      throw new SuprsendError("distinct_id must be passed");
    }
    return new UserIdentity(this.config, distinct_id);
  }
}

class UserIdentity {
  constructor(config, distinct_id) {
    this.config = config;
    this.distinct_id = distinct_id;
    this.__url = this.__get_url();
    this.__supr_props = this.__super_properties();

    this.__errors = [];
    this.__info = [];
    this._append_count = 0;
    this._remove_count = 0;
    this._events = [];
    this._helper = new _IdentityEventInternalHelper(
      distinct_id,
      config.env_key
    );
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

  __get_events() {
    let all_events = this._events;
    for (let e of all_events) {
      e["properties"] = this.__supr_props;
    }

    if (this._append_count > 0) {
      const user_identify_event = {
        $insert_id: uuid(),
        $time: epoch_milliseconds(),
        env: this.config.env_key,
        event: "$identify",
        properties: {
          $anon_id: this.distinct_id,
          $identified_id: this.distinct_id,
          ...this.__super_properties,
        },
      };
      all_events.push(user_identify_event);
    }
    return all_events;
  }

  __validate_body() {
    if (!is_empty(this.__info)) {
      console.log("WARNING: " + this.__info.join("\n"));
    }
    if (!is_empty(this.__errors)) {
      throw new SuprsendError("ERROR: " + this.__errors.join("\n"));
    }
    if (is_empty(this._events)) {
      throw new SuprsendError(
        "ERROR: no user properties have been edited. Use user.append/remove/unset method to update user properties"
      );
    }
  }

  async save() {
    this.__validate_body();
    const headers = this.__get_headers();
    const events = this.__get_events();
    const content_text = JSON.stringify(events);
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

  _collect_event() {
    const resp = this._helper.get_identity_events();
    if (!is_empty(resp["errors"])) {
      this.__errors = [...this.__errors, ...resp["errors"]];
    }
    if (!is_empty(resp["info"])) {
      this.__info = [...this.__info, ...resp["info"]];
    }
    if (!is_empty(resp["event"])) {
      this._events.push(resp["event"]);
      this._append_count += resp["append"];
      this._remove_count += resp["remove"];
      this._unset_count += resp["unset"];
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
}
