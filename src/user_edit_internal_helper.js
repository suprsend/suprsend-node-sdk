import { is_empty, is_string } from "./utils";

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

class _UserEditInternalHelper {
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
    this.__dict_append = {};
    this.__dict_remove = {};
    this.__list_unset = [];
    this.__dict_set_once = {};
    this.__dict_increment = {};
    this.__errors = [];
    this.__info = [];
  }

  get_operation_result() {
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

  // ------------------------
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

  // -------------------------
  _append_kv(key, val, kwargs = {}, caller = "append") {
    const [k, is_k_valid] = this.__validate_key_basic(key, caller);
    if (!is_k_valid) return;
    if (this.__is_identity_key(k)) {
      this.__add_identity(k, val, kwargs, caller);
    } else {
      this.__dict_append[k] = val;
    }
  }

  _remove_kv(key, val, kwargs = {}, caller = "remove") {
    const [k, is_k_valid] = this.__validate_key_basic(key, caller);
    if (!is_k_valid) return;
    if (this.__is_identity_key(k)) {
      this.__remove_identity(k, val, kwargs, caller);
    } else {
      this.__dict_remove[k] = val;
    }
  }

  _unset_k(key, caller = "unset") {
    const [k, is_k_valid] = this.__validate_key_basic(key, caller);
    if (!is_k_valid) return;
    this.__list_unset.push(k);
  }

  _set_kv(key, val, caller = "set") {
    const [k, is_k_valid] = this.__validate_key_basic(key, caller);
    if (!is_k_valid) return;
    this.__dict_set[k] = val;
  }

  _set_once_kv(key, val, caller = "set_once") {
    const [k, is_k_valid] = this.__validate_key_basic(key, caller);
    if (!is_k_valid) return;
    this.__dict_set_once[k] = val;
  }

  _increment_kv(key, val, caller = "increment") {
    const [k, is_k_valid] = this.__validate_key_basic(key, caller);
    if (!is_k_valid) return;
    this.__dict_increment[k] = val;
  }

  _set_preferred_language(lang_code, caller) {
    this.__dict_set[KEY_PREFERRED_LANGUAGE] = lang_code;
  }

  _set_timezone(timezone, caller) {
    this.__dict_set[KEY_TIMEZONE] = timezone;
  }

  __add_identity(key, val, kwargs, caller) {
    const new_caller = `${caller}:${key}`;
    switch (key) {
      case IDENT_KEY_EMAIL:
        this._add_email(val, new_caller);
        break;
      case IDENT_KEY_SMS:
        this._add_sms(val, new_caller);
        break;
      case IDENT_KEY_WHATSAPP:
        this._add_whatsapp(val, new_caller);
        break;
      case IDENT_KEY_ANDROIDPUSH:
        this._add_androidpush(val, kwargs[KEY_ID_PROVIDER], new_caller);
        break;
      case IDENT_KEY_IOSPUSH:
        this._add_iospush(val, kwargs[KEY_ID_PROVIDER], new_caller);
        break;
      case IDENT_KEY_WEBPUSH:
        this._add_webpush(val, kwargs[KEY_ID_PROVIDER], new_caller);
        break;
      case IDENT_KEY_SLACK:
        this._add_slack(val, new_caller);
        break;
      case IDENT_KEY_MS_TEAMS:
        this._add_ms_teams(val, new_caller);
        break;
    }
  }

  __remove_identity(key, val, kwargs, caller) {
    const new_caller = `${caller}:${key}`;
    switch (key) {
      case IDENT_KEY_EMAIL:
        this._remove_email(val, new_caller);
        break;
      case IDENT_KEY_SMS:
        this._remove_sms(val, new_caller);
        break;
      case IDENT_KEY_WHATSAPP:
        this._remove_whatsapp(val, new_caller);
        break;
      case IDENT_KEY_ANDROIDPUSH:
        this._remove_androidpush(val, kwargs[KEY_ID_PROVIDER], new_caller);
        break;
      case IDENT_KEY_IOSPUSH:
        this._remove_iospush(val, kwargs[KEY_ID_PROVIDER], new_caller);
        break;
      case IDENT_KEY_WEBPUSH:
        this._remove_webpush(val, kwargs[KEY_ID_PROVIDER], new_caller);
        break;
      case IDENT_KEY_SLACK:
        this._remove_slack(val, new_caller);
        break;
      case IDENT_KEY_MS_TEAMS:
        this._remove_ms_teams(val, new_caller);
        break;
    }
  }

  // ------------------------ Email
  _add_email(value, caller) {
    this.__dict_append[IDENT_KEY_EMAIL] = value;
  }

  _remove_email(value, caller) {
    this.__dict_remove[IDENT_KEY_EMAIL] = value;
  }

  // ------------------------ SMS
  _add_sms(value, caller) {
    this.__dict_append[IDENT_KEY_SMS] = value;
  }

  _remove_sms(value, caller) {
    this.__dict_remove[IDENT_KEY_SMS] = value;
  }

  // ------------------------ Whatsapp
  _add_whatsapp(value, caller) {
    this.__dict_append[IDENT_KEY_WHATSAPP] = value;
  }

  _remove_whatsapp(value, caller) {
    this.__dict_remove[IDENT_KEY_WHATSAPP] = value;
  }

  // ------------------------ Androidpush
  _add_androidpush(value, provider, caller) {
    this.__dict_append[IDENT_KEY_ANDROIDPUSH] = value;
    this.__dict_append[KEY_ID_PROVIDER] = provider;
  }

  _remove_androidpush(value, provider, caller) {
    this.__dict_remove[IDENT_KEY_ANDROIDPUSH] = value;
    this.__dict_remove[KEY_ID_PROVIDER] = provider;
  }

  // ------------------------ Iospush
  _add_iospush(value, provider, caller) {
    this.__dict_append[IDENT_KEY_IOSPUSH] = value;
    this.__dict_append[KEY_ID_PROVIDER] = provider;
  }

  _remove_iospush(value, provider, caller) {
    this.__dict_remove[IDENT_KEY_IOSPUSH] = value;
    this.__dict_remove[KEY_ID_PROVIDER] = provider;
  }

  // ------------------------ Webpush
  _add_webpush(value, provider, caller) {
    this.__dict_append[IDENT_KEY_WEBPUSH] = value;
    this.__dict_append[KEY_ID_PROVIDER] = provider;
  }

  _remove_webpush(value, provider, caller) {
    this.__dict_remove[IDENT_KEY_WEBPUSH] = value;
    this.__dict_remove[KEY_ID_PROVIDER] = provider;
  }

  // ------------------------ Slack
  _add_slack(value, caller) {
    this.__dict_append[IDENT_KEY_SLACK] = value;
  }

  _remove_slack(value, caller) {
    this.__dict_remove[IDENT_KEY_SLACK] = value;
  }

  // ------------------------ MS Teams
  _add_ms_teams(value, caller) {
    this.__dict_append[IDENT_KEY_MS_TEAMS] = value;
  }

  _remove_ms_teams(value, caller) {
    this.__dict_remove[IDENT_KEY_MS_TEAMS] = value;
  }
}

export default _UserEditInternalHelper;
