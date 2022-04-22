import {
  is_object,
  has_special_char,
  SuprsendError,
  epoch_milliseconds,
  uuid,
  is_empty,
  is_string,
} from "./utils";
import get_request_signature from "./signature";
import axios from "axios";

const EMAIL_REGEX = /\S+@\S+\.\S+/;
const MOBILE_REGEX = /^\+[0-9\s]+/;
const PUSH_VENDOR = "$pushvendor";
const CHANNEL_MAP = {
  EMAIL: "$email",
  SMS: "$sms",
  WHATSAPP: "$whatsapp",
  ANDROID_PUSH: "$androidpush",
  IOS_PUSH: "$iospush",
  WEB_PUSH: "$webpush",
};
const ANDROID_PUSH_VENDORS = ["fcm", "xiaomi", "oppo"];
const IOS_PUSH_VENDORS = ["apns"];
const WEB_PUSH_VENDORS = ["vapid"];

export default class UserIdentity {
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
    return new User(this.config, distinct_id);
  }
}

class User {
  constructor(config, distinct_id) {
    this.config = config;
    this.distinct_id = distinct_id;
    this.events = [];
    this.append_obj = {};
    this.remove_obj = {};
    this.errors = [];
    this.info = [];
    this.url = this._get_url();
  }

  _get_url() {
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

  _get_headers() {
    return {
      "Content-Type": "application/json; charset=utf-8",
      Date: new Date().toUTCString(),
      "User-Agent": this.config.user_agent,
    };
  }

  _super_properties() {
    return {
      $ss_sdk_version: this.config.user_agent,
    };
  }

  _validate_body() {
    if (!is_empty(this.info)) {
      console.log("WARNING: " + this.info.join("\n"));
    }
    if (!is_empty(this.errors)) {
      throw new SuprsendError("ERROR: " + this.errors.join("\n"));
    }
  }

  _is_channel_event() {
    return Object.values(CHANNEL_MAP).includes(key);
  }

  _validate_key(key, caller) {
    if (!is_string(key)) {
      this.info.push(`[${caller}] skipping key: ${key}. key must be a string`);
      return [key, false];
    }
    key = key.trim();
    if (!key) {
      this.info.push(`[${caller}] skipping key: empty string`);
      return [key, false];
    }
    return [key, true];
  }

  _validate_key_prefix(key, caller) {
    if (!this._is_channel_event(key)) {
      if (has_special_char(key)) {
        this.info.push(
          `[${caller}] skipping key: ${key}. key starting with [$,ss_] are reserved`
        );
        return false;
      }
    }
    return true;
  }

  _append_identity() {
    if (!is_empty(this.append_obj)) {
      const super_properties = this._super_properties();
      const user_identity_event = {
        $insert_id: uuid(),
        $time: epoch_milliseconds(),
        env: this.config.env_key,
        event: "$identify",
        properties: {
          $anon_id: this.distinct_id,
          $identified_id: this.distinct_id,
          ...super_properties,
        },
      };
      this.events.push(user_identity_event);
    }
  }

  _get_events() {
    if (!is_empty(this.append_obj) || !is_empty(this.remove_obj)) {
      let events = {
        $insert_id: uuid(),
        $time: epoch_milliseconds(),
        env: this.config.env_key,
        distinct_id: this.distinct_id,
      };
      if (!is_empty(this.append_obj)) {
        events["$append"] = this.append_obj;
        this._append_identity();
      }
      if (!is_empty(this.remove_obj)) {
        events["$remove"] = this.remove_obj;
      }
      this.events.push(events);
      return this.events;
    }
    return;
  }

  reset_user() {
    this.events = [];
    this.append_obj = {};
    this.remove_obj = {};
    this.errors = [];
  }

  async save() {
    this._validate_body();
    const headers = this._get_headers();
    const events = this._get_events();
    if (!events) {
      throw new SuprsendError(
        "ERROR: no user properties have been edited. Use user.append/remove/unset method to update user properties"
      );
    }
    this.reset_user();
    const content_text = JSON.stringify(events);
    if (this.config.auth_enabled) {
      const signature = get_request_signature(
        this.url,
        "POST",
        content_text,
        headers,
        this.config.env_secret
      );
      headers["Authorization"] = `${this.config.env_key}:${signature}`;
    }
    try {
      const response = await axios.post(this.url, content_text, { headers });
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

  append(key, value) {
    const caller = "append";
    if (!is_string(key) && !is_object(key)) {
      this.errors.push(`[${caller}] arg1 must be either string or a dict`);
      return;
    }
    if (is_string(key)) {
      if (!value) {
        this.errors.push(
          `[${caller}] if arg1 is a string, then arg2 must be passed`
        );
        return;
      } else {
        this._append_kv(key, value, {}, caller);
      }
    } else {
      for (let item in key) {
        this._append_kv(item, key[item], key, caller);
      }
    }
  }

  _append_kv(key, value, args = {}, caller = "append") {
    const [validated_key, is_valid] = this._validate_key(key, caller);
    if (!is_valid) {
      return;
    }
    if (this._is_channel_event(validated_key)) {
      this._add_channel_event(validated_key, value, args);
    } else {
      const is_valid = this._validate_key_prefix(validated_key, caller);
      if (is_valid) {
        this.append_obj[validated_key] = value;
      }
    }
  }

  _add_channel_event(key, value, args) {
    switch (key) {
      case CHANNEL_MAP.EMAIL:
        this.add_email(value);
        break;
      case CHANNEL_MAP.SMS:
        this.add_sms(value);
        break;
      case CHANNEL_MAP.WHATSAPP:
        this.add_whatsapp(value);
        break;
      case CHANNEL_MAP.ANDROID_PUSH:
        this.add_androidpush(value, args[PUSH_VENDOR]);
        break;
      case CHANNEL_MAP.IOS_PUSH:
        this.add_iospush(value, args[PUSH_VENDOR]);
        break;
      case CHANNEL_MAP.WEB_PUSH:
        this.add_webpush(value, args[PUSH_VENDOR]);
        break;
      default:
        break;
    }
  }

  remove(key, value) {
    const caller = "remove";
    if (!is_string(key) && !is_object(key)) {
      this.errors.push(`[${caller}] arg1 must be either string or a dict`);
      return;
    }
    if (is_string(key)) {
      if (!value) {
        this.errors.push(
          `[${caller}] if arg1 is a string, then arg2 must be passed`
        );
        return;
      } else {
        this._remove_kv(key, value);
      }
    } else {
      for (let item in key) {
        this._remove_kv(item, key[item], key);
      }
    }
  }

  _remove_kv(key, value, args = {}, caller = "remove") {
    const [validated_key, is_valid] = this._validate_key(key, caller);
    if (!is_valid) {
      return;
    }
    if (this._is_channel_event(validated_key)) {
      this._remove_channel_event(validated_key, value, args);
    } else {
      const is_valid = this._validate_key_prefix(validated_key, caller);
      if (is_valid) {
        this.remove_obj[validated_key] = value;
      }
    }
  }

  _remove_channel_event(key, value, args) {
    switch (key) {
      case CHANNEL_MAP.EMAIL:
        this.remove_email(value);
        break;
      case CHANNEL_MAP.SMS:
        this.remove_sms(value);
        break;
      case CHANNEL_MAP.WHATSAPP:
        this.remove_whatsapp(value);
        break;
      case CHANNEL_MAP.ANDROID_PUSH:
        this.remove_androidpush(value, args[PUSH_VENDOR]);
        break;
      case CHANNEL_MAP.IOS_PUSH:
        this.remove_iospush(value, args[PUSH_VENDOR]);
        break;
      case CHANNEL_MAP.WEB_PUSH:
        this.remove_webpush(value, args[PUSH_VENDOR]);
        break;
      default:
        break;
    }
  }

  _validate_identity_value(value, caller) {
    const message = "value must a string with proper value";
    if (!is_string(value)) {
      this.error.push(`[${caller}] ${message}`);
      return [value, false];
    }
    value = value.trim();
    if (!value) {
      this.error.push(`[${caller}] ${message}`);
      return [value, false];
    }
    return [value, true];
  }

  // email methods
  _validate_email(value, caller) {
    const [email, is_valid] = this._validate_identity_value(value, caller);
    if (!is_valid) {
      return [email, false];
    }
    const message = "value in email format required. e.g. user@example.com";
    const min_length = 6;
    const max_length = 127;
    const is_valid_email = EMAIL_REGEX.test(email);
    if (!is_valid_email) {
      this.errors.push(`[${caller}] invalid value ${email}. ${message}`);
      return [email, false];
    }
    if (email.length < min_length || email.length > max_length) {
      this.errors.push(
        `[${caller}] invalid value ${email}. must be 6 <= email.length <= 127`
      );
      return [email, false];
    }
    return [email, true];
  }

  add_email(email) {
    const caller = "add_email";
    const [value, is_valid] = this._validate_email(email, caller);
    if (!is_valid) {
      return;
    }
    this.append_obj[CHANNEL_MAP.EMAIL] = value;
  }

  remove_email(email) {
    const caller = "remove_email";
    const [value, is_valid] = this._validate_email(email, caller);
    if (!is_valid) {
      return;
    }
    this.remove_obj[CHANNEL_MAP.EMAIL] = value;
  }

  // mobile methods
  _validate_mobile_number(value, caller) {
    const [mobile, is_valid] = this._validate_key(value, caller);
    if (!is_valid) {
      return [mobile, false];
    }
    const message =
      "number must start with + and must contain country code. e.g. +41446681800";
    const min_length = 8;
    const is_valid_mobile = MOBILE_REGEX.test(mobile);
    if (!is_valid_mobile) {
      this.errors.push(`[${caller}] invalid value ${mobile}. ${message}`);
      return [mobile, false];
    }
    if (mobile.length < min_length) {
      this.errors.push(
        `[${caller}] invalid value ${mobile}. mobile_no.length must be >= 8`
      );
      return [mobile, false];
    }
    return [mobile, true];
  }

  add_sms(mobile_no) {
    const caller = "add_sms";
    const [value, is_valid] = this._validate_mobile_number(mobile_no, caller);
    if (!is_valid) {
      return;
    }
    this.append_obj[CHANNEL_MAP.SMS] = value;
  }

  remove_sms(mobile_no) {
    const caller = "remove_sms";
    const [value, is_valid] = this._validate_mobile_number(mobile_no, caller);
    if (!is_valid) {
      return;
    }
    this.remove_obj[CHANNEL_MAP.SMS] = value;
  }

  add_whatsapp(mobile_no) {
    const caller = "add_whatsapp";
    const [value, is_valid] = this._validate_mobile_number(mobile_no, caller);
    if (!is_valid) {
      return;
    }
    this.append_obj[CHANNEL_MAP.WHATSAPP] = value;
  }

  remove_whatsapp(mobile_no) {
    const caller = "remove_whatsapp";
    const [value, is_valid] = this._validate_mobile_number(mobile_no, caller);
    if (!is_valid) {
      return;
    }
    this.remove_obj[CHANNEL_MAP.WHATSAPP] = value;
  }

  // android push methods
  _validate_android_push(value, provider, caller) {
    const [push_token, is_valid] = this._validate_key(value, caller);
    if (!is_valid) {
      return [push_token, provider, false];
    }
    if (!provider) {
      provider = "fcm";
    }
    if (!ANDROID_PUSH_VENDORS.includes(provider)) {
      this.errors.push(
        `[${caller}] unsupported androidpush provider ${provider}`
      );
      return [push_token, provider, false];
    }
    return [push_token, provider, true];
  }

  add_androidpush(push_token, provider = "fcm") {
    const caller = "add_androidpush";
    const [value, vendor, is_valid] = this._validate_android_push(
      push_token,
      provider,
      caller
    );
    if (!is_valid) {
      return;
    }
    this.append_obj[CHANNEL_MAP.ANDROID_PUSH] = value;
    this.append_obj[PUSH_VENDOR] = vendor;
  }

  remove_androidpush(push_token, provider = "fcm") {
    const caller = "remove_androidpush";
    const [value, vendor, is_valid] = this._validate_android_push(
      push_token,
      provider,
      caller
    );
    if (!is_valid) {
      return;
    }
    this.remove_obj[CHANNEL_MAP.ANDROID_PUSH] = value;
    this.remove_obj[PUSH_VENDOR] = vendor;
  }

  // ios push methods
  _validate_ios_push(value, provider, caller) {
    const [push_token, is_valid] = this._validate_key(value, caller);
    if (!is_valid) {
      return [push_token, provider, false];
    }
    if (!provider) {
      provider = "apns";
    }
    if (!IOS_PUSH_VENDORS.includes(provider)) {
      this.errors.push(`[${caller}] unsupported iospush provider ${provider}`);
      return [push_token, provider, false];
    }
    return [push_token, provider, true];
  }

  add_iospush(push_token, provider = "apns") {
    const caller = "add_iospush";
    const [value, vendor, is_valid] = this._validate_ios_push(
      push_token,
      provider,
      caller
    );
    if (!is_valid) {
      return;
    }
    this.append_obj[CHANNEL_MAP.IOS_PUSH] = value;
    this.append_obj[PUSH_VENDOR] = vendor;
  }

  remove_iospush(push_token, provider = "apns") {
    const caller = "remove_iospush";
    const [value, vendor, is_valid] = this._validate_ios_push(
      push_token,
      provider,
      caller
    );
    if (!is_valid) {
      return;
    }
    this.remove_obj[CHANNEL_MAP.IOS_PUSH] = value;
    this.remove_obj[PUSH_VENDOR] = vendor;
  }

  // web push methods
  _validate_web_push(value, provider, caller) {
    if (!is_object(value)) {
      this.errors.push(
        `[${caller}] value must be a valid dict representing webpush-token`
      );
      return [value, provider, false];
    }
    if (!provider) {
      provider = "vapid";
    }
    if (!WEB_PUSH_VENDORS.includes(provider)) {
      this.errors.push(`[${caller}] unsupported webpush provider ${provider}`);
      return [value, provider, false];
    }
    return [value, provider, true];
  }

  add_webpush(push_token, provider = "vapid") {
    const caller = "add_webpush";
    const [value, vendor, is_valid] = this._validate_web_push(
      push_token,
      provider,
      caller
    );
    if (!is_valid) {
      return;
    }
    this.append_obj[CHANNEL_MAP.WEB_PUSH] = value;
    this.append_obj[PUSH_VENDOR] = vendor;
  }

  remove_webpush(push_token, provider = "vapid") {
    const caller = "remove_webpush";
    const [value, vendor, is_valid] = this._validate_web_push(
      push_token,
      provider,
      caller
    );
    if (!is_valid) {
      return;
    }
    this.remove_obj[CHANNEL_MAP.WEB_PUSH] = value;
    this.remove_obj[PUSH_VENDOR] = vendor;
  }
}
