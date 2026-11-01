import { describe, expect, it } from "vitest";
import { formatCurrency } from "./currency";

describe("currency", () => {
  describe("formatCurrency", () => {
    it("changes the currency marker without changing currency identity or amount", () => {
      const record = Object.freeze({ amount: 12345.67, currency: "USD" });
      const symbol = formatCurrency(record.amount, record.currency);
      const code = formatCurrency(record.amount, record.currency, {}, "code");

      expect(symbol).toContain("12,345.67");
      expect(code.replace(/\s/g, " ")).toBe("USD 12,345.67");
      expect(code).not.toContain("INR");
      expect(record).toEqual({ amount: 12345.67, currency: "USD" });
    });

    it.each([
      [0, "INR 0"],
      [-1250.5, "-INR 1,250.5"],
      [null, "INR 0"],
      ["123456.78", "INR 1,23,456.78"],
    ])("preserves Indian grouping and the sign for %s", (value, expected) => {
      expect(formatCurrency(value, "INR", {}, "code").replace(/\s/g, " ")).toBe(expected);
    });

    it("retains explicitly requested precision", () => {
      expect(formatCurrency(1250, "INR", { minimumFractionDigits: 2 }, "code")
        .replace(/\s/g, " ")).toBe("INR 1,250.00");
      expect(formatCurrency(1250.75, "INR", { maximumFractionDigits: 0 }, "code")
        .replace(/\s/g, " ")).toBe("INR 1,251");
    });
  });
});