import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { existsSync, readFileSync } from "node:fs";

describe("room CRUD wiring", () => {
  it("ships scoped admin route handlers for room types", () => {
    const path = "src/app/api/admin/room-types/route.ts";
    assert.equal(existsSync(path), true, `${path} should exist`);

    const route = readFileSync(path, "utf8");
    assert.match(route, /getCurrentAdminContext/);
    assert.match(route, /createRoomType/);
    assert.match(route, /updateRoomType/);
    assert.match(route, /deleteRoomType/);
    assert.match(route, /export async function POST/);
    assert.match(route, /export async function PATCH/);
    assert.match(route, /export async function DELETE/);
    assert.doesNotMatch(route, /propertyId:\s*parsed\.data\.propertyId/);
  });

  it("ships scoped admin route handlers for physical rooms", () => {
    const path = "src/app/api/admin/rooms/route.ts";
    assert.equal(existsSync(path), true, `${path} should exist`);

    const route = readFileSync(path, "utf8");
    assert.match(route, /getCurrentAdminContext/);
    assert.match(route, /createRoom/);
    assert.match(route, /updateRoom/);
    assert.match(route, /deleteRoom/);
    assert.match(route, /export async function POST/);
    assert.match(route, /export async function PATCH/);
    assert.match(route, /export async function DELETE/);
    assert.doesNotMatch(route, /propertyId:\s*parsed\.data\.propertyId/);
  });

  it("adds DB helpers for room type and physical room mutations", () => {
    const queries = readFileSync("src/lib/db/queries.ts", "utf8");

    for (const helper of [
      "CreateRoomTypeInput",
      "UpdateRoomTypeInput",
      "createRoomType",
      "updateRoomType",
      "deleteRoomType",
      "CreateRoomInput",
      "UpdateRoomInput",
      "createRoom",
      "updateRoom",
      "deleteRoom",
    ]) {
      assert.match(queries, new RegExp(`export (type |async function )${helper}`));
    }

    assert.match(queries, /insert\(schema\.roomTypes\)/);
    assert.match(queries, /update\(schema\.roomTypes\)/);
    assert.match(queries, /delete\(schema\.roomTypes\)/);
    assert.match(queries, /insert\(schema\.rooms\)/);
    assert.match(queries, /update\(schema\.rooms\)/);
    assert.match(queries, /delete\(schema\.rooms\)/);
  });

  it("renders room management controls from the admin rooms page", () => {
    const page = readFileSync("src/app/admin/rooms/page.tsx", "utf8");
    const managementPath = "src/app/admin/rooms/room-management.tsx";
    assert.equal(existsSync(managementPath), true, `${managementPath} should exist`);

    const management = readFileSync(managementPath, "utf8");
    assert.match(page, /RoomManagement/);
    assert.match(management, /Add room type/);
    assert.match(management, /Add physical room/);
    assert.match(management, /Edit/);
    assert.match(management, /Deactivate/);
    assert.match(management, /Delete/);
    assert.match(management, /\/api\/admin\/room-types/);
    assert.match(management, /\/api\/admin\/rooms/);
  });

  it("guards hard delete against inventory that has dependent records", () => {
    const roomTypesRoute = readFileSync("src/app/api/admin/room-types/route.ts", "utf8");
    const roomsRoute = readFileSync("src/app/api/admin/rooms/route.ts", "utf8");

    assert.match(roomTypesRoute, /hardDelete/);
    assert.match(roomTypesRoute, /Cannot delete a room type/);
    assert.match(roomsRoute, /hardDelete/);
    assert.match(roomsRoute, /Cannot delete a room/);
  });
});
