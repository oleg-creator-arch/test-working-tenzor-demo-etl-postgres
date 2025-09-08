WITH hourly AS (
    SELECT
        date_trunc('hour', ts AT TIME ZONE 'Europe/Moscow') AS hour_start,
        value
    FROM demo_schema.demo_metrics
    WHERE group_name = 'host-2'
      AND metric = 'ram'
)
, aggregated AS (
    SELECT
        hour_start,
        MIN(value) AS first_value  -- или MAX(value), если нужно
    FROM hourly
    GROUP BY hour_start
)
, increments AS (
    SELECT
        hour_start,
        first_value,
        LAG(first_value) OVER (ORDER BY hour_start) AS prev_hour_value
    FROM aggregated
)
SELECT
    hour_start,
    first_value - prev_hour_value AS increment
FROM increments
WHERE prev_hour_value IS NOT NULL
ORDER BY hour_start;
