import React, {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Badge,
  Button,
  Form,
  Spinner,
} from "react-bootstrap";
import Chart from "react-apexcharts";
import { useNavigate } from "react-router-dom";


function asArray(value) {
  return Array.isArray(value) ? value : [];
}


function formatNumber(value) {
  const numeric = Number(value);

  return Number.isFinite(numeric)
    ? numeric.toLocaleString()
    : "0";
}


function formatCurrency(
  value,
  {
    unavailable = "—",
    maximumFractionDigits = 6,
  } = {},
) {
  if (
    value === null
    || value === undefined
    || value === ""
  ) {
    return unavailable;
  }

  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return unavailable;
  }

  return numeric.toLocaleString(
    "en-US",
    {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits,
    },
  );
}


function formatDuration(value) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return "—";
  }

  if (numeric < 1000) {
    return `${Math.round(numeric)} ms`;
  }

  if (numeric < 60000) {
    return `${(numeric / 1000).toFixed(1)} s`;
  }

  const minutes = Math.floor(
    numeric / 60000,
  );

  const seconds = (
    (numeric % 60000)
    / 1000
  );

  return `${minutes}m ${seconds.toFixed(1)}s`;
}


function formatOffset(value) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return "—";
  }

  if (numeric < 1000) {
    return `+${Math.round(numeric)} ms`;
  }

  return `+${(numeric / 1000).toFixed(1)} s`;
}


function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString();
}


function formatCompactDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString(
    undefined,
    {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  );
}


function percent(
  numerator,
  denominator,
) {
  const top = Number(numerator);
  const bottom = Number(denominator);

  if (
    !Number.isFinite(top)
    || !Number.isFinite(bottom)
    || bottom <= 0
  ) {
    return null;
  }

  return (
    (top / bottom)
    * 100
  );
}


function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function truncated(value, length = 32) {
  const text = String(value || "");

  if (text.length <= length) {
    return text;
  }

  return `${text.slice(0, length - 1)}…`;
}


function themeTokens() {
  const fallback = {
    mode: "light",
    bg: "#f6f7f9",
    surface: "#ffffff",
    surface2: "#f9fafb",
    text: "#0f172a",
    muted: "#64748b",
    border: "rgba(15, 23, 42, 0.12)",
    borderStrong: "rgba(15, 23, 42, 0.22)",
    primary: "#2563eb",
    accent: "#0f766e",
    success: "#198754",
    warning: "#ffc107",
    danger: "#dc3545",
  };

  fallback.series = [
    fallback.primary,
    fallback.accent,
    fallback.success,
    fallback.warning,
    fallback.danger,
  ];

  if (
    typeof window === "undefined"
    || typeof document === "undefined"
  ) {
    return fallback;
  }

  const style = window.getComputedStyle(
    document.documentElement,
  );

  const read = (
    property,
    fallbackValue,
  ) => (
    style
      .getPropertyValue(property)
      .trim()
    || fallbackValue
  );

  const colorScheme = String(
    style.colorScheme
    || style.getPropertyValue(
      "color-scheme",
    )
    || "",
  ).toLowerCase();

  const mode = colorScheme.includes("light")
    ? "light"
    : "dark";

  const result = {
    mode,
    bg: read(
      "--theme-bg",
      fallback.bg,
    ),
    surface: read(
      "--theme-surface",
      fallback.surface,
    ),
    surface2: read(
      "--theme-surface-2",
      fallback.surface2,
    ),
    text: read(
      "--theme-text",
      fallback.text,
    ),
    muted: read(
      "--theme-text-muted",
      fallback.muted,
    ),
    border: read(
      "--theme-border",
      fallback.border,
    ),
    borderStrong: read(
      "--theme-border-strong",
      fallback.borderStrong,
    ),
    primary: read(
      "--theme-primary",
      fallback.primary,
    ),
    accent: read(
      "--theme-accent",
      fallback.accent,
    ),
    success: read(
      "--theme-success",
      read(
        "--bs-success",
        fallback.success,
      ),
    ),
    warning: read(
      "--theme-warning",
      read(
        "--bs-warning",
        fallback.warning,
      ),
    ),
    danger: read(
      "--theme-danger",
      read(
        "--bs-danger",
        fallback.danger,
      ),
    ),
  };

  result.series = [
    result.primary,
    result.accent,
    result.success,
    result.warning,
    result.danger,
  ];

  return result;
}

function coverageState(
  cost,
) {
  const executions = Number(
    cost?.executionCount || 0,
  );

  const unknown = Number(
    cost?.costUnknownExecutionCount || 0,
  );

  if (executions === 0) {
    return "unavailable";
  }

  if (unknown > 0) {
    return "partial";
  }

  return "complete";
}


function coverageTone(state) {
  if (state === "complete") {
    return "success";
  }

  if (state === "partial") {
    return "warning";
  }

  return "secondary";
}


function CoverageBadge({
  cost,
  t,
}) {
  const state = (
    cost?.telemetryState
    || coverageState(cost)
  );

  return (
    <Badge bg={coverageTone(state)}>
      {t(
        `adminAI.costs.coverageStates.${state}`,
      )}
    </Badge>
  );
}


function Metric({
  label,
  value,
  caption,
  tone = "",
}) {
  return (
    <div
      className={[
        "DfctAdminAI-metric",
        tone
          ? `is-${tone}`
          : "",
      ].join(" ")}
    >
      <span>{label}</span>
      <strong>{value}</strong>
      {caption ? (
        <small>{caption}</small>
      ) : null}
    </div>
  );
}


function knownCostValue(cost) {
  const known = Number(
    cost?.costKnownExecutionCount || 0,
  );

  const unknown = Number(
    cost?.costUnknownExecutionCount || 0,
  );

  if (
    known === 0
    && unknown > 0
  ) {
    return null;
  }

  if (
    known === 0
    && Number(cost?.executionCount || 0) === 0
  ) {
    return null;
  }

  return cost?.resolvedCostUsdKnown;
}


function providerNamesFromCost(data) {
  const names = new Set(
    Object.keys(
      data?.byProvider || {},
    ),
  );

  for (
    const row
    of asArray(data?.history)
  ) {
    for (
      const provider
      of Object.keys(
        row?.byProvider || {},
      )
    ) {
      names.add(provider);
    }
  }

  return Array.from(names).sort();
}


