import {
  uuid,
  get_apparent_identity_event_size,
  InputValueError,
  epoch_milliseconds,
  is_empty,
  is_string,
  is_object,
} from "./utils";

class UserEdit {
  constructor(config, distinct_id) {
    this.config = config;
    this.distinct_id = distinct_id;

    this.__errors = [];
    this.__info = [];

    this.operations = [];
    this._helper = new _UserEditInternalHelper();

    this.__warnings_list = [];
  }

  get warnings() {
    return this.__info;
  }

  get errors() {
    return this.__errors;
  }

  get_payload() {
    return { operations: this.operations };
  }

  get_async_payload() {
    return {
      $schema: "2",
      $insert_id: uuid(),
      $time: epoch_milliseconds(),
      env: this.config.workspace_key,
      distinct_id: this.distinct_id,
      $user_operations: this.operations,
      properties: { $ss_sdk_version: this.config.user_agent },
    };
  }

  as_json_async() {
    return {
      distinct_id: this.distinct_id,
      $user_operations: this.operations,
      warnings: this.__warnings_list,
    };
  }

  validate_payload_size(payload) {
    const apparent_size = get_apparent_identity_event_size(payload);
    if (apparent_size > IDENTITY_SINGLE_EVENT_MAX_APPARENT_SIZE_IN_BYTES) {
      throw new InputValueError(
        `User Payload size too big - ${apparent_size} Bytes, ` +
          `must not cross ${IDENTITY_SINGLE_EVENT_MAX_APPARENT_SIZE_IN_BYTES_READABLE}`
      );
    }
    return [payload, apparent_size];
  }

  validate_body() {
    this.__warnings_list = [];
    if (!is_empty(this.__info)) {
      const msg = `[distinct_id: ${this.distinct_id}]` + this.__info.join("\n");
      this.__warnings_list.push(msg);
      console.log(`WARNING: ${msg}`);
    }
    if (!is_empty(this.__errors)) {
      const msg =
        `[distinct_id: ${this.distinct_id}]` + this.__errors.join("\n");
      this.__warnings_list.push(msg);
      console.log(`ERROR: ${msg}`);
    }
    return this.__warnings_list;
  }

  _collect_operation() {
    const resp = this._helper.get_operation_result();
    if (!is_empty(resp["errors"])) {
      this.__errors = [...this.__errors, ...resp["errors"]];
    }
    if (!is_empty(resp["info"])) {
      this.__info = [...this.__info, ...resp["info"]];
    }
    if (!is_empty(resp["operation"])) {
      this.operations.push(resp["operation"]);
    }
  }

  append(arg1, arg2 = null) {
    const caller = "append";
    if (!is_string(arg1) && !is_object(arg1)) {
      this.__errors.push(`[${caller}] arg1 must be either string or a dict`);
      return;
    }
    if (is_string(arg1)) {
      if (!arg2) {
        this.__errors.push(
          `[${caller}] if arg1 is a string, then arg2 must be passed`
        );
        return;
      } else {
        this._helper._append_kv(arg1, arg2, {}, caller);
        this._collect_operation();
      }
    } else {
      for (let item in arg1) {
        this._helper._append_kv(item, arg1[item], arg1, caller);
      }
      this._collect_operation();
    }
  }

  set(arg1, arg2 = null) {
    const caller = "set";
    if (!is_string(arg1) && !is_object(arg1)) {
      this.__errors.push(`[${caller}] arg1 must be String or a dict`);
      return;
    }
    if (typeof arg1 === "string") {
      if (arg2 === null || arg2 === undefined) {
        this.__errors.push(
          `[${caller}] if arg1 is a string, then arg2 must be passed`
        );
        return;
      } else {
        this._helper._set_kv(arg1, arg2, caller);
        this._collect_operation();
      }
    } else {
      for (let item in arg1) {
        this._helper._set_kv(item, arg1[item], arg1, caller);
      }
      this._collect_operation();
    }
  }

  set_once(arg1, arg2 = null) {
    const caller = "set_once";
    if (!is_string(arg1) && !is_object(arg1)) {
      this.__errors.push(`[${caller}] arg1 must be String or a dict`);
      return;
    }
    if (is_string(arg1)) {
      if (arg2 === null || arg2 === undefined) {
        this.__errors.push(
          `[${caller}] if arg1 is a string, then arg2 must be passed`
        );
        return;
      } else {
        this._helper._set_once_kv(arg1, arg2, caller);
        this._collect_operation();
      }
    } else {
      for (let item in arg1) {
        this._helper._set_once_kv(item, arg1[item], arg1, caller);
      }
      this._collect_operation();
    }
  }

