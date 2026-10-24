import { createHash } from 'node:crypto';

/** A ordem das propriedades faz parte do checksum histórico; não ordenar ou reformatar. */
export interface MigrationManifest {
    readonly version: string;
    readonly [key: string]: unknown;
}

export function checksum(manifest: MigrationManifest): string {
    const serialized: string | undefined = JSON.stringify(manifest);
    if (typeof serialized !== 'string') {
        throw new TypeError('Manifesto de migração não serializável.');
    }
    return createHash('sha256').update(serialized).digest('hex');
}
