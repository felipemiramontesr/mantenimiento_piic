/* eslint-disable */
// 🔱 Sovereign Web API Polyfills for isolated VM environments (vmForks/vmThreads compatibility)
import { TransformStream, ReadableStream, WritableStream } from 'node:stream/web';
import { TextEncoder, TextDecoder } from 'node:util';

if (typeof global.TransformStream === 'undefined') {
  (global as any).TransformStream = TransformStream;
}
if (typeof global.ReadableStream === 'undefined') {
  (global as any).ReadableStream = ReadableStream;
}
if (typeof global.WritableStream === 'undefined') {
  (global as any).WritableStream = WritableStream;
}
if (typeof global.TextEncoder === 'undefined') {
  (global as any).TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
  (global as any).TextDecoder = TextDecoder;
}
if (typeof global.ProgressEvent === 'undefined') {
  (global as any).ProgressEvent = class ProgressEvent extends Event {};
}
