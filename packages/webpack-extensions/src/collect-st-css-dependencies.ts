import { StylableMeta, Imported, CSSResolve, JSResolve, Stylable } from '@stylable/core';

export type ResolvedImport = {
    stImport: Imported;
    resolved: CSSResolve | JSResolve | null;
};

export function collectDependenciesDeep(
    stylable: Stylable,
    meta: StylableMeta,
    out = new Map<StylableMeta, ResolvedImport[]>()
) {
    if (out.has(meta)) {
        return out;
    }
    const imports: ResolvedImport[] = [];
    out.set(meta, imports);
    for (const stImport of meta.imports) {
        const named = Object.values(stImport.named);
        const namedReExports = named.map(onlyReExports(stylable, stImport)).filter(Boolean);

        if (stImport.defaultExport || namedReExports.length !== named.length) {
            const resolved = stylable.resolver.resolveImported(stImport, '');
            imports.push({ stImport, resolved });
            if (resolved && resolved._kind === 'css') {
                collectDependenciesDeep(stylable, resolved.meta, out);
            }
        } else {
            const rootResolved = stylable.resolver.resolveImported(stImport, '');
            if (rootResolved && rootResolved._kind === 'css') {
                const imports: ResolvedImport[] = [];
                out.set(rootResolved.meta, imports);

                for (const stImportReExport of namedReExports) {
                    const innerResolved = stylable.resolver.resolveImported(stImportReExport!, '');
                    imports.push({ stImport: stImportReExport!, resolved: innerResolved });
                    if (innerResolved && innerResolved._kind === 'css') {
                        collectDependenciesDeep(stylable, innerResolved.meta, out);
                    }
                }
            }
        }
    }

    return out;
}

function onlyReExports(
    stylable: Stylable,
    stImport: Imported
): (value: string, index: number, array: string[]) => Imported | undefined {
    return (name) => {
        const resolved = stylable.resolver.resolveImported(stImport, name);
        if (
            resolved?._kind === 'css' &&
            resolved.symbol._kind === 'element' &&
            resolved.symbol.alias
        ) {
            return resolved.symbol.alias.import;
        }
        return;
    };
}
