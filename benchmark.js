import isRelativeUrl, { cache } from './index.js';

// Test URLs for benchmarking
const testUrls = [
	'http://example.com',
	'https://example.com',
	'https://example.com/path/to/resource',
	'file://path/to/file',
	'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAHklEQVQoz2NgAIP/YMBAPBjVMNAa/pMISNcwEoMVAH0ls03D44ABAAAAAElFTkSuQmCC',
	'ftp://ftp.example.com',
	'ws://websocket.example.com',
	'wss://secure-websocket.example.com',
	'//example.com',
	'/path/to/resource',
	'path/to/resource',
	'./relative/path',
	'../parent/path',
	'resource',
	'',
	'mailto:test@example.com',
	'tel:+1234567890',
	'data:text/plain;charset=utf-8,Hello%20World',
];

function formatNumber(num) {
	return num.toLocaleString('en-US');
}

function formatTime(ns) {
	if (ns < 1000) {
		return `${ns.toFixed(2)} ns`;
	} else if (ns < 1000000) {
		return `${(ns / 1000).toFixed(2)} μs`;
	} else if (ns < 1000000000) {
		return `${(ns / 1000000).toFixed(2)} ms`;
	} else {
		return `${(ns / 1000000000).toFixed(2)} s`;
	}
}

function benchmark(name, fn, iterations = 100000) {
	// Warm up
	for (let i = 0; i < 1000; i++) {
		fn();
	}

	// Measure
	const start = process.hrtime.bigint();
	for (let i = 0; i < iterations; i++) {
		fn();
	}
	const end = process.hrtime.bigint();

	const totalNs = Number(end - start);
	const avgNs = totalNs / iterations;
	const opsPerSec = (1000000000 / avgNs).toFixed(0);

	console.log(`\n${name}:`);
	console.log(`  Total time: ${formatTime(totalNs)}`);
	console.log(`  Average time: ${formatTime(avgNs)}`);
	console.log(`  Operations/sec: ${formatNumber(opsPerSec)}`);
	console.log(`  Iterations: ${formatNumber(iterations)}`);

	return { totalNs, avgNs, opsPerSec: parseFloat(opsPerSec) };
}

console.log('='.repeat(60));
console.log('URL Validation Performance Benchmark');
console.log('='.repeat(60));

// Benchmark 1: Single URL (cold cache)
console.log('\n--- Benchmark 1: Single URL Validation (no cache benefit) ---');
let results = [];

cache.clear();
results.push(benchmark('Absolute URL (https)', () => {
	cache.clear();
	isRelativeUrl('https://example.com');
}));

cache.clear();
results.push(benchmark('Relative URL (path)', () => {
	cache.clear();
	isRelativeUrl('/path/to/resource');
}));

cache.clear();
results.push(benchmark('Protocol-relative URL', () => {
	cache.clear();
	isRelativeUrl('//example.com');
}));

// Benchmark 2: Repeated URL validation (cache benefit)
console.log('\n--- Benchmark 2: Repeated URL Validation (with cache) ---');

cache.clear();
results.push(benchmark('Repeated absolute URL (cache hit)', () => {
	isRelativeUrl('https://example.com');
}));

cache.clear();
results.push(benchmark('Repeated relative URL (cache hit)', () => {
	isRelativeUrl('/path/to/resource');
}));

// Benchmark 3: Mixed workload
console.log('\n--- Benchmark 3: Mixed Workload ---');

cache.clear();
let urlIndex = 0;
results.push(benchmark('Random URLs from test set', () => {
	isRelativeUrl(testUrls[urlIndex++ % testUrls.length]);
}, 100000));

// Benchmark 4: Options variations
console.log('\n--- Benchmark 4: With Options ---');

cache.clear();
results.push(benchmark('With allowProtocolRelative: false', () => {
	cache.clear();
	isRelativeUrl('//example.com', { allowProtocolRelative: false });
}));

cache.clear();
results.push(benchmark('With allowProtocolRelative: true (default)', () => {
	cache.clear();
	isRelativeUrl('//example.com', { allowProtocolRelative: true });
}));

// Benchmark 5: Fast paths
console.log('\n--- Benchmark 5: Fast Path Performance ---');

cache.clear();
results.push(benchmark('Empty string (fast path)', () => {
	cache.clear();
	isRelativeUrl('');
}));

cache.clear();
results.push(benchmark('Common protocol http:// (fast path)', () => {
	cache.clear();
	isRelativeUrl('http://example.com');
}));

cache.clear();
results.push(benchmark('Common protocol https:// (fast path)', () => {
	cache.clear();
	isRelativeUrl('https://example.com/path');
}));

cache.clear();
results.push(benchmark('Data URI (fast path)', () => {
	cache.clear();
	isRelativeUrl('data:text/plain,Hello');
}));

// Benchmark 6: Cache effectiveness
console.log('\n--- Benchmark 6: Cache Effectiveness ---');

cache.clear();
const cacheTestUrl = 'https://example.com/test/path';
// First call (cache miss)
const start1 = process.hrtime.bigint();
for (let i = 0; i < 10000; i++) {
	cache.clear();
	isRelativeUrl(cacheTestUrl);
}
const end1 = process.hrtime.bigint();
const withoutCacheNs = Number(end1 - start1) / 10000;

cache.clear();
// Subsequent calls (cache hits)
const start2 = process.hrtime.bigint();
for (let i = 0; i < 10000; i++) {
	isRelativeUrl(cacheTestUrl);
}
const end2 = process.hrtime.bigint();
const withCacheNs = Number(end2 - start2) / 10000;

const speedup = (withoutCacheNs / withCacheNs).toFixed(2);

console.log(`\nCache miss (first call): ${formatTime(withoutCacheNs)}`);
console.log(`Cache hit (repeated): ${formatTime(withCacheNs)}`);
console.log(`Speedup: ${speedup}x faster with cache`);

// Summary
console.log('\n' + '='.repeat(60));
console.log('Summary');
console.log('='.repeat(60));
console.log('\nOptimizations applied:');
console.log('  ✓ Pre-compiled regex patterns');
console.log('  ✓ LRU cache for validation results (1000 entries)');
console.log('  ✓ Fast paths for common protocols (http/https/file/data/ftp/ws/wss)');
console.log('  ✓ Fast paths for empty strings and type checks');
console.log('  ✓ Inlined is-absolute-url logic to reduce function call overhead');
console.log('  ✓ Optimized protocol-relative URL checking with pre-compiled regex');
console.log('\nPerformance characteristics:');
console.log(`  • Cache miss: ~${formatTime(withoutCacheNs)} per operation`);
console.log(`  • Cache hit: ~${formatTime(withCacheNs)} per operation`);
console.log(`  • Cache speedup: ${speedup}x improvement`);
console.log('\nCache is most effective for:');
console.log('  • Repeated validation of the same URLs');
console.log('  • High-frequency validation in web applications');
console.log('  • Batch processing of URLs with duplicates');
