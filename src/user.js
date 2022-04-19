import { is_object } from "./utils";

const EMAIL_REGEX = /^S+@S+.S+$/;
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

class UserIdentity {
  constructor(config) {
    this.config = config;
  }

  new_user(distinct_id) {
    if (!(distinct_id instanceof String)) {
      throw new SuprsendError(
        "distinct_id must be a string. an Id which uniquely identify a user in your app"
      );
    }
    distinct_id = distinct_id.trim();
    if (!distinct_id) {
      throw new SuprsendError(
        "distinct_id must be a string. an Id which uniquely identify a user in your app"
      );
    }
    return new User(this.config, distinct_id);
  }
}

class User {
  constructor(config, distinct_id) {
    this.config = config;
    this.distinct_id = distinct_id;
    this.append_obj = {};
    this.remove_obj = {};
    this.errors = {};
  }

  _validate_string(value) {
    if (!(value instanceof String)) {
      return [value, false];
    }
    value = value.trim();
    if (!distinct_id) {
      return [value, false];
    }
    return [value, true];
  }

  append(key, value) {
    if (!(key instanceof String) && !is_object(key)) {
      return;
    }
    if (key instanceof String) {
      if (!value) {
        return;
      } else {
        this._append_kv(key, value);
      }
    } else {
      // key is object
      for (let item in key) {
        this._append_kv(item, key[item], key);
      }
    }
  }

  _is_channel_event() {
    return Object.values(CHANNEL_MAP).includes(key);
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

  _remove_channel_event(key, value) {
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
        this.remove_androidpush(value);
        break;
      case CHANNEL_MAP.IOS_PUSH:
        this.remove_iospush(value);
        break;
      case CHANNEL_MAP.WEB_PUSH:
        this.remove_webpush(value);
        break;
      default:
        break;
    }
  }

  _append_kv(key, value, args = {}) {
    const [key, is_valid] = this._validate_string(key);
    if (!is_valid) {
      return;
    }
    if (this._is_channel_event(key)) {
      this._add_channel_event(key, value, args);
    } else {
      // code from here
    }
  }

  // email methods
  _validate_email(value, method_name) {
    const [email, is_valid] = this._validate_string(value);
    if (!is_valid) {
      return [email, false];
    }

    const min_length = 6;
    const max_length = 127;
    const is_valid_email = EMAIL_REGEX.test(email);
    if (!is_valid_email) {
      return [email, false];
    }
    if (email.length < min_length || email.length > max_length) {
      return [email, false];
    }
    return [email, true];
  }

  add_email(email) {
    const [value, is_valid] = this._validate_email(email, "add_email");
    if (!is_valid) {
      return;
    }
    this.append_obj[CHANNEL_MAP.EMAIL] = value;
  }

  remove_email(email) {
    const [value, is_valid] = this._validate_email(email, "remove_email");
    if (!is_valid) {
      return;
    }
    this.remove_obj[CHANNEL_MAP.EMAIL] = value;
  }

  // mobile methods
  _validate_mobile_number(value, method_name) {
    const [mobile, is_valid] = this._validate_string(value);
    if (!is_valid) {
      return [mobile, false];
    }

    const min_length = 8;
    const is_valid_mobile = MOBILE_REGEX.test(mobile);
    if (!is_valid_mobile) {
      return [mobile, false];
    }
    if (mobile.length < min_length) {
      return [mobile, false];
    }
    return [mobile, true];
  }

  add_sms(mobile_no) {
    const [value, is_valid] = this._validate_email(mobile_no, "add_sms");
    if (!is_valid) {
      return;
    }
    this.append_obj[CHANNEL_MAP.SMS] = value;
  }

  remove_sms(mobile_no) {
    const [value, is_valid] = this._validate_sms(mobile_no, "remove_sms");
    if (!is_valid) {
      return;
    }
    this.remove_obj[CHANNEL_MAP.SMS] = value;
  }

