import { is_object, has_special_char, is_empty, is_string } from "./utils";

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

const KEY_ID_PROVIDER = "$id_provider";
const KEY_PREFERRED_LANGUAGE = "$preferred_language";
const KEY_TIMEZONE = "$timezone";

export default class _ObjectEditInternalHelper {
  constructor() {
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

  _get_operation_result() {
    const operation = this.__form_operation();
    const ret_val = {
      errors: this.__errors,
      info: this.__info,
      operation: operation,
    };
    this.reset();
    return ret_val;
  }

  __form_operation() {
    const ops = {};
    if (!is_empty(this.__dict_set)) {
      ops["$set"] = this.__dict_set;
    }
    if (!is_empty(this.__dict_set_once)) {
      ops["$set_once"] = this.__dict_set_once;
    }
    if (!is_empty(this.__dict_increment)) {
      ops["$add"] = this.__dict_increment;
    }
    if (!is_empty(this.__dict_append)) {
      ops["$append"] = this.__dict_append;
    }
    if (!is_empty(this.__dict_remove)) {
      ops["$remove"] = this.__dict_remove;
    }
    if (!is_empty(this.__list_unset)) {
      ops["$unset"] = this.__list_unset;
    }
    return ops;
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
      this.__dict_append[validated_key] = value;
    }
  }

  _set_kv(key, value, args = {}, caller = "set") {
    const [validated_key, is_k_valid] = this.__validate_key_basic(key, caller);
    if (!is_k_valid) {
      return;
    } else {
      this.__dict_set[validated_key] = value;
    }
  }

  _set_once_kv(key, value, args = {}, caller = "set_once") {
    const [validated_key, is_k_valid] = this.__validate_key_basic(key, caller);
    if (!is_k_valid) {
      return;
    } else {
      this.__dict_set_once[validated_key] = value;
    }
  }

  _increment_kv(key, value, args = {}, caller = "increment") {
    const [validated_key, is_k_valid] = this.__validate_key_basic(key, caller);
    if (!is_k_valid) {
      return;
    } else {
      this.__dict_increment[validated_key] = value;
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
      this.__dict_remove[validated_key] = value;
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
        this._add_androidpush(value, args[KEY_ID_PROVIDER], new_caller);
        break;
      case IDENT_KEY_IOSPUSH:
        this._add_iospush(value, args[KEY_ID_PROVIDER], new_caller);
        break;
      case IDENT_KEY_WEBPUSH:
        this._add_webpush(value, args[KEY_ID_PROVIDER], new_caller);
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
        this._remove_androidpush(value, args[KEY_ID_PROVIDER], new_caller);
        break;
      case IDENT_KEY_IOSPUSH:
        this._remove_iospush(value, args[KEY_ID_PROVIDER], new_caller);
        break;
      case IDENT_KEY_WEBPUSH:
        this._remove_webpush(value, args[KEY_ID_PROVIDER], new_caller);
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
    const message = "value must be a string with proper value";
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
  _add_email(email, caller) {
    this.__dict_append[IDENT_KEY_EMAIL] = email;
  }

  _remove_email(email, caller) {
    this.__dict_remove[IDENT_KEY_EMAIL] = email;
  }

  // sms methods
  _add_sms(mobile_no, caller) {
    this.__dict_append[IDENT_KEY_SMS] = mobile_no;
  }

  _remove_sms(mobile_no, caller) {
    this.__dict_remove[IDENT_KEY_SMS] = mobile_no;
  }

  // whatsapp methods
  _add_whatsapp(mobile_no, caller) {
    this.__dict_append[IDENT_KEY_WHATSAPP] = mobile_no;
  }

  _remove_whatsapp(mobile_no, caller) {
    this.__dict_remove[IDENT_KEY_WHATSAPP] = mobile_no;
  }

  // android push methods
  _add_androidpush(push_token, provider, caller) {
    this.__dict_append[IDENT_KEY_ANDROIDPUSH] = push_token;
    this.__dict_append[KEY_ID_PROVIDER] = provider;
  }

  _remove_androidpush(push_token, provider) {
    this.__dict_remove[IDENT_KEY_ANDROIDPUSH] = push_token;
    this.__dict_remove[KEY_ID_PROVIDER] = provider;
  }

  // ios push methods
  _add_iospush(push_token, provider, caller) {
    this.__dict_append[IDENT_KEY_IOSPUSH] = push_token;
    this.__dict_append[KEY_ID_PROVIDER] = provider;
  }

  _remove_iospush(push_token, provider, caller) {
    this.__dict_remove[IDENT_KEY_IOSPUSH] = push_token;
    this.__dict_remove[KEY_ID_PROVIDER] = provider;
  }

  // web push methods
  _add_webpush(push_token, provider, caller) {
    this.__dict_append[IDENT_KEY_WEBPUSH] = push_token;
    this.__dict_append[KEY_ID_PROVIDER] = provider;
  }

  _remove_webpush(push_token, provider, caller) {
    this.__dict_remove[IDENT_KEY_WEBPUSH] = push_token;
    this.__dict_remove[KEY_ID_PROVIDER] = provider;
  }

  // slack methods
  _add_slack(value, caller) {
    this.__dict_append[IDENT_KEY_SLACK] = value;
  }

  _remove_slack(value, caller) {
    this.__dict_remove[IDENT_KEY_SLACK] = value;
  }

  // ms teams methods
  _add_ms_teams(value, caller) {
    this.__dict_append[IDENT_KEY_MS_TEAMS] = value;
  }

  _remove_ms_teams(value, caller) {
    this.__dict_remove[IDENT_KEY_MS_TEAMS] = value;
  }
}
