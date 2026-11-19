import {
    MCR, type CoverageReportOptions, type TypeScriptFileInfo,
    type TypeScriptOption, type TypeScriptOptions, type ResolvedTypeScriptOptions,
    type TypeScriptOptionsResult, type CoverageFile
} from 'monocart-coverage-reports';

const reportIdentity = (file: CoverageFile) => {
    const id: string | undefined = file.id;
    // @ts-expect-error Internal content hashes are not part of the public report API.
    file.sourceContentId;
    // @ts-expect-error Reports use the existing id, not an additional merge identifier.
    file.mergeId;
    // @ts-expect-error Collection bookkeeping is not exposed as public file IDs.
    file.fileIds;
    void id;
};
void reportIdentity;

const callback = (info: TypeScriptFileInfo): TypeScriptOptionsResult => {
    const url: string = info.url;
    const sourcePath: string = info.sourcePath;
    const native: boolean = info.nativeTypeScript;
    const empty: boolean = info.empty;
    // @ts-expect-error File information is readonly.
    info.nativeTypeScript = true;
    void [url, sourcePath];
    return empty ? true : { enabled: native };
};

const object: TypeScriptOptions = { enabled: (info) => info.empty || info.nativeTypeScript };
const final: ResolvedTypeScriptOptions = { enabled: true };
const values: TypeScriptOption[] = [null, undefined, true, false, {}, { enabled: undefined }, object, final, callback, () => undefined];
const namespaceOption: MCR.TypeScriptOption = object;
const namespaceInfo = (info: MCR.TypeScriptFileInfo): boolean => info.nativeTypeScript;
const namespaceResult: MCR.TypeScriptOptionsResult = final;
const namespaceFinal: MCR.ResolvedTypeScriptOptions = final;
const namespaceOptions: MCR.TypeScriptOptions = object;
for (const typescript of values) {
    const options: CoverageReportOptions = { typescript };
    void MCR(options);
}
const inferred: CoverageReportOptions = {
    typescript: (info) => {
        const native: boolean = info.nativeTypeScript;
        // @ts-expect-error Callbacks receive file descriptions, not arbitrary coverage fields.
        info.source;
        return { enabled: native };
    }
};
const inferredEnabled: CoverageReportOptions = {
    typescript: {
        enabled: (info) => {
            // @ts-expect-error Readonly callback information must not be modified.
            info.url = 'changed';
            return info.empty;
        }
    }
};
void [namespaceOption, namespaceInfo, namespaceResult, namespaceFinal, namespaceOptions, inferred, inferredEnabled];

// @ts-expect-error Wrong spelling is not an alias for enabled.
const misspelled: TypeScriptOption = { endabled: true };
// @ts-expect-error filter is not implemented yet.
const unknown: TypeScriptOption = { filter: () => true };
// @ts-expect-error enabled callbacks must return a boolean.
const nonBoolean: TypeScriptOption = { enabled: () => undefined };
// @ts-expect-error Top-level callbacks return final options, not a nested callback.
const nested: TypeScriptOption = () => ({ enabled: () => true });
// @ts-expect-error Callback recursion is unsupported.
const recursive: TypeScriptOption = () => () => true;
// @ts-expect-error Async top-level callbacks are unsupported.
const asynchronous: TypeScriptOption = async () => true;
// @ts-expect-error Async enabled callbacks are unsupported.
const asynchronousEnabled: TypeScriptOption = { enabled: async () => true };
// @ts-expect-error Final options only permit a boolean enabled field.
const nonFinal: ResolvedTypeScriptOptions = object;
// @ts-expect-error Explicitly declared option types still apply despite the general index signature.
const invalid: CoverageReportOptions = { typescript: 'true' };
void [misspelled, unknown, nonBoolean, nested, recursive, asynchronous, asynchronousEnabled, nonFinal, invalid];
