/**
 * ข้อผิดพลาดจาก Graph ที่แมปเป็น HTTP status + คำแนะนำฝั่งผู้ใช้
 */
export class FacebookGraphActionError extends Error {
  readonly fbCode?: number;
  readonly hint?: string;
  readonly fbtraceId?: string;
  readonly httpStatus: number;

  constructor(opts: {
    message: string;
    fbCode?: number;
    hint?: string;
    fbtraceId?: string;
    httpStatus?: number;
  }) {
    super(opts.message);
    this.name = "FacebookGraphActionError";
    this.fbCode = opts.fbCode;
    this.hint = opts.hint;
    this.fbtraceId = opts.fbtraceId;
    this.httpStatus = opts.httpStatus ?? 502;
  }
}