function CostsChart({
  data,
  t,
}) {
  const theme = themeTokens();

  const history = asArray(
    data?.history,
  );

  const providers = useMemo(
    () => providerNamesFromCost(data),
    [data],
  );

  const categories = history.map(
    (row) => row.date,
  );

  const knownSeries = providers.map(
    (provider) => ({
      name: provider,
      type: "column",
      data: history.map(
        (row) => Number(
          row?.byProvider?.[provider]
          || 0,
        ),
      ),
    }),
  );

  const unknownSeries = {
    name: t(
      "adminAI.costs.chart.unknownExecutions",
    ),
    type: "line",
    data: history.map(
      (row) => Number(
        row?.costUnknownExecutionCount
        || 0,
      ),
    ),
  };

  const providerCount = knownSeries.length;

  const options = {
    chart: {
      type: "line",
      stacked: true,
      background: "transparent",
      toolbar: {
        show: false,
      },
      animations: {
        enabled: true,
        speed: 280,
      },
      fontFamily: "inherit",
      foreColor: theme.muted,
    },
    theme: {
      mode: theme.mode,
    },
    colors: [
      ...providers.map(
        (_, index) => (
          theme.series[
            index % theme.series.length
          ]
        ),
      ),
      theme.danger,
    ],
    stroke: {
      width: [
        ...providers.map(() => 0),
        2,
      ],
      curve: "smooth",
    },
    dataLabels: {
      enabled: false,
    },
    grid: {
      borderColor: theme.border,
      strokeDashArray: 3,
    },
    legend: {
      position: "top",
      horizontalAlign: "left",
      fontSize: "12px",
      labels: {
        colors: theme.text,
      },
    },
    plotOptions: {
      bar: {
        columnWidth: "68%",
        borderRadius: 3,
      },
    },
    xaxis: {
      categories,
      labels: {
        rotate: -35,
        formatter: (value) => {
          const date = new Date(
            `${value}T00:00:00`,
          );

          if (
            Number.isNaN(
              date.getTime(),
            )
          ) {
            return value;
          }

          return date.toLocaleDateString(
            undefined,
            {
              month: "short",
              day: "numeric",
            },
          );
        },
      },
    },
    yaxis: [
      {
        seriesName: providers,
        min: 0,
        title: {
          text: t(
            "adminAI.costs.chart.knownCostAxis",
          ),
        },
        labels: {
          formatter: (value) => (
            `$${Number(value).toFixed(2)}`
          ),
        },
      },
      {
        seriesName: unknownSeries.name,
        opposite: true,
        min: 0,
        forceNiceScale: true,
        title: {
          text: t(
            "adminAI.costs.chart.unknownAxis",
          ),
        },
        labels: {
          formatter: (value) => (
            `${Math.round(Number(value))}`
          ),
        },
      },
    ],
    tooltip: {
      theme: theme.mode,
      background: theme.surface,
      shared: true,
      intersect: false,
      y: {
        formatter: (
          value,
          context,
        ) => {
          if (
            context.seriesIndex
            >= providerCount
          ) {
            return formatNumber(value);
          }

          return formatCurrency(
            value,
            {
              maximumFractionDigits: 8,
            },
          );
        },
      },
    },
    noData: {
      text: t(
        "adminAI.costs.empty",
      ),
    },
  };

  return (
    <Chart
      type="line"
      height={330}
      options={options}
      series={[
        ...knownSeries,
        unknownSeries,
      ]}
    />
  );
}


