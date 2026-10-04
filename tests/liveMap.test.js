import { test, describe } from "node:test";
import assert from "node:assert";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
    LEGACY_FIXTURE_IDS,
    isDummyReport,
    cleanLegacyFixtures,
    processReports,
    fetchMapReports,
    MapStatusNotice,
} from "../src/utils/liveMapLogic.js";

// In-memory mock for localStorage
const createMockStorage = (initialState = {}) => {
    const store = { ...initialState };
    return {
        getItem: (key) => (Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null),
        setItem: (key, val) => {
            store[key] = String(val);
        },
        removeItem: (key) => {
            delete store[key];
        },
        clear: () => {
            Object.keys(store).forEach((k) => delete store[k]);
        },
        dump: () => ({ ...store }),
    };
};

describe("LiveMap Legacy Fixture Cleanup Logic", () => {
    test("LEGACY_FIXTURE_IDS contains only the exact legacy fixture IDs", () => {
        assert.deepStrictEqual(
            Array.from(LEGACY_FIXTURE_IDS).sort(),
            ["CMP-M1", "CMP-M2", "CMP-M3", "mock-1", "mock-2", "mock-3"].sort()
        );
    });

    test("isDummyReport returns true for exact legacy fixture IDs", () => {
        assert.strictEqual(isDummyReport({ id: "mock-1", complaint_id: "CMP-M1" }), true);
        assert.strictEqual(isDummyReport({ id: "mock-2", complaint_id: "CMP-M2" }), true);
        assert.strictEqual(isDummyReport({ id: "mock-3", complaint_id: "CMP-M3" }), true);
        assert.strictEqual(isDummyReport({ id: "mock-1" }), true);
        assert.strictEqual(isDummyReport({ complaint_id: "CMP-M2" }), true);
    });

    test("isDummyReport returns false for legitimate reports even with CMP-M prefix or matching location/issue", () => {
        // Must NOT match generic CMP-M prefix for real reports
        assert.strictEqual(
            isDummyReport({ id: "101", complaint_id: "CMP-M4" }),
            false,
            "CMP-M4 should not be identified as dummy"
        );
        assert.strictEqual(
            isDummyReport({ id: "102", complaint_id: "CMP-M999" }),
            false,
            "CMP-M999 should not be identified as dummy"
        );
        assert.strictEqual(
            isDummyReport({ id: "103", complaint_id: "CMP-M2026-001" }),
            false,
            "CMP-M2026-001 should not be identified as dummy"
        );

        // Must NOT remove reports based only on place, issueType, department
        assert.strictEqual(
            isDummyReport({
                id: "real-1",
                complaint_id: "CMP-8888",
                place: "Chennai Central",
                issueType: "Broken Road",
                department: "Roads Department",
            }),
            false,
            "Real report at Chennai Central should not be removed"
        );
        assert.strictEqual(
            isDummyReport({
                id: "real-2",
                complaint_id: "CMP-8889",
                place: "T Nagar",
                issueType: "Garbage Overflow",
                department: "Sanitation",
            }),
            false,
            "Real report at T Nagar should not be removed"
        );
        assert.strictEqual(
            isDummyReport({
                id: "real-3",
                complaint_id: "CMP-8890",
                place: "Adyar",
                issueType: "Streetlight Out",
                department: "Electrical",
            }),
            false,
            "Real report at Adyar should not be removed"
        );
    });

    test("cleanLegacyFixtures removes only legacy dummy reports and preserves real reports in storage", () => {
        const initialReports = [
            { id: "mock-1", complaint_id: "CMP-M1", issueType: "Broken Road" },
            { id: "real-1", complaint_id: "CMP-M4", issueType: "Broken Road", place: "Chennai Central" },
            { id: "mock-2", complaint_id: "CMP-M2", issueType: "Garbage Overflow" },
        ];
        const storage = createMockStorage({
            reports: JSON.stringify(initialReports),
            civicfix_issues: JSON.stringify(initialReports),
        });

        cleanLegacyFixtures(storage);

        const cleanedReports = JSON.parse(storage.getItem("reports"));
        assert.strictEqual(cleanedReports.length, 1);
        assert.strictEqual(cleanedReports[0].complaint_id, "CMP-M4");

        const cleanedIssues = JSON.parse(storage.getItem("civicfix_issues"));
        assert.strictEqual(cleanedIssues.length, 1);
        assert.strictEqual(cleanedIssues[0].complaint_id, "CMP-M4");
    });
});

