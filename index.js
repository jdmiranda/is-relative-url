// Pre-compiled regex patterns for optimal performance
// Scheme: https://tools.ietf.org/html/rfc3986#section-3.1
// Absolute URL: https://tools.ietf.org/html/rfc3986#section-4.3
const ABSOLUTE_URL_REGEX = /^[a-zA-Z][a-zA-Z\d+\-.]*?:/;

// Windows paths like `c:\`
const WINDOWS_PATH_REGEX = /^[a-zA-Z]:\\/;

// Protocol-relative URL pattern
const PROTOCOL_RELATIVE_REGEX = /^\/\//;

// LRU Cache implementation for validation results
class LRUCache {
	constructor(maxSize = 1000) {
		this.maxSize = maxSize;
		this.cache = new Map();
	}

	get(key) {
		if (!this.cache.has(key)) {
			return undefined;
		}
		// Move to end (most recently used)
		const value = this.cache.get(key);
		this.cache.delete(key);
		this.cache.set(key, value);
		return value;
	}

	set(key, value) {
		// Delete if exists to re-add at end
		if (this.cache.has(key)) {
			this.cache.delete(key);
		} else if (this.cache.size >= this.maxSize) {
			// Remove least recently used (first item)
			const firstKey = this.cache.keys().next().value;
			this.cache.delete(firstKey);
		}
		this.cache.set(key, value);
	}

	clear() {
		this.cache.clear();
	}
}

// Create cache instance
const cache = new LRUCache(1000);

// Inlined isAbsoluteUrl logic for performance
function isAbsoluteUrlInline(url) {
	// Fast path: check for common absolute URL patterns first
	if (url.length > 7) {
		// Check for common protocols using string comparison (faster than regex for common cases)
		if (url.startsWith('http://') || url.startsWith('https://')) {
			return true;
		}
		if (url.startsWith('file://') || url.startsWith('data:')) {
			return true;
		}
		if (url.startsWith('ftp://') || url.startsWith('ws://') || url.startsWith('wss://')) {
			return true;
		}
	}

	// Windows path check
	if (WINDOWS_PATH_REGEX.test(url)) {
		return false;
	}

	// Full regex check for other schemes
	return ABSOLUTE_URL_REGEX.test(url);
}

export default function isRelativeUrl(url, options = {}) {
	const {allowProtocolRelative = true} = options;

	// Fast path: type check
	if (typeof url !== 'string') {
		// Match is-absolute-url behavior - it throws TypeError
		// So non-strings are not absolute, therefore relative
		return true;
	}

	// Fast path: empty string is relative
	if (url.length === 0) {
		return true;
	}

	// Fast path: protocol-relative URL check
	if (!allowProtocolRelative && PROTOCOL_RELATIVE_REGEX.test(url)) {
		return false;
	}

	// Create cache key
	const cacheKey = allowProtocolRelative ? url : `strict:${url}`;

	// Check cache
	const cached = cache.get(cacheKey);
	if (cached !== undefined) {
		return cached;
	}

	// Compute result
	const result = !isAbsoluteUrlInline(url);

	// Store in cache
	cache.set(cacheKey, result);

	return result;
}

// Export cache for testing/benchmarking purposes
export { cache };
