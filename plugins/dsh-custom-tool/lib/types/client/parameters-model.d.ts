/**
 * Pure conversions between a parameters JSON Schema (object root) and the
 * editable parameter-row GUI model. Properties the GUI does not model
 * (nested objects, oneOf, non-string enums) stay in `extras` and round-trip
 * verbatim, so switching between GUI and advanced editing loses nothing.
 */
export declare const PARAMETER_TYPES: readonly ["string", "number", "integer", "boolean", "null", "object", "array"];
export type ParameterType = (typeof PARAMETER_TYPES)[number];
export declare const ARRAY_ITEM_TYPES: readonly ["string", "number", "integer", "boolean", "null"];
export type ArrayItemType = (typeof ARRAY_ITEM_TYPES)[number];
/** One GUI-editable parameter row. */
export interface ParameterRow {
    name: string;
    type: ParameterType;
    required: boolean;
    description: string;
    /** Comma-separated allowed values; string type only. */
    enumText: string;
    /** Array element type; array type only. */
    itemsType: ArrayItemType;
}
export declare const PARAMETER_NAME_PATTERN: RegExp;
/** A fresh empty row for the 添加参数 button. */
export declare function newParameterRow(): ParameterRow;
/** The GUI model of one parameters schema: editable rows plus preserved extras. */
export interface ParametersModel {
    rows: ParameterRow[];
    /** Properties the GUI does not model; preserved verbatim across edits. */
    extras: Record<string, unknown>;
    /** Required entries owned by extras; re-emitted so complex props keep their required flag. */
    extrasRequired: string[];
    /** The original required order, restored on serialization for byte-stable round-trips. */
    requiredOrder: string[];
}
/**
 * Split a subset-valid parameters schema into editable rows plus preserved extras.
 * @param schema - the parameters JSON Schema (object root).
 * @returns the GUI model.
 */
export declare function modelFromParameters(schema: unknown): ParametersModel;
/**
 * Serialize rows plus preserved extras back to the object-root JSON Schema.
 * @param model - the GUI model.
 * @returns the schema value.
 */
export declare function parametersFromModel(model: ParametersModel): Record<string, unknown>;
/**
 * Row-level validation for the GUI: non-empty unique names matching the
 * pattern, reported in the active locale.
 * @param t - the locale translator.
 * @param rows - the current rows.
 * @returns the first user-facing error, or null.
 */
export declare function validateRows(t: (key: string) => string, rows: readonly ParameterRow[]): string | null;