describe("TEST A — EMPTY API RESPONSE", () => {
    test("when API succeeds with empty array, shows empty state with no fake markers and no dummy data written", async () => {
        const storage = createMockStorage();

        // Simulate API succeeding with empty list
        const fetchFn = async () => ({
            ok: true,
            status: 200,
            json: async () => ({ data: [] }),
        });

        const result = await fetchMapReports({
            apiBase: "http://example.com/api",
            fetchFn,
            storage,
        });

        // 1. No fake complaints returned
        assert.deepStrictEqual(result.reports, [], "Expected 0 reports");
        assert.strictEqual(result.apiError, null, "Expected no apiError on success");

        // 2. No dummy data written to localStorage
        assert.strictEqual(storage.getItem("reports"), null, "localStorage 'reports' must be empty");
        assert.strictEqual(storage.getItem("civicfix_issues"), null, "localStorage 'civicfix_issues' must be empty");

        // 3. Empty-state UI is shown
        const html = renderToStaticMarkup(
            React.createElement(MapStatusNotice, {
                loading: false,
                apiError: result.apiError,
                reportsCount: result.reports.length,
                onRetry: () => {},
            })
        );

        assert(
            html.includes('data-testid="map-empty-state"'),
            "UI must render empty state notice"
        );
        assert(
            html.includes("No complaints reported yet. The map is currently clear."),
            "UI must inform user that the map is clear"
        );
        assert(
            !html.includes('data-testid="map-error-state"'),
            "UI must NOT render error state notice on empty success"
        );
        assert(
            !html.includes('data-testid="map-loading-state"'),
            "UI must NOT render loading state when done"
        );
    });
});

describe("TEST B — API ERROR", () => {
    test("when API request fails and localStorage has no real reports, shows error state and NOT map clear", async () => {
        const storage = createMockStorage();

        // Simulate network failure
        const fetchFn = async () => {
            throw new Error("Network error: Failed to fetch");
        };

        const result = await fetchMapReports({
            apiBase: "http://example.com/api",
            fetchFn,
            storage,
        });

        // 1. Error state captured
        assert.strictEqual(
            result.apiError,
            "Failed to load complaints. Please try again.",
            "Expected friendly error message"
        );
        assert.strictEqual(result.reports.length, 0, "No fake complaints created on failure");

        // 2. No dummy data created or persisted
        assert.strictEqual(storage.getItem("reports"), null, "No fake complaints persisted in reports");
        assert.strictEqual(storage.getItem("civicfix_issues"), null, "No fake complaints persisted in civicfix_issues");

        // 3. UI shows error state and does NOT say map is clear
        let retryCalled = false;
        const onRetry = () => {
            retryCalled = true;
        };
        const html = renderToStaticMarkup(
            React.createElement(MapStatusNotice, {
                loading: false,
                apiError: result.apiError,
                reportsCount: result.reports.length,
                onRetry,
            })
        );
        onRetry();
        assert.strictEqual(retryCalled, true);

        assert(
            html.includes('data-testid="map-error-state"'),
            "UI must display error state container"
        );
        assert(
            html.includes("Failed to load complaints. Please try again."),
            "UI must show clear error message"
        );
        assert(
            !html.includes('data-testid="map-empty-state"'),
            "UI must NOT say the map is clear when API failed"
        );
        assert(
            !html.includes("The map is currently clear"),
            "UI must NOT display 'map is clear' message when API failed"
        );
        assert(
            html.includes('data-testid="map-retry-button"'),
            "UI must render retry button"
        );
    });

    test("retry action can trigger another request", async () => {
        let fetchCount = 0;
        const fetchFn = async () => {
            fetchCount += 1;
            if (fetchCount === 1) {
                throw new Error("Temporary failure");
            }
            return {
                ok: true,
                status: 200,
                json: async () => ({
                    data: [
                        {
                            id: "1",
                            complaint_id: "CMP-1",
                            issue_type: "Pothole",
                            latitude: 13.0827,
                            longitude: 80.2707,
                        },
                    ],
                }),
            };
        };

        const storage = createMockStorage();

        // First attempt fails
        const firstResult = await fetchMapReports({
            apiBase: "http://example.com/api",
            fetchFn,
            storage,
        });
        assert.strictEqual(firstResult.reports.length, 0);
        assert(firstResult.apiError !== null);
        assert.strictEqual(fetchCount, 1);

        // Retry attempt succeeds
        const secondResult = await fetchMapReports({
            apiBase: "http://example.com/api",
            fetchFn,
            storage,
        });
        assert.strictEqual(secondResult.reports.length, 1);
        assert.strictEqual(secondResult.apiError, null);
        assert.strictEqual(fetchCount, 2);
    });

    test("when API request fails but localStorage has real reports, displays local reports with warning notice", async () => {
        const localRealReports = [
            {
                id: "local-1",
                complaint_id: "CMP-LOCAL-1",
                issue_type: "Water Leakage",
                area: "Mylapore",
                city: "Chennai",
                latitude: 13.0334,
                longitude: 80.2674,
                severity: "Medium",
                status: "Pending",
            },
        ];
        const storage = createMockStorage({
            reports: JSON.stringify(localRealReports),
        });

        const fetchFn = async () => {
            throw new Error("Server offline");
        };

        const result = await fetchMapReports({
            apiBase: "http://example.com/api",
            fetchFn,
            storage,
        });

        // Local report is preserved
        assert.strictEqual(result.reports.length, 1);
        assert.strictEqual(result.reports[0].complaint_id, "CMP-LOCAL-1");
        assert.strictEqual(result.reports[0].lat, 13.0334);
        assert.strictEqual(result.reports[0].lng, 80.2674);

        // UI renders offline error notice with reports, NOT empty state
        const html = renderToStaticMarkup(
            React.createElement(MapStatusNotice, {
                loading: false,
                apiError: result.apiError,
                reportsCount: result.reports.length,
                onRetry: () => {},
            })
        );

        assert(
            html.includes('data-testid="map-error-state"'),
            "UI must render error state indicating offline fallback"
        );
        assert(
            !html.includes('data-testid="map-empty-state"'),
            "UI must NOT render empty state when local reports exist"
        );
    });
});

