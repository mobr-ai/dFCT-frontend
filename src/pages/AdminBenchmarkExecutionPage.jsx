import React, {
  Suspense,
  useEffect,
} from "react";
import {
  Alert,
  Button,
  Spinner,
} from "react-bootstrap";
import {
  useNavigate,
  useOutletContext,
  useParams,
} from "react-router-dom";
import { useTranslation } from "react-i18next";

import {
  hasAdminClaim,
  useAdminAccess,
} from "../hooks/useAdminAccess";
import { useAdminAi } from "../hooks/useAdminAi";
import { useAutoRefresh } from "../hooks/useAutoRefresh";

import "../styles/admin/AdminConsole.css";


const BenchmarkDetail = React.lazy(
  () =>
    import(
      "../components/admin/AdminAiObservability"
    ).then(
      (module) => ({
        default: module.BenchmarkDetail,
      }),
    ),
);


export default function AdminBenchmarkExecutionPage() {
  const { t } = useTranslation();

  const navigate = useNavigate();

  const {
    benchmarkRunId,
  } = useParams();

  const outlet = useOutletContext() || {};

  const userData = (
    outlet.userData
    || outlet.user
    || outlet.session?.user
    || outlet.session
    || null
  );

  const showToast = outlet.showToast;

  const {
    isAdmin: roleBasedAdmin,
  } = useAdminAccess(userData);

  const isAdmin = Boolean(
    roleBasedAdmin
    || hasAdminClaim(userData),
  );

  const adminAi = useAdminAi(
    userData,
    showToast,
    t,
  );

  useEffect(() => {
    if (
      !isAdmin
      || !benchmarkRunId
    ) {
      return;
    }

    adminAi.loadBenchmarkDetail(
      benchmarkRunId,
    );
  }, [
    adminAi.loadBenchmarkDetail,
    benchmarkRunId,
    isAdmin,
  ]);

  const detailSummary = (
    adminAi.benchmarkDetail?.summary
    || {}
  );

  const detailBenchmark = (
    adminAi.benchmarkDetail?.benchmark
    || {}
  );

  const detailTerminal = Boolean(
    [
      "succeeded",
      "failed",
    ].includes(
      String(
        detailSummary.status
        || detailBenchmark.status
        || "",
      ).toLowerCase(),
    )
    || [
      "passed",
      "failed",
      "incomplete",
    ].includes(
      String(
        detailSummary.outcome
        || detailBenchmark.outcome
        || "",
      ).toLowerCase(),
    )
  );

  const detailRefresh = useAutoRefresh({
    enabled: Boolean(
      isAdmin
      && benchmarkRunId
      && adminAi.benchmarkDetail
      && !detailTerminal
    ),
    refresh: async () => {
      await adminAi.loadBenchmarkDetail(
        benchmarkRunId,
        {
          silent: true,
        },
      );
    },
    intervalMs: 5000,
    maxIntervalMs: 30000,
    refreshWhenHidden: false,
    runImmediately: false,
    jitterRatio: 0.04,
    onError: () => {},
  });

  if (!isAdmin) {
    return (
      <main className="DfctAdminConsole">
        <div className="DfctAdminConsole-inner DfctAdminShell">
          <Alert variant="danger">
            {t(
              "adminAI.accessDenied",
            )}
          </Alert>
        </div>
      </main>
    );
  }

  return (
    <main className="DfctAdminConsole">
      <div className="DfctAdminConsole-inner DfctAdminShell DfctAdminAI-benchmarkExecutionPage">
        <section className="DfctAdminConsole-hero DfctAdminAI-dedicatedBenchmarkHeader">
          <div>
            <span className="DfctAdminConsole-eyebrow">
              {t(
                "adminAI.benchmarks.executionPageEyebrow",
              )}
            </span>

            <h1>
              {t(
                "adminAI.benchmarks.executionPageTitle",
              )}
            </h1>

            <p>
              {t(
                "adminAI.benchmarks.executionPageSubtitle",
              )}
            </p>
          </div>

          <Button
            variant="outline-secondary"
            onClick={() => {
              navigate(
                "/admin?tab=ai&view=benchmarks",
              );
            }}
          >
            ←{" "}
            {t(
              "adminAI.benchmarks.backToBenchmarks",
            )}
          </Button>
        </section>

        {adminAi.error ? (
          <Alert variant="warning">
            {adminAi.error}
          </Alert>
        ) : null}

        <Suspense
          fallback={
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
          }
        >
          <BenchmarkDetail
            detail={adminAi.benchmarkDetail}
            loading={adminAi.detailLoading}
            refreshing={detailRefresh.isRefreshing}
            t={t}
          />
        </Suspense>
      </div>
    </main>
  );
}
