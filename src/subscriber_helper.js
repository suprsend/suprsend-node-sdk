import {
  is_object,
  has_special_char,
  epoch_milliseconds,
  uuid,
  is_empty,
  is_string,
} from "./utils";
import ALL_LANG_CODES from "./language_codes";

// ---------- Identity keys
const IDENT_KEY_EMAIL = "$email";
const IDENT_KEY_SMS = "$sms";
const IDENT_KEY_ANDROIDPUSH = "$androidpush";
const IDENT_KEY_IOSPUSH = "$iospush";
const IDENT_KEY_WHATSAPP = "$whatsapp";
const IDENT_KEY_WEBPUSH = "$webpush";
const IDENT_KEY_SLACK = "$slack";
const IDENT_KEY_MS_TEAMS = "$ms_teams";

const IDENT_KEYS_ALL = [
  IDENT_KEY_EMAIL,
  IDENT_KEY_SMS,
  IDENT_KEY_ANDROIDPUSH,
  IDENT_KEY_IOSPUSH,
  IDENT_KEY_WHATSAPP,
  IDENT_KEY_WEBPUSH,
  IDENT_KEY_SLACK,
  IDENT_KEY_MS_TEAMS,
];

const KEY_PUSHVENDOR = "$pushvendor";
const KEY_PREFERRED_LANGUAGE = "$preferred_language";
const KEY_TIMEZONE = "$timezone";

const OTHER_RESERVED_KEYS = [
  "$messenger",
  "$inbox",
  KEY_PUSHVENDOR,
  "$device_id",
  "$insert_id",
  "$time",
  "$set",
  "$set_once",
  "$add",
  "$append",
  "$remove",
  "$unset",
  "$identify",
  "$anon_id",
  "$identified_id",
  KEY_PREFERRED_LANGUAGE,
  KEY_TIMEZONE,
  "$notification_delivered",
  "$notification_dismiss",
  "$notification_clicked",
];

const SUPER_PROPERTY_KEYS = [
  "$app_version_string",
  "$app_build_number",
  "$brand",
  "$carrier",
  "$manufacturer",
  "$model",
  "$os",
  "$ss_sdk_version",
  "$insert_id",
  "$time",
];

const ALL_RESERVED_KEYS = [
  ...SUPER_PROPERTY_KEYS,
  ...OTHER_RESERVED_KEYS,
  ...IDENT_KEYS_ALL,
];

const EMAIL_REGEX = /\S+@\S+\.\S+/;
const MOBILE_REGEX = /^\+[0-9\s]+/;

export default class _SubscriberInternalHelper {
  constructor(distinct_id, workspace_key) {
    this.distinct_id = distinct_id;
    this.workspace_key = workspace_key;

    this.__dict_set = {};

    this.__dict_set_once = {};

    this.__dict_increment = {};

    this.__dict_append = {};

    this.__dict_remove = {};

    this.__list_unset = [];

    this.__errors = [];
    this.__info = [];
  }

  reset() {
    this.__dict_set = {};
    this.__dict_set_once = {};
    this.__dict_increment = {};
    this.__dict_append = {};
    this.__dict_remove = {};
    this.__list_unset = [];
    this.__errors = [];
    this.__info = [];
  }

  get_identity_events() {
    const evt = this.__form_event();
    const ret_val = {
      errors: this.__errors,
      info: this.__info,
      event: evt,
    };
    this.reset();
    return ret_val;
  }