describe("TEST C — REAL REPORT", () => {
    test("when API succeeds with legitimate real complaint, displays real report and marker, not removed by cleanup", async () => {
        const realReport = {
            id: "real-101",
            complaint_id: "CMP-M99", // Resembles CMP-M prefix but is legitimate
            issue_type: "Broken Road", // Matches place and issue of old fixture
            area: "Chennai Central",
            city: "Chennai",
            latitude: 13.0827,
            longitude: 80.2707,
            severity: "High",
            department: "Roads Department",
            status: "In Progress",
            created_at: "2026-09-29T10:00:00.000Z",
        };

        const storage = createMockStorage();
        const fetchFn = async () => ({
            ok: true,
            status: 200,
            json: async () => ({ data: [realReport] }),
        });

        const result = await fetchMapReports({
            apiBase: "http://example.com/api",
            fetchFn,
            storage,
        });

        // 1. Real complaint is returned
        assert.strictEqual(result.reports.length, 1);
        const report = result.reports[0];
        assert.strictEqual(report.complaint_id, "CMP-M99");
        assert.strictEqual(report.lat, 13.0827);
        assert.strictEqual(report.lng, 80.2707);
        assert.strictEqual(report.issueType, "Broken Road");
        assert.strictEqual(report.place, "Chennai Central, Chennai");
        assert.strictEqual(report.severity, "High");
        assert.strictEqual(report.status, "In Progress");

        // 2. Real report is NOT deleted by cleanup
        assert.strictEqual(isDummyReport(realReport), false);

        // 3. UI notice: neither empty state nor error state is shown
        const html = renderToStaticMarkup(
            React.createElement(MapStatusNotice, {
                loading: false,
                apiError: result.apiError,
                reportsCount: result.reports.length,
                onRetry: () => {},
            })
        );
        assert.strictEqual(html, "", "When real reports are loaded successfully, no notice is shown");
    });

    test("specific proof: broad CMP-M prefix or location pattern does not delete legitimate complaints", () => {
        const legitimateReports = [
            {
                id: "rep-1",
                complaint_id: "CMP-M100",
                latitude: 13.0827,
                longitude: 80.2707,
                issue_type: "Broken Road",
                place: "Chennai Central",
                department: "Roads Department",
            },
            {
                id: "rep-2",
                complaint_id: "CMP-M200",
                latitude: 13.0418,
                longitude: 80.2341,
                issue_type: "Garbage Overflow",
                place: "T Nagar",
                department: "Sanitation",
            },
            {
                id: "rep-3",
                complaint_id: "CMP-M300",
                latitude: 13.0012,
                longitude: 80.2565,
                issue_type: "Streetlight Out",
                place: "Adyar",
                department: "Electrical",
            },
        ];

        const legacyDummyReports = [
            { id: "mock-1", complaint_id: "CMP-M1" },
            { id: "mock-2", complaint_id: "CMP-M2" },
            { id: "mock-3", complaint_id: "CMP-M3" },
        ];

        const processed = processReports(
            [...legitimateReports, ...legacyDummyReports],
            []
        );

        // Legacy dummies removed, legitimate reports completely retained
        assert.strictEqual(processed.length, 3);
        const ids = processed.map((r) => r.complaint_id);
        assert.deepStrictEqual(ids, ["CMP-M100", "CMP-M200", "CMP-M300"]);
    });
});
