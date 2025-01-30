import { is_object, is_empty, is_string } from "./utils";
import _ObjectEditInternalHelper from "./object_edit_internal_helper";

export default class ObjectEdit {
  constructor(config, object_type, object_id) {
    this.config = config;
    this.object_type = object_type;
    this.object_id = object_id;

    this.__errors = [];
    this.__info = [];
    this.operations = [];
    this._helper = new _ObjectEditInternalHelper();
  }

  get_object_type() {
    return this.object_type;
  }

  get_object_id() {
    return this.object_id;
  }

  get_warnings() {
    return this.__info;
  }

  get_errors() {
    return this.__errors;
  }

  get_payload() {
    return { operations: this.operations };
  }

  validate_body() {
    if (!is_empty(this.__info)) {
      const msg = `[object: ${this.object_type}/${
        this.object_id
      }] ${this.__info.join("\n")}`;
      console.log(`WARNING: ${msg}`);
    }
    if (!is_empty(this.__errors)) {
      const msg = `[object: ${this.object_type}/${
        this.object_id
      }] ${this.__errors.join("\n")}`;
      console.log(`ERROR: ${msg}`);
    }
  }

  _collect_operation() {
    const resp = this._helper._get_operation_result();
    if (!is_empty(resp["errors"])) {
      this.__errors = [...this.__errors, ...resp["errors"]];
    }
    if (!is_empty(resp["info"])) {
      this.__info = [...this.__info, ...resp["info"]];
    }
    if (!is_empty(resp["operation"])) {
      this.operations.push(resp["operation"]); // TODO: changed key name from payload to operation
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
        this._collect_operation();
      }
    } else {
      for (let item in key) {
        this._helper._append_kv(item, key[item], key, caller);
      }
      this._collect_operation();
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
        this._collect_operation();
      }
    } else {
      for (let item in key) {
        this._helper._set_kv(item, key[item], key, caller);
      }
      this._collect_operation();
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
        this._collect_operation();
      }
    } else {
      for (let item in key) {
        this._helper._set_once_kv(item, key[item], key, caller);
      }
      this._collect_operation();
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
        this._collect_operation();
      }
    } else {
      for (let item in key) {
        this._helper._increment_kv(item, key[item], key, caller);
      }
      this._collect_operation();
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
        this._collect_operation();
      }
    } else {
      for (let item in key) {
        this._helper._remove_kv(item, key[item], key, caller);
      }
      this._collect_operation();
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
      this._collect_operation();
    } else {
      for (let item of key) {
        this._helper._unset_k(item, caller);
      }
      this._collect_operation();
    }
  }

  set_preferred_language(lang_code) {
    const caller = "set_preferred_language";
    this._helper._set_preferred_language(lang_code, caller);
    this._collect_operation();
  }

  set_timezone(timezone) {
    const caller = "set_timezone";
    this._helper._set_timezone(timezone, caller);
    this._collect_operation();
  }

  add_email(email) {
    const caller = "add_email";
    this._helper._add_email(email, caller);
    this._collect_operation();
  }

  remove_email(email) {
    const caller = "remove_email";
    this._helper._remove_email(email, caller);
    this._collect_operation();
  }

  add_sms(mobile_no) {
    const caller = "add_sms";
    this._helper._add_sms(mobile_no, caller);
    this._collect_operation();
  }

  remove_sms(mobile_no) {
    const caller = "remove_sms";
    this._helper._remove_sms(mobile_no, caller);
    this._collect_operation();
  }

  add_whatsapp(mobile_no) {
    const caller = "add_whatsapp";
    this._helper._add_whatsapp(mobile_no, caller);
    this._collect_operation();
  }

  remove_whatsapp(mobile_no) {
    const caller = "remove_whatsapp";
    this._helper._remove_whatsapp(mobile_no, caller);
    this._collect_operation();
  }

  add_androidpush(push_token, provider = "fcm") {
    const caller = "add_androidpush";
    this._helper._add_androidpush(push_token, provider, caller);
    this._collect_operation();
  }

  remove_androidpush(push_token, provider = "fcm") {
    const caller = "remove_androidpush";
    this._helper._remove_androidpush(push_token, provider, caller);
    this._collect_operation();
  }

  add_iospush(push_token, provider = "apns") {
    const caller = "add_iospush";
    this._helper._add_iospush(push_token, provider, caller);
    this._collect_operation();
  }

  remove_iospush(push_token, provider = "apns") {
    const caller = "remove_iospush";
    this._helper._remove_iospush(push_token, provider, caller);
    this._collect_operation();
  }

  add_webpush(push_token, provider = "vapid") {
    const caller = "add_webpush";
    this._helper._add_webpush(push_token, provider, caller);
    this._collect_operation();
  }

  remove_webpush(push_token, provider = "vapid") {
    const caller = "remove_webpush";
    this._helper._remove_webpush(push_token, provider, caller);
    this._collect_operation();
  }

  add_slack(value) {
    const caller = "add_slack";
    this._helper._add_slack(value, caller);
    this._collect_operation();
  }

  remove_slack(value) {
    const caller = "remove_slack";
    this._helper._remove_slack(value, caller);
    this._collect_operation();
  }

  add_ms_teams(value) {
    const caller = "add_ms_teams";
    this._helper._add_ms_teams(value, caller);
    this._collect_operation();
  }

  remove_ms_teams(value) {
    const caller = "remove_ms_teams";
    this._helper._remove_ms_teams(value, caller);
    this._collect_operation();
  }
}
