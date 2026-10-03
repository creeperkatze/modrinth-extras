import { AbstractFeature, ModrinthApiError, type RequestContext } from '@modrinth/api-client'

const MAX_CONCURRENT = 4
const RATE_LIMIT_PAUSE_MS = 30_000

// A 429 without CORS headers reaches the page as a failure without a status.
function isRateLimited(error: unknown): boolean {
	if (!(error instanceof ModrinthApiError)) return false
	return error.statusCode === 429 || error.statusCode === undefined
}

// Cloudflare rejects bursts of requests long before the API's per-minute limit is used up.
export class RequestThrottleFeature extends AbstractFeature {
	private active = 0
	private queue: (() => void)[] = []
	private pausedUntil = 0

	constructor() {
		super({ name: 'request-throttle' })
	}

	async execute<T>(next: () => Promise<T>, context: RequestContext): Promise<T> {
		// A JSON content type without a body still forces a CORS preflight, doubling every request.
		if (context.options.body === undefined && context.options.headers) {
			delete context.options.headers['Content-Type']
		}

		await this.acquire()
		try {
			// Checked once a slot is free, so queued requests don't go out after a 429.
			context.options.signal?.throwIfAborted()
			if (Date.now() < this.pausedUntil) {
				throw new ModrinthApiError('Paused after being rate limited', {
					statusCode: 429,
					context: context.path,
				})
			}

			try {
				return await next()
			} catch (err) {
				// A cancelled request also fails without a status, but it isn't a rate limit.
				if (!context.options.signal?.aborted && isRateLimited(err)) {
					this.pausedUntil = Date.now() + RATE_LIMIT_PAUSE_MS
				}
				throw err
			}
		} finally {
			this.release()
		}
	}

	private acquire(): Promise<void> {
		if (this.active < MAX_CONCURRENT) {
			this.active++
			return Promise.resolve()
		}
		return new Promise((resolve) => this.queue.push(resolve))
	}

	// A finished request hands its slot straight to the next one in line.
	private release() {
		const nextInLine = this.queue.shift()
		if (nextInLine) nextInLine()
		else this.active--
	}
}