function ProviderCostTable({
  providers,
  t,
}) {
  const rows = Object.entries(
    providers || {},
  );

  if (!rows.length) {
    return (
      <div className="DfctAdminAI-empty">
        {t("adminAI.costs.empty")}
      </div>
    );
  }

  return (
    <div className="DfctAdmin-tableWrap">
      <table className="DfctAdmin-table DfctAdminAI-costTable">
        <thead>
          <tr>
            <th>
              {t(
                "adminAI.costs.columns.provider",
              )}
            </th>
            <th>
              {t(
                "adminAI.costs.columns.executions",
              )}
            </th>
            <th>
              {t(
                "adminAI.costs.columns.known",
              )}
            </th>
            <th>
              {t(
                "adminAI.costs.columns.unknown",
              )}
            </th>
            <th>
              {t(
                "adminAI.costs.columns.coverage",
              )}
            </th>
            <th>
              {t(
                "adminAI.costs.columns.knownCost",
              )}
            </th>
          </tr>
        </thead>

        <tbody>
          {rows.map(
            ([provider, metrics]) => (
              <tr key={provider}>
                <td>
                  <strong>
                    {provider}
                  </strong>
                </td>

                <td>
                  {formatNumber(
                    metrics.executionCount,
                  )}
                </td>

                <td>
                  {formatNumber(
                    metrics
                      .costKnownExecutionCount,
                  )}
                </td>

                <td>
                  {formatNumber(
                    metrics
                      .costUnknownExecutionCount,
                  )}
                </td>

                <td>
                  <CoverageBadge
                    cost={metrics}
                    t={t}
                  />
                </td>

                <td>
                  {formatCurrency(
                    knownCostValue(metrics),
                    {
                      maximumFractionDigits: 8,
                    },
                  )}
                </td>
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}


export function CostsView({
  adminAi,
  t,
}) {
  const data = adminAi.costData || {};
  const [windowDays, setWindowDays] = useState(
    Number(data.windowDays || 30),
  );

  useEffect(() => {
    if (
      Number(data.windowDays || 0)
      === Number(windowDays)
    ) {
      return;
    }

    adminAi.loadCosts(windowDays);
  }, [
    adminAi,
    data.windowDays,
    windowDays,
  ]);

  const summary = (
    data.summary || {}
  );

  const executions = Number(
    summary.executionCount || 0,
  );

  const known = Number(
    summary.costKnownExecutionCount || 0,
  );

  const unknown = Number(
    summary.costUnknownExecutionCount || 0,
  );

  const coverage = percent(
    known,
    executions,
  );

  return (
    <>
      <section className="DfctAdmin-section">
        <div className="DfctAdminAI-observabilityHeader">
          <div className="DfctAdmin-sectionHeader">
            <span className="DfctAdmin-eyebrow">
              {t(
                "adminAI.costs.eyebrow",
              )}
            </span>

            <h2>
              {t(
                "adminAI.costs.title",
              )}
            </h2>

            <p>
              {t(
                "adminAI.costs.subtitle",
              )}
            </p>
          </div>

          <div className="DfctAdminAI-rangeSelector">
            {[7, 30, 90, 365].map(
              (days) => (
                <button
                  key={days}
                  type="button"
                  className={
                    Number(windowDays) === days
                      ? "is-active"
                      : ""
                  }
                  onClick={() => {
                    setWindowDays(days);
                  }}
                >
                  {t(
                    "adminAI.costs.days",
                    { days },
                  )}
                </button>
              ),
            )}
          </div>
        </div>

        <div className="DfctAdminAI-metricGrid">
          <Metric
            label={t(
              "adminAI.costs.stats.knownSpend",
            )}
            value={formatCurrency(
              knownCostValue(summary),
              {
                maximumFractionDigits: 8,
              },
            )}
            caption={t(
              "adminAI.costs.stats.knownSpendHelp",
            )}
          />

          <Metric
            label={t(
              "adminAI.costs.stats.coverage",
            )}
            value={
              coverage === null
                ? "—"
                : `${coverage.toFixed(1)}%`
            }
            caption={t(
              "adminAI.costs.stats.coverageHelp",
            )}
            tone={
              unknown > 0
                ? "warning"
                : "success"
            }
          />

          <Metric
            label={t(
              "adminAI.costs.stats.executions",
            )}
            value={formatNumber(executions)}
          />

          <Metric
            label={t(
              "adminAI.costs.stats.unknown",
            )}
            value={formatNumber(unknown)}
            tone={
              unknown > 0
                ? "warning"
                : ""
            }
          />
        </div>

        <div className="DfctAdminAI-chartCard">
          <div className="DfctAdminAI-chartHeader">
            <div>
              <strong>
                {t(
                  "adminAI.costs.chart.title",
                )}
              </strong>

              <span>
                {t(
                  "adminAI.costs.chart.subtitle",
                )}
              </span>
            </div>

            <CoverageBadge
              cost={{
                ...summary,
                telemetryState:
                  data.telemetryState,
              }}
              t={t}
            />
          </div>

          <CostsChart
            data={data}
            t={t}
          />
        </div>
      </section>

      <section className="DfctAdmin-section">
        <div className="DfctAdmin-sectionHeader">
          <span className="DfctAdmin-eyebrow">
            {t(
              "adminAI.costs.providersEyebrow",
            )}
          </span>

          <h2>
            {t(
              "adminAI.costs.providersTitle",
            )}
          </h2>

          <p>
            {t(
              "adminAI.costs.providersSubtitle",
            )}
          </p>
        </div>

        <ProviderCostTable
          providers={data.byProvider}
          t={t}
        />
      </section>
    </>
  );
}


function benchmarkScoreLabel(run) {
  const score = run?.score || {};

  if (!score.total) {
    return "—";
  }

  return (
    `${score.passed}/${score.total}`
  );
}


function benchmarkTone(run) {
  if (
    run?.status === "running"
    || run?.status === "queued"
  ) {
    return "info";
  }

  if (
    run?.score?.gatePassed
    && run?.outcome === "passed"
  ) {
    return "success";
  }

  if (
    run?.outcome === "failed"
    || run?.outcome === "incomplete"
    || run?.status === "failed"
  ) {
    return "danger";
  }

  return "secondary";
}


function BenchmarkHistoryChart({
  runs,
  onSelect,
  t,
}) {
  const theme = themeTokens();

  const ordered = [...runs].sort(
    (left, right) => (
      new Date(left.createdAt).getTime()
      - new Date(right.createdAt).getTime()
    ),
  );

  const categories = ordered.map(
    (run) => (
      formatCompactDate(
        run.createdAt,
      )
    ),
  );

  const costs = ordered.map(
    (run) => {
      const cost = run.cost || {};
      const known = Number(
        cost.costKnownExecutionCount || 0,
      );

      const unknown = Number(
        cost.costUnknownExecutionCount || 0,
      );

      if (
        known === 0
        && unknown > 0
      ) {
        return null;
      }

      if (
        Number(cost.executionCount || 0)
        === 0
      ) {
        return null;
      }

      return Number(
        cost.resolvedCostUsdKnown || 0,
      );
    },
  );

  const quality = ordered.map(
    (run) => {
      const score = run.score || {};

      if (!score.total) {
        return null;
      }

      return (
        Number(score.passed || 0)
        / Number(score.total)
        * 100
      );
    },
  );

  const options = {
    chart: {
      type: "line",
      background: "transparent",
      toolbar: {
        show: false,
      },
      fontFamily: "inherit",
      foreColor: theme.muted,
      events: {
        dataPointSelection: (
          _event,
          _context,
          config,
        ) => {
          const run = ordered[
            config.dataPointIndex
          ];

          if (run) {
            onSelect(run);
          }
        },
      },
    },
    theme: {
      mode: theme.mode,
    },
    colors: [
      theme.primary,
      theme.success,
    ],
    dataLabels: {
      enabled: false,
    },
    stroke: {
      width: [0, 3],
      curve: "straight",
    },
    plotOptions: {
      bar: {
        columnWidth: "58%",
        borderRadius: 4,
      },
    },
    grid: {
      borderColor: theme.border,
      strokeDashArray: 3,
    },
    legend: {
      position: "top",
      horizontalAlign: "left",
      labels: {
        colors: theme.text,
      },
    },
    xaxis: {
      categories,
      labels: {
        rotate: -35,
      },
    },
    yaxis: [
      {
        min: 0,
        title: {
          text: t(
            "adminAI.benchmarks.chart.costAxis",
          ),
        },
        labels: {
          formatter: (value) => (
            `$${Number(value).toFixed(2)}`
          ),
        },
      },
      {
        opposite: true,
        min: 0,
        max: 100,
        tickAmount: 4,
        title: {
          text: t(
            "adminAI.benchmarks.chart.qualityAxis",
          ),
        },
        labels: {
          formatter: (value) => (
            `${Math.round(Number(value))}%`
          ),
        },
      },
    ],
    annotations: {
      yaxis: [
        {
          y: 100,
          yAxisIndex: 1,
          borderColor: theme.primary,
          strokeDashArray: 4,
          label: {
            text: t(
              "adminAI.benchmarks.chart.hardGate",
            ),
          },
        },
      ],
    },
    tooltip: {
      theme: theme.mode,
      background: theme.surface,
      shared: true,
      intersect: false,
      custom: ({
        dataPointIndex,
      }) => {
        const run = (
          ordered[dataPointIndex]
          || {}
        );

        const score = run.score || {};

        const scoreText = (
          score.total
            ? (
                `${score.passed || 0}`
                + `/${score.total}`
              )
            : "—"
        );

        const knownCost = (
          costs[dataPointIndex]
        );

        return `
          <div class="DfctAdminAI-chartTooltip DfctAdminAI-chartTooltip--benchmark">
            <strong>${escapeHtml(
              formatCompactDate(
                run.createdAt,
              ),
            )}</strong>

            <span>${escapeHtml(
              [
                run.benchmarkKey,
                run.benchmarkVersion
                  ? `v${run.benchmarkVersion}`
                  : "",
              ]
                .filter(Boolean)
                .join(" · "),
            )}</span>

            <div class="DfctAdminAI-chartTooltipGrid">
              <span>
                ${escapeHtml(
                  t(
                    "adminAI.benchmarks.columns.score",
                  ),
                )}
                <b>${escapeHtml(
                  scoreText,
                )}</b>
              </span>

              <span>
                ${escapeHtml(
                  t(
                    "adminAI.benchmarks.columns.outcome",
                  ),
                )}
                <b>${escapeHtml(
                  run.outcome || "—",
                )}</b>
              </span>

              <span>
                ${escapeHtml(
                  t(
                    "adminAI.benchmarks.columns.cost",
                  ),
                )}
                <b>${escapeHtml(
                  knownCost === null
                  || knownCost === undefined
                    ? "—"
                    : formatCurrency(
                        knownCost,
                        {
                          maximumFractionDigits: 8,
                        },
                      ),
                )}</b>
              </span>

              <span>
                ${escapeHtml(
                  t(
                    "adminAI.benchmarks.columns.duration",
                  ),
                )}
                <b>${escapeHtml(
                  formatDuration(
                    run.durationMs,
                  ),
                )}</b>
              </span>
            </div>
          </div>
        `;
      },
    },
  };

  return (
    <Chart
      type="line"
      height={320}
      options={options}
      series={[
        {
          name: t(
            "adminAI.benchmarks.chart.knownCost",
          ),
          type: "column",
          data: costs,
        },
        {
          name: t(
            "adminAI.benchmarks.chart.score",
          ),
          type: "line",
          data: quality,
        },
      ]}
    />
  );
}


function NodeBadge({
  value,
  fallback = "—",
}) {
  return (
    <span className="DfctAdminAI-nodeBadge">
      {value || fallback}
    </span>
  );
}


function ExecutionDag({
  visual,
  selectedNodeId,
  onSelect,
  t,
}) {
  const dag = visual?.dag || {};
  const nodes = asArray(dag.nodes);
  const edges = asArray(dag.edges);
  const columns = asArray(
    dag.columns,
  );

  if (!nodes.length) {
    return (
      <div className="DfctAdminAI-empty">
        {t(
          "adminAI.execution.empty",
        )}
      </div>
    );
  }

  const nodeById = new Map(
    nodes.map(
      (node) => [
        node.nodeId,
        node,
      ],
    ),
  );

  const columnWidth = 246;
  const nodeWidth = 204;
  const nodeHeight = 64;
  const paddingX = 28;
  const paddingY = 28;

  const maxRows = Math.max(
    1,
    ...columns.map(
      (column) => (
        asArray(
          column.nodeIds,
        ).length
      ),
    ),
  );

  const rowPitch = 88;

  const height = Math.max(
    260,
    (
      maxRows
      * rowPitch
    ) + (paddingY * 2),
  );

  const width = Math.max(
    520,
    (
      columns.length
      * columnWidth
    ) + (paddingX * 2),
  );

  const positions = new Map();

  for (const column of columns) {
    const ids = asArray(
      column.nodeIds,
    );

    const x = (
      paddingX
      + (
        Number(column.depth)
        * columnWidth
      )
    );

    ids.forEach(
      (nodeId, index) => {
        const center = (
          (
            index + 1
          )
          * height
          / (
            ids.length + 1
          )
        );

        positions.set(
          nodeId,
          {
            x,
            y: (
              center
              - nodeHeight / 2
            ),
          },
        );
      },
    );
  }

  return (
    <div className="DfctAdminAI-dagScroll">
      <svg
        className="DfctAdminAI-dag"
        viewBox={`0 0 ${width} ${height}`}
        style={{
          width: `${width}px`,
          height: `${height}px`,
        }}
        role="img"
        aria-label={t(
          "adminAI.execution.dagAria",
        )}
      >
        <g className="DfctAdminAI-dagEdges">
          {edges.map(
            (edge, index) => {
              const source = positions.get(
                edge.sourceNodeId,
              );

              const target = positions.get(
                edge.targetNodeId,
              );

              if (
                !source
                || !target
              ) {
                return null;
              }

              const x1 = (
                source.x
                + nodeWidth
              );

              const y1 = (
                source.y
                + nodeHeight / 2
              );

              const x2 = target.x;

              const y2 = (
                target.y
                + nodeHeight / 2
              );

              const middle = (
                x1
                + (x2 - x1) / 2
              );

              return (
                <path
                  key={`${edge.sourceNodeId}-${edge.targetNodeId}-${index}`}
                  d={[
                    `M ${x1} ${y1}`,
                    `C ${middle} ${y1}`,
                    `${middle} ${y2}`,
                    `${x2} ${y2}`,
                  ].join(" ")}
                />
              );
            },
          )}
        </g>

        <g className="DfctAdminAI-dagNodes">
          {nodes.map(
            (node) => {
              const position = positions.get(
                node.nodeId,
              );

              if (!position) {
                return null;
              }

              const selected = (
                selectedNodeId
                === node.nodeId
              );

              const subtitle = (
                node.model
                || node.provider
                || node.operation
                || node.kind
              );

              return (
                <g
                  key={node.nodeId}
                  className={[
                    "DfctAdminAI-dagNode",
                    `is-${node.kind}`,
                    node.isContainer
                      ? "is-container"
                      : "is-work",
                    selected
                      ? "is-selected"
                      : "",
                  ].join(" ")}
                  transform={
                    `translate(${position.x} ${position.y})`
                  }
                  tabIndex="0"
                  role="button"
                  onClick={() => {
                    onSelect(
                      node.nodeId,
                    );
                  }}
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter"
                      || event.key === " "
                    ) {
                      event.preventDefault();

                      onSelect(
                        node.nodeId,
                      );
                    }
                  }}
                >
                  <rect
                    width={nodeWidth}
                    height={nodeHeight}
                    rx="9"
                  />

                  <circle
                    cx="15"
                    cy="17"
                    r="4"
                  />

                  <text
                    className="DfctAdminAI-dagNodeTitle"
                    x="26"
                    y="21"
                  >
                    {truncated(
                      node.label
                      || node.operation
                      || node.kind,
                      24,
                    )}
                  </text>

                  <text
                    className="DfctAdminAI-dagNodeMeta"
                    x="14"
                    y="42"
                  >
                    {truncated(
                      subtitle,
                      27,
                    )}
                  </text>

                  {node.resolvedCostUsd
                    !== null
                    && node.resolvedCostUsd
                    !== undefined ? (
                    <text
                      className="DfctAdminAI-dagNodeCost"
                      x={nodeWidth - 10}
                      y="42"
                      textAnchor="end"
                    >
                      {formatCurrency(
                        node.resolvedCostUsd,
                        {
                          maximumFractionDigits: 5,
                        },
                      )}
                    </text>
                  ) : null}
                </g>
              );
            },
          )}
        </g>
      </svg>
    </div>
  );
}


function ExecutionTimeline({
  visual,
  selectedNodeId,
  onSelect,
  t,
}) {
  const theme = themeTokens();

  const timeline = (
    visual?.timeline || {}
  );

  const rows = asArray(
    timeline.rows,
  ).filter(
    (row) => (
      row.startOffsetMs
      !== null
      && row.startOffsetMs
      !== undefined
      && row.endOffsetMs
      !== null
      && row.endOffsetMs
      !== undefined
    ),
  );

  if (!rows.length) {
    return (
      <div className="DfctAdminAI-empty">
        {t(
          "adminAI.execution.noTimeline",
        )}
      </div>
    );
  }

  const seriesData = rows.map(
    (row) => ({
      x: (
        `${"· ".repeat(
          Math.max(
            0,
            Number(row.depth || 0),
          ),
        )}${row.label || row.operation || row.kind}`
      ),
      y: [
        Number(row.startOffsetMs),
        Number(row.endOffsetMs),
      ],
      nodeId: row.nodeId,
      raw: row,
    }),
  );

  const windows = asArray(
    visual.parallelWindows,
  );

  const options = {
    chart: {
      type: "rangeBar",
      background: "transparent",
      toolbar: {
        show: false,
      },
      fontFamily: "inherit",
      foreColor: theme.muted,
      events: {
        dataPointSelection: (
          _event,
          _chart,
          config,
        ) => {
          const row = seriesData[
            config.dataPointIndex
          ];

          if (row?.nodeId) {
            onSelect(
              row.nodeId,
            );
          }
        },
      },
    },
    theme: {
      mode: theme.mode,
    },
    colors: [
      theme.primary,
    ],
    plotOptions: {
      bar: {
        horizontal: true,
        barHeight: "58%",
        rangeBarGroupRows: true,
        borderRadius: 4,
      },
    },
    dataLabels: {
      enabled: false,
    },
    grid: {
      borderColor: theme.border,
      strokeDashArray: 3,
    },
    xaxis: {
      type: "numeric",
      min: 0,
      max: Math.max(
        1,
        Number(
          timeline.durationMs || 1,
        ),
      ),
      labels: {
        formatter: (value) => (
          formatOffset(value)
        ),
      },
      title: {
        text: t(
          "adminAI.execution.timelineAxis",
        ),
      },
    },
    yaxis: {
      labels: {
        maxWidth: 245,
        style: {
          fontSize: "11px",
        },
      },
    },
    annotations: {
      xaxis: windows.map(
        (window, index) => ({
          x: Number(
            window.startOffsetMs,
          ),
          x2: Number(
            window.endOffsetMs,
          ),
          fillColor: theme.primary,
          opacity: 0.08,
          label: index === 0
            ? {
                text: t(
                  "adminAI.execution.parallel",
                ),
              }
            : undefined,
        }),
      ),
    },
    states: {
      active: {
        filter: {
          type: "none",
        },
      },
    },
    tooltip: {
      theme: theme.mode,
      background: theme.surface,
      custom: ({
        dataPointIndex,
      }) => {
        const row = rows[
          dataPointIndex
        ] || {};

        const selected = (
          row.nodeId
          === selectedNodeId
        );

        return `
          <div class="DfctAdminAI-chartTooltip ${
            selected
              ? "is-selected"
              : ""
          }">
            <strong>${escapeHtml(
              row.label
              || row.operation
              || row.kind,
            )}</strong>
            <span>${escapeHtml(
              [
                row.provider,
                row.model,
              ].filter(Boolean).join(" · "),
            )}</span>
            <span>${escapeHtml(
              row.operation || "",
            )}</span>
            <div>
              ${escapeHtml(
                formatDuration(
                  row.durationMs,
                ),
              )}
              ·
              ${escapeHtml(
                formatCurrency(
                  row.resolvedCostUsd,
                  {
                    maximumFractionDigits: 8,
                  },
                ),
              )}
            </div>
          </div>
        `;
      },
    },
  };

  const height = Math.min(
    920,
    Math.max(
      360,
      (
        rows.length
        * 31
      ) + 90,
    ),
  );

  return (
    <Chart
      type="rangeBar"
      height={height}
      options={options}
      series={[
        {
          name: t(
            "adminAI.execution.timeline",
          ),
          data: seriesData,
        },
      ]}
    />
  );
}


function ExecutionServices({
  visual,
  t,
}) {
  const services = asArray(
    visual?.services,
  );

  if (!services.length) {
    return null;
  }

  return (
    <div className="DfctAdminAI-serviceStrip">
      {services.map(
        (service) => (
          <div
            key={service.serviceKey}
            className="DfctAdminAI-serviceCard"
          >
            <div>
              <strong>
                {service.serviceKey}
              </strong>

              <span>
                {t(
                  "adminAI.execution.serviceExecutions",
                  {
                    count:
                      service.executionCount,
                  },
                )}
              </span>
            </div>

            <div className="DfctAdminAI-serviceMetrics">
              <span>
                {formatDuration(
                  service.durationMs,
                )}
              </span>

              <span>
                {formatCurrency(
                  service
                    .resolvedCostUsdKnown,
                  {
                    maximumFractionDigits: 8,
                  },
                )}
              </span>
            </div>
          </div>
        ),
      )}
    </div>
  );
}


function NodeInspector({
  node,
  t,
}) {
  if (!node) {
    return (
      <div className="DfctAdminAI-nodeInspector is-empty">
        {t(
          "adminAI.execution.selectNode",
        )}
      </div>
    );
  }

  const refs = Object.entries(
    node.refs || {},
  ).filter(
    ([, value]) => (
      value !== null
      && value !== undefined
      && value !== ""
    ),
  );

  return (
    <aside className="DfctAdminAI-nodeInspector">
      <div className="DfctAdminAI-nodeInspectorHeader">
        <div>
          <span className="DfctAdmin-eyebrow">
            {node.kind}
          </span>

          <h4>
            {node.label
              || node.operation
              || node.kind}
          </h4>

          <p>
            {node.nodeId}
          </p>
        </div>

        <Badge
          bg={
            node.status === "succeeded"
              ? "success"
              : node.status === "failed"
                ? "danger"
                : node.status === "partial"
                  ? "warning"
                  : "secondary"
          }
        >
          {node.status || "—"}
        </Badge>
      </div>

      <div className="DfctAdminAI-inspectorGrid">
        <div>
          <span>
            {t(
              "adminAI.execution.fields.provider",
            )}
          </span>
          <strong>
            {node.provider || "—"}
          </strong>
        </div>

        <div>
          <span>
            {t(
              "adminAI.execution.fields.model",
            )}
          </span>
          <strong>
            {node.model || "—"}
          </strong>
        </div>

        <div>
          <span>
            {t(
              "adminAI.execution.fields.role",
            )}
          </span>
          <strong>
            {node.roleKey || "—"}
          </strong>
        </div>

        <div>
          <span>
            {t(
              "adminAI.execution.fields.operation",
            )}
          </span>
          <strong>
            {node.operation || "—"}
          </strong>
        </div>

        <div>
          <span>
            {t(
              "adminAI.execution.fields.duration",
            )}
          </span>
          <strong>
            {formatDuration(
              node.durationMs,
            )}
          </strong>
        </div>

        <div>
          <span>
            {t(
              "adminAI.execution.fields.offset",
            )}
          </span>
          <strong>
            {formatOffset(
              node.startOffsetMs,
            )}
          </strong>
        </div>

        <div>
          <span>
            {t(
              "adminAI.execution.fields.cost",
            )}
          </span>
          <strong>
            {formatCurrency(
              node.resolvedCostUsd,
              {
                maximumFractionDigits: 8,
              },
            )}
          </strong>
        </div>

        <div>
          <span>
            {t(
              "adminAI.execution.fields.costProvenance",
            )}
          </span>
          <strong>
            {node.costProvenance || "—"}
          </strong>
        </div>
      </div>

      {refs.length ? (
        <div className="DfctAdminAI-nodeRefs">
          <strong>
            {t(
              "adminAI.execution.references",
            )}
          </strong>

          {refs.map(
            ([key, value]) => (
              <div key={key}>
                <span>{key}</span>
                <code>
                  {String(value)}
                </code>
              </div>
            ),
          )}
        </div>
      ) : null}
    </aside>
  );
}


export function ExecutionVisualization({
  visual,
  t,
}) {
  const nodes = asArray(
    visual?.dag?.nodes,
  );

  const initialNode = (
    nodes.find(
      (node) => node.isWorkNode,
    )
    || nodes[0]
  );

  const [selectedNodeId, setSelectedNodeId] = useState(
    initialNode?.nodeId || "",
  );

  useEffect(() => {
    if (!nodes.length) {
      setSelectedNodeId("");
      return;
    }

    if (
      nodes.some(
        (node) => (
          node.nodeId
          === selectedNodeId
        ),
      )
    ) {
      return;
    }

    const next = (
      nodes.find(
        (node) => node.isWorkNode,
      )
      || nodes[0]
    );

    setSelectedNodeId(
      next?.nodeId || "",
    );
  }, [
    nodes,
    selectedNodeId,
  ]);

  const selectedNode = nodes.find(
    (node) => (
      node.nodeId
      === selectedNodeId
    ),
  );

  const summary = (
    visual?.summary || {}
  );

  return (
    <div className="DfctAdminAI-execution">
      <div className="DfctAdminAI-executionSummary">
        <Metric
          label={t(
            "adminAI.execution.stats.duration",
          )}
          value={formatDuration(
            summary.durationMs,
          )}
        />

        <Metric
          label={t(
            "adminAI.execution.stats.nodes",
          )}
          value={formatNumber(
            summary.nodeCount,
          )}
        />

        <Metric
          label={t(
            "adminAI.execution.stats.work",
          )}
          value={formatNumber(
            summary.workNodeCount,
          )}
        />

        <Metric
          label={t(
            "adminAI.execution.stats.parallelism",
          )}
          value={
            `${formatNumber(
              summary.maxParallelism,
            )}×`
          }
          caption={
            summary.hasParallelism
              ? t(
                  "adminAI.execution.stats.parallelismDetected",
                  {
                    count:
                      summary.parallelWindowCount,
                  },
                )
              : t(
                  "adminAI.execution.stats.serial",
                )
          }
          tone={
            summary.hasParallelism
              ? "info"
              : ""
          }
        />

        <Metric
          label={t(
            "adminAI.execution.stats.knownCost",
          )}
          value={formatCurrency(
            summary
              .resolvedNodeCostUsdKnown,
            {
              maximumFractionDigits: 8,
            },
          )}
        />
      </div>

      <ExecutionServices
        visual={visual}
        t={t}
      />

      <div className="DfctAdminAI-executionSplit">
        <div className="DfctAdminAI-visualCard">
          <div className="DfctAdminAI-visualCardHeader">
            <div>
              <span className="DfctAdmin-eyebrow">
                {t(
                  "adminAI.execution.dagEyebrow",
                )}
              </span>

              <h3>
                {t(
                  "adminAI.execution.dagTitle",
                )}
              </h3>

              <p>
                {t(
                  "adminAI.execution.dagSubtitle",
                )}
              </p>
            </div>
          </div>

          <ExecutionDag
            visual={visual}
            selectedNodeId={
              selectedNodeId
            }
            onSelect={
              setSelectedNodeId
            }
            t={t}
          />
        </div>

        <NodeInspector
          node={selectedNode}
          t={t}
        />
      </div>

      <div className="DfctAdminAI-visualCard">
        <div className="DfctAdminAI-visualCardHeader">
          <div>
            <span className="DfctAdmin-eyebrow">
              {t(
                "adminAI.execution.timelineEyebrow",
              )}
            </span>

            <h3>
              {t(
                "adminAI.execution.timelineTitle",
              )}
            </h3>

            <p>
              {t(
                "adminAI.execution.timelineSubtitle",
              )}
            </p>
          </div>

          {summary.hasParallelism ? (
            <Badge bg="info">
              {t(
                "adminAI.execution.parallelBadge",
                {
                  count:
                    summary.maxParallelism,
                },
              )}
            </Badge>
          ) : null}
        </div>

        <ExecutionTimeline
          visual={visual}
          selectedNodeId={
            selectedNodeId
          }
          onSelect={
            setSelectedNodeId
          }
          t={t}
        />
      </div>
    </div>
  );
}


function BenchmarkSortHeader({
  field,
  label,
  sortKey,
  sortDirection,
  onSort,
  t,
}) {
  const active = sortKey === field;

  const ariaSort = active
    ? (
        sortDirection === "asc"
          ? "ascending"
          : "descending"
      )
    : "none";

  return (
    <th aria-sort={ariaSort}>
      <button
        type="button"
        className={[
          "DfctAdminAI-sortButton",
          active
            ? "is-active"
            : "",
        ].join(" ")}
        onClick={() => {
          onSort(field);
        }}
        title={t(
          "adminAI.benchmarks.sortBy",
          {
            column: label,
          },
        )}
      >
        <span>{label}</span>

        <span
          className="DfctAdminAI-sortIndicator"
          aria-hidden="true"
        >
          {active
            ? (
                sortDirection === "asc"
                  ? "↑"
                  : "↓"
              )
            : "↕"}
        </span>
      </button>
    </th>
  );
}


function BenchmarkRunsTable({
  runs,
  selectedRunId,
  onSelect,
  sortKey,
  sortDirection,
  onSort,
  t,
}) {
  if (!runs.length) {
    return (
      <div className="DfctAdminAI-empty">
        {t(
          "adminAI.benchmarks.empty",
        )}
      </div>
    );
  }

  return (
    <div className="DfctAdmin-tableWrap">
      <table className="DfctAdmin-table DfctAdminAI-benchmarkTable">
        <thead>
          <tr>
            <BenchmarkSortHeader
              field="date"
              label={t(
                "adminAI.benchmarks.columns.date",
              )}
              sortKey={sortKey}
              sortDirection={sortDirection}
              onSort={onSort}
              t={t}
            />

            <BenchmarkSortHeader
              field="benchmark"
              label={t(
                "adminAI.benchmarks.columns.benchmark",
              )}
              sortKey={sortKey}
              sortDirection={sortDirection}
              onSort={onSort}
              t={t}
            />

            <BenchmarkSortHeader
              field="score"
              label={t(
                "adminAI.benchmarks.columns.score",
              )}
              sortKey={sortKey}
              sortDirection={sortDirection}
              onSort={onSort}
              t={t}
            />

            <BenchmarkSortHeader
              field="outcome"
              label={t(
                "adminAI.benchmarks.columns.outcome",
              )}
              sortKey={sortKey}
              sortDirection={sortDirection}
              onSort={onSort}
              t={t}
            />

            <BenchmarkSortHeader
              field="knownCost"
              label={t(
                "adminAI.benchmarks.columns.cost",
              )}
              sortKey={sortKey}
              sortDirection={sortDirection}
              onSort={onSort}
              t={t}
            />

            <BenchmarkSortHeader
              field="coverage"
              label={t(
                "adminAI.benchmarks.columns.coverage",
              )}
              sortKey={sortKey}
              sortDirection={sortDirection}
              onSort={onSort}
              t={t}
            />

            <BenchmarkSortHeader
              field="duration"
              label={t(
                "adminAI.benchmarks.columns.duration",
              )}
              sortKey={sortKey}
              sortDirection={sortDirection}
              onSort={onSort}
              t={t}
            />
          </tr>
        </thead>

        <tbody>
          {runs.map(
            (run) => (
              <tr
                key={run.benchmarkRunId}
                className={
                  run.benchmarkRunId
                  === selectedRunId
                    ? "is-selected"
                    : ""
                }
                onClick={() => {
                  onSelect(run);
                }}
              >
                <td>
                  {formatCompactDate(
                    run.createdAt,
                  )}
                </td>

                <td>
                  <strong>
                    {run.benchmarkKey}
                  </strong>
                  <small>
                    v{run.benchmarkVersion}
                  </small>
                </td>

                <td>
                  <strong>
                    {benchmarkScoreLabel(
                      run,
                    )}
                  </strong>
                </td>

                <td>
                  <Badge
                    bg={benchmarkTone(run)}
                  >
                    {run.outcome
                      || run.status
                      || "—"}
                  </Badge>
                </td>

                <td>
                  {formatCurrency(
                    knownCostValue(
                      run.cost,
                    ),
                    {
                      maximumFractionDigits: 8,
                    },
                  )}
                </td>

                <td>
                  <CoverageBadge
                    cost={run.cost}
                    t={t}
                  />
                </td>

                <td>
                  {formatDuration(
                    run.durationMs,
                  )}
                </td>
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}


export function BenchmarkDetail({
  detail,
  loading,
  t,
}) {
  if (loading) {
    return (
      <div className="DfctAdminAI-loading">
        <Spinner
          animation="border"
          size="sm"
        />
        <span>
          {t(
            "adminAI.benchmarks.loadingDetail",
          )}
        </span>
      </div>
    );
  }

  if (!detail) {
    return null;
  }

  const summary = (
    detail.summary || {}
  );

  const benchmark = (
    detail.benchmark || {}
  );

  const assertions = asArray(
    benchmark.assertions,
  );

  return (
    <section className="DfctAdmin-section DfctAdminAI-benchmarkDetail">
      <div className="DfctAdminAI-benchmarkHero">
        <div>
          <span className="DfctAdmin-eyebrow">
            {summary.benchmarkKey}
            {" · "}
            v{summary.benchmarkVersion}
          </span>

          <h2>
            {summary.score?.gatePassed
              ? t(
                  "adminAI.benchmarks.detail.pass",
                )
              : t(
                  "adminAI.benchmarks.detail.fail",
                )}
          </h2>

          <p>
            {t(
              "adminAI.benchmarks.detail.runMeta",
              {
                topic:
                  summary.topicId || "—",
                environment:
                  summary.environment || "—",
              },
            )}
          </p>
        </div>

        <Badge
          bg={
            summary.score?.gatePassed
              ? "success"
              : "danger"
          }
          className="DfctAdminAI-hardGateBadge"
        >
          {benchmarkScoreLabel(
            summary,
          )}
        </Badge>
      </div>

      <div className="DfctAdminAI-metricGrid">
        <Metric
          label={t(
            "adminAI.benchmarks.detail.hardGate",
          )}
          value={benchmarkScoreLabel(
            summary,
          )}
          caption={t(
            "adminAI.benchmarks.detail.hardGateHelp",
          )}
          tone={
            summary.score?.gatePassed
              ? "success"
              : "danger"
          }
        />

        <Metric
          label={t(
            "adminAI.benchmarks.detail.knownCost",
          )}
          value={formatCurrency(
            knownCostValue(
              summary.cost,
            ),
            {
              maximumFractionDigits: 8,
            },
          )}
        />

        <Metric
          label={t(
            "adminAI.benchmarks.detail.duration",
          )}
          value={formatDuration(
            summary.durationMs,
          )}
        />

        <Metric
          label={t(
            "adminAI.benchmarks.detail.commit",
          )}
          value={
            summary.gitCommitSha
              ? String(
                  summary.gitCommitSha,
                ).slice(0, 9)
              : "—"
          }
          caption={
            summary.gitBranch || ""
          }
        />
      </div>

      <div className="DfctAdminAI-assertionStrip">
        {assertions.map(
          (assertion) => (
            <div
              key={
                assertion
                  .benchmarkAssertionResultId
                || assertion.assertionKey
              }
              className={[
                "DfctAdminAI-assertion",
                assertion.status
                  === "passed"
                  ? "is-passed"
                  : assertion.status
                    === "failed"
                    ? "is-failed"
                    : "",
              ].join(" ")}
              title={
                assertion.message || ""
              }
            >
              <span>
                {assertion.assertionKey}
              </span>

              <strong>
                {assertion.status}
              </strong>
            </div>
          ),
        )}
      </div>

      <ExecutionVisualization
        visual={
          detail.executionVisualization
        }
        t={t}
      />
    </section>
  );
}


function GeneralExecutionLookup({
  adminAi,
  t,
}) {
  const [analysisRunId, setAnalysisRunId] = useState("");

  const detail = adminAi.executionDetail;

  return (
    <section className="DfctAdmin-section">
      <div className="DfctAdmin-sectionHeader">
        <span className="DfctAdmin-eyebrow">
          {t(
            "adminAI.execution.lookupEyebrow",
          )}
        </span>

        <h2>
          {t(
            "adminAI.execution.lookupTitle",
          )}
        </h2>

        <p>
          {t(
            "adminAI.execution.lookupSubtitle",
          )}
        </p>
      </div>

      <div className="DfctAdminAI-runLookup">
        <Form.Control
          value={analysisRunId}
          placeholder={t(
            "adminAI.execution.lookupPlaceholder",
          )}
          onChange={(event) => {
            setAnalysisRunId(
              event.target.value,
            );
          }}
        />

        <Button
          variant="outline-primary"
          disabled={
            !analysisRunId.trim()
            || adminAi.detailLoading
          }
          onClick={() => {
            adminAi.loadExecutionDetail(
              analysisRunId.trim(),
            );
          }}
        >
          {adminAi.detailLoading ? (
            <Spinner
              animation="border"
              size="sm"
            />
          ) : (
            t(
              "adminAI.execution.inspect",
            )
          )}
        </Button>
      </div>

      {detail?.executionVisualization ? (
        <div className="DfctAdminAI-generalExecution">
          <ExecutionVisualization
            visual={
              detail.executionVisualization
            }
            t={t}
          />
        </div>
      ) : null}
    </section>
  );
}


export function BenchmarksView({
  adminAi,
  t,
}) {
  const navigate = useNavigate();

  const data = adminAi.benchmarkData || {};

  const items = asArray(
    data.items,
  );

  const latest = items[0];

  const [benchmarkKey, setBenchmarkKey] = useState("");
  const [benchmarkVersion, setBenchmarkVersion] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState("date");
  const [sortDirection, setSortDirection] = useState("desc");

  const benchmarkKeys = useMemo(
    () => (
      Array.from(
        new Set(
          items
            .map(
              (run) => run.benchmarkKey,
            )
            .filter(Boolean),
        ),
      ).sort()
    ),
    [items],
  );

  useEffect(() => {
    if (!latest) {
      return;
    }

    if (
      !benchmarkKey
      || !benchmarkKeys.includes(
        benchmarkKey,
      )
    ) {
      setBenchmarkKey(
        latest.benchmarkKey || "",
      );
    }
  }, [
    benchmarkKey,
    benchmarkKeys,
    latest,
  ]);

  const versions = useMemo(
    () => (
      Array.from(
        new Set(
          items
            .filter(
              (run) => (
                !benchmarkKey
                || run.benchmarkKey
                  === benchmarkKey
              ),
            )
            .map(
              (run) => String(
                run.benchmarkVersion
                ?? "",
              ),
            )
            .filter(Boolean),
        ),
      ).sort(
        (left, right) => (
          right.localeCompare(
            left,
            undefined,
            {
              numeric: true,
            },
          )
        ),
      )
    ),
    [
      benchmarkKey,
      items,
    ],
  );

  useEffect(() => {
    if (!versions.length) {
      setBenchmarkVersion("");
      return;
    }

    if (
      !benchmarkVersion
      || !versions.includes(
        benchmarkVersion,
      )
    ) {
      const latestForKey = items.find(
        (run) => (
          run.benchmarkKey
          === benchmarkKey
        ),
      );

      const preferred = String(
        latestForKey?.benchmarkVersion
        ?? versions[0],
      );

      setBenchmarkVersion(
        versions.includes(preferred)
          ? preferred
          : versions[0],
      );
    }
  }, [
    benchmarkKey,
    benchmarkVersion,
    items,
    versions,
  ]);

  const historyRuns = useMemo(
    () => (
      items.filter(
        (run) => (
          (
            !benchmarkKey
            || run.benchmarkKey
              === benchmarkKey
          )
          && (
            !benchmarkVersion
            || String(
              run.benchmarkVersion,
            ) === benchmarkVersion
          )
        ),
      )
    ),
    [
      benchmarkKey,
      benchmarkVersion,
      items,
    ],
  );

  const visibleRuns = useMemo(
    () => {
      const query = (
        searchQuery
          .trim()
          .toLowerCase()
      );

      const searched = query
        ? historyRuns.filter(
            (run) => {
              const score = (
                run.score || {}
              );

              const haystack = [
                run.createdAt,
                run.benchmarkKey,
                run.benchmarkVersion,
                run.outcome,
                run.status,
                run.environment,
                run.gitSha,
                run.gitBranch,
                run.topicId,
                run.analysisRunId,
                score.passed,
                score.total,
              ]
                .filter(
                  (value) => (
                    value !== null
                    && value !== undefined
                  ),
                )
                .join(" ")
                .toLowerCase();

              return haystack.includes(
                query,
              );
            },
          )
        : historyRuns;

      const coverageRatio = (run) => {
        const cost = run.cost || {};

        const total = Number(
          cost.executionCount || 0,
        );

        const known = Number(
          cost.knownCostExecutionCount || 0,
        );

        if (!total) {
          return -1;
        }

        return known / total;
      };

      const numericScore = (run) => {
        const score = run.score || {};

        const total = Number(
          score.total || 0,
        );

        if (!total) {
          return -1;
        }

        return (
          Number(score.passed || 0)
          / total
        );
      };

      const valueFor = (run) => {
        switch (sortKey) {
          case "benchmark":
            return (
              `${run.benchmarkKey || ""}:`
              + `${run.benchmarkVersion || ""}`
            );

          case "score":
            return numericScore(run);

          case "outcome":
            return String(
              run.outcome
              || run.status
              || "",
            );

          case "knownCost":
            return Number(
              run.cost
                ?.resolvedCostUsdKnown
              ?? -1,
            );

          case "coverage":
            return coverageRatio(run);

          case "duration":
            return Number(
              run.durationMs || 0,
            );

          case "date":
          default:
            return (
              new Date(
                run.createdAt || 0,
              ).getTime()
            );
        }
      };

      return [...searched].sort(
        (left, right) => {
          const leftValue = valueFor(left);
          const rightValue = valueFor(right);

          let comparison;

          if (
            typeof leftValue === "number"
            && typeof rightValue
              === "number"
          ) {
            comparison = (
              leftValue - rightValue
            );
          } else {
            comparison = String(
              leftValue,
            ).localeCompare(
              String(rightValue),
              undefined,
              {
                numeric: true,
                sensitivity: "base",
              },
            );
          }

          return sortDirection === "asc"
            ? comparison
            : -comparison;
        },
      );
    },
    [
      historyRuns,
      searchQuery,
      sortDirection,
      sortKey,
    ],
  );

  const selectRun = (run) => {
    if (!run?.benchmarkRunId) {
      return;
    }

    navigate(
      "/admin/ai/benchmarks/"
      + encodeURIComponent(
        run.benchmarkRunId,
      ),
    );
  };

  const changeSort = (field) => {
    if (field === sortKey) {
      setSortDirection(
        (current) => (
          current === "asc"
            ? "desc"
            : "asc"
        ),
      );

      return;
    }

    setSortKey(field);

    setSortDirection(
      [
        "date",
        "score",
        "knownCost",
        "coverage",
        "duration",
      ].includes(field)
        ? "desc"
        : "asc",
    );
  };

  return (
    <>
      <section className="DfctAdmin-section">
        <div className="DfctAdminAI-observabilityHeader">
          <div className="DfctAdmin-sectionHeader">
            <span className="DfctAdmin-eyebrow">
              {t(
                "adminAI.benchmarks.eyebrow",
              )}
            </span>

            <h2>
              {t(
                "adminAI.benchmarks.title",
              )}
            </h2>

            <p>
              {t(
                "adminAI.benchmarks.subtitle",
              )}
            </p>
          </div>

          <div className="DfctAdminAI-benchmarkFilters">
            <Form.Select
              value={benchmarkKey}
              aria-label={t(
                "adminAI.benchmarks.filterBenchmark",
              )}
              onChange={(event) => {
                setBenchmarkKey(
                  event.target.value,
                );
              }}
            >
              {benchmarkKeys.map(
                (key) => (
                  <option
                    key={key}
                    value={key}
                  >
                    {key}
                  </option>
                ),
              )}
            </Form.Select>

            <Form.Select
              value={benchmarkVersion}
              aria-label={t(
                "adminAI.benchmarks.filterVersion",
              )}
              onChange={(event) => {
                setBenchmarkVersion(
                  event.target.value,
                );
              }}
            >
              {versions.map(
                (version) => (
                  <option
                    key={version}
                    value={version}
                  >
                    v{version}
                  </option>
                ),
              )}
            </Form.Select>
          </div>
        </div>

        <div className="DfctAdminAI-chartCard">
          <div className="DfctAdminAI-chartHeader">
            <div>
              <strong>
                {t(
                  "adminAI.benchmarks.chart.title",
                )}
              </strong>

              <span>
                {t(
                  "adminAI.benchmarks.chart.subtitle",
                )}
              </span>
            </div>

            <Badge bg="danger">
              {t(
                "adminAI.benchmarks.chart.gateBadge",
              )}
            </Badge>
          </div>

          {historyRuns.length ? (
            <BenchmarkHistoryChart
              runs={historyRuns}
              onSelect={selectRun}
              t={t}
            />
          ) : (
            <div className="DfctAdminAI-empty">
              {t(
                "adminAI.benchmarks.empty",
              )}
            </div>
          )}
        </div>
      </section>

      <section className="DfctAdmin-section">
        <div className="DfctAdminAI-benchmarkListHeader">
          <div className="DfctAdmin-sectionHeader">
            <span className="DfctAdmin-eyebrow">
              {t(
                "adminAI.benchmarks.runsEyebrow",
              )}
            </span>

            <h2>
              {t(
                "adminAI.benchmarks.runsTitle",
              )}
            </h2>

            <p>
              {t(
                "adminAI.benchmarks.runsSubtitle",
              )}
            </p>
          </div>

          <Form.Control
            className="DfctAdminAI-benchmarkSearch"
            type="search"
            value={searchQuery}
            placeholder={t(
              "adminAI.benchmarks.searchPlaceholder",
            )}
            aria-label={t(
              "adminAI.benchmarks.searchAria",
            )}
            onChange={(event) => {
              setSearchQuery(
                event.target.value,
              );
            }}
          />
        </div>

        <BenchmarkRunsTable
          runs={visibleRuns}
          selectedRunId=""
          onSelect={selectRun}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSort={changeSort}
          t={t}
        />
      </section>

      <GeneralExecutionLookup
        adminAi={adminAi}
        t={t}
      />
    </>
  );
}
