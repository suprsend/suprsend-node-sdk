import {
  is_object,
  has_special_char,
  epoch_milliseconds,
  uuid,
  is_empty,
  is_string,
} from "./utils";

const EMAIL_REGEX = /\S+@\S+\.\S+/;
const MOBILE_REGEX = /^\+[0-9\s]+/;
const KEY_PUSHVENDOR = "$pushvendor";
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

export default class _IdentityEventInternalHelper {
  constructor(distinct_id, workspace_key) {
    this.distinct_id = distinct_id;
    this.workspace_key = workspace_key;

    this.__dict_append = {};
    this.__append_count = 0;

    this.__dict_remove = {};
    this.__remove_count = 0;

    this.__list_unset = [];
    this.__unset_count = 0;

    this.__errors = [];
    this.__info = [];
  }

  reset() {
    this.__dict_append = {};
    this.__append_count = 0;

    this.__dict_remove = {};
    this.__remove_count = 0;

    this.__list_unset = [];
    this.__unset_count = 0;

    this.__errors = [];
    this.__info = [];
  }

  get_identity_events() {
    const evt = this.__form_event();
    const ret_val = {
      errors: this.__errors,
      info: this.__info,
      event: evt,
      append: this.__append_count,
      remove: this.__remove_count,
      unset: this.__unset_count,
    };
    this.reset();
    return ret_val;
  }

  __form_event() {
    if (!is_empty(this.__dict_append) || !is_empty(this.__dict_remove)) {
      let event = {
        $insert_id: uuid(),
        $time: epoch_milliseconds(),
        env: this.workspace_key,
        distinct_id: this.distinct_id,
      };
      if (!is_empty(this.__dict_append)) {
        event["$append"] = this.__dict_append;
        this.__append_count += 1;
      }
      if (!is_empty(this.__dict_remove)) {
        event["$remove"] = this.__dict_remove;
        this.__remove_count += 1;
      }
      return event;
    }
    return;
  }

  __validate_key_basic(key, caller) {
    if (!is_string(key)) {
      this.__info.push(
        `[${caller}] skipping key: ${key}. key must be a string`
      );
      return [key, false];
    }
    key = key.trim();
    if (!key) {
      this.__info.push(`[${caller}] skipping key: empty string`);
      return [key, false];
    }
    return [key, true];
  }

  __validate_key_prefix(key, caller) {
    if (!this.__is_identity_key(key)) {
      if (has_special_char(key)) {
        this.__info.push(
          `[${caller}] skipping key: ${key}. key starting with [$,ss_] are reserved`
        );
        return false;
      }
    }
    return true;
  }

  __is_identity_key(key) {
    return Object.values(CHANNEL_MAP).includes(key);
  }

  _append_kv(key, value, args = {}, caller = "append") {
    const [validated_key, is_valid] = this.__validate_key_basic(key, caller);
    if (!is_valid) {
      return;
    }
    if (this.__is_identity_key(validated_key)) {
      this.__add_identity(validated_key, value, args, caller);
    } else {
      const is_valid = this.__validate_key_prefix(validated_key, caller);
      if (is_valid) {
        this.__dict_append[validated_key] = value;
      }
    }
  }

  _remove_kv(key, value, args = {}, caller = "remove") {
    const [validated_key, is_valid] = this.__validate_key_basic(key, caller);
    if (!is_valid) {
      return;
    }
    if (this.__is_identity_key(validated_key)) {
      this.__remove_identity(validated_key, value, args, caller);
    } else {
      const is_valid = this.__validate_key_prefix(validated_key, caller);
      if (is_valid) {
        this.__dict_remove[validated_key] = value;
      }
    }
  }

  __add_identity(key, value, args, caller) {
    switch (key) {
      case CHANNEL_MAP.EMAIL:
        this._add_email(value, caller);
        break;
      case CHANNEL_MAP.SMS:
        this._add_sms(value, caller);
        break;
      case CHANNEL_MAP.WHATSAPP:
        this._add_whatsapp(value, caller);
        break;
      case CHANNEL_MAP.ANDROID_PUSH:
        this._add_androidpush(value, args[KEY_PUSHVENDOR], caller);
        if (this.__dict_append[KEY_PUSHVENDOR]) {
          args[KEY_PUSHVENDOR] = this.__dict_append[KEY_PUSHVENDOR];
        }
        break;
      case CHANNEL_MAP.IOS_PUSH:
        this._add_iospush(value, args[KEY_PUSHVENDOR], caller);
        if (this.__dict_append[KEY_PUSHVENDOR]) {
          args[KEY_PUSHVENDOR] = this.__dict_append[KEY_PUSHVENDOR];
        }
        break;
      case CHANNEL_MAP.WEB_PUSH:
        this._add_webpush(value, args[KEY_PUSHVENDOR], caller);
        if (this.__dict_append[KEY_PUSHVENDOR]) {
          args[KEY_PUSHVENDOR] = this.__dict_append[KEY_PUSHVENDOR];
        }
        break;
      default:
        break;
    }
  }

