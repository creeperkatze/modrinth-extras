import type { Labrinth } from '@modrinth/api-client'

export type Version = Labrinth.Versions.v3.Version

export function primaryJar(version: Version): Labrinth.Versions.v3.VersionFile | null {
	const file = version.files.find((f) => f.primary) ?? version.files[0]
	return file?.filename.toLowerCase().endsWith('.jar') ? file : null
}
