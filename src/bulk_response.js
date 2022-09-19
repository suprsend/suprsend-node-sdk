export default class BulkResponse {
  constructor() {
    this.status;
    this.failed_records = [];
    this.total = 0;
    this.success = 0;
    this.failure = 0;
    this.warnings = [];
  }

  merge_chunk_response(ch_resp) {
    if (!ch_resp) {
      return;
    }
    // possible status: success/partial/fail
    if (!this.status) {
      this.status = ch_resp["status"];
    } else {
      if (this.status === "success") {
        if (ch_resp.status === "fail") {
          this.status = "partial";
        }
      } else if (this.status === "fail") {
        if (ch_resp.status === "success") {
          this.status = "partial";
        }
      }
    }
    this.total += ch_resp.total || 0;
    this.success += ch_resp.success || 0;
    this.failure += ch_resp.failure || 0;
    const failed_recs = ch_resp.failed_records || [];
    this.failed_records = [...this.failed_records, ...failed_recs];
  }
}