  __remove_identity(key, value, args, caller) {
    switch (key) {
      case CHANNEL_MAP.EMAIL:
        this._remove_email(value, caller);
        break;
      case CHANNEL_MAP.SMS:
        this._remove_sms(value, caller);
        break;
      case CHANNEL_MAP.WHATSAPP:
        this._remove_whatsapp(value, caller);
        break;
      case CHANNEL_MAP.ANDROID_PUSH:
        this._remove_androidpush(value, args[KEY_PUSHVENDOR], caller);
        if (this.__dict_remove[KEY_PUSHVENDOR]) {
          args[KEY_PUSHVENDOR] = this.__dict_remove[KEY_PUSHVENDOR];
        }
        break;
      case CHANNEL_MAP.IOS_PUSH:
        this._remove_iospush(value, args[KEY_PUSHVENDOR], caller);
        if (this.__dict_remove[KEY_PUSHVENDOR]) {
          args[KEY_PUSHVENDOR] = this.__dict_remove[KEY_PUSHVENDOR];
        }
        break;
      case CHANNEL_MAP.WEB_PUSH:
        this._remove_webpush(value, args[KEY_PUSHVENDOR], caller);
        if (this.__dict_remove[KEY_PUSHVENDOR]) {
          args[KEY_PUSHVENDOR] = this.__dict_remove[KEY_PUSHVENDOR];
        }
        break;
      default:
        break;
    }
  }

  __check_ident_val_string(value, caller) {
    const message = "value must a string with proper value";
    if (!is_string(value)) {
      this.__errors.push(`[${caller}] ${message}`);
      return [value, false];
    }
    value = value.trim();
    if (!value) {
      this.__errors.push(`[${caller}] ${message}`);
      return [value, false];
    }
    return [value, true];
  }

  // email methods
  __validate_email(value, caller) {
    const [email, is_valid] = this.__check_ident_val_string(value, caller);
    if (!is_valid) {
      return [email, false];
    }
    const message = "value in email format required. e.g. user@example.com";
    const min_length = 6;
    const max_length = 127;
    const is_valid_email = EMAIL_REGEX.test(email);
    if (!is_valid_email) {
      this.__errors.push(`[${caller}] invalid value ${email}. ${message}`);
      return [email, false];
    }
    if (email.length < min_length || email.length > max_length) {
      this.__errors.push(
        `[${caller}] invalid value ${email}. must be 6 <= email.length <= 127`
      );
      return [email, false];
    }
    return [email, true];
  }

  _add_email(email, caller) {
    const [value, is_valid] = this.__validate_email(email, caller);
    if (!is_valid) {
      return;
    }
    this.__dict_append[CHANNEL_MAP.EMAIL] = value;
  }

  _remove_email(email, caller) {
    const [value, is_valid] = this.__validate_email(email, caller);
    if (!is_valid) {
      return;
    }
    this.__dict_remove[CHANNEL_MAP.EMAIL] = value;
  }

  // mobile methods
  __validate_mobile_no(value, caller) {
    const [mobile, is_valid] = this.__check_ident_val_string(value, caller);
    if (!is_valid) {
      return [mobile, false];
    }
    const message =
      "number must start with + and must contain country code. e.g. +41446681800";
    const min_length = 8;
    const is_valid_mobile = MOBILE_REGEX.test(mobile);
    if (!is_valid_mobile) {
      this.__errors.push(`[${caller}] invalid value ${mobile}. ${message}`);
      return [mobile, false];
    }
    if (mobile.length < min_length) {
      this.__errors.push(
        `[${caller}] invalid value ${mobile}. mobile_no.length must be >= 8`
      );
      return [mobile, false];
    }
    return [mobile, true];
  }

  _add_sms(mobile_no, caller) {
    const [value, is_valid] = this.__validate_mobile_no(mobile_no, caller);
    if (!is_valid) {
      return;
    }
    this.__dict_append[CHANNEL_MAP.SMS] = value;
  }

  _remove_sms(mobile_no, caller) {
    const [value, is_valid] = this.__validate_mobile_no(mobile_no, caller);
    if (!is_valid) {
      return;
    }
    this.__dict_remove[CHANNEL_MAP.SMS] = value;
  }

