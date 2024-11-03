import {
    is_object,
    is_empty,
    is_string,
    InputValueError, SuprsendApiError,
} from "./utils";
import get_request_signature from "./signature";
import axios from "axios";
import _ObjectInternalHelper from "./object_helper";


class ObjectsApi {
    constructor(config) {
        this.config = config;
        this.listUrl = this.createListUrl();
        this.headers = this.commonHeaders();
    }

    createListUrl() {
        return `${this.config.base_url}v1/object/`;
    }

    commonHeaders() {
        return {
            'Content-Type': 'application/json; charset=utf-8',
            'User-Agent': this.config.user_agent,
        };
    }

    dynamicHeaders() {
        return {
            'Date': new Date().toISOString(), // Adjust to your header date format
        };
    }

    validateObjectEntityString(entityId) {
        if (!is_string(entityId)) {
            throw new InputValueError(
                "object entity must be a string"
            );
        }
        entityId = entityId.trim();
        if (!entityId) {
            throw new InputValueError("object entity must be passed");
        }
        return entityId;
    }

    async list(objectType, options = {}) {
        const params = new URLSearchParams(options).toString();
        const validatedType = this.validateObjectEntityString(objectType);
        const encodedType = encodeURIComponent(validatedType);
        const url = `${this.listUrl}${encodedType}/?${params}`;
        const headers = { ...this.headers, ...this.dynamicHeaders() };
        const signature = get_request_signature(
            url,
            "GET",
            "",
            headers,
            this.config.workspace_secret
        );
        headers['Authorization'] = `${this.config.workspace_key}:${signature}`;

        try {
            const response = await axios.get(url, { headers });
            return response.data;
        } catch (err) {
            throw new SuprsendApiError(err);
        }
    }

    async detailUrl(objectType, objectId) {
        const validatedType = this.validateObjectEntityString(objectType);
        const encodedType = encodeURIComponent(validatedType);

        const validatedId = this.validateObjectEntityString(objectId);
        const encodedId = encodeURIComponent(validatedId);

        return `${this.listUrl}${encodedType}/${encodedId}/`;
    }

    async get(objectType, objectId) {
        const url = await this.detailUrl(objectType, objectId);
        const headers = { ...this.headers, ...this.dynamicHeaders() };
        const signature = get_request_signature(
            url,
            "GET",
            "",
            headers,
            this.config.workspace_secret
        );
        headers['Authorization'] = `${this.config.workspace_key}:${signature}`;

        try {
            const response = await axios.get(url, { headers });
            return response.data;
        } catch (err) {
            throw new SuprsendApiError(err);
        }
    }

    async upsert(objectType, objectId, objectPayload) {
        const url = await this.detailUrl(objectType, objectId);
        const headers = { ...this.headers, ...this.dynamicHeaders() };
        const contentText = JSON.stringify(objectPayload);
        const signature = get_request_signature(
            url,
            "POST",
            contentText,
            headers,
            this.config.workspace_secret
        );
        headers['Authorization'] = `${this.config.workspace_key}:${signature}`;

        try {
            const response = await axios.post(url, contentText, { headers });
            return response.data;
        } catch (err) {
            throw new SuprsendApiError(err);
        }
    }

    async edit(objectType, objectId, editPayload) {
        const url = await this.detailUrl(objectType, objectId);
        const headers = { ...this.headers, ...this.dynamicHeaders() };
        const contentText = JSON.stringify(editPayload);
        const signature = get_request_signature(
            url,
            "PATCH",
            contentText,
            headers,
            this.config.workspace_secret
        );
        headers['Authorization'] = `${this.config.workspace_key}:${signature}`;

        try {
            const response = await axios.patch(url, contentText, { headers });
            return response.data;
        } catch (err) {
            throw new SuprsendApiError(err);
        }
    }

    async delete(objectType, objectId) {
        const url = await this.detailUrl(objectType, objectId);
        const headers = { ...this.headers, ...this.dynamicHeaders() };
        const signature = get_request_signature(
            url,
            "DELETE",
            "",
            headers,
            this.config.workspace_secret
        );
        headers['Authorization'] = `${this.config.workspace_key}:${signature}`;

        try {
            const response = await axios.delete(url, { headers });
            return response.data;
        } catch (err) {
            throw new SuprsendApiError(err);
        }
    }

