import {
  InputValueError,
  get_apparent_workflow_body_size,
  validate_workflow_trigger_body_schema,
} from "./utils";
import get_attachment_json from "./attachment";
import {
  SINGLE_EVENT_MAX_APPARENT_SIZE_IN_BYTES,
  SINGLE_EVENT_MAX_APPARENT_SIZE_IN_BYTES_READABLE,
} from "./constants";

export default class WorkflowTriggerRequest {
  constructor(body, kwargs = {}) {
    if (!(typeof body === "object" && !Array.isArray(body))) {
      throw new InputValueError(
        "WorkflowTriggerRequest body must be a JSON object/dictionary"
      );
    }
    this.body = body;
    this.idempotency_key = kwargs?.idempotency_key;
    this.tenant_id = kwargs?.tenant_id;
    this.cancellation_key = kwargs?.cancellation_key;
  }

  add_attachment(file_path = "", kwargs = {}) {
    const file_name = kwargs?.file_name;
    const ignore_if_error = kwargs?.ignore_if_error ?? false;
    if (!this.body.data) {
      this.body.data = {};
    }
    // If body["data"] is not a dictionary, don't raise an error while adding attachment.
    if (typeof this.body.data !== "object") {
      console.warn(
        "WARNING: attachment cannot be added. Please make sure body['data'] is a dictionary. WorkflowTriggerRequest ",
        JSON.stringify(this.as_json())
      );
      return;
    }
    const attachment = get_attachment_json(
      file_path,
      file_name,
      ignore_if_error
    );
    if (!attachment) {
      return;
    }
    if (!this.body.data.$attachments) {
      this.body.data.$attachments = [];
    }
    this.body.data.$attachments.push(attachment);
  }

  get_final_json(config, is_part_of_bulk = false) {
    if (this.idempotency_key) {
      this.body["$idempotency_key"] = this.idempotency_key;
    }
    if (this.tenant_id) {
      this.body["tenant_id"] = this.tenant_id;
    }
    if (this.cancellation_key) {
      this.body.cancellation_key = this.cancellation_key;
    }

    this.body = validate_workflow_trigger_body_schema(this.body);

    const apparent_size = get_apparent_workflow_body_size(
      this.body,
      is_part_of_bulk
    );
    if (apparent_size > SINGLE_EVENT_MAX_APPARENT_SIZE_IN_BYTES) {
      throw new InputValueError(
        `workflow body too big - ${apparent_size} Bytes, must not exceed ${SINGLE_EVENT_MAX_APPARENT_SIZE_IN_BYTES_READABLE}`
      );
    }

    return [this.body, apparent_size];
  }

  as_json() {
    const body_dict = { ...this.body };
    if (this.idempotency_key) {
      body_dict.$idempotency_key = this.idempotency_key;
    }
    if (this.tenant_id) {
      body_dict.tenant_id = this.tenant_id;
    }
    if (this.cancellation_key) {
      body_dict.cancellation_key = this.cancellation_key;
    }
    return body_dict;
  }
}