  _add_whatsapp(mobile_no, caller) {
    const [value, is_valid] = this.__validate_mobile_no(mobile_no, caller);
    if (!is_valid) {
      return;
    }
    this.__dict_append[CHANNEL_MAP.WHATSAPP] = value;
  }

  _remove_whatsapp(mobile_no, caller) {
    const [value, is_valid] = this.__validate_mobile_no(mobile_no, caller);
    if (!is_valid) {
      return;
    }
    this.__dict_remove[CHANNEL_MAP.WHATSAPP] = value;
  }

  // android push methods
  __check_androidpush_value(value, provider, caller) {
    const [push_token, is_valid] = this.__check_ident_val_string(value, caller);
    if (!is_valid) {
      return [push_token, provider, false];
    }
    if (!provider) {
      provider = "fcm";
    }
    if (!ANDROID_PUSH_VENDORS.includes(provider)) {
      this.__errors.push(
        `[${caller}] unsupported androidpush provider ${provider}`
      );
      return [push_token, provider, false];
    }
    return [push_token, provider, true];
  }

  _add_androidpush(push_token, provider = "fcm", caller) {
    const [value, vendor, is_valid] = this.__check_androidpush_value(
      push_token,
      provider,
      caller
    );
    if (!is_valid) {
      return;
    }
    this.__dict_append[CHANNEL_MAP.ANDROID_PUSH] = value;
    this.__dict_append[KEY_PUSHVENDOR] = vendor;
  }

  _remove_androidpush(push_token, provider = "fcm") {
    const caller = "remove_androidpush";
    const [value, vendor, is_valid] = this.__check_androidpush_value(
      push_token,
      provider,
      caller
    );
    if (!is_valid) {
      return;
    }
    this.__dict_remove[CHANNEL_MAP.ANDROID_PUSH] = value;
    this.__dict_remove[KEY_PUSHVENDOR] = vendor;
  }

  // ios push methods
  __check_iospush_value(value, provider, caller) {
    const [push_token, is_valid] = this.__check_ident_val_string(value, caller);
    if (!is_valid) {
      return [push_token, provider, false];
    }
    if (!provider) {
      provider = "apns";
    }
    if (!IOS_PUSH_VENDORS.includes(provider)) {
      this.__errors.push(
        `[${caller}] unsupported iospush provider ${provider}`
      );
      return [push_token, provider, false];
    }
    return [push_token, provider, true];
  }

  _add_iospush(push_token, provider = "apns", caller) {
    const [value, vendor, is_valid] = this.__check_iospush_value(
      push_token,
      provider,
      caller
    );
    if (!is_valid) {
      return;
    }
    this.__dict_append[CHANNEL_MAP.IOS_PUSH] = value;
    this.__dict_append[KEY_PUSHVENDOR] = vendor;
  }

  _remove_iospush(push_token, provider = "apns", caller) {
    const [value, vendor, is_valid] = this.__check_iospush_value(
      push_token,
      provider,
      caller
    );
    if (!is_valid) {
      return;
    }
    this.__dict_remove[CHANNEL_MAP.IOS_PUSH] = value;
    this.__dict_remove[KEY_PUSHVENDOR] = vendor;
  }

  // web push methods
  __check_webpush_dict(value, provider, caller) {
    if (!is_object(value)) {
      this.__errors.push(
        `[${caller}] value must be a valid dict representing webpush-token`
      );
      return [value, provider, false];
    }
    if (!provider) {
      provider = "vapid";
    }
    if (!WEB_PUSH_VENDORS.includes(provider)) {
      this.__errors.push(
        `[${caller}] unsupported webpush provider ${provider}`
      );
      return [value, provider, false];
    }
    return [value, provider, true];
  }

  _add_webpush(push_token, provider = "vapid", caller) {
    const [value, vendor, is_valid] = this.__check_webpush_dict(
      push_token,
      provider,
      caller
    );
    if (!is_valid) {
      return;
    }
    this.__dict_append[CHANNEL_MAP.WEB_PUSH] = value;
    this.__dict_append[KEY_PUSHVENDOR] = vendor;
  }

  _remove_webpush(push_token, provider = "vapid", caller) {
    const [value, vendor, is_valid] = this.__check_webpush_dict(
      push_token,
      provider,
      caller
    );
    if (!is_valid) {
      return;
    }
    this.__dict_remove[CHANNEL_MAP.WEB_PUSH] = value;
    this.__dict_remove[KEY_PUSHVENDOR] = vendor;
  }
}
