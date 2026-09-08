import SpigetClient, { type Author, type Icon, type Resource } from 'spiget-js'

import { boundFetch, USER_AGENT } from '../../utils/api'
import { namesMatch, type PlatformMatch } from '../../utils/platforms'

const client = new SpigetClient({ userAgent: USER_AGENT, fetch: boundFetch })

const SEARCH_SIZE = 25

// The hosted icon is preferred over Spiget's inline base64 copy to keep the message small.
function resolveIcon(icon: Icon | undefined): string | null {
	if (icon?.url) return `https://www.spigotmc.org/${icon.url}`
	if (icon?.data) return `data:image/png;base64,${icon.data}`
	return null
}

function toResourceMatch(resource: Resource): PlatformMatch {
	return {
		platform: 'spigot',
		name: resource.name,
		url: `https://www.spigotmc.org/resources/${resource.id}/`,
		iconUrl: resolveIcon(resource.icon),
		downloads: resource.downloads,
	}
}

function toAuthorMatch(author: Author): PlatformMatch {
	return {
		platform: 'spigot',
		name: author.name,
		url: `https://www.spigotmc.org/members/${author.id}/`,
		iconUrl: resolveIcon(author.icon),
	}
}

export async function findSpigotProject(title: string): Promise<PlatformMatch | null> {
	// Spiget resources have no slug, so the title is the only thing to match on.
	const response = await client.resources.search(title, {
		field: 'name',
		size: SEARCH_SIZE,
		sort: '-downloads',
	})

	const resource = response.data?.find((candidate) => namesMatch(candidate.name, title))
	return resource ? toResourceMatch(resource) : null
}

export async function findSpigotUser(username: string): Promise<PlatformMatch | null> {
	const response = await client.authors.search(username, { field: 'name', size: SEARCH_SIZE })

	const author = response.data?.find((candidate) => namesMatch(candidate.name, username))
	return author ? toAuthorMatch(author) : null
}
