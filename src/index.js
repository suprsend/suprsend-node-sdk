import { SuprsendConfigError, InputValueError } from "./utils";
import get_attachment_json from "./attachment";
import Workflow, { _WorkflowTrigger } from "./workflow";
import { BulkWorkflowsFactory } from "./workflows_bulk";
import WorkflowTriggerRequest from "./workflow_request";
import WorkflowsApi from "./workflow_api";
import Event, { EventCollector } from "./event";
import { BulkEventsFactory } from "./events_bulk";
import SubscriberFactory from "./subscriber";
import BulkSubscribersFactory from "./subscribers_bulk";
import { SubscriberListsApi, SubscriberListBroadcast } from "./subscriber_list";
import BrandsApi from "./brands";
import TenantsApi from "./tenant";
import { DEFAULT_URL } from "./constants";

const package_json = require("../package.json");

class Suprsend {
  constructor(workspace_key, workspace_secret, config = {}) {
    this.workspace_key = workspace_key;
    this.workspace_secret = workspace_secret;
    this.config = config;

    this.base_url = this._get_url(config.base_url);
    this.user_agent = `suprsend/${
      package_json.version
    };node/${process.version.slice(1)}`;

    this._workflow_trigger = new _WorkflowTrigger(this);
    this._eventcollector = new EventCollector(this);

    this._bulk_workflows = new BulkWorkflowsFactory(this);
    this._bulk_events = new BulkEventsFactory(this);
    this._bulk_users = new BulkSubscribersFactory(this);

    this._user = new SubscriberFactory(this);

    this.brands = new BrandsApi(this);
    this.tenants = new TenantsApi(this);
    this.workflows = new WorkflowsApi(this);

    this.subscriber_lists = new SubscriberListsApi(this);

    this._validate();
  }

  get bulk_workflows() {
    return this._bulk_workflows;
  }

  get bulk_events() {
    return this._bulk_events;
  }

  get bulk_users() {
    return this._bulk_users;
  }

  get user() {
    return this._user;
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
      base_url = DEFAULT_URL;
    }
    base_url = base_url.trim();
    if (!base_url.endsWith("/")) {
      base_url += "/";
    }
    return base_url;
  }

  add_attachment(body, file_path, kwargs = {}) {
    console.warn(
      'This method is deprecated. Use "WorkflowTriggerRequest.add_attachment()" instead'
    );
    const file_name = kwargs?.file_name;
    const ignore_if_error = kwargs?.ignore_if_error ?? false;
    if (!body?.data) {
      body.data = {};
    }
    if (!(body.data instanceof Object)) {
      throw new InputValueError("data must be an object");
    }
    const attachment = get_attachment_json(
      file_path,
      file_name,
      ignore_if_error
    );
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

  track(distinct_id, event_name, properties = {}, kwargs = {}) {
    console.warn('This method is deprecated. Use "track_event(Event)" instead');
    const event = new Event(distinct_id, event_name, properties, kwargs);
    return this._eventcollector.collect(event);
  }

  track_event(event) {
    if (!(event instanceof Event)) {
      throw new InputValueError(
        "argument must be an instance of suprsend.Event"
      );
    }
    return this._eventcollector.collect(event);
  }
}

export {
  Suprsend,
  Event,
  Workflow,
  SubscriberListBroadcast,
  WorkflowTriggerRequest,
};
