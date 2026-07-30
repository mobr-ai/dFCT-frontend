import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Badge,
  Button,
  Form,
  Modal,
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


function ProviderCostChart({
  providers,
  t,
}) {
  const theme = themeTokens();

  const rows = Object.entries(
    providers || {},
  )
    .map(([provider, metrics]) => ({
      provider,
      metrics,
      cost: knownCostValue(metrics),
    }))
    .filter(
      (row) => row.cost !== null,
    )
    .sort(
      (left, right) => (
        Number(right.cost || 0)
        - Number(left.cost || 0)
      ),
    );

  const options = {
    chart: {
      type: "bar",
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
      ...rows.map(
        (_, index) => (
          theme.series[
            index % theme.series.length
          ]
        ),
      ),
    ],
    plotOptions: {
      bar: {
        horizontal: true,
        distributed: true,
        borderRadius: 5,
        barHeight: "54%",
      },
    },
    dataLabels: {
      enabled: true,
      formatter: (value) => (
        formatCurrency(
          value,
          {
            maximumFractionDigits: 4,
          },
        )
      ),
      style: {
        fontSize: "11px",
        fontWeight: 700,
      },
    },
    grid: {
      borderColor: theme.border,
      strokeDashArray: 3,
    },
    legend: {
      show: false,
    },
    xaxis: {
      categories: rows.map(
        (row) => (
          providerDisplayName(
            row.provider,
          )
        ),
      ),
      min: 0,
      labels: {
        formatter: (value) => (
          `$${Number(value).toFixed(2)}`
        ),
      },
    },
    yaxis: {
      labels: {
        maxWidth: 130,
        style: {
          fontWeight: 700,
        },
      },
    },
    tooltip: {
      theme: theme.mode,
      y: {
        formatter: (
          value,
          { dataPointIndex },
        ) => {
          const row = (
            rows[dataPointIndex]
            || {}
          );

          const metrics = (
            row.metrics
            || {}
          );

          const executions = Number(
            metrics.executionCount || 0,
          );

          const known = Number(
            metrics.costKnownExecutionCount
            || 0,
          );

          const coverage = percent(
            known,
            executions,
          );

          const coverageText = (
            coverage === null
              ? "—"
              : `${coverage.toFixed(1)}%`
          );

          return (
            `${formatCurrency(
              value,
              {
                maximumFractionDigits: 8,
              },
            )}`
            + ` · ${coverageText} `
            + t(
              "adminAI.costs.chart.providerCoverageSuffix",
            )
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
      type="bar"
      height={Math.max(
        250,
        rows.length * 48,
      )}
      options={options}
      series={[
        {
          name: t(
            "adminAI.costs.chart.knownRecorded",
          ),
          data: rows.map(
            (row) => Number(
              row.cost || 0,
            ),
          ),
        },
      ]}
    />
  );
}


function CostBasisLegend({
  t,
}) {
  return (
    <div className="DfctAdminAI-costBasis">
      <span className="DfctAdminAI-costBasisLabel">
        {t(
          "adminAI.costs.basis.title",
        )}
      </span>

      <div className="DfctAdminAI-costBasisItems">
        <span>
          <Badge bg="primary">
            {t(
              "adminAI.costs.basis.providerBilled",
            )}
          </Badge>
          {t(
            "adminAI.costs.basis.providerBilledHelp",
          )}
        </span>

        <span>
          <Badge bg="info">
            {t(
              "adminAI.costs.basis.reported",
            )}
          </Badge>
          {t(
            "adminAI.costs.basis.reportedHelp",
          )}
        </span>

        <span>
          <Badge bg="secondary">
            {t(
              "adminAI.costs.basis.estimated",
            )}
          </Badge>
          {t(
            "adminAI.costs.basis.estimatedHelp",
          )}
        </span>

        <span>
          <Badge bg="light" text="dark">
            {t(
              "adminAI.costs.basis.unknown",
            )}
          </Badge>
          {t(
            "adminAI.costs.basis.unknownHelp",
          )}
        </span>
      </div>
    </div>
  );
}


function maskedProviderApiKey(value) {
  const text = String(value || "").trim();

  if (!text) {
    return "—";
  }

  const suffix = text.slice(-4);

  return `••••${suffix}`;
}


function reconciliationTone(reconciliation) {
  return reconciliation?.comparable
    ? "success"
    : "warning";
}


function providerDisplayName(providerKey) {
  if (providerKey === "openai") {
    return "OpenAI";
  }

  if (providerKey === "anthropic") {
    return "Anthropic";
  }

  return providerKey;
}


function scopedComparisonTone(status) {
  if (status === "workspace_scope_aligned") {
    return "info";
  }

  if (status === "local_cost_incomplete") {
    return "warning";
  }

  return "secondary";
}


function ProviderFinanceScopedComparisons({
  rows,
  t,
}) {
  const comparisons = asArray(rows);

  if (!comparisons.length) {
    return null;
  }

  return (
    <div className="DfctAdminAI-financeScoped">
      <div className="DfctAdminAI-chartHeader">
        <div>
          <strong>
            {t(
              "adminAI.costs.finance.scoped.title",
            )}
          </strong>

          <span>
            {t(
              "adminAI.costs.finance.scoped.subtitle",
            )}
          </span>
        </div>
      </div>

      <div className="DfctAdminAI-financeScopedGrid">
        {comparisons.map((row, index) => {
          const workspaceId = (
            row.workspaceId
            ?? null
          );

          const isDefault = (
            row.includesDefaultWorkspace
            || workspaceId === null
          );

          const apiKeyIds = asArray(
            row.localApiKeyIds,
          );

          const pendingProvider = (
            row.providerReportedCostUsd
            === null
            || row.providerReportedCostUsd
            === undefined
          );

          return (
            <div
              key={
                workspaceId
                || `default-${index}`
              }
              className="DfctAdminAI-financeScopedCard"
            >
              <div className="DfctAdminAI-financeScopedHeader">
                <div>
                  <span>
                    {t(
                      "adminAI.costs.finance.scoped.workspace",
                    )}
                  </span>

                  <strong>
                    {isDefault
                      ? t(
                          "adminAI.costs.finance.scoped.defaultWorkspace",
                        )
                      : t(
                          "adminAI.costs.finance.scoped.namedWorkspace",
                        )}
                  </strong>

                  {!isDefault ? (
                    <small>
                      {workspaceId}
                    </small>
                  ) : null}
                </div>

                <Badge
                  bg={scopedComparisonTone(
                    row.status,
                  )}
                >
                  {t(
                    `adminAI.costs.finance.scoped.status.${row.status}`,
                    {
                      defaultValue:
                        row.status
                        || "—",
                    },
                  )}
                </Badge>
              </div>

              <div className="DfctAdminAI-financeScopedMetrics">
                <div>
                  <span>
                    {t(
                      "adminAI.costs.finance.scoped.providerBilled",
                    )}
                  </span>

                  <strong>
                    {formatCurrency(
                      row.providerReportedCostUsd,
                      {
                        unavailable: t(
                          "adminAI.costs.finance.scoped.pendingProviderReport",
                        ),
                        maximumFractionDigits: 8,
                      },
                    )}
                  </strong>

                  <small>
                    {pendingProvider
                      ? t(
                          "adminAI.costs.finance.scoped.pendingProviderReportHelp",
                        )
                      : t(
                          "adminAI.costs.finance.scoped.providerObservations",
                          {
                            count:
                              formatNumber(
                                row.providerObservationCount,
                              ),
                          },
                        )}
                  </small>
                </div>

                <div>
                  <span>
                    {t(
                      "adminAI.costs.finance.scoped.localExecutions",
                    )}
                  </span>

                  <strong>
                    {formatNumber(
                      row.localExecutionCount,
                    )}
                  </strong>

                  <small>
                    {t(
                      "adminAI.costs.finance.scoped.outsideCoverage",
                      {
                        count:
                          formatNumber(
                            row.localExecutionCountOutsideProviderCoverage,
                          ),
                      },
                    )}
                  </small>
                </div>

                <div>
                  <span>
                    {t(
                      "adminAI.costs.finance.scoped.localKnownCost",
                    )}
                  </span>

                  <strong>
                    {formatCurrency(
                      row.knownRecordedCostUsd,
                      {
                        maximumFractionDigits: 8,
                      },
                    )}
                  </strong>

                  <small>
                    {t(
                      "adminAI.costs.finance.scoped.localCostCoverage",
                      {
                        known:
                          formatNumber(
                            row.localCostKnownExecutionCount,
                          ),
                        unknown:
                          formatNumber(
                            row.localCostUnknownExecutionCount,
                          ),
                      },
                    )}
                  </small>
                </div>

                <div>
                  <span>
                    {t(
                      "adminAI.costs.finance.scoped.observedDelta",
                    )}
                  </span>

                  <strong>
                    {formatCurrency(
                      row.observedDeltaUsd,
                      {
                        unavailable: "—",
                        maximumFractionDigits: 8,
                      },
                    )}
                  </strong>

                  <small>
                    {t(
                      "adminAI.costs.finance.scoped.observedDeltaHelp",
                    )}
                  </small>
                </div>
              </div>

              <div className="DfctAdminAI-financeScopedMeta">
                <div>
                  <span>
                    {t(
                      "adminAI.costs.finance.scoped.apiKeys",
                    )}
                  </span>

                  <strong>
                    {apiKeyIds.length
                      ? apiKeyIds
                          .map(
                            maskedProviderApiKey,
                          )
                          .join(", ")
                      : "—"}
                  </strong>
                </div>

                <div>
                  <span>
                    {t(
                      "adminAI.costs.finance.scoped.providerCoverage",
                    )}
                  </span>

                  <strong>
                    {row.providerCoverageStart
                      && row.providerCoverageEnd
                      ? `${formatCompactDate(
                          row.providerCoverageStart,
                        )} – ${formatCompactDate(
                          row.providerCoverageEnd,
                        )}`
                      : t(
                          "adminAI.costs.finance.scoped.noProviderCoverage",
                        )}
                  </strong>
                </div>
              </div>

              <p className="DfctAdminAI-financeScopedReason">
                {t(
                  `adminAI.costs.finance.scoped.reason.${row.reason}`,
                  {
                    defaultValue:
                      row.reason
                      || "—",
                  },
                )}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}


function ProviderFinanceLineItems({
  rows,
  t,
}) {
  const items = asArray(rows);

  if (!items.length) {
    return (
      <div className="DfctAdminAI-empty">
        {t(
          "adminAI.costs.finance.noLineItems",
        )}
      </div>
    );
  }

  const ordered = [...items].sort(
    (left, right) => (
      Number(
        right?.providerReportedCostUsd
        || 0,
      )
      - Number(
        left?.providerReportedCostUsd
        || 0,
      )
    ),
  );

  return (
    <div className="DfctAdmin-tableWrap">
      <table className="DfctAdmin-table DfctAdminAI-financeTable">
        <thead>
          <tr>
            <th>
              {t(
                "adminAI.costs.finance.columns.lineItem",
              )}
            </th>
            <th>
              {t(
                "adminAI.costs.finance.columns.observations",
              )}
            </th>
            <th>
              {t(
                "adminAI.costs.finance.columns.quantity",
              )}
            </th>
            <th>
              {t(
                "adminAI.costs.finance.columns.billed",
              )}
            </th>
          </tr>
        </thead>

        <tbody>
          {ordered.map((row) => (
            <tr
              key={row.lineItem}
            >
              <td>
                <strong>
                  {row.lineItem}
                </strong>
              </td>

              <td>
                {formatNumber(
                  row.observationCount,
                )}
              </td>

              <td>
                {formatNumber(
                  row.quantityKnown,
                )}
              </td>

              <td>
                {formatCurrency(
                  row.providerReportedCostUsd,
                  {
                    maximumFractionDigits: 8,
                  },
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


function ProviderFinanceSection({
  adminAi,
  windowDays,
  t,
}) {
  const data = (
    adminAi.financeData
    || {}
  );

  const providers = (
    data.providers
    || {}
  );

  const entries = Object.entries(
    providers,
  );

  return (
    <section className="DfctAdmin-section DfctAdminAI-financeSection">
      <div className="DfctAdminAI-financeHeader">
        <div className="DfctAdmin-sectionHeader">
          <span className="DfctAdmin-eyebrow">
            {t(
              "adminAI.costs.finance.eyebrow",
            )}
          </span>

          <h2>
            {t(
              "adminAI.costs.finance.title",
            )}
          </h2>

          <p>
            {t(
              "adminAI.costs.finance.subtitle",
            )}
          </p>
        </div>
      </div>

      {!entries.length ? (
        <div className="DfctAdminAI-empty">
          {t(
            "adminAI.costs.finance.empty",
          )}
        </div>
      ) : (
        <div className="DfctAdminAI-financeProviderStack">
          {entries.map(
            ([providerKey, finance]) => {
              const organization = (
                asArray(
                  finance.organizations,
                )[0]
                || {}
              );

              const project = (
                asArray(
                  finance.projects,
                )[0]
                || {}
              );

              const apiKeyId = (
                asArray(
                  finance.apiKeyIds,
                )[0]
                || ""
              );

              const reconciliation = (
                finance.reconciliation
                || {}
              );

              const canSync = (
                providerKey === "openai"
                || providerKey === "anthropic"
              );

              const syncingProvider = (
                adminAi.actionLoading
                === `finance-sync:${providerKey}`
              );

              const scopedComparisons = (
                reconciliation.scopedComparisons
                || []
              );

              return (
                <article
                  key={providerKey}
                  className="DfctAdminAI-financeCard"
                >
                  <div className="DfctAdminAI-financeCardHeader">
                    <div>
                      <span className="DfctAdmin-eyebrow">
                        {providerKey}
                      </span>

                      <h3>
                        {providerDisplayName(
                          providerKey,
                        )}
                      </h3>

                      <p>
                        {t(
                          "adminAI.costs.finance.period",
                          {
                            from:
                              data.fromDate
                              || "—",
                            through:
                              data.throughDate
                              || "—",
                          },
                        )}
                      </p>
                    </div>

                    <div className="DfctAdminAI-financeActions">
                      <Badge
                        bg={reconciliationTone(
                          reconciliation,
                        )}
                      >
                        {reconciliation.comparable
                          ? t(
                              "adminAI.costs.finance.reconciliationComparable",
                            )
                          : t(
                              "adminAI.costs.finance.reconciliationNotComparable",
                            )}
                      </Badge>

                      {canSync ? (
                        <Button
                          size="sm"
                          variant="outline-secondary"
                          disabled={Boolean(
                            adminAi.actionLoading,
                          )}
                          onClick={() => {
                            adminAi.syncProviderFinances(
                              providerKey,
                              windowDays,
                            );
                          }}
                        >
                          {syncingProvider ? (
                            <>
                              <Spinner
                                animation="border"
                                size="sm"
                              />
                              {" "}
                              {t(
                                "adminAI.costs.finance.syncing",
                              )}
                            </>
                          ) : (
                            t(
                              "adminAI.costs.finance.sync",
                            )
                          )}
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  <div className="DfctAdminAI-metricGrid DfctAdminAI-financeMetrics">
                    <Metric
                      label={t(
                        "adminAI.costs.finance.stats.providerBilled",
                      )}
                      value={formatCurrency(
                        finance.providerReportedCostUsd,
                        {
                          maximumFractionDigits: 8,
                        },
                      )}
                      caption={t(
                        "adminAI.costs.finance.stats.providerBilledHelp",
                      )}
                    />

                    <Metric
                      label={t(
                        "adminAI.costs.finance.stats.recorded",
                      )}
                      value={formatCurrency(
                        finance.knownRecordedCostUsd,
                        {
                          maximumFractionDigits: 8,
                        },
                      )}
                      caption={t(
                        "adminAI.costs.finance.stats.recordedHelp",
                      )}
                    />

                    <Metric
                      label={t(
                        "adminAI.costs.finance.stats.delta",
                      )}
                      value={formatCurrency(
                        finance.knownRecordedDeltaUsd,
                        {
                          maximumFractionDigits: 8,
                        },
                      )}
                      caption={t(
                        "adminAI.costs.finance.stats.deltaHelp",
                      )}
                      tone="warning"
                    />

                    <Metric
                      label={t(
                        "adminAI.costs.finance.stats.lastSync",
                      )}
                      value={formatCompactDate(
                        finance.lastSyncedAt,
                      )}
                      caption={t(
                        "adminAI.costs.finance.stats.lastSyncHelp",
                      )}
                    />
                  </div>

                  <details className="DfctAdminAI-financeDetails">
                    <summary>
                      <span>
                        {t(
                          "adminAI.costs.finance.details",
                        )}
                      </span>
                    </summary>

                  <div className="DfctAdminAI-financeScope">
                    <div>
                      <span>
                        {t(
                          "adminAI.costs.finance.scope.organization",
                        )}
                      </span>
                      <strong>
                        {organization.organizationName
                          || organization.organizationId
                          || "—"}
                      </strong>
                      {organization.organizationId ? (
                        <small>
                          {organization.organizationId}
                        </small>
                      ) : null}
                    </div>

                    <div>
                      <span>
                        {t(
                          "adminAI.costs.finance.scope.project",
                        )}
                      </span>
                      <strong>
                        {project.projectName
                          || project.projectId
                          || "—"}
                      </strong>
                      {project.projectId ? (
                        <small>
                          {project.projectId}
                        </small>
                      ) : null}
                    </div>

                    <div>
                      <span>
                        {t(
                          "adminAI.costs.finance.scope.apiKey",
                        )}
                      </span>
                      <strong>
                        {maskedProviderApiKey(
                          apiKeyId,
                        )}
                      </strong>
                      <small>
                        {t(
                          "adminAI.costs.finance.scope.apiKeyHelp",
                        )}
                      </small>
                    </div>

                    <div>
                      <span>
                        {t(
                          "adminAI.costs.finance.scope.localCoverage",
                        )}
                      </span>
                      <strong>
                        {formatNumber(
                          finance.localExecutionCount,
                        )}
                      </strong>
                      <small>
                        {t(
                          "adminAI.costs.finance.scope.localCoverageHelp",
                          {
                            unknown:
                              formatNumber(
                                finance.localCostUnknownExecutionCount,
                              ),
                          },
                        )}
                      </small>
                    </div>
                  </div>

                  {!reconciliation.comparable ? (
                    <div className="DfctAdminAI-financeNotice">
                      <strong>
                        {t(
                          "adminAI.costs.finance.reconciliationTitle",
                        )}
                      </strong>
                      <span>
                        {t(
                          "adminAI.costs.finance.reconciliationHelp",
                        )}
                      </span>
                    </div>
                  ) : null}

                  <ProviderFinanceScopedComparisons
                    rows={scopedComparisons}
                    t={t}
                  />

                  <div className="DfctAdminAI-financeLineItems">
                    <div className="DfctAdminAI-chartHeader">
                      <div>
                        <strong>
                          {t(
                            "adminAI.costs.finance.lineItemsTitle",
                          )}
                        </strong>
                        <span>
                          {t(
                            "adminAI.costs.finance.lineItemsSubtitle",
                          )}
                        </span>
                      </div>
                    </div>

                    <ProviderFinanceLineItems
                      rows={finance.lineItems}
                      t={t}
                    />
                  </div>
                  </details>
                </article>
              );
            },
          )}
        </div>
      )}
    </section>
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
    let cancelled = false;

    const sync = async () => {
      if (cancelled) return;

      for (const providerKey of [
        "openai",
        "anthropic",
      ]) {
        if (cancelled) return;

        await adminAi.syncProviderFinances(
          providerKey,
          windowDays,
          { silent: true },
        );
      }
    };

    void sync();

    const interval = window.setInterval(
      () => {
        void sync();
      },
      5 * 60 * 1000,
    );

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [
    adminAi.syncProviderFinances,
    windowDays,
  ]);

  useEffect(() => {
    if (
      Number(data.windowDays || 0)
      === Number(windowDays)
    ) {
      return;
    }

    adminAi.loadCosts(windowDays);
    adminAi.loadFinances(windowDays);
  }, [
    adminAi.loadCosts,
    adminAi.loadFinances,
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

        <div className="DfctAdminAI-costVisualGrid">
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

          <div className="DfctAdminAI-chartCard">
            <div className="DfctAdminAI-chartHeader">
              <div>
                <strong>
                  {t(
                    "adminAI.costs.chart.providerTitle",
                  )}
                </strong>

                <span>
                  {t(
                    "adminAI.costs.chart.providerSubtitle",
                  )}
                </span>
              </div>
            </div>

            <ProviderCostChart
              providers={data.byProvider}
              t={t}
            />
          </div>
        </div>

        <CostBasisLegend
          t={t}
        />
      </section>

      <ProviderFinanceSection
        adminAi={adminAi}
        windowDays={windowDays}
        t={t}
      />


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
  const viewportRef = useRef(null);
  const svgRef = useRef(null);

  const tooltipDismissRef = useRef(null);
  const tooltipRemoveRef = useRef(null);
  const panAnimationRef = useRef(null);
  const zoomFrameRef = useRef(null);

  const touchPointersRef = useRef(
    new Map(),
  );

  const touchGestureRef = useRef(null);
  const dagIdentityRef = useRef("");

  const effectiveZoomRef = useRef(0.8);

  const [viewportSize, setViewportSize] = useState({
    width: 0,
    height: 0,
  });

  const [fitScale, setFitScale] = useState(1);
  const [zoomMode, setZoomMode] = useState(
    "manual",
  );
  const [manualZoom, setManualZoom] = useState(
    0.8,
  );

  const [pinnedNodeId, setPinnedNodeId] = useState(
    "",
  );

  const [tooltip, setTooltip] = useState(null);

  const dag = visual?.dag || {};
  const nodes = asArray(dag.nodes);
  const edges = asArray(dag.edges);
  const columns = asArray(
    dag.columns,
  );

  const nodeWidth = 204;
  const nodeHeight = 64;
  const columnPitch = 232;
  const rowPitch = 108;
  const paddingX = 34;
  const paddingY = 30;

  const minZoom = 0.06;
  const maxZoom = 2.2;

  const maxNodesAtDepth = Math.max(
    1,
    ...columns.map(
      (column) => (
        asArray(
          column.nodeIds,
        ).length
      ),
    ),
  );

  const width = Math.max(
    680,
    (
      maxNodesAtDepth
      * columnPitch
    ) + (paddingX * 2),
  );

  const height = Math.max(
    320,
    (
      Math.max(
        1,
        columns.length,
      )
      * rowPitch
    ) + (paddingY * 2),
  );

  const positions = new Map();

  for (const column of columns) {
    const ids = asArray(
      column.nodeIds,
    );

    const depth = Number(
      column.depth || 0,
    );

    const y = (
      paddingY
      + (depth * rowPitch)
    );

    const groupWidth = (
      ids.length
      * columnPitch
    );

    const groupStart = (
      (width - groupWidth) / 2
      + (
        columnPitch
        - nodeWidth
      ) / 2
    );

    ids.forEach(
      (nodeId, index) => {
        positions.set(
          nodeId,
          {
            x: (
              groupStart
              + (
                index
                * columnPitch
              )
            ),
            y,
          },
        );
      },
    );
  }

  const clampZoom = (value) => (
    Math.min(
      maxZoom,
      Math.max(
        minZoom,
        Number(value) || minZoom,
      ),
    )
  );

  const finePointerAvailable = () => (
    typeof window !== "undefined"
    && typeof window.matchMedia === "function"
    && window.matchMedia(
      "(hover: hover) and (pointer: fine)",
    ).matches
  );

  const clearTooltipTimers = () => {
    if (tooltipDismissRef.current !== null) {
      window.clearTimeout(
        tooltipDismissRef.current,
      );

      tooltipDismissRef.current = null;
    }

    if (tooltipRemoveRef.current !== null) {
      window.clearTimeout(
        tooltipRemoveRef.current,
      );

      tooltipRemoveRef.current = null;
    }
  };

  const removePinnedTooltip = ({
    fade = false,
    clearSelection = true,
  } = {}) => {
    clearTooltipTimers();

    if (
      fade
      && tooltip?.node
    ) {
      setTooltip(
        (current) => (
          current
            ? {
                ...current,
                fading: true,
              }
            : null
        ),
      );

      tooltipRemoveRef.current = (
        window.setTimeout(
          () => {
            setTooltip(null);
            setPinnedNodeId("");

            if (clearSelection) {
              onSelect("");
            }

            tooltipRemoveRef.current = null;
          },
          220,
        )
      );

      return;
    }

    setTooltip(null);
    setPinnedNodeId("");

    if (clearSelection) {
      onSelect("");
    }
  };

  const schedulePinnedTooltipDismiss = () => {
    clearTooltipTimers();

    tooltipDismissRef.current = (
      window.setTimeout(
        () => {
          setTooltip(
            (current) => (
              current
                ? {
                    ...current,
                    fading: true,
                  }
                : null
            ),
          );

          tooltipRemoveRef.current = (
            window.setTimeout(
              () => {
                setTooltip(null);
                setPinnedNodeId("");
                onSelect("");

                tooltipRemoveRef.current = null;
              },
              220,
            )
          );
        },
        7000,
      )
    );
  };

  const cancelPanAnimation = () => {
    if (panAnimationRef.current !== null) {
      window.cancelAnimationFrame(
        panAnimationRef.current,
      );

      panAnimationRef.current = null;
    }
  };

  const animateViewportTo = (
    targetLeft,
    targetTop,
    {
      animated = true,
      duration = 240,
    } = {},
  ) => {
    const viewport = (
      viewportRef.current
    );

    if (!viewport) {
      return;
    }

    cancelPanAnimation();

    const maxLeft = Math.max(
      0,
      viewport.scrollWidth
      - viewport.clientWidth,
    );

    const maxTop = Math.max(
      0,
      viewport.scrollHeight
      - viewport.clientHeight,
    );

    const destinationLeft = Math.max(
      0,
      Math.min(
        maxLeft,
        Number(targetLeft) || 0,
      ),
    );

    const destinationTop = Math.max(
      0,
      Math.min(
        maxTop,
        Number(targetTop) || 0,
      ),
    );

    if (!animated) {
      viewport.scrollLeft = (
        destinationLeft
      );

      viewport.scrollTop = (
        destinationTop
      );

      return;
    }

    const initialLeft = (
      viewport.scrollLeft
    );

    const initialTop = (
      viewport.scrollTop
    );

    const deltaLeft = (
      destinationLeft
      - initialLeft
    );

    const deltaTop = (
      destinationTop
      - initialTop
    );

    if (
      Math.abs(deltaLeft) < 0.5
      && Math.abs(deltaTop) < 0.5
    ) {
      return;
    }

    const startedAt = (
      performance.now()
    );

    const frame = (now) => {
      const progress = Math.min(
        1,
        (
          now - startedAt
        ) / duration,
      );

      const eased = (
        1
        - Math.pow(
          1 - progress,
          5,
        )
      );

      viewport.scrollLeft = (
        initialLeft
        + deltaLeft * eased
      );

      viewport.scrollTop = (
        initialTop
        + deltaTop * eased
      );

      if (progress < 1) {
        panAnimationRef.current = (
          window.requestAnimationFrame(
            frame,
          )
        );
      } else {
        panAnimationRef.current = null;
      }
    };

    panAnimationRef.current = (
      window.requestAnimationFrame(
        frame,
      )
    );
  };

  const nodeElement = (
    nodeId,
  ) => {
    const viewport = (
      viewportRef.current
    );

    if (!viewport) {
      return null;
    }

    return Array.from(
      viewport.querySelectorAll(
        ".DfctAdminAI-dagNode",
      ),
    ).find(
      (element) => (
        element.getAttribute(
          "data-dag-node-id",
        ) === String(nodeId)
      ),
    ) || null;
  };

  const centerElement = (
    element,
    {
      animated = true,
      duration = 260,
    } = {},
  ) => {
    const viewport = (
      viewportRef.current
    );

    if (
      !viewport
      || !element
    ) {
      return;
    }

    const viewportRect = (
      viewport.getBoundingClientRect()
    );

    const elementRect = (
      element.getBoundingClientRect()
    );

    const deltaX = (
      (
        elementRect.left
        + elementRect.width / 2
      )
      - (
        viewportRect.left
        + viewportRect.width / 2
      )
    );

    const deltaY = (
      (
        elementRect.top
        + elementRect.height / 2
      )
      - (
        viewportRect.top
        + viewportRect.height / 2
      )
    );

    animateViewportTo(
      viewport.scrollLeft + deltaX,
      viewport.scrollTop + deltaY,
      {
        animated,
        duration,
      },
    );
  };

  const firstNodeId = (
    asArray(
      columns
        .slice()
        .sort(
          (left, right) => (
            Number(left.depth || 0)
            - Number(right.depth || 0)
          ),
        )[0]?.nodeIds,
    )[0]
    || nodes[0]?.nodeId
    || ""
  );

  const centerFirstStep = (
    animated = true,
  ) => {
    const element = (
      nodeElement(
        firstNodeId,
      )
    );

    if (element) {
      centerElement(
        element,
        {
          animated,
          duration: 260,
        },
      );
    }
  };

  /*
   * Tooltip coordinates are stored in the scrollable viewport's own
   * content coordinate system. This is important: absolute coordinates
   * without scrollLeft/scrollTop are what previously allowed the tooltip
   * to visually escape above the DAG.
   */
  const positionTooltip = (
    element,
    node,
    {
      pinned = false,
    } = {},
  ) => {
    const viewport = (
      viewportRef.current
    );

    if (
      !viewport
      || !element
      || !finePointerAvailable()
    ) {
      return false;
    }

    const viewportRect = (
      viewport.getBoundingClientRect()
    );

    const nodeRect = (
      element.getBoundingClientRect()
    );

    const viewportVisible = (
      viewportRect.bottom > 0
      && viewportRect.right > 0
      && viewportRect.top < window.innerHeight
      && viewportRect.left < window.innerWidth
    );

    if (!viewportVisible) {
      setTooltip(null);
      return false;
    }

    const nodeVisible = !(
      nodeRect.bottom
        <= viewportRect.top
      || nodeRect.top
        >= viewportRect.bottom
      || nodeRect.right
        <= viewportRect.left
      || nodeRect.left
        >= viewportRect.right
    );

    if (!nodeVisible) {
      setTooltip(null);
      return false;
    }

    const margin = 10;

    const visibleLeft = Math.max(
      viewportRect.left + margin,
      margin,
    );

    const visibleRight = Math.min(
      viewportRect.right - margin,
      window.innerWidth - margin,
    );

    const visibleTop = Math.max(
      viewportRect.top + margin,
      margin,
    );

    const visibleBottom = Math.min(
      viewportRect.bottom - margin,
      window.innerHeight - margin,
    );

    const tooltipWidth = Math.min(
      300,
      Math.max(
        180,
        visibleRight
        - visibleLeft,
      ),
    );

    const tooltipHeight = 205;

    const centerX = (
      nodeRect.left
      + nodeRect.width / 2
    );

    const clientLeft = Math.max(
      visibleLeft,
      Math.min(
        centerX
        - tooltipWidth / 2,
        visibleRight
        - tooltipWidth,
      ),
    );

    const roomBelow = (
      visibleBottom
      - nodeRect.bottom
    );

    const roomAbove = (
      nodeRect.top
      - visibleTop
    );

    const above = (
      roomBelow
        < tooltipHeight + margin
      && roomAbove > roomBelow
    );

    const idealClientTop = above
      ? (
          nodeRect.top
          - tooltipHeight
          - margin
        )
      : (
          nodeRect.bottom
          + margin
        );

    const clientTop = Math.max(
      visibleTop,
      Math.min(
        idealClientTop,
        visibleBottom
        - tooltipHeight,
      ),
    );

    /*
     * Convert client coordinates to scroll-content coordinates.
     * The viewport's overflow then becomes the final clipping boundary.
     */
    const left = (
      viewport.scrollLeft
      + clientLeft
      - viewportRect.left
    );

    const top = (
      viewport.scrollTop
      + clientTop
      - viewportRect.top
    );

    setTooltip({
      node,
      left,
      top,
      width: tooltipWidth,
      pinned,
      fading: false,
    });

    return true;
  };

  const showTransientTooltip = (
    event,
    node,
  ) => {
    if (
      !finePointerAvailable()
      || pinnedNodeId
    ) {
      return;
    }

    positionTooltip(
      event.currentTarget,
      node,
    );
  };

  const hideTransientTooltip = () => {
    if (!pinnedNodeId) {
      setTooltip(null);
    }
  };

  const pinDesktopNode = (
    element,
    node,
  ) => {
    clearTooltipTimers();

    setPinnedNodeId(
      node.nodeId,
    );

    onSelect(
      node.nodeId,
    );

    positionTooltip(
      element,
      node,
      {
        pinned: true,
      },
    );

    centerElement(
      element,
      {
        animated: true,
        duration: 280,
      },
    );

    schedulePinnedTooltipDismiss();
  };

  const activateNode = (
    event,
    node,
  ) => {
    if (finePointerAvailable()) {
      pinDesktopNode(
        event.currentTarget,
        node,
      );

      return;
    }

    onSelect(
      selectedNodeId === node.nodeId
        ? ""
        : node.nodeId,
    );
  };

  /*
   * Fit is responsive to the actual DAG viewport, not the whole window.
   */
  useEffect(() => {
    const viewport = (
      viewportRef.current
    );

    if (!viewport) {
      return undefined;
    }

    const update = () => {
      const rect = (
        viewport.getBoundingClientRect()
      );

      const availableWidth = Math.max(
        1,
        rect.width - 28,
      );

      const availableHeight = Math.max(
        1,
        rect.height - 28,
      );

      const nextFit = Math.min(
        1,
        Math.max(
          minZoom,
          Math.min(
            availableWidth / width,
            availableHeight / height,
          ),
        ),
      );

      setViewportSize({
        width: rect.width,
        height: rect.height,
      });

      setFitScale(nextFit);
    };

    update();

    if (
      typeof ResizeObserver
      === "undefined"
    ) {
      window.addEventListener(
        "resize",
        update,
      );

      return () => {
        window.removeEventListener(
          "resize",
          update,
        );
      };
    }

    const observer = new ResizeObserver(
      update,
    );

    observer.observe(
      viewport,
    );

    return () => {
      observer.disconnect();
    };
  }, [
    height,
    width,
  ]);

  const effectiveZoom = (
    zoomMode === "fit"
      ? fitScale
      : manualZoom
  );

  effectiveZoomRef.current = (
    effectiveZoom
  );

  const renderedWidth = (
    width * effectiveZoom
  );

  const renderedHeight = (
    height * effectiveZoom
  );

  const zoomPercent = Math.round(
    effectiveZoom * 100,
  );

  /*
   * Reset whenever a different durable DAG is loaded.
   */
  useEffect(() => {
    const identity = [
      nodes.length,
      edges.length,
      firstNodeId,
      width,
      height,
    ].join(":");

    if (
      !nodes.length
      || dagIdentityRef.current
        === identity
    ) {
      return;
    }

    dagIdentityRef.current = (
      identity
    );

    effectiveZoomRef.current = 0.8;

    setZoomMode(
      "manual",
    );

    setManualZoom(
      0.8,
    );

    setPinnedNodeId("");
    setTooltip(null);
    onSelect("");

    window.requestAnimationFrame(
      () => {
        window.requestAnimationFrame(
          () => {
            centerFirstStep(
              false,
            );
          },
        );
      },
    );
  }, [
    edges.length,
    firstNodeId,
    height,
    nodes.length,
    width,
  ]);

  /*
   * Keep a pinned tooltip attached to its node while the DAG itself pans.
   * Window scrolling is also observed so an off-screen DAG never leaves a
   * floating inspector behind.
   */
  useEffect(() => {
    if (
      !pinnedNodeId
      || !finePointerAvailable()
    ) {
      return undefined;
    }

    const viewport = (
      viewportRef.current
    );

    const node = nodes.find(
      (candidate) => (
        candidate.nodeId
        === pinnedNodeId
      ),
    );

    if (
      !viewport
      || !node
    ) {
      return undefined;
    }

    let frame = null;

    const update = () => {
      if (frame !== null) {
        window.cancelAnimationFrame(
          frame,
        );
      }

      frame = window.requestAnimationFrame(
        () => {
          frame = null;

          const element = nodeElement(
            pinnedNodeId,
          );

          if (!element) {
            setTooltip(null);
            return;
          }

          positionTooltip(
            element,
            node,
            {
              pinned: true,
            },
          );
        },
      );
    };

    viewport.addEventListener(
      "scroll",
      update,
      {
        passive: true,
      },
    );

    /*
     * capture=true catches page/ancestor scrolling as well.
     */
    window.addEventListener(
      "scroll",
      update,
      true,
    );

    window.addEventListener(
      "resize",
      update,
    );

    update();

    return () => {
      viewport.removeEventListener(
        "scroll",
        update,
      );

      window.removeEventListener(
        "scroll",
        update,
        true,
      );

      window.removeEventListener(
        "resize",
        update,
      );

      if (frame !== null) {
        window.cancelAnimationFrame(
          frame,
        );
      }
    };
  }, [
    nodes,
    pinnedNodeId,
  ]);

  const prepareForZoom = () => {
    /*
     * A zoom changes the inspection context. Dismiss persistent telemetry
     * immediately rather than letting it float over a moving graph.
     */
    if (
      pinnedNodeId
      || tooltip?.pinned
    ) {
      removePinnedTooltip({
        fade: true,
      });
    } else {
      setTooltip(null);
    }
  };

  const setManualZoomValue = (
    value,
  ) => {
    const next = clampZoom(
      value,
    );

    effectiveZoomRef.current = (
      next
    );

    setZoomMode(
      "manual",
    );

    setManualZoom(
      next,
    );

    return next;
  };

  /*
   * Zoom around a client-space focal point and then bring that point toward
   * the middle of the viewport. This provides the camera-style navigation
   * requested for mouse-wheel zoom.
   */
  const zoomTowardPoint = (
    nextZoom,
    clientX,
    clientY,
  ) => {
    const viewport = (
      viewportRef.current
    );

    if (!viewport) {
      return;
    }

    const previousZoom = (
      effectiveZoomRef.current
    );

    const normalized = (
      clampZoom(
        nextZoom,
      )
    );

    if (
      Math.abs(
        normalized
        - previousZoom
      ) < 0.0001
    ) {
      return;
    }

    prepareForZoom();

    const rect = (
      viewport.getBoundingClientRect()
    );

    const pointerX = (
      clientX
      - rect.left
    );

    const pointerY = (
      clientY
      - rect.top
    );

    const contentX = (
      viewport.scrollLeft
      + pointerX
    );

    const contentY = (
      viewport.scrollTop
      + pointerY
    );

    const ratio = (
      normalized
      / previousZoom
    );

    setManualZoomValue(
      normalized,
    );

    if (zoomFrameRef.current !== null) {
      window.cancelAnimationFrame(
        zoomFrameRef.current,
      );
    }

    zoomFrameRef.current = (
      window.requestAnimationFrame(
        () => {
          zoomFrameRef.current = null;

          animateViewportTo(
            (
              contentX * ratio
              - viewport.clientWidth / 2
            ),
            (
              contentY * ratio
              - viewport.clientHeight / 2
            ),
            {
              animated: true,
              duration: 175,
            },
          );
        },
      )
    );
  };

  /*
   * Native non-passive wheel listener is intentional.
   *
   * Chromium reports trackpad pinch as Ctrl+wheel.
   * High-resolution pixel deltas are treated as trackpad panning.
   * Coarser discrete wheel deltas remain mouse-wheel zoom.
   */
  useEffect(() => {
    const viewport = (
      viewportRef.current
    );

    if (!viewport) {
      return undefined;
    }

    const normalizeDelta = (
      value,
      mode,
    ) => {
      let delta = Number(
        value || 0,
      );

      if (mode === 1) {
        delta *= 16;
      } else if (mode === 2) {
        delta *= Math.max(
          320,
          viewport.clientHeight,
        );
      }

      return Math.max(
        -240,
        Math.min(
          240,
          delta,
        ),
      );
    };

    const canPanX = (
      delta,
    ) => (
      delta < 0
        ? viewport.scrollLeft > 0
        : viewport.scrollLeft
          < (
            viewport.scrollWidth
            - viewport.clientWidth
            - 1
          )
    );

    const canPanY = (
      delta,
    ) => (
      delta < 0
        ? viewport.scrollTop > 0
        : viewport.scrollTop
          < (
            viewport.scrollHeight
            - viewport.clientHeight
            - 1
          )
    );

    const handleWheel = (
      event,
    ) => {
      let deltaX = normalizeDelta(
        event.deltaX,
        event.deltaMode,
      );

      let deltaY = normalizeDelta(
        event.deltaY,
        event.deltaMode,
      );

      /*
       * Browser/OS trackpad pinch gesture.
       */
      if (event.ctrlKey) {
        event.preventDefault();
        event.stopPropagation();

        const factor = Math.exp(
          -deltaY * 0.003,
        );

        zoomTowardPoint(
          effectiveZoomRef.current
          * factor,
          event.clientX,
          event.clientY,
        );

        return;
      }

      if (
        event.shiftKey
        && Math.abs(deltaX) < 0.25
      ) {
        deltaX = deltaY;
        deltaY = 0;
      }

      const pixelPrecision = (
        event.deltaMode === 0
      );

      /*
       * Chromium has no reliable "trackpad" flag. In practice trackpads
       * generate pixel deltas and either a horizontal component, fractional
       * values, or substantially smaller Y steps than a physical wheel.
       */
      const likelyTrackpad = (
        pixelPrecision
        && (
          Math.abs(deltaX) > 0.01
          || Math.abs(deltaY) < 80
          || !Number.isInteger(deltaY)
        )
      );

      if (likelyTrackpad) {
        const panX = (
          Math.abs(deltaX) >= 0.15
          && canPanX(deltaX)
        );

        const panY = (
          Math.abs(deltaY) >= 0.15
          && canPanY(deltaY)
        );

        /*
         * When the DAG cannot consume the gesture at its boundary, allow
         * normal page scrolling instead of trapping the user.
         */
        if (!panX && !panY) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();

        cancelPanAnimation();

        if (panX) {
          viewport.scrollLeft += (
            deltaX
          );
        }

        if (panY) {
          viewport.scrollTop += (
            deltaY
          );
        }

        return;
      }

      /*
       * Discrete mouse wheel = zoom.
       */
      if (Math.abs(deltaY) >= 0.15) {
        event.preventDefault();
        event.stopPropagation();

        const factor = Math.exp(
          -deltaY * 0.0019,
        );

        zoomTowardPoint(
          effectiveZoomRef.current
          * factor,
          event.clientX,
          event.clientY,
        );
      }
    };

    viewport.addEventListener(
      "wheel",
      handleWheel,
      {
        passive: false,
        capture: true,
      },
    );

    return () => {
      viewport.removeEventListener(
        "wheel",
        handleWheel,
        {
          capture: true,
        },
      );
    };
  }, [
    pinnedNodeId,
    tooltip,
  ]);

  /*
   * Touch canvas:
   *
   * 1 pointer -> pan
   * 2 pointers -> pinch zoom
   *
   * This also works with Chromium DevTools mobile touch emulation because it
   * uses Pointer Events rather than browser-specific touch events.
   */
  useEffect(() => {
    const viewport = (
      viewportRef.current
    );

    if (!viewport) {
      return undefined;
    }

    const distance = (
      left,
      right,
    ) => (
      Math.hypot(
        right.x - left.x,
        right.y - left.y,
      )
    );

    const midpoint = (
      left,
      right,
    ) => ({
      x: (
        left.x + right.x
      ) / 2,
      y: (
        left.y + right.y
      ) / 2,
    });

    const beginGesture = () => {
      const pointers = Array.from(
        touchPointersRef.current.values(),
      );

      if (pointers.length === 1) {
        const pointer = pointers[0];

        touchGestureRef.current = {
          mode: "pan",
          pointerId: pointer.id,
          x: pointer.x,
          y: pointer.y,
          scrollLeft:
            viewport.scrollLeft,
          scrollTop:
            viewport.scrollTop,
        };

        return;
      }

      if (pointers.length >= 2) {
        const left = pointers[0];
        const right = pointers[1];

        touchGestureRef.current = {
          mode: "pinch",
          distance: Math.max(
            1,
            distance(
              left,
              right,
            ),
          ),
          zoom:
            effectiveZoomRef.current,
          midpoint: midpoint(
            left,
            right,
          ),
        };

        prepareForZoom();
      }
    };

    const handlePointerDown = (
      event,
    ) => {
      if (
        event.pointerType !== "touch"
      ) {
        return;
      }

      touchPointersRef.current.set(
        event.pointerId,
        {
          id: event.pointerId,
          x: event.clientX,
          y: event.clientY,
        },
      );

      try {
        viewport.setPointerCapture(
          event.pointerId,
        );
      } catch {
        // Pointer capture can be unavailable in some emulation modes.
      }

      beginGesture();
    };

    const handlePointerMove = (
      event,
    ) => {
      if (
        event.pointerType !== "touch"
        || !touchPointersRef.current.has(
          event.pointerId,
        )
      ) {
        return;
      }

      event.preventDefault();

      touchPointersRef.current.set(
        event.pointerId,
        {
          id: event.pointerId,
          x: event.clientX,
          y: event.clientY,
        },
      );

      const pointers = Array.from(
        touchPointersRef.current.values(),
      );

      if (
        pointers.length >= 2
      ) {
        const left = pointers[0];
        const right = pointers[1];

        if (
          touchGestureRef.current?.mode
          !== "pinch"
        ) {
          beginGesture();
        }

        const gesture = (
          touchGestureRef.current
        );

        if (
          !gesture
          || gesture.mode !== "pinch"
        ) {
          return;
        }

        const currentDistance = Math.max(
          1,
          distance(
            left,
            right,
          ),
        );

        const currentMidpoint = midpoint(
          left,
          right,
        );

        const nextZoom = clampZoom(
          gesture.zoom
          * (
            currentDistance
            / gesture.distance
          ),
        );

        const previousZoom = (
          effectiveZoomRef.current
        );

        if (
          Math.abs(
            nextZoom
            - previousZoom
          ) >= 0.001
        ) {
          const rect = (
            viewport.getBoundingClientRect()
          );

          const localX = (
            currentMidpoint.x
            - rect.left
          );

          const localY = (
            currentMidpoint.y
            - rect.top
          );

          const contentX = (
            viewport.scrollLeft
            + localX
          );

          const contentY = (
            viewport.scrollTop
            + localY
          );

          const ratio = (
            nextZoom
            / previousZoom
          );

          effectiveZoomRef.current = (
            nextZoom
          );

          setZoomMode(
            "manual",
          );

          setManualZoom(
            nextZoom,
          );

          window.requestAnimationFrame(
            () => {
              viewport.scrollLeft = Math.max(
                0,
                (
                  contentX * ratio
                  - localX
                ),
              );

              viewport.scrollTop = Math.max(
                0,
                (
                  contentY * ratio
                  - localY
                ),
              );
            },
          );
        }

        return;
      }

      if (
        pointers.length === 1
      ) {
        const pointer = pointers[0];

        if (
          touchGestureRef.current?.mode
          !== "pan"
          || touchGestureRef.current
            .pointerId !== pointer.id
        ) {
          beginGesture();
        }

        const gesture = (
          touchGestureRef.current
        );

        if (
          !gesture
          || gesture.mode !== "pan"
        ) {
          return;
        }

        cancelPanAnimation();

        viewport.scrollLeft = (
          gesture.scrollLeft
          - (
            pointer.x
            - gesture.x
          )
        );

        viewport.scrollTop = (
          gesture.scrollTop
          - (
            pointer.y
            - gesture.y
          )
        );
      }
    };

    const finishPointer = (
      event,
    ) => {
      if (
        event.pointerType !== "touch"
      ) {
        return;
      }

      touchPointersRef.current.delete(
        event.pointerId,
      );

      if (
        touchPointersRef.current.size
        === 0
      ) {
        touchGestureRef.current = null;
      } else {
        beginGesture();
      }
    };

    viewport.addEventListener(
      "pointerdown",
      handlePointerDown,
      {
        passive: true,
      },
    );

    viewport.addEventListener(
      "pointermove",
      handlePointerMove,
      {
        passive: false,
      },
    );

    viewport.addEventListener(
      "pointerup",
      finishPointer,
      {
        passive: true,
      },
    );

    viewport.addEventListener(
      "pointercancel",
      finishPointer,
      {
        passive: true,
      },
    );

    return () => {
      viewport.removeEventListener(
        "pointerdown",
        handlePointerDown,
      );

      viewport.removeEventListener(
        "pointermove",
        handlePointerMove,
      );

      viewport.removeEventListener(
        "pointerup",
        finishPointer,
      );

      viewport.removeEventListener(
        "pointercancel",
        finishPointer,
      );

      touchPointersRef.current.clear();
      touchGestureRef.current = null;
    };
  }, [
    pinnedNodeId,
    tooltip,
  ]);

  useEffect(
    () => () => {
      clearTooltipTimers();
      cancelPanAnimation();

      if (zoomFrameRef.current !== null) {
        window.cancelAnimationFrame(
          zoomFrameRef.current,
        );
      }
    },
    [],
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

  return (
    <div className="DfctAdminAI-dagWorkspace">
      <div className="DfctAdminAI-dagToolbar">
        <div
          className="DfctAdminAI-dagZoom"
          role="group"
          aria-label={t(
            "adminAI.execution.dagZoomControls",
          )}
        >
          <button
            type="button"
            aria-label={t(
              "adminAI.execution.dagZoomOut",
            )}
            title={t(
              "adminAI.execution.dagZoomOut",
            )}
            onClick={() => {
              prepareForZoom();

              setManualZoomValue(
                effectiveZoomRef.current
                / 1.2,
              );
            }}
          >
            −
          </button>

          <span
            className="DfctAdminAI-dagZoomValue"
            aria-live="polite"
          >
            {zoomPercent}%
          </span>

          <button
            type="button"
            aria-label={t(
              "adminAI.execution.dagZoomIn",
            )}
            title={t(
              "adminAI.execution.dagZoomIn",
            )}
            onClick={() => {
              prepareForZoom();

              setManualZoomValue(
                effectiveZoomRef.current
                * 1.2,
              );
            }}
          >
            +
          </button>

          <button
            type="button"
            className={
              zoomMode === "fit"
                ? "is-active"
                : ""
            }
            onClick={() => {
              prepareForZoom();

              effectiveZoomRef.current = (
                fitScale
              );

              setZoomMode(
                "fit",
              );

              window.requestAnimationFrame(
                () => {
                  window.requestAnimationFrame(
                    () => {
                      centerFirstStep(
                        true,
                      );
                    },
                  );
                },
              );
            }}
          >
            {t(
              "adminAI.execution.dagFit",
            )}
          </button>

          <button
            type="button"
            aria-label={t(
              "adminAI.execution.dagResetHelp",
            )}
            title={t(
              "adminAI.execution.dagResetHelp",
            )}
            onClick={() => {
              prepareForZoom();

              effectiveZoomRef.current = 0.8;

              setZoomMode(
                "manual",
              );

              setManualZoom(
                0.8,
              );

              window.requestAnimationFrame(
                () => {
                  window.requestAnimationFrame(
                    () => {
                      centerFirstStep(
                        true,
                      );
                    },
                  );
                },
              );
            }}
          >
            {t(
              "adminAI.execution.dagReset",
            )}
          </button>
        </div>
      </div>

      <div
        ref={viewportRef}
        className="DfctAdminAI-dagScroll DfctAdminAI-dagViewport"
      >
        <div
          className="DfctAdminAI-dagStage"
          style={{
            minWidth: `${
              Math.max(
                0,
                viewportSize.width - 2,
              )
            }px`,
            minHeight: `${
              Math.max(
                0,
                viewportSize.height - 2,
              )
            }px`,
          }}
        >
          <svg
            ref={svgRef}
            className="DfctAdminAI-dag"
            viewBox={`0 0 ${width} ${height}`}
            style={{
              width: `${renderedWidth}px`,
              height: `${renderedHeight}px`,
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
                    + nodeWidth / 2
                  );

                  const y1 = (
                    source.y
                    + nodeHeight
                  );

                  const x2 = (
                    target.x
                    + nodeWidth / 2
                  );

                  const y2 = target.y;

                  const middle = (
                    y1
                    + (y2 - y1) / 2
                  );

                  return (
                    <path
                      key={`${edge.sourceNodeId}-${edge.targetNodeId}-${index}`}
                      d={[
                        `M ${x1} ${y1}`,
                        `C ${x1} ${middle}`,
                        `${x2} ${middle}`,
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
                  const position = (
                    positions.get(
                      node.nodeId,
                    )
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
                      data-dag-node-id={
                        node.nodeId
                      }
                      onMouseEnter={(event) => {
                        showTransientTooltip(
                          event,
                          node,
                        );
                      }}
                      onMouseMove={(event) => {
                        showTransientTooltip(
                          event,
                          node,
                        );
                      }}
                      onMouseLeave={
                        hideTransientTooltip
                      }
                      onFocus={(event) => {
                        showTransientTooltip(
                          event,
                          node,
                        );
                      }}
                      onBlur={
                        hideTransientTooltip
                      }
                      onClick={(event) => {
                        activateNode(
                          event,
                          node,
                        );
                      }}
                      onKeyDown={(event) => {
                        if (
                          event.key === "Enter"
                          || event.key === " "
                        ) {
                          event.preventDefault();

                          activateNode(
                            event,
                            node,
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

        {tooltip?.node ? (
          <div
            className={[
              "DfctAdminAI-dagNodeTooltip",
              tooltip.pinned
                ? "is-pinned"
                : "",
              tooltip.fading
                ? "is-fading"
                : "",
            ].join(" ")}
            style={{
              left: `${tooltip.left}px`,
              top: `${tooltip.top}px`,
              width: `${tooltip.width || 300}px`,
            }}
            role="tooltip"
          >
            <div className="DfctAdminAI-dagNodeTooltipHeader">
              <div>
                <span>
                  {tooltip.node.kind || "—"}
                </span>

                <strong>
                  {tooltip.node.label
                    || tooltip.node.operation
                    || tooltip.node.kind
                    || "—"}
                </strong>
              </div>

              <div className="DfctAdminAI-dagNodeTooltipActions">
                <Badge
                  bg={
                    tooltip.node.status === "succeeded"
                      ? "success"
                      : tooltip.node.status === "failed"
                        ? "danger"
                        : tooltip.node.status === "partial"
                          ? "warning"
                          : "secondary"
                  }
                >
                  {tooltip.node.status || "—"}
                </Badge>

                {tooltip.pinned ? (
                  <button
                    type="button"
                    className="DfctAdminAI-dagNodeTooltipClose"
                    aria-label={t(
                      "adminAI.execution.closeInspector",
                    )}
                    title={t(
                      "adminAI.execution.closeInspector",
                    )}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();

                      removePinnedTooltip({
                        fade: true,
                      });
                    }}
                  >
                    ×
                  </button>
                ) : null}
              </div>
            </div>

            <div className="DfctAdminAI-dagNodeTooltipGrid">
              <div>
                <span>
                  {t(
                    "adminAI.execution.fields.provider",
                  )}
                </span>
                <strong>
                  {tooltip.node.provider || "—"}
                </strong>
              </div>

              <div>
                <span>
                  {t(
                    "adminAI.execution.fields.model",
                  )}
                </span>
                <strong>
                  {tooltip.node.model || "—"}
                </strong>
              </div>

              <div>
                <span>
                  {t(
                    "adminAI.execution.fields.operation",
                  )}
                </span>
                <strong>
                  {tooltip.node.operation || "—"}
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
                    tooltip.node.durationMs,
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
                    tooltip.node.startOffsetMs,
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
                    tooltip.node.resolvedCostUsd,
                    {
                      maximumFractionDigits: 8,
                    },
                  )}
                </strong>
              </div>
            </div>
          </div>
        ) : null}
      </div>
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
  onClose,
  t,
}) {
  if (!node) {
    return null;
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

  const facts = [
    [
      t(
        "adminAI.execution.fields.provider",
      ),
      node.provider || "—",
    ],
    [
      t(
        "adminAI.execution.fields.model",
      ),
      node.model || "—",
    ],
    [
      t(
        "adminAI.execution.fields.role",
      ),
      node.roleKey || "—",
    ],
    [
      t(
        "adminAI.execution.fields.operation",
      ),
      node.operation || "—",
    ],
    [
      t(
        "adminAI.execution.fields.duration",
      ),
      formatDuration(
        node.durationMs,
      ),
    ],
    [
      t(
        "adminAI.execution.fields.offset",
      ),
      formatOffset(
        node.startOffsetMs,
      ),
    ],
    [
      t(
        "adminAI.execution.fields.cost",
      ),
      formatCurrency(
        node.resolvedCostUsd,
        {
          maximumFractionDigits: 8,
        },
      ),
    ],
    [
      t(
        "adminAI.execution.fields.costProvenance",
      ),
      node.costProvenance || "—",
    ],
  ];

  return (
    <aside className="DfctAdminAI-nodeInspector DfctAdminAI-nodeInspector--compact">
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

        <div className="DfctAdminAI-nodeInspectorActions">
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

          <button
            type="button"
            className="DfctAdminAI-nodeInspectorClose"
            aria-label={t(
              "adminAI.execution.closeInspector",
            )}
            onClick={onClose}
          >
            ×
          </button>
        </div>
      </div>

      <div className="DfctAdminAI-inspectorGrid">
        {facts.map(
          ([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ),
        )}
      </div>

      {refs.length ? (
        <details className="DfctAdminAI-nodeRefs">
          <summary>
            {t(
              "adminAI.execution.references",
            )}
            {" · "}
            {refs.length}
          </summary>

          <div className="DfctAdminAI-nodeRefsBody">
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
        </details>
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

  const [selectedNodeId, setSelectedNodeId] = useState("");

  useEffect(() => {
    if (
      selectedNodeId
      && !nodes.some(
        (node) => (
          node.nodeId
          === selectedNodeId
        ),
      )
    ) {
      setSelectedNodeId("");
    }
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

      <div className="DfctAdminAI-visualCard DfctAdminAI-dagCard">
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

          <span className="DfctAdminAI-dagHint">
            {t(
              "adminAI.execution.dagInteractionHint",
            )}
          </span>
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

        <div className="DfctAdminAI-mobileNodeInspector">
          <NodeInspector
            node={selectedNode}
            onClose={() => {
              setSelectedNodeId("");
            }}
            t={t}
          />
        </div>
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
                    {benchmarkProfileReference(
                      run.analysisProfile,
                    )
                      ? ` · ${benchmarkProfileReference(
                          run.analysisProfile,
                        )}`
                      : ""}
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


function benchmarkAssertionLabel(
  assertionKey,
  t,
) {
  const key = String(
    assertionKey || "",
  ).trim();

  if (!key) {
    return "—";
  }

  const fallbackWords = key
    .split("_")
    .filter(Boolean)
    .join(" ");

  const fallback = fallbackWords
    ? (
        fallbackWords
          .charAt(0)
          .toUpperCase()
        + fallbackWords.slice(1)
      )
    : key;

  return t(
    `adminAI.benchmarks.assertions.${key}`,
    {
      defaultValue: fallback,
    },
  );
}


export function BenchmarkDetail({
  detail,
  loading,
  refreshing = false,
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

  const runStatus = String(
    summary.outcome
    || benchmark.outcome
    || summary.status
    || benchmark.status
    || "",
  ).toLowerCase();

  const terminal = Boolean(
    [
      "succeeded",
      "failed",
    ].includes(
      String(
        summary.status
        || benchmark.status
        || "",
      ).toLowerCase(),
    )
    || [
      "passed",
      "failed",
      "incomplete",
    ].includes(
      String(
        summary.outcome
        || benchmark.outcome
        || "",
      ).toLowerCase(),
    )
  );

  const gatePassed = Boolean(
    terminal
    && summary.score?.gatePassed
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
            {!terminal
              ? benchmarkStateLabel(
                  runStatus || "running",
                  t,
                )
              : gatePassed
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
            terminal
              ? (
                  gatePassed
                    ? "success"
                    : "danger"
                )
              : benchmarkStateTone(
                  runStatus || "running",
                )
          }
          className="DfctAdminAI-hardGateBadge"
        >
          {!terminal && refreshing ? (
            <>
              <Spinner
                animation="border"
                size="sm"
              />
              {" "}
            </>
          ) : null}

          {terminal
            ? benchmarkScoreLabel(
                summary,
              )
            : benchmarkStateLabel(
                runStatus || "running",
                t,
              )}
        </Badge>
      </div>

      <BenchmarkLifecycleTimeline
        durableRun
        terminal={terminal}
        t={t}
      />

      <div className="DfctAdminAI-metricGrid DfctAdminAI-benchmarkMetricGrid">
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
                {benchmarkAssertionLabel(
                  assertion.assertionKey,
                  t,
                )}
              </span>

              <strong>
                {benchmarkStateLabel(
                  assertion.status,
                  t,
                )}
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



function localizedCatalogText(
  value,
  language,
) {
  if (
    typeof value === "string"
  ) {
    return value;
  }

  if (
    !value
    || typeof value !== "object"
  ) {
    return "";
  }

  const normalized = String(
    language || "en",
  ).toLowerCase();

  if (
    normalized.startsWith("pt")
  ) {
    return (
      value["pt-BR"]
      || value.pt
      || value.en
      || Object.values(value)[0]
      || ""
    );
  }

  return (
    value.en
    || value["pt-BR"]
    || Object.values(value)[0]
    || ""
  );
}


function benchmarkProfileReference(
  value,
) {
  if (!value) return "";

  if (
    typeof value === "string"
  ) {
    return value;
  }

  if (value.reference) {
    return String(
      value.reference,
    );
  }

  if (
    value.key
    && value.version !== undefined
    && value.version !== null
  ) {
    return (
      `${value.key}@${value.version}`
    );
  }

  return "";
}


function benchmarkStateTone(
  value,
) {
  const state = String(
    value || "",
  ).toLowerCase();

  if (
    state === "passed"
    || state === "succeeded"
  ) {
    return "success";
  }

  if (
    state === "failed"
  ) {
    return "danger";
  }

  if (
    state === "running"
  ) {
    return "primary";
  }

  if (
    state === "queued"
    || state === "incomplete"
  ) {
    return "warning";
  }

  return "secondary";
}


function benchmarkStateLabel(
  value,
  t,
) {
  const state = String(
    value || "",
  ).toLowerCase();

  if (!state) {
    return "—";
  }

  return t(
    `adminAI.benchmarks.states.${state}`,
    {
      defaultValue: state,
    },
  );
}


function BenchmarkLifecycleTimeline({
  durableRun = false,
  terminal = false,
  t,
}) {
  return (
    <div className="DfctAdminAI-runProgress">
      <div className="is-complete">
        <span>1</span>
        <strong>
          {t(
            "adminAI.benchmarks.active.accepted",
          )}
        </strong>
      </div>

      <div
        className={
          durableRun
            ? "is-complete"
            : "is-current"
        }
      >
        <span>2</span>
        <strong>
          {durableRun
            ? t(
                "adminAI.benchmarks.active.persisted",
              )
            : t(
                "adminAI.benchmarks.active.awaitingRun",
              )}
        </strong>
      </div>

      <div
        className={
          terminal
            ? "is-complete"
            : durableRun
              ? "is-current"
              : ""
        }
      >
        <span>3</span>
        <strong>
          {terminal
            ? t(
                "adminAI.benchmarks.active.resultReady",
              )
            : t(
                "adminAI.benchmarks.active.executing",
              )}
        </strong>
      </div>
    </div>
  );
}


function profileStatusTone(
  status,
) {
  if (status === "validated") {
    return "success";
  }

  if (status === "candidate") {
    return "info";
  }

  return "secondary";
}


function BenchmarkOperations({
  adminAi,
  onInspect,
  t,
}) {
  const catalog = (
    adminAi.benchmarkCatalog
    || {}
  );

  const benchmarks = asArray(
    catalog.benchmarks,
  );

  const profiles = asArray(
    catalog.analysisProfiles,
  );

  const [benchmarkKey, setBenchmarkKey] = useState("");
  const [benchmarkVersion, setBenchmarkVersion] = useState("");
  const [profileReference, setProfileReference] = useState("");
  const [showCandidateProfiles, setShowCandidateProfiles] = useState(false);
  const [preflightSignature, setPreflightSignature] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [paidRunConfirmed, setPaidRunConfirmed] = useState(false);

  const language = (
    t?.i18n?.resolvedLanguage
    || t?.i18n?.language
    || (
      typeof document !== "undefined"
        ? document.documentElement.lang
        : "en"
    )
    || "en"
  );

  useEffect(() => {
    if (
      !adminAi.benchmarkCatalog
      && !adminAi.actionLoading
    ) {
      void adminAi.loadBenchmarkCatalog();
    }
  }, [
    adminAi.actionLoading,
    adminAi.benchmarkCatalog,
    adminAi.loadBenchmarkCatalog,
  ]);

  const selectedBenchmark = useMemo(
    () => (
      benchmarks.find(
        (item) => (
          item.key === benchmarkKey
        ),
      )
      || null
    ),
    [
      benchmarkKey,
      benchmarks,
    ],
  );

  const versionOptions = asArray(
    selectedBenchmark?.versions,
  );

  const selectedVersion = (
    versionOptions.find(
      (item) => (
        String(
          item.version,
        )
        === String(
          benchmarkVersion,
        )
      ),
    )
    || null
  );

  const validatedProfiles = useMemo(
    () => (
      profiles.filter(
        (profile) => (
          profile.status === "validated"
        ),
      )
    ),
    [
      profiles,
    ],
  );

  const candidateProfiles = useMemo(
    () => (
      profiles
        .filter(
          (profile) => (
            profile.status !== "validated"
          ),
        )
        .sort(
          (left, right) => {
            const keyCompare = String(
              left.key || "",
            ).localeCompare(
              String(
                right.key || "",
              ),
            );

            if (keyCompare !== 0) {
              return keyCompare;
            }

            return (
              Number(
                right.version || 0,
              )
              - Number(
                left.version || 0,
              )
            );
          },
        )
    ),
    [
      profiles,
    ],
  );

  const visibleProfiles = useMemo(
    () => (
      showCandidateProfiles
        ? [
            ...validatedProfiles,
            ...candidateProfiles,
          ]
        : validatedProfiles
    ),
    [
      candidateProfiles,
      showCandidateProfiles,
      validatedProfiles,
    ],
  );

  const selectedProfile = useMemo(
    () => (
      profiles.find(
        (profile) => (
          profile.reference
          === profileReference
        ),
      )
      || null
    ),
    [
      profileReference,
      profiles,
    ],
  );

  useEffect(() => {
    if (!benchmarks.length) {
      return;
    }

    if (
      !benchmarkKey
      || !benchmarks.some(
        (item) => (
          item.key === benchmarkKey
        ),
      )
    ) {
      setBenchmarkKey(
        benchmarks[0].key,
      );
    }
  }, [
    benchmarkKey,
    benchmarks,
  ]);

  useEffect(() => {
    if (!selectedBenchmark) {
      return;
    }

    const available = asArray(
      selectedBenchmark.versions,
    ).map(
      (item) => String(
        item.version,
      ),
    );

    const preferred = String(
      selectedBenchmark.defaultVersion
      || available[0]
      || "",
    );

    if (
      !benchmarkVersion
      || !available.includes(
        String(
          benchmarkVersion,
        ),
      )
    ) {
      setBenchmarkVersion(
        preferred,
      );
      setPreflightSignature("");
    }
  }, [
    benchmarkVersion,
    selectedBenchmark,
  ]);

  useEffect(() => {
    if (!profiles.length) {
      return;
    }

    if (
      profileReference
      && profiles.some(
        (profile) => (
          profile.reference
          === profileReference
        ),
      )
    ) {
      return;
    }

    const recommended = (
      selectedBenchmark
        ?.recommendedAnalysisProfile
    );

    const preferred = (
      visibleProfiles.find(
        (profile) => (
          profile.reference
          === recommended
        ),
      )
      || validatedProfiles[0]
      || visibleProfiles[0]
      || null
    );

    setProfileReference(
      preferred?.reference
      || "",
    );
    setPreflightSignature("");
  }, [
    profileReference,
    profiles,
    selectedBenchmark,
    validatedProfiles,
    visibleProfiles,
  ]);

  const selectionSignature = [
    benchmarkKey,
    benchmarkVersion,
    profileReference,
  ].join(":");

  const preflightReady = Boolean(
    adminAi.benchmarkPreflight
    && preflightSignature
    === selectionSignature
  );

  const preflight = preflightReady
    ? adminAi.benchmarkPreflight
    : null;

  const preflightProfile = (
    preflight?.analysisProfile
    || preflight?.profile
    || preflight?.profileSnapshot
    || preflight?.analysisProfileSnapshot
    || {}
  );

  const preflightRoles = Object.entries(
    preflightProfile.roles
    || {},
  );

  const safety = (
    catalog.safety
    || {}
  );

  const launch = (
    adminAi.benchmarkLaunch
    || null
  );

  const activeRun = (
    adminAi.activeBenchmarkRun
    || null
  );

  const launchTaskId = (
    launch?.celeryTaskId
    || launch?.taskId
    || activeRun?.celeryTaskId
    || ""
  );

  const activeStatus = (
    activeRun?.outcome
    || activeRun?.status
    || launch?.status
    || (
      launchTaskId
        ? "queued"
        : ""
    )
  );

  const activeTerminal = Boolean(
    activeRun
    && (
      [
        "succeeded",
        "failed",
      ].includes(
        String(
          activeRun.status
          || "",
        ).toLowerCase(),
      )
      || [
        "passed",
        "failed",
        "incomplete",
      ].includes(
        String(
          activeRun.outcome
          || "",
        ).toLowerCase(),
      )
    ),
  );

  const runPayload = {
    benchmarkKey,
    benchmarkVersion,
    analysisProfile:
      profileReference,
  };

  const runPreflight = async () => {
    const result = (
      await adminAi.preflightBenchmark(
        runPayload,
      )
    );

    if (result) {
      setPreflightSignature(
        selectionSignature,
      );
    }
  };

  const launchPaidRun = async () => {
    if (!paidRunConfirmed) {
      return;
    }

    const result = (
      await adminAi.launchBenchmark({
        ...runPayload,
        confirmPaidRun: true,
      })
    );

    if (result) {
      setConfirmOpen(false);
      setPaidRunConfirmed(false);
    }
  };

  const selectionReady = Boolean(
    selectedBenchmark
    && selectedVersion
    && selectedProfile
  );

  return (
    <section className="DfctAdmin-section DfctAdminAI-benchmarkOps">
      <div className="DfctAdminAI-benchmarkOpsHeader">
        <div className="DfctAdmin-sectionHeader">
          <span className="DfctAdmin-eyebrow">
            {t(
              "adminAI.benchmarks.operations.eyebrow",
            )}
          </span>

          <h2>
            {t(
              "adminAI.benchmarks.operations.title",
            )}
          </h2>

          <p>
            {t(
              "adminAI.benchmarks.operations.subtitle",
            )}
          </p>
        </div>

        <div className="DfctAdminAI-benchmarkLiveStatus">
          {adminAi.benchmarkActiveRefreshing ? (
            <Spinner
              animation="border"
              size="sm"
            />
          ) : (
            <span className="DfctAdminAI-liveDot" />
          )}

          <span>
            {launchTaskId && !activeTerminal
              ? t(
                  "adminAI.benchmarks.operations.liveRefresh",
                )
              : t(
                  "adminAI.benchmarks.operations.idleRefresh",
                )}
          </span>
        </div>
      </div>

      {!benchmarks.length ? (
        <div className="DfctAdminAI-loading">
          <Spinner
            animation="border"
            size="sm"
          />
          <span>
            {t(
              "adminAI.benchmarks.operations.loadingCatalog",
            )}
          </span>
        </div>
      ) : (
        <>
          <div className="DfctAdminAI-benchmarkConfigGrid">
            <Form.Group>
              <Form.Label>
                {t(
                  "adminAI.benchmarks.operations.benchmark",
                )}
              </Form.Label>

              <Form.Select
                value={benchmarkKey}
                onChange={(event) => {
                  setBenchmarkKey(
                    event.target.value,
                  );
                  setBenchmarkVersion("");
                  setPreflightSignature("");
                }}
              >
                {benchmarks.map(
                  (benchmark) => (
                    <option
                      key={benchmark.key}
                      value={benchmark.key}
                    >
                      {benchmark.title
                        || benchmark.key}
                    </option>
                  ),
                )}
              </Form.Select>
            </Form.Group>

            <Form.Group>
              <Form.Label>
                {t(
                  "adminAI.benchmarks.operations.version",
                )}
              </Form.Label>

              <Form.Select
                value={benchmarkVersion}
                onChange={(event) => {
                  setBenchmarkVersion(
                    event.target.value,
                  );
                  setPreflightSignature("");
                }}
              >
                {versionOptions.map(
                  (version) => (
                    <option
                      key={version.version}
                      value={version.version}
                    >
                      v{version.version}
                      {version.isDefault
                        ? ` · ${t(
                            "adminAI.benchmarks.operations.defaultVersion",
                          )}`
                        : ""}
                    </option>
                  ),
                )}
              </Form.Select>
            </Form.Group>

            <Form.Group>
              <Form.Label>
                {t(
                  "adminAI.benchmarks.operations.profile",
                )}
              </Form.Label>

              <Form.Select
                value={profileReference}
                onChange={(event) => {
                  setProfileReference(
                    event.target.value,
                  );
                  setPreflightSignature("");
                }}
              >
                {visibleProfiles.map(
                  (profile) => (
                    <option
                      key={profile.reference}
                      value={profile.reference}
                    >
                      {profile.reference}
                      {" · "}
                      {t(
                        `adminAI.benchmarks.profileStatus.${profile.status}`,
                        {
                          defaultValue:
                            profile.status
                            || "—",
                        },
                      )}
                    </option>
                  ),
                )}
              </Form.Select>

              <Form.Check
                className="DfctAdminAI-candidateProfileToggle"
                type="switch"
                id="admin-ai-show-candidate-profiles"
                checked={showCandidateProfiles}
                label={t(
                  "adminAI.benchmarks.operations.showCandidateProfiles",
                )}
                onChange={(event) => {
                  const next = event.target.checked;

                  setShowCandidateProfiles(
                    next,
                  );

                  if (
                    !next
                    && selectedProfile?.status
                    !== "validated"
                  ) {
                    setProfileReference(
                      validatedProfiles[0]
                        ?.reference
                      || "",
                    );
                    setPreflightSignature("");
                  }
                }}
              />
            </Form.Group>
          </div>

          <div className="DfctAdminAI-benchmarkSelection">
            <div className="DfctAdminAI-benchmarkSelectionMain">
            <div className="DfctAdminAI-benchmarkIdentity">
              <div className="DfctAdminAI-benchmarkPreview">
                <img
                  src={
                    selectedBenchmark?.preview?.dataUrl
                    || "/placeholder.png"
                  }
                  alt=""
                  aria-hidden="true"
                />
              </div>

              <div className="DfctAdminAI-benchmarkIdentityCopy">
              <div className="DfctAdminAI-benchmarkSelectionTitle">
                <strong>
                  {selectedBenchmark?.title
                    || benchmarkKey}
                </strong>

                {selectedVersion ? (
                  <Badge bg="secondary">
                    v{selectedVersion.version}
                  </Badge>
                ) : null}

                {selectedProfile ? (
                  <Badge
                    bg={profileStatusTone(
                      selectedProfile.status,
                    )}
                  >
                    {t(
                      `adminAI.benchmarks.profileStatus.${selectedProfile.status}`,
                      {
                        defaultValue:
                          selectedProfile.status
                          || "—",
                      },
                    )}
                  </Badge>
                ) : null}
              </div>

              <p>
                {selectedVersion?.description
                  || selectedBenchmark?.description
                  || ""}
              </p>

              {selectedProfile ? (
                <small>
                  {localizedCatalogText(
                    selectedProfile.description,
                    language,
                  )}
                </small>
              ) : null}
            </div>

                </div>
            </div>

          <div className="DfctAdminAI-benchmarkSelectionFacts">
              <span>
                <small>
                  {t(
                    "adminAI.benchmarks.operations.assertions",
                  )}
                </small>
                <strong>
                  {selectedVersion?.assertionCount
                    ?? "—"}
                </strong>
              </span>

              <span>
                <small>
                  {t(
                    "adminAI.benchmarks.operations.input",
                  )}
                </small>
                <strong>
                  {selectedVersion?.inputKind
                    || "—"}
                </strong>
              </span>

              <span>
                <small>
                  {t(
                    "adminAI.benchmarks.operations.serviceLevel",
                  )}
                </small>
                <strong>
                  {selectedVersion?.serviceLevel
                    || "—"}
                </strong>
              </span>

              <span>
                <small>
                  {t(
                    "adminAI.benchmarks.operations.profileHash",
                  )}
                </small>
                <strong
                  className="is-mono"
                  title={
                    selectedProfile
                      ?.definitionSha256
                    || ""
                  }
                >
                  {selectedProfile
                    ?.definitionSha256
                    ? truncated(
                        selectedProfile
                          .definitionSha256,
                        15,
                      )
                    : "—"}
                </strong>
              </span>
            </div>
          </div>

          <div className="DfctAdminAI-preflightPanel">
            <div className="DfctAdminAI-preflightHeader">
              <div>
                <span className="DfctAdmin-eyebrow">
                  {t(
                    "adminAI.benchmarks.preflight.eyebrow",
                  )}
                </span>

                <strong>
                  {t(
                    "adminAI.benchmarks.preflight.title",
                  )}
                </strong>

                <p>
                  {t(
                    "adminAI.benchmarks.preflight.subtitle",
                  )}
                </p>
              </div>

              <div className="DfctAdminAI-safetyBadges">
                <Badge bg="success">
                  {t(
                    "adminAI.benchmarks.preflight.noProviders",
                  )}
                </Badge>

                <Badge bg="success">
                  {t(
                    "adminAI.benchmarks.preflight.noCredentials",
                  )}
                </Badge>

                <Badge bg="success">
                  {t(
                    "adminAI.benchmarks.preflight.noWrites",
                  )}
                </Badge>
              </div>
            </div>

            {preflightReady ? (
              <Alert
                variant="success"
                className="DfctAdminAI-preflightResult"
              >
                <div>
                  <strong>
                    {t(
                      "adminAI.benchmarks.preflight.ready",
                    )}
                  </strong>

                  <span>
                    {selectedProfile?.reference}
                    {" · "}
                    {selectedVersion?.assertionCount}
                    {" "}
                    {t(
                      "adminAI.benchmarks.preflight.assertionsSuffix",
                    )}
                  </span>
                </div>

                {preflightRoles.length ? (
                  <div className="DfctAdminAI-preflightRoles">
                    {preflightRoles.map(
                      ([roleKey, role]) => (
                        <span key={roleKey}>
                          <small>
                            {t(
                              `adminAI.roles.names.${roleKey}`,
                              {
                                defaultValue:
                                  roleKey,
                              },
                            )}
                          </small>

                          <strong>
                            {[
                              role?.providerKey,
                              role?.model,
                            ]
                              .filter(Boolean)
                              .join(" · ")
                              || t(
                                "adminAI.benchmarks.preflight.inherited",
                              )}
                          </strong>
                        </span>
                      ),
                    )}
                  </div>
                ) : null}
              </Alert>
            ) : (
              <div className="DfctAdminAI-preflightPending">
                <span>
                  {t(
                    "adminAI.benchmarks.preflight.pending",
                  )}
                </span>
              </div>
            )}

            <div className="DfctAdminAI-benchmarkActions">
              <Button
                variant="outline-primary"
                disabled={
                  !selectionReady
                  || Boolean(
                    adminAi.actionLoading,
                  )
                }
                onClick={runPreflight}
              >
                {adminAi.actionLoading
                  === "benchmark-preflight" ? (
                    <>
                      <Spinner
                        animation="border"
                        size="sm"
                      />
                      {" "}
                      {t(
                        "adminAI.benchmarks.preflight.running",
                      )}
                    </>
                  ) : (
                    t(
                      "adminAI.benchmarks.preflight.action",
                    )
                  )}
              </Button>

              <Button
                variant="primary"
                disabled={
                  !preflightReady
                  || Boolean(
                    adminAi.actionLoading,
                  )
                }
                onClick={() => {
                  setPaidRunConfirmed(false);
                  setConfirmOpen(true);
                }}
              >
                {t(
                  "adminAI.benchmarks.launch.action",
                )}
              </Button>
            </div>
          </div>

          {launchTaskId ? (
            <div
              className={[
                "DfctAdminAI-activeBenchmark",
                activeTerminal
                  ? "is-terminal"
                  : "is-active",
              ].join(" ")}
            >
              <div className="DfctAdminAI-activeBenchmarkHeader">
                <div>
                  <span className="DfctAdmin-eyebrow">
                    {t(
                      "adminAI.benchmarks.active.eyebrow",
                    )}
                  </span>

                  <h3>
                    {activeRun?.benchmarkKey
                      || launch?.benchmarkKey
                      || benchmarkKey}
                    {" · "}
                    v{activeRun?.benchmarkVersion
                      || launch?.benchmarkVersion
                      || benchmarkVersion}
                  </h3>

                  <p>
                    {benchmarkProfileReference(
                      activeRun?.analysisProfile,
                    )
                      || benchmarkProfileReference(
                        launch?.analysisProfile,
                      )
                      || profileReference}
                  </p>
                </div>

                <Badge
                  bg={benchmarkStateTone(
                    activeStatus,
                  )}
                  className="DfctAdminAI-activeBenchmarkBadge"
                >
                  {!activeTerminal
                  && adminAi.benchmarkActiveRefreshing ? (
                    <Spinner
                      animation="border"
                      size="sm"
                    />
                  ) : null}
                  {" "}
                  {benchmarkStateLabel(
                    activeStatus,
                    t,
                  )}
                </Badge>
              </div>

              <BenchmarkLifecycleTimeline
                durableRun={Boolean(activeRun)}
                terminal={activeTerminal}
                t={t}
              />

              <div className="DfctAdminAI-activeBenchmarkFacts">
                <span>
                  <small>
                    {t(
                      "adminAI.benchmarks.active.taskId",
                    )}
                  </small>
                  <strong className="is-mono">
                    {truncated(
                      launchTaskId,
                      24,
                    )}
                  </strong>
                </span>

                <span>
                  <small>
                    {t(
                      "adminAI.benchmarks.active.runId",
                    )}
                  </small>
                  <strong className="is-mono">
                    {activeRun?.benchmarkRunId
                      ? truncated(
                          activeRun
                            .benchmarkRunId,
                          24,
                        )
                      : t(
                          "adminAI.benchmarks.active.pending",
                        )}
                  </strong>
                </span>

                <span>
                  <small>
                    {t(
                      "adminAI.benchmarks.active.score",
                    )}
                  </small>
                  <strong>
                    {activeRun
                      ? benchmarkScoreLabel(
                          activeRun,
                        )
                      : "—"}
                  </strong>
                </span>

                <span>
                  <small>
                    {t(
                      "adminAI.benchmarks.active.cost",
                    )}
                  </small>
                  <strong>
                    {activeRun
                      ? formatCurrency(
                          knownCostValue(
                            activeRun.cost,
                          ),
                          {
                            maximumFractionDigits: 8,
                          },
                        )
                      : "—"}
                  </strong>
                </span>
              </div>

              <div className="DfctAdminAI-activeBenchmarkFooter">
                <span>
                  {activeTerminal
                    ? t(
                        "adminAI.benchmarks.active.autoRefreshComplete",
                      )
                    : t(
                        "adminAI.benchmarks.active.autoRefreshActive",
                      )}
                </span>

                {activeRun?.benchmarkRunId ? (
                  <Button
                    size="sm"
                    variant="outline-primary"
                    onClick={() => {
                      onInspect(
                        activeRun,
                      );
                    }}
                  >
                    {t(
                      "adminAI.benchmarks.active.inspect",
                    )}
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </>
      )}

      <Modal
        show={confirmOpen}
        onHide={() => {
          setConfirmOpen(false);
          setPaidRunConfirmed(false);
        }}
        centered
        className="DfctAdminAI-benchmarkConfirmModal"
      >
        <Modal.Header>
          <Modal.Title>
            {t(
              "adminAI.benchmarks.launch.confirmTitle",
            )}
          </Modal.Title>

          <button
            type="button"
            className="DfctAdminAI-modalClose"
            aria-label={t(
              "adminAI.benchmarks.launch.cancel",
            )}
            onClick={() => {
              setConfirmOpen(false);
              setPaidRunConfirmed(false);
            }}
          >
            ×
          </button>
        </Modal.Header>

        <Modal.Body>
          <p>
            {t(
              "adminAI.benchmarks.launch.confirmText",
              {
                benchmark:
                  selectedBenchmark?.title
                  || benchmarkKey,
                version:
                  benchmarkVersion,
                profile:
                  profileReference,
              },
            )}
          </p>

          <div className="DfctAdminAI-paidRunWarnings">
            <div>
              <strong>
                {t(
                  "adminAI.benchmarks.launch.realProviders",
                )}
              </strong>
              <span>
                {t(
                  "adminAI.benchmarks.launch.realProvidersHelp",
                )}
              </span>
            </div>

            <div>
              <strong>
                {t(
                  "adminAI.benchmarks.launch.billingBypassed",
                )}
              </strong>
              <span>
                {t(
                  "adminAI.benchmarks.launch.billingBypassedHelp",
                )}
              </span>
            </div>

            <div>
              <strong>
                {t(
                  "adminAI.benchmarks.launch.disposableTopic",
                )}
              </strong>
              <span>
                {t(
                  "adminAI.benchmarks.launch.disposableTopicHelp",
                )}
              </span>
            </div>
          </div>

          <Form.Check
            className="DfctAdminAI-paidRunConfirm"
            type="checkbox"
            id="benchmark-paid-run-confirm"
            checked={paidRunConfirmed}
            label={t(
              "adminAI.benchmarks.launch.confirmCheckbox",
            )}
            onChange={(event) => {
              setPaidRunConfirmed(
                event.target.checked,
              );
            }}
          />
        </Modal.Body>

        <Modal.Footer>
          <Button
            variant="outline-secondary"
            onClick={() => {
              setConfirmOpen(false);
              setPaidRunConfirmed(false);
            }}
          >
            {t(
              "adminAI.benchmarks.launch.cancel",
            )}
          </Button>

          <Button
            variant="danger"
            disabled={
              !paidRunConfirmed
              || adminAi.actionLoading
              === "benchmark-launch"
            }
            onClick={launchPaidRun}
          >
            {adminAi.actionLoading
            === "benchmark-launch" ? (
              <>
                <Spinner
                  animation="border"
                  size="sm"
                />
                {" "}
                {t(
                  "adminAI.benchmarks.launch.launching",
                )}
              </>
            ) : (
              t(
                "adminAI.benchmarks.launch.confirmAction",
              )
            )}
          </Button>
        </Modal.Footer>
      </Modal>
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
      <BenchmarkOperations
        adminAi={adminAi}
        onInspect={selectRun}
        t={t}
      />

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
