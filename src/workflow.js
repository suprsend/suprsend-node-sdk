import get_request_signature from "./signature";
import { Validator } from "jsonschema";
import { SuprsendError } from "./utils";
import axios from "axios";

const workflow_schema = require("./request_json/workflow.json");

class Workflow {
  constructor(ss_instance, data) {
    this.ss_instance = ss_instance;
    this.data = data;
    this.url = this._get_url();
  }

  _get_url() {
    let url_template = "/trigger/";
    if (this.ss_instance.include_signature_param) {
      if (this.ss_instance.auth_enabled) {
        url_template = url_template + "?verify=true";
      } else {
        url_template = url_template + "?verify=false";
      }
    }
    const url_formatted = `${this.ss_instance.base_url}${this.ss_instance.env_key}${url_template}`;
    return url_formatted;
  }

  _get_headers() {
    return {
      "Content-Type": "application/json",
      Date: new Date().toUTCString(),
      "User-Agent": this.ss_instance.user_agent,
    };
  }

  async execute_workflow() {
    const headers = this._get_headers();
    const content_text = JSON.stringify(this.data);
    if (this.ss_instance.auth_enabled) {
      const signature = get_request_signature(
        this.url,
        "POST",
        content_text,
        headers,
        this.ss_instance.env_secret
      );
      headers["Authorization"] = `${this.ss_instance.env_key}:${signature}`;
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

  validate_data() {
    if (!this.data?.data) {
      this.data.data = {};
    }
    if (!(this.data.data instanceof Object)) {
      throw new SuprsendError("data must be a object");
    }
    const schema = workflow_schema;
    var v = new Validator();
    const validated_data = v.validate(this.data, schema);
    if (validated_data.valid) {
      return this.data;
    } else {
      const error_obj = validated_data.errors[0];
      const error_msg = `${error_obj.property} ${error_obj.message}`;
      throw new SuprsendError(error_msg);
    }
  }
}

export default Workflow;
