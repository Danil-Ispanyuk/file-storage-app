# Моніторинг та метрики

Додаток використовує Prometheus для збору метрик та моніторингу.

## Endpoint метрик

**GET /api/metrics** (тільки для адмінів)

Повертає метрики у форматі Prometheus.

```bash
curl -H "Cookie: next-auth.session-token=YOUR_TOKEN" http://localhost:3000/api/metrics
```

## Доступні метрики

### HTTP метрики

- `http_request_duration_seconds` - Тривалість HTTP запитів (histogram)
- `http_requests_total` - Загальна кількість HTTP запитів (counter)
- `http_request_errors_total` - Кількість помилок HTTP запитів (counter)

**Labels:**

- `method` - HTTP метод (GET, POST, DELETE, etc.)
- `route` - Маршрут API
- `status` - HTTP статус код

### File операції

- `file_uploads_total` - Кількість завантажень файлів (counter)
- `file_upload_size_bytes` - Розмір завантажених файлів (histogram)
- `file_downloads_total` - Кількість скачувань файлів (counter)
- `file_deletes_total` - Кількість видалень файлів (counter)

**Labels:**

- `success` - true/false

### Автентифікація

- `auth_attempts_total` - Кількість спроб автентифікації (counter)
- `two_factor_verifications_total` - Кількість перевірок 2FA (counter)

**Labels:**

- `type` - login, register
- `success` - true/false
- `method` - totp, backup_code (для 2FA)

### Storage

- `storage_usage_bytes` - Використане місце (gauge)
- `storage_quota_bytes` - Квота зберігання (gauge)

**Labels:**

- `user_id` - ID користувача

### System метрики

- `active_users_total` - Кількість активних користувачів (gauge)
- `total_files` - Загальна кількість файлів (gauge)
- `rate_limit_hits_total` - Кількість спрацювань rate limiting (counter)

### Default метрики (від prom-client)

- `process_cpu_user_seconds_total`
- `process_cpu_system_seconds_total`
- `process_cpu_seconds_total`
- `process_start_time_seconds`
- `process_resident_memory_bytes`
- `nodejs_heap_size_total_bytes`
- `nodejs_heap_size_used_bytes`
- `nodejs_external_memory_bytes`
- `nodejs_heap_space_size_total_bytes`
- `nodejs_heap_space_size_used_bytes`
- `nodejs_heap_space_size_available_bytes`
- `nodejs_version_info`

## Налаштування Prometheus

### prometheus.yml

```yaml
scrape_configs:
  - job_name: "file-storage-app"
    scrape_interval: 15s
    metrics_path: "/api/metrics"
    static_configs:
      - targets: ["localhost:3000"]
    basic_auth:
      username: "admin"
      password: "your-password"
```

## Налаштування Grafana

### Dashboard приклад

1. Створити новий dashboard
2. Додати panels для:
   - HTTP request rate
   - HTTP error rate
   - File upload/download rate
   - Authentication success rate
   - Storage usage
   - System metrics (CPU, memory)

### Приклади запитів PromQL

```promql
# HTTP request rate
rate(http_requests_total[5m])

# Error rate
rate(http_request_errors_total[5m])

# File upload success rate
rate(file_uploads_total{success="true"}[5m])

# Average file upload size
rate(file_upload_size_bytes_sum[5m]) / rate(file_upload_size_bytes_count[5m])

# 2FA verification success rate
rate(two_factor_verifications_total{success="true"}[5m]) / rate(two_factor_verifications_total[5m])
```

## Алерти

### Приклад правил алертів (alertmanager.yml)

```yaml
groups:
  - name: file_storage_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_request_errors_total[5m]) > 0.1
        for: 5m
        annotations:
          summary: "High error rate detected"

      - alert: HighFileUploadFailureRate
        expr: rate(file_uploads_total{success="false"}[5m]) > 0.05
        for: 5m
        annotations:
          summary: "High file upload failure rate"

      - alert: High2FAFailureRate
        expr: rate(two_factor_verifications_total{success="false"}[5m]) > 0.2
        for: 5m
        annotations:
          summary: "High 2FA verification failure rate"

      - alert: HighMemoryUsage
        expr: process_resident_memory_bytes > 1073741824 # 1GB
        for: 5m
        annotations:
          summary: "High memory usage"
```

## Інтеграція з іншими системами

### Datadog

```javascript
// Використовувати Prometheus endpoint як джерело метрик
```

### New Relic

```javascript
// Експортувати метрики через Prometheus endpoint
```

## Troubleshooting

### Метрики не збираються

1. Перевірити чи endpoint `/api/metrics` доступний
2. Перевірити чи користувач має права адміна
3. Перевірити логи на помилки

### Високе навантаження від метрик

- Метрики збираються асинхронно
- Використовується кешування де можливо
- Можна зменшити частоту збору метрик в Prometheus
