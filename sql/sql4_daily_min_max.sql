SELECT 
    group_name,
    date_trunc('day', ts AT TIME ZONE 'Europe/Moscow') AS day_date,
    MIN(value) AS min_value,
    MAX(value) AS max_value
FROM demo_schema.demo_metrics
WHERE group_name = 'host-1'
  AND ts >= '2025-01-01 00:00:00+03'
  AND ts < '2025-01-02 00:00:00+03'
GROUP BY group_name, day_date
ORDER BY group_name, day_date;