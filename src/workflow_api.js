import axios from "axios";
import get_request_signature from "./signature";
import { BulkWorkflowTrigger } from "./workflow_trigger_bulk";
import WorkflowTriggerRequest from "./workflow_request";

export default class WorkflowsApi {
  constructor(config) {
    this.config = config;
    this.metadata = { "User-Agent": this.config.user_agent };
  }

  _get_headers() {
    return {
      "Content-Type": "application/json; charset=utf-8",
      Date: new Date().toUTCString(),
      "User-Agent": this.config.user_agent,
    };
  }

  async trigger(workflow) {
    const is_part_of_bulk = false;
    const [workflow_body, body_size] = workflow.get_final_json(
      this.config,
      is_part_of_bulk
    );
    try {
      const headers = this._get_headers();
      const content_text = JSON.stringify(workflow_body);
      const url = `${this.config.base_url}trigger/`;
      const signature = get_request_signature(
        url,
        "POST",
        content_text,
        headers,
        this.config.workspace_secret
      );
      headers["Authorization"] = `${this.config.workspace_key}:${signature}`;
      const resp = await axios.post(url, content_text, {
        headers,
        transformResponse: [(data) => data], // dont assume type of response
      });
      const ok_response = Math.floor(resp.status / 100) === 2;
      return {
        success: ok_response,
        status: ok_response ? "success" : "fail",
        status_code: resp.status,
        message: resp.data,
      };
    } catch (err) {
      if (err?.response) {
        return {
          success: false,
          status: "fail",
          status_code: err?.response?.status || 500,
          message: err?.response?.data,
        };
      } else {
        return {
          success: false,
          status: "fail",
          status_code: 500,
          message: err.message,
        };
      }
    }
  }

  bulk_trigger_instance() {
    return new BulkWorkflowTrigger(this.config);
  }
}