  add_whatsapp(mobile_no) {
    const [value, is_valid] = this._validate_email(mobile_no, "add_whatsapp");
    if (!is_valid) {
      return;
    }
    this.append_obj[CHANNEL_MAP.WHATSAPP] = value;
  }

  remove_whatsapp(mobile_no) {
    const [value, is_valid] = this._validate_sms(mobile_no, "remove_whatsapp");
    if (!is_valid) {
      return;
    }
    this.remove_obj[CHANNEL_MAP.WHATSAPP] = value;
  }

  // android push methods [providers: fcm / xiaomi / oppo]
  _validate_android_push(value, provider, method_name) {
    const [push_token, is_valid] = this._validate_string(value);
    if (!is_valid) {
      return [push_token, provider, false];
    }
    if (!provider) {
      provider = "fcm";
    }
    if (!["fcm", "xiaomi", "oppo"].includes(provider)) {
      return [push_token, provider, false];
    }
    return [push_token, provider, true];
  }

  add_androidpush(push_token, provider = "fcm") {
    const [value, provider, is_valid] = this._validate_android_push(
      push_token,
      provider,
      "add_androidpush"
    );
    if (!is_valid) {
      return;
    }
    this.append_obj[CHANNEL_MAP.ANDROID_PUSH] = value;
    this.append_obj[PUSH_VENDOR] = provider;
  }

  remove_androidpush(push_token, provider = "fcm") {
    const [value, provider, is_valid] = this._validate_android_push(
      push_token,
      provider,
      "remove_androidpush"
    );
    if (!is_valid) {
      return;
    }
    this.remove_obj[CHANNEL_MAP.ANDROID_PUSH] = value;
    this.remove_obj[PUSH_VENDOR] = provider;
  }

  // ios push methods [providers: apns]
  _validate_ios_push(value, provider, method_name) {
    const [push_token, is_valid] = this._validate_string(value);
    if (!is_valid) {
      return [push_token, provider, false];
    }
    if (!provider) {
      provider = "apns";
    }
    if (!["apns"].includes(provider)) {
      return [push_token, provider, false];
    }
    return [push_token, provider, true];
  }

  add_iospush(push_token, provider = "apns") {
    const [value, provider, is_valid] = this._validate_android_push(
      push_token,
      provider,
      "add_iospush"
    );
    if (!is_valid) {
      return;
    }
    this.append_obj[CHANNEL_MAP.IOS_PUSH] = value;
    this.append_obj[PUSH_VENDOR] = provider;
  }

  remove_iospush(push_token, provider = "apns") {
    const [value, provider, is_valid] = this._validate_android_push(
      push_token,
      provider,
      "remove_iospush"
    );
    if (!is_valid) {
      return;
    }
    this.remove_obj[CHANNEL_MAP.IOS_PUSH] = value;
    this.remove_obj[PUSH_VENDOR] = provider;
  }

  // web push methods [providers: vapid]
  _validate_web_push(value, provider, method_name) {
    if (!is_object(value)) {
      return [value, provider, false];
    }
    if (!provider) {
      provider = "vapid";
    }
    if (!["vapid"].includes(provider)) {
      return [value, provider, false];
    }
    return [value, provider, true];
  }

  add_webpush(push_token, provider = "vapid") {
    const [value, provider, is_valid] = this._validate_android_push(
      push_token,
      provider,
      "add_webpush"
    );
    if (!is_valid) {
      return;
    }
    this.append_obj[CHANNEL_MAP.WEB_PUSH] = value;
    this.append_obj[PUSH_VENDOR] = provider;
  }

  remove_webpush(push_token, provider = "vapid") {
    const [value, provider, is_valid] = this._validate_android_push(
      push_token,
      provider,
      "remove_webpush"
    );
    if (!is_valid) {
      return;
    }
    this.remove_obj[CHANNEL_MAP.WEB_PUSH] = value;
    this.remove_obj[PUSH_VENDOR] = provider;
  }
}
