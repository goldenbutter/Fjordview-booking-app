import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const roots = ["src/app/admin", "src/app/api/admin", "src/lib/admin-metrics.ts"];
const forbidden = ["env.defaultPropertySlug", "getPropertyBySlug(env.defaultPropertySlug)"];

function filesUnder(path: string): string[] {
  if (statSync(path).isFile()) {
    return [path];
  }

  return readdirSync(path).flatMap((entry) => {
    const fullPath = join(path, entry);
    return statSync(fullPath).isDirectory() ? filesUnder(fullPath) : [fullPath];
  });
}

describe("admin scoping", () => {
  it("does not resolve admin property context from DEFAULT_PROPERTY_SLUG", () => {
    const offenders = roots
      .flatMap(filesUnder)
      .filter((file) => /\.(ts|tsx)$/.test(file))
      .flatMap((file) => {
        const content = readFileSync(file, "utf8");
        return forbidden
          .filter((pattern) => content.includes(pattern))
          .map((pattern) => `${relative(process.cwd(), file)} contains ${pattern}`);
      });

    assert.deepEqual(offenders, []);
  });

  it("scopes admin booking detail lookups to the current admin property", () => {
    const offenders = roots
      .flatMap(filesUnder)
      .filter((file) => /\.(ts|tsx)$/.test(file))
      .flatMap((file) => {
        const content = readFileSync(file, "utf8");
        return /\bgetBookingDetail\(/.test(content)
          ? [`${relative(process.cwd(), file)} calls getBookingDetail without property scope`]
          : [];
      });

    assert.deepEqual(offenders, []);
  });
});
