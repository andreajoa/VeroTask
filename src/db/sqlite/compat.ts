/**
 * SQLite/Drizzle staging column factories matching VeroTask's PostgreSQL column API.
 * These are not a production replacement for PostgreSQL row-locking transactions.
 * Date columns deliberately persist ISO timestamps as TEXT for compatibility with the
 * current D1 staging schema; mixed dates and numeric epochs are not accepted.
 */
import { customType, index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export { index, uniqueIndex };
export const pgTable = sqliteTable;
export { integer, text };

export const uuid = (name: string) => text(name);
export const varchar = (name: string, _options?: { length?: number }) => text(name);
export const time = (name: string) => text(name);
export const boolean = (name: string) => integer(name, { mode: "boolean" });
export const doublePrecision = (name: string) => real(name);
export const jsonb = (name: string) => text(name, { mode: "json" });

const numericText = customType<{ data: string; driverData: string }>({
  dataType() { return "real"; },
  toDriver(value: string) { return value; },
  fromDriver(value: string) { return String(value); }
});
export const numeric = (name: string, _options?: { precision?: number; scale?: number }) => numericText(name);

const isoDateText = customType<{ data: Date; driverData: string }>({
  dataType() { return "text"; },
  toDriver(value: Date) { return value.toISOString(); },
  fromDriver(value: string) {
    const normalized = value.includes("T") ? value : value.replace(" ", "T") + "Z";
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) throw new Error("invalid_sqlite_timestamp");
    return date;
  }
});
export const timestamp = (name: string, _options?: { withTimezone?: boolean }) => isoDateText(name);

export function pgEnum<const T extends readonly [string, ...string[]]>(_name: string, choices: T) {
  return (name: string) => text(name, { enum: choices });
}