    async get_subscriptions(objectType, objectId, options = {}) {
        const params = new URLSearchParams(options).toString();
        const url = await this.detailUrl(objectType, objectId);
        const subscription_url = `${url}subscription/?${params}`;
        const headers = { ...this.headers, ...this.dynamicHeaders() };
        const signature = get_request_signature(
            subscription_url,
            "GET",
            "",
            headers,
            this.config.workspace_secret
        );
        headers['Authorization'] = `${this.config.workspace_key}:${signature}`;

        try {
            const response = await axios.get(url, { headers });
            return response.data;
        } catch (err) {
            throw new SuprsendApiError(err);
        }
    }

    async create_subscriptions(objectType, objectId, subscriptions) {
        const url = await this.detailUrl(objectType, objectId);
        const subscription_url = `${url}subscription/`;
        const headers = { ...this.headers, ...this.dynamicHeaders() };
        const contentText = JSON.stringify(subscriptions);
        const signature = get_request_signature(
            subscription_url,
            "POST",
            contentText,
            headers,
            this.config.workspace_secret
        );
        headers['Authorization'] = `${this.config.workspace_key}:${signature}`;

        try {
            const response = await axios.post(url, contentText, { headers });
            return response.data;
        } catch (err) {
            throw new SuprsendApiError(err);
        }
    }

    async delete_subscriptions(objectType, objectId, subscriptions) {
        const url = await this.detailUrl(objectType, objectId);
        const subscription_url = `${url}subscription/`;
        const headers = { ...this.headers, ...this.dynamicHeaders() };
        const contentText = JSON.stringify(subscriptions);
        const signature = get_request_signature(
            subscription_url,
            "DELETE",
            contentText,
            headers,
            this.config.workspace_secret
        );
        headers['Authorization'] = `${this.config.workspace_key}:${signature}`;

        try {
            const response = await axios.delete(url, { headers });
            return response.data;
        } catch (err) {
            throw new SuprsendApiError(err);
        }
    }

    get_instance(object_type, object_id) {
        if (!is_string(object_type)) {
            throw new InputValueError(
                "object_type must be a string"
            );
        }
        object_type = object_type.trim();
        if (!object_type) {
            throw new InputValueError("object_type must be passed");
        }

        if (!is_string(object_id)) {
            throw new InputValueError(
                "object_id must be a string"
            );
        }
        object_id = object_id.trim();
        if (!object_id) {
            throw new InputValueError("object_id must be passed");
        }
        return new _Object(this.config, object_type, object_id);
    }

}

export class _Object {
    constructor(config, object_type, object_id) {
        this.config = config;
        this.object_type = object_type;
        this.object_id = object_id;
        this.__url = this.__get_url();
        this.__super_props = this.__super_properties();

        this.__errors = [];
        this.__info = [];
        this.operations = [];
        this._helper = new _ObjectInternalHelper();
    }

