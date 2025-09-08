-- Параметры: заменить :groups на '', 'host-2' или 'host-1','host-2'
WITH time_range AS (
    SELECT generate_series(
        '2025-01-01 10:00:00+03'::timestamptz,
        '2025-01-02 10:00:00+03'::timestamptz,
        '1 hour'
    ) AS hour_start
)
, groups AS (
    SELECT DISTINCT group_name FROM demo_schema.demo_metrics
    WHERE group_name IN ('host-1','host-2') -- заменить на нужные группы или оставить пустую строку ''
)
, metrics AS (
    SELECT DISTINCT metric FROM demo_schema.demo_metrics
)
, combinations AS (
    SELECT g.group_name, m.metric, t.hour_start
    FROM groups g CROSS JOIN metrics m CROSS JOIN time_range t
)
SELECT 
    c.group_name,
    c.metric,
    c.hour_start,
    SUM(dm.value) AS sum_value
FROM combinations c
LEFT JOIN demo_schema.demo_metrics dm
    ON dm.group_name = c.group_name
   AND dm.metric = c.metric
   AND dm.ts >= c.hour_start
   AND dm.ts < c.hour_start + INTERVAL '1 hour'
GROUP BY c.group_name, c.metric, c.hour_start
ORDER BY c.group_name, c.metric, c.hour_start;