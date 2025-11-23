import { Registry, Counter, Histogram, Gauge } from "prom-client";

// Створити реєстр метрик
export const register = new Registry();

// HTTP метрики
export const httpRequestDuration = new Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status"],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
  registers: [register],
});

export const httpRequestTotal = new Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status"],
  registers: [register],
});

export const httpRequestErrors = new Counter({
  name: "http_request_errors_total",
  help: "Total number of HTTP request errors",
  labelNames: ["method", "route", "status"],
  registers: [register],
});

// File operation метрики
export const fileUploadsTotal = new Counter({
  name: "file_uploads_total",
  help: "Total number of file uploads",
  labelNames: ["success"],
  registers: [register],
});

export const fileUploadSize = new Histogram({
  name: "file_upload_size_bytes",
  help: "Size of uploaded files in bytes",
  buckets: [1024, 10240, 102400, 1048576, 10485760, 104857600], // 1KB to 100MB
  registers: [register],
});

export const fileDownloadsTotal = new Counter({
  name: "file_downloads_total",
  help: "Total number of file downloads",
  labelNames: ["success"],
  registers: [register],
});

export const fileDeletesTotal = new Counter({
  name: "file_deletes_total",
  help: "Total number of file deletions",
  labelNames: ["success"],
  registers: [register],
});

// Authentication метрики
export const authAttemptsTotal = new Counter({
  name: "auth_attempts_total",
  help: "Total number of authentication attempts",
  labelNames: ["type", "success"], // type: login, register, 2fa
  registers: [register],
});

export const twoFactorVerificationsTotal = new Counter({
  name: "two_factor_verifications_total",
  help: "Total number of 2FA verifications",
  labelNames: ["success", "method"], // method: totp, backup_code
  registers: [register],
});

// Storage метрики
export const storageUsage = new Gauge({
  name: "storage_usage_bytes",
  help: "Total storage usage in bytes",
  labelNames: ["user_id"],
  registers: [register],
});

export const storageQuota = new Gauge({
  name: "storage_quota_bytes",
  help: "Storage quota in bytes",
  labelNames: ["user_id"],
  registers: [register],
});

// System метрики
export const activeUsers = new Gauge({
  name: "active_users_total",
  help: "Number of active users",
  registers: [register],
});

export const totalFiles = new Gauge({
  name: "total_files",
  help: "Total number of files in the system",
  registers: [register],
});

// Rate limiting метрики
export const rateLimitHits = new Counter({
  name: "rate_limit_hits_total",
  help: "Total number of rate limit hits",
  labelNames: ["endpoint", "ip"],
  registers: [register],
});

// Register default metrics (CPU, memory, etc.)
import { collectDefaultMetrics } from "prom-client";
collectDefaultMetrics({ register });
