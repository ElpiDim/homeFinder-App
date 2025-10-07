// backend/__tests__/matching.test.js
const { computeMatchScore } = require("../utils/matching");

describe("computeMatchScore", () => {
  test("matches when client budget & sqm meet property and ≥50% score", () => {
    const client = { maxPrice: 900, minSqm: 70, familyStatus: "Single", furnished: true };
    const ownerReqs = { furnished: true, familyStatus: "Single" };
    const prop = { rent: 800, squareMeters: 80, bedrooms: 2, bathrooms: 1 };
    const tenant = { householdSize: 1 };

    const r = computeMatchScore(client, ownerReqs, prop, tenant);
    expect(r.hardFails).toBeUndefined();
    expect(r.score).toBeGreaterThanOrEqual(0.5);
  });

  test("hard-fail on budget (should exclude: score = 0)", () => {
    const client = { maxPrice: 700, minSqm: 50 };
    const ownerReqs = { furnished: true };
    const prop = { rent: 800, squareMeters: 60 };

    const r = computeMatchScore(client, ownerReqs, prop, {});
    expect(r.score).toBe(0);
    expect(r.hardFails).toContain("budget");
  });

  test("fails on sqm (should exclude: score = 0)", () => {
    const client = { maxPrice: 1200, minSqm: 90 };
    const ownerReqs = {};
    const prop = { rent: 1000, squareMeters: 70 };

    const r = computeMatchScore(client, ownerReqs, prop, {});
    expect(r.score).toBe(0);
    expect(r.hardFails).toContain("sqm");
  });

  test("≥50% threshold with mixed soft fields", () => {
    const client = { maxPrice: 1000, minSqm: 50, familyStatus: "Couple", parking: true };
    const ownerReqs = { furnished: true, familyStatus: "Couple", parking: true };
    const prop = { rent: 950, squareMeters: 60, bedrooms: 2, bathrooms: 1 };

    const tenant = { householdSize: 2, hasFamily: false };
    const r = computeMatchScore(client, ownerReqs, prop, tenant);
    expect(r.hardFails).toBeUndefined();
    expect(r.score).toBeGreaterThanOrEqual(0.5);
  });

  test("excludes when tenant fails owner requirements", () => {
    const client = { maxPrice: 1200, minSqm: 50 };
    const ownerReqs = { minTenantSalary: 3000, pets: false };
    const prop = { rent: 900, squareMeters: 70 };
    const tenant = { salary: 2500, hasPets: true };

    const r = computeMatchScore(client, ownerReqs, prop, tenant);
    expect(r.score).toBe(0);
    expect(r.hardFails).toEqual(
      expect.arrayContaining(["tenant_minTenantSalary", "tenant_pets"])
    );
  });
});