  __form_event() {
    const event = {};
    if (!is_empty(this.__dict_set)) {
      event["$set"] = this.__dict_set;
    }
    if (!is_empty(this.__dict_set_once)) {
      event["$set_once"] = this.__dict_set_once;
    }
    if (!is_empty(this.__dict_increment)) {
      event["$add"] = this.__dict_increment;
    }
    if (!is_empty(this.__dict_append)) {
      event["$append"] = this.__dict_append;
    }
    if (!is_empty(this.__dict_remove)) {
      event["$remove"] = this.__dict_remove;
    }
    if (!is_empty(this.__list_unset)) {
      event["$unset"] = this.__list_unset;
    }
    return event;
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
    if (!ALL_RESERVED_KEYS.includes(key)) {
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
    return IDENT_KEYS_ALL.includes(key);
  }

  _append_kv(key, value, args = {}, caller = "append") {
    const [validated_key, is_k_valid] = this.__validate_key_basic(key, caller);
    if (!is_k_valid) {
      return;
    }
    if (this.__is_identity_key(validated_key)) {
      this.__add_identity(validated_key, value, args, caller);
    } else {
      const is_k_valid = this.__validate_key_prefix(validated_key, caller);
      if (is_k_valid) {
        this.__dict_append[validated_key] = value;
      }
    }
  }

  _set_kv(key, value, args = {}, caller = "set") {
    const [validated_key, is_k_valid] = this.__validate_key_basic(key, caller);
    if (!is_k_valid) {
      return;
    } else {
      const is_k_valid = this.__validate_key_prefix(validated_key, caller);
      if (is_k_valid) {
        this.__dict_set[validated_key] = value;
      }
    }
  }

  _set_once_kv(key, value, args = {}, caller = "set_once") {
    const [validated_key, is_k_valid] = this.__validate_key_basic(key, caller);
    if (!is_k_valid) {
      return;
    } else {
      const is_k_valid = this.__validate_key_prefix(validated_key, caller);
      if (is_k_valid) {
        this.__dict_set_once[validated_key] = value;
      }
    }
  }

  _increment_kv(key, value, args = {}, caller = "increment") {
    const [validated_key, is_k_valid] = this.__validate_key_basic(key, caller);
    if (!is_k_valid) {
      return;
    } else {
      const is_k_valid = this.__validate_key_prefix(validated_key, caller);
      if (is_k_valid) {
        this.__dict_increment[validated_key] = value;
      }
    }
  }

  _remove_kv(key, value, args = {}, caller = "remove") {
    const [validated_key, is_k_valid] = this.__validate_key_basic(key, caller);
    if (!is_k_valid) {
      return;
    }
    if (this.__is_identity_key(validated_key)) {
      this.__remove_identity(validated_key, value, args, caller);
    } else {
      const is_k_valid = this.__validate_key_prefix(validated_key, caller);
      if (is_k_valid) {
        this.__dict_remove[validated_key] = value;
      }
    }
  }

  _unset_k(key, caller = "unset") {
    const [validated_key, is_k_valid] = this.__validate_key_basic(key, caller);
    if (!is_k_valid) {
      return;
    }
    this.__list_unset.push(validated_key);
  }

  _set_preferred_language(lang_code, caller) {
    if (!ALL_LANG_CODES.includes(lang_code)) {
      this.__info.push(`[${caller}] invalid value ${lang_code}`);
      return;
    }
    this.__dict_set[KEY_PREFERRED_LANGUAGE] = lang_code;
  }

  _set_timezone(timezone, caller) {
    this.__dict_set[KEY_TIMEZONE] = timezone;
  }

  __add_identity(key, value, args, caller) {
    const new_caller = `${caller}:${key}`;
    switch (key) {
      case IDENT_KEY_EMAIL:
        this._add_email(value, new_caller);
        break;
      case IDENT_KEY_SMS:
        this._add_sms(value, new_caller);
        break;
      case IDENT_KEY_WHATSAPP:
        this._add_whatsapp(value, new_caller);
        break;
      case IDENT_KEY_ANDROIDPUSH:
        this._add_androidpush(value, args[KEY_PUSHVENDOR], new_caller);
        break;
      case IDENT_KEY_IOSPUSH:
        this._add_iospush(value, args[KEY_PUSHVENDOR], new_caller);
        break;
      case IDENT_KEY_WEBPUSH:
        this._add_webpush(value, args[KEY_PUSHVENDOR], new_caller);
        break;
      case IDENT_KEY_SLACK:
        this._add_slack(value, caller);
        break;
      case IDENT_KEY_MS_TEAMS:
        this._add_ms_teams(value, caller);
        break;
      default:
        break;
    }
  }

  __remove_identity(key, value, args, caller) {
    const new_caller = `${caller}:${key}`;
    switch (key) {
      case IDENT_KEY_EMAIL:
        this._remove_email(value, new_caller);
        break;
      case IDENT_KEY_SMS:
        this._remove_sms(value, new_caller);
        break;
      case IDENT_KEY_WHATSAPP:
        this._remove_whatsapp(value, new_caller);
        break;
      case IDENT_KEY_ANDROIDPUSH:
        this._remove_androidpush(value, args[KEY_PUSHVENDOR], new_caller);
        break;
      case IDENT_KEY_IOSPUSH:
        this._remove_iospush(value, args[KEY_PUSHVENDOR], new_caller);
        break;
      case IDENT_KEY_WEBPUSH:
        this._remove_webpush(value, args[KEY_PUSHVENDOR], new_caller);
        break;
      case IDENT_KEY_SLACK:
        this._remove_slack(val, caller);
        break;
      case IDENT_KEY_MS_TEAMS:
        this._remove_ms_teams(val, caller);
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
    this.__dict_append[IDENT_KEY_EMAIL] = value;
  }

  _remove_email(email, caller) {
    const [value, is_valid] = this.__validate_email(email, caller);
    if (!is_valid) {
      return;
    }
    this.__dict_remove[IDENT_KEY_EMAIL] = value;
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
    this.__dict_append[IDENT_KEY_SMS] = value;
  }

  _remove_sms(mobile_no, caller) {
    const [value, is_valid] = this.__validate_mobile_no(mobile_no, caller);
    if (!is_valid) {
      return;
    }
    this.__dict_remove[IDENT_KEY_SMS] = value;
  }

  _add_whatsapp(mobile_no, caller) {
    const [value, is_valid] = this.__validate_mobile_no(mobile_no, caller);
    if (!is_valid) {
      return;
    }
    this.__dict_append[IDENT_KEY_WHATSAPP] = value;
  }

  _remove_whatsapp(mobile_no, caller) {
    const [value, is_valid] = this.__validate_mobile_no(mobile_no, caller);
    if (!is_valid) {
      return;
    }
    this.__dict_remove[IDENT_KEY_WHATSAPP] = value;
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
    if (typeof provider === "string") {
      provider = provider.toLocaleLowerCase();
    }
    if (!["fcm", "xiaomi", "oppo"].includes(provider)) {
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
    this.__dict_append[IDENT_KEY_ANDROIDPUSH] = value;
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
    this.__dict_remove[IDENT_KEY_ANDROIDPUSH] = value;
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
    if (typeof provider === "string") {
      provider = provider.toLocaleLowerCase();
    }
    if (!["apns"].includes(provider)) {
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
    this.__dict_append[IDENT_KEY_IOSPUSH] = value;
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
    this.__dict_remove[IDENT_KEY_IOSPUSH] = value;
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
    if (typeof provider === "string") {
      provider = provider.toLocaleLowerCase();
    }
    if (!["vapid"].includes(provider)) {
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
    this.__dict_append[IDENT_KEY_WEBPUSH] = value;
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
    this.__dict_remove[IDENT_KEY_WEBPUSH] = value;
    this.__dict_remove[KEY_PUSHVENDOR] = vendor;
  }

  __check_slack_dict(value, caller) {
    const msg = "value must be a valid dict/json with proper keys";
    if (!(value && value instanceof Object)) {
      this.__errors.push(`[${caller}] ${msg}`);
      return [value, false];
    } else {
      return [value, true];
    }
  }

  _add_slack(value, caller) {
    const [validated_value, is_valid] = this.__check_slack_dict(value, caller);
    if (!is_valid) {
      return;
    }
    this.__dict_append[IDENT_KEY_SLACK] = validated_value;
  }

  _remove_slack(value, caller) {
    const [validated_value, is_valid] = this.__check_slack_dict(value, caller);
    if (!is_valid) {
      return;
    }
    this.__dict_remove[IDENT_KEY_SLACK] = validated_value;
  }

  __check_ms_teams_dict(value, caller) {
    const msg = "value must be a valid dict/json with proper keys";
    if (!(value && value instanceof Object)) {
      this.__errors.push(`[${caller}] ${msg}`);
      return [value, false];
    } else {
      return [value, true];
    }
  }

  _add_ms_teams(value, caller) {
    const [validated_value, is_valid] = this.__check_ms_teams_dict(
      value,
      caller
    );
    if (!is_valid) {
      return;
    }
    this.__dict_append[IDENT_KEY_MS_TEAMS] = validated_value;
  }

  _remove_ms_teams(value, caller) {
    const [validated_value, is_valid] = this.__check_ms_teams_dict(
      value,
      caller
    );
    if (!is_valid) {
      return;
    }
    this.__dict_remove[IDENT_KEY_MS_TEAMS] = validated_value;
  }
}