    __get_url() {
        return `${this.config.base_url}v1/object/${this.object_type}/${this.object_id}/`;
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

    validate_body() {
        if (!is_empty(this.__info)) {
            const msg = `[object_type: ${this.object_type}, ${this.object_id}]${this.__info.join("\n")}`;
            console.log(`WARNING: ${msg}`);
        }
        if (!is_empty(this.__errors)) {
            const msg = `[object_type: ${this.object_type}, ${this.object_id}]${this.__errors.join("\n")}`;
            console.log(`ERROR: ${msg}`);
        }
    }

    async save() {
        this.validate_body();
        const headers = this.__get_headers();
        //
        const payload = {
            operations: this.operations
        }
        const content_text = JSON.stringify(payload);

        const signature = get_request_signature(
            this.__url,
            "PATCH",
            content_text,
            headers,
            this.config.workspace_secret
        );
        headers['Authorization'] = `${this.config.workspace_key}:${signature}`;

        try {
            const response = await axios.patch(this.__url, content_text, { headers });
            return response.data;
        } catch (err) {
            throw new SuprsendApiError(err);
        }
    }

    _collect_payload() {
        const resp = this._helper.get_identity_events();
        if (!is_empty(resp["errors"])) {
            this.__errors = [...this.__errors, ...resp["errors"]];
        }
        if (!is_empty(resp["info"])) {
            this.__info = [...this.__info, ...resp["info"]];
        }
        if (!is_empty(resp["payload"])) {
            this.operations.push(resp["payload"]);
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
                this._collect_payload();
            }
        } else {
            for (let item in key) {
                this._helper._append_kv(item, key[item], key, caller);
            }
            this._collect_payload();
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
                this._collect_payload();
            }
        } else {
            for (let item in key) {
                this._helper._set_kv(item, key[item], key, caller);
            }
            this._collect_payload();
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
                this._collect_payload();
            }
        } else {
            for (let item in key) {
                this._helper._set_once_kv(item, key[item], key, caller);
            }
            this._collect_payload();
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
                this._collect_payload();
            }
        } else {
            for (let item in key) {
                this._helper._increment_kv(item, key[item], key, caller);
            }
            this._collect_payload();
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
                this._collect_payload();
            }
        } else {
            for (let item in key) {
                this._helper._remove_kv(item, key[item], key, caller);
            }
            this._collect_payload();
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
            this._collect_payload();
        } else {
            for (let item of key) {
                this._helper._unset_k(item, caller);
            }
            this._collect_payload();
        }
    }

    set_preferred_language(lang_code) {
        const caller = "set_preferred_language";
        this._helper._set_preferred_language(lang_code, caller);
        this._collect_payload();
    }

    set_timezone(timezone) {
        const caller = "set_timezone";
        this._helper._set_timezone(timezone, caller);
        this._collect_payload();
    }

    add_email(email) {
        const caller = "add_email";
        this._helper._add_email(email, caller);
        this._collect_payload();
    }

    remove_email(email) {
        const caller = "remove_email";
        this._helper._remove_email(email, caller);
        this._collect_payload();
    }

    add_sms(mobile_no) {
        const caller = "add_sms";
        this._helper._add_sms(mobile_no, caller);
        this._collect_payload();
    }

    remove_sms(mobile_no) {
        const caller = "remove_sms";
        this._helper._remove_sms(mobile_no, caller);
        this._collect_payload();
    }

    add_whatsapp(mobile_no) {
        const caller = "add_whatsapp";
        this._helper._add_whatsapp(mobile_no, caller);
        this._collect_payload();
    }

    remove_whatsapp(mobile_no) {
        const caller = "remove_whatsapp";
        this._helper._remove_whatsapp(mobile_no, caller);
        this._collect_payload();
    }

    add_androidpush(push_token, provider = "fcm") {
        const caller = "add_androidpush";
        this._helper._add_androidpush(push_token, provider, caller);
        this._collect_payload();
    }

    remove_androidpush(push_token, provider = "fcm") {
        const caller = "remove_androidpush";
        this._helper._remove_androidpush(push_token, provider, caller);
        this._collect_payload();
    }

    add_iospush(push_token, provider = "apns") {
        const caller = "add_iospush";
        this._helper._add_iospush(push_token, provider, caller);
        this._collect_payload();
    }

    remove_iospush(push_token, provider = "apns") {
        const caller = "remove_iospush";
        this._helper._remove_iospush(push_token, provider, caller);
        this._collect_payload();
    }

    add_webpush(push_token, provider = "vapid") {
        const caller = "add_webpush";
        this._helper._add_webpush(push_token, provider, caller);
        this._collect_payload();
    }

    remove_webpush(push_token, provider = "vapid") {
        const caller = "remove_webpush";
        this._helper._remove_webpush(push_token, provider, caller);
        this._collect_payload();
    }

    add_slack(value) {
        const caller = "add_slack";
        this._helper._add_slack(value, caller);
        this._collect_payload();
    }

    remove_slack(value) {
        const caller = "remove_slack";
        this._helper._remove_slack(value, caller);
        this._collect_payload();
    }

    add_ms_teams(value) {
        const caller = "add_ms_teams";
        this._helper._add_ms_teams(value, caller);
        this._collect_payload();
    }

    remove_ms_teams(value) {
        const caller = "remove_ms_teams";
        this._helper._remove_ms_teams(value, caller);
        this._collect_payload();
    }

}

export default ObjectsApi;