  increment(arg1, arg2 = null) {
    const caller = "increment";
    if (!is_string(arg1) && !is_object(arg1)) {
      this.__errors.push(`[${caller}] arg1 must be String or a dict`);
      return;
    }
    if (is_string(arg1)) {
      if (arg2 === null || arg2 === undefined) {
        this.__errors.push(
          `[${caller}] if arg1 is a string, then arg2 must be passed`
        );
        return;
      } else {
        this._helper._increment_kv(arg1, arg2, caller);
        this._collect_operation();
      }
    } else {
      for (let item in arg1) {
        this._helper._increment_kv(item, arg1[item], arg1, caller);
      }
      this._collect_operation();
    }
  }

  remove(arg1, arg2 = null) {
    const caller = "remove";
    if (!is_string(arg1) && !is_object(arg1)) {
      this.__errors.push(`[${caller}] arg1 must be either string or a dict`);
      return;
    }
    if (is_string(arg1)) {
      if (arg2 === null || arg2 === undefined) {
        this.__errors.push(
          `[${caller}] if arg1 is a string, then arg2 must be passed`
        );
        return;
      } else {
        this._helper._remove_kv(arg1, arg2, {}, caller);
        this._collect_operation();
      }
    } else {
      for (let item in arg1) {
        this._helper._remove_kv(item, arg1[item], arg1, caller);
      }
      this._collect_operation();
    }
  }

  unset(key) {
    const caller = "unset";
    if (!is_string(key) && !Array.isArray(key)) {
      this.__errors.push(
        `[${caller}] key must be either String or List[string]`
      );
      return;
    }
    if (is_string(key)) {
      this._helper._unset_k(key, caller);
      this._collect_operation();
    } else {
      for (const k of key) {
        this._helper._unset_k(k, caller);
      }
      this._collect_operation();
    }
  }

  // ------------------------ Preferred language
  set_preferred_language(lang_code) {
    const caller = "set_preferred_language";
    this._helper._set_preferred_language(lang_code, caller);
    this._collect_operation();
  }

  // ------------------------ Timezone
  set_timezone(timezone) {
    const caller = "set_timezone";
    this._helper._set_timezone(timezone, caller);
    this._collect_operation();
  }

  // ------------------------ Email
  add_email(value) {
    const caller = "add_email";
    this._helper._add_email(value, caller);
    this._collect_operation();
  }

  remove_email(value) {
    const caller = "remove_email";
    this._helper._remove_email(value, caller);
    this._collect_operation();
  }

  // ------------------------ SMS
  add_sms(value) {
    const caller = "add_sms";
    this._helper._add_sms(value, caller);
    this._collect_operation();
  }

  remove_sms(value) {
    const caller = "remove_sms";
    this._helper._remove_sms(value, caller);
    this._collect_operation();
  }

  // ------------------------ Whatsapp
  add_whatsapp(value) {
    const caller = "add_whatsapp";
    this._helper._add_whatsapp(value, caller);
    this._collect_operation();
  }

  remove_whatsapp(value) {
    const caller = "remove_whatsapp";
    this._helper._remove_whatsapp(value, caller);
    this._collect_operation();
  }

  // ------------------------ Androidpush
  add_androidpush(value, provider = null) {
    const caller = "add_androidpush";
    this._helper._add_androidpush(value, provider, caller);
    this._collect_operation();
  }

  remove_androidpush(value, provider = null) {
    const caller = "remove_androidpush";
    this._helper._remove_androidpush(value, provider, caller);
    this._collect_operation();
  }

  // ------------------------ Iospush [providers: apns]
  add_iospush(value, provider = null) {
    const caller = "add_iospush";
    this._helper._add_iospush(value, provider, caller);
    this._collect_operation();
  }

  remove_iospush(value, provider = null) {
    const caller = "remove_iospush";
    this._helper._remove_iospush(value, provider, caller);
    this._collect_operation();
  }

  // ------------------------ Webpush [providers: vapid]
  add_webpush(value, provider = null) {
    const caller = "add_webpush";
    this._helper._add_webpush(value, provider, caller);
    this._collect_operation();
  }

  remove_webpush(value, provider = null) {
    const caller = "remove_webpush";
    this._helper._remove_webpush(value, provider, caller);
    this._collect_operation();
  }

  // ------------------------ Slack
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

  // ------------------------ MS Teams
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

export default UserEdit;
