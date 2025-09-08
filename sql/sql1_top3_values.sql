-- ./sql/sql1_top3_values.sql

WITH filtered AS (
    SELECT *
    FROM demo_schema.demo_metrics
    WHERE ts >= '2025-01-01 10:00:00+03' 
      AND ts < '2025-01-01 11:00:00+03'
)
, ranked AS (
    SELECT 
        group_name,
        metric,
        ts,
        value,
        ROW_NUMBER() OVER (PARTITION BY group_name, metric ORDER BY value DESC) AS rn
    FROM filtered
)
SELECT group_name, metric, ts, value
FROM ranked
WHERE rn <= 3
ORDER BY group_name, metric, value DESC;
