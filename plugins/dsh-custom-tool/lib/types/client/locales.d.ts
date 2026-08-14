/**
 * Simplified-Chinese dictionary (the key-set source of truth) and its
 * checked-complete English pair, registered into the harness locale service
 * so every string follows the harness language switch.
 */
/** The locale namespace this plugin registers under. */
export declare const LOCALE_NS = "dsh-custom-tool";
/** Simplified Chinese dictionary; {name} and {message} are format placeholders. */
export declare const zh: {
    nav: string;
    kicker: string;
    title: string;
    subtitle: string;
    newTool: string;
    empty: string;
    edit: string;
    enable: string;
    disable: string;
    delete: string;
    cancel: string;
    save: string;
    saving: string;
    'badge.model': string;
    'badge.user': string;
    'badge.workspaceExec': string;
    'badge.workspaceLocal': string;
    'badge.off': string;
    'toolName.label': string;
    'toolName.hint': string;
    'toolName.placeholder': string;
    'description.label': string;
    'description.hint': string;
    'scope.label': string;
    'scope.hint': string;
    'scope.global': string;
    'scope.workspace': string;
    'location.label': string;
    'location.hint': string;
    'location.global': string;
    'location.workspace': string;
    'params.label': string;
    'params.hint': string;
    'code.label': string;
    'code.hint': string;
    'params.empty': string;
    addParam: string;
    'param.name.placeholder': string;
    'param.required': string;
    'param.desc.placeholder': string;
    'param.enum.label': string;
    'param.enum.placeholder': string;
    'param.items.label': string;
    'advanced.open': string;
    'advanced.close': string;
    'params.extras': string;
    'err.saveFailed': string;
    'err.schemaParse': string;
    'err.schemaInvalid': string;
    'err.codeSyntax': string;
    'err.descEmpty': string;
    'err.dupName': string;
    'err.nameEmpty': string;
    'err.namePattern': string;
    'err.nameDup': string;
};
/** The locale key union for the component `t` seat. */
export type CustomToolKey = keyof typeof zh;
/** English dictionary, checked complete against the zh key set. */
export declare const en: Record<CustomToolKey, string>;
/** Format one dictionary entry, replacing {name}/{message}/{count}/{path} placeholders. */
export declare function fmt(template: string, values: Record<string, string | number>): string;
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        'dsh-custom-tool': CustomToolKey;
    }
}
