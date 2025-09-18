// backend/__tests__/matching.test.js
const { computeMatchScore } = require("../utils/matching");

describe("computeMatchScore", () => {
  test("hard requirement mismatch triggers hard fail", () => {
    const client = { maxPrice: 1000, minSqm: 60, pets: true };
    const ownerReqs = [
      { name: "pets", value: false, importance: "high" },
      { name: "furnished", value: true, importance: "low" },
    ];
    const prop = { rent: 900, squareMeters: 80 };

    const r = computeMatchScore(client, ownerReqs, prop);
    expect(r.score).toBe(0);
    expect(r.hardFails).toContain("pets");
  });

  test("properties pass when high requirements match and ≥50% of lows", () => {
    const client = {
      maxPrice: 900,
      minSqm: 70,
      familyStatus: "Single",
      furnished: true,
      parking: false,
      elevator: true,
    };
    const ownerReqs = [
      { name: "familyStatus", value: "single", importance: "high" },
      { name: "furnished", value: true, importance: "low" },
      { name: "parking", value: true, importance: "low" },
      { name: "hasElevator", value: true, importance: "low" },
    ];
    const prop = { rent: 850, squareMeters: 75 };

    const r = computeMatchScore(client, ownerReqs, prop);
    expect(r.hardFails).toHaveLength(0);
    expect(r.score).toBeCloseTo(2 / 3, 5);
  });

  test("score defaults to 1 when only high requirements match", () => {
    const client = { maxPrice: 950, minSqm: 60, familyStatus: "Couple" };
    const ownerReqs = [
      { name: "familyStatus", value: "couple", importance: "high" },
      { name: "pets", value: false, importance: "high" },
    ];
    const prop = { rent: 900, squareMeters: 70 };

    const r = computeMatchScore(client, ownerReqs, prop);
    expect(r.hardFails).toHaveLength(0);
    expect(r.score).toBe(1);
  });

  test("budget still enforces a hard fail", () => {
    const client = { maxPrice: 700, minSqm: 50 };
    const ownerReqs = [];
    const prop = { rent: 750, squareMeters: 60 };

    const r = computeMatchScore(client, ownerReqs, prop);
    expect(r.score).toBe(0);
    expect(r.hardFails).toContain("budget");
  });
});
