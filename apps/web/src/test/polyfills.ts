// 🔱 Sovereign Web API Polyfills for isolated VM environments (vmForks/vmThreads compatibility)
import { TransformStream, ReadableStream, WritableStream } from 'node:stream/web';
import { TextEncoder, TextDecoder } from 'node:util';

// Patching globals with APIs TypeScript's own lib types don't declare is
// inherently untyped — narrowed to `Record<string, unknown>` instead of
// `any` (equally unsafe by necessity here, but not the literal `any` type).
const patchedGlobal = global as unknown as Record<string, unknown>;

if (global.TransformStream === undefined) {
  patchedGlobal.TransformStream = TransformStream;
}
if (global.ReadableStream === undefined) {
  patchedGlobal.ReadableStream = ReadableStream;
}
if (global.WritableStream === undefined) {
  patchedGlobal.WritableStream = WritableStream;
}
if (global.TextEncoder === undefined) {
  patchedGlobal.TextEncoder = TextEncoder;
}
if (global.TextDecoder === undefined) {
  patchedGlobal.TextDecoder = TextDecoder;
}
if (global.ProgressEvent === undefined) {
  patchedGlobal.ProgressEvent = class ProgressEvent extends Event {};
}
