// URL & friends RN lacks
import 'react-native-url-polyfill/auto';

// Web Streams (Readable/Writable/Transform)
import { ReadableStream, WritableStream, TransformStream } from 'web-streams-polyfill';
(globalThis as any).ReadableStream  ??= ReadableStream;
(globalThis as any).WritableStream  ??= WritableStream;
(globalThis as any).TransformStream ??= TransformStream;

// Stream encoders/decoders
import TextDecoderStream from 'polyfill-text-decoder-stream';
import TextEncoderStream from 'polyfill-text-encoder-stream';
(globalThis as any).TextDecoderStream ??= TextDecoderStream;
(globalThis as any).TextEncoderStream ??= TextEncoderStream;