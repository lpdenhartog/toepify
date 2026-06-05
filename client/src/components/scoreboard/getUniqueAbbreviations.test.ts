import { describe, it, expect } from "vitest";
import { getUniqueAbbreviations } from "./getUniqueAbbreviations";

describe("getUniqueAbbreviations", () => {
  it("uses single uppercase letters when they are unique", () => {
    const abbr = getUniqueAbbreviations(["Daan", "Joost", "Sanne"]);
    expect(abbr.get("Daan")).toBe("D");
    expect(abbr.get("Joost")).toBe("J");
    expect(abbr.get("Sanne")).toBe("S");
  });

  it("lengthens colliding names until unique", () => {
    // "D" collides → "DA" still collides → "DAA"/"DAV" are distinct.
    const abbr = getUniqueAbbreviations(["Daan", "David"]);
    expect(abbr.get("Daan")).toBe("DAA");
    expect(abbr.get("David")).toBe("DAV");
  });

  it("only lengthens the colliding group, not unique names", () => {
    const abbr = getUniqueAbbreviations(["Daan", "David", "Joost"]);
    expect(abbr.get("Joost")).toBe("J");
    expect(abbr.get("Daan")).toBe("DAA");
    expect(abbr.get("David")).toBe("DAV");
  });

  it("never exceeds the name length", () => {
    const abbr = getUniqueAbbreviations(["Jo", "Jo"]);
    // identical names cannot be disambiguated; capped at full length
    expect(abbr.get("Jo")).toBe("JO");
  });

  it("handles a single name", () => {
    const abbr = getUniqueAbbreviations(["Tijn"]);
    expect(abbr.get("Tijn")).toBe("T");
  });
});
