import config from "./config";
import { SuprsendError, SuprsendConfigError } from "./utils";
import EventCollector from "./event";
import get_attachment_json_for_file from "./attachment";
import { BulkWorkflowsFactory } from "./workflow_batch";
import Workflow, { _WorkflowTrigger } from "./workflow";

const package_json = require("../package.json");

export default class Suprsend {
  constructor(workspace_key, workspace_secret, config = {}) {
    this.workspace_key = workspace_key;
    this.workspace_secret = workspace_secret;
    this.config = config;

    this.base_url = this._get_url(config.base_url);
    this.auth_enabled = config.auth_enabled !== false;
    this.include_signature_param = config.include_signature_param !== false;
    this.user_agent = `suprsend/${
      package_json.version
    };node/${process.version.slice(1)}`;

    this._workflow_trigger = new _WorkflowTrigger(this);
    this._eventcollector = new EventCollector(this);

    this._bulk_workflows = new BulkWorkflowsFactory(this);
    this._validate();
  }

  get bulk_workflows() {
    return this._bulk_workflows;
  }

  _validate() {
    if (!this.workspace_key) {
      throw new SuprsendConfigError("Missing workspace_key");
    } else if (!this.workspace_secret) {
      throw new SuprsendConfigError("Missing workspace_secret");
    } else if (!this.base_url) {
      throw new SuprsendConfigError("Missing base_url");
    }
  }

  _get_url(base_url) {
    if (base_url) {
      base_url = base_url.trim();
    }
    if (!base_url) {
      if (this.config.is_staging) {
        base_url = config.staging;
      } else {
        base_url = config.prod;
      }
    }
    base_url = base_url.trim();
    if (!base_url.endsWith("/")) {
      base_url += "/";
    }
    return base_url;
  }

  add_attachment(body, file_path) {
    if (!body.data) {
      body.data = {};
    }
    if (!body.data instanceof Object) {
      throw new SuprsendError("data must be an object");
    }
    const attachment = get_attachment_json_for_file(file_path);
    if (!body.data["$attachments"]) {
      body["data"]["$attachments"] = [];
    }
    body["data"]["$attachments"].push(attachment);
    return body;
  }

  trigger_workflow(data) {
    let wf_ins;
    if (data instanceof Workflow) {
      wf_ins = data;
    } else {
      wf_ins = new Workflow(data);
    }
    return this._workflow_trigger.trigger(wf_ins);
  }

  track(distinct_id, event_name, properties = {}) {
    const event = new Event(distinct_id, event_name, properties);
    return this._eventcollector.collect(event);
  }

  track_event(event) {
    if (!(event instanceof Event)) {
      throw new SuprsendError("argument must be an instance of suprsend.Event");
    }
    return this._eventcollector.collect(event);
  }
}
