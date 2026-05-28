/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Extracts the audio track from a video file, downmixes it to mono,
 * and downsamples it to a lightweight 16kHz WAV format in the browser.
 */
export async function extractAudioToWav(videoFile: File, onProgress?: (msg: string) => void): Promise<Blob> {
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  if (onProgress) onProgress("Parsing video metadata...");
  const arrayBuffer = await videoFile.arrayBuffer();
  
  if (onProgress) onProgress("Decoding audio track inside video...");
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  
  // Clean up initial audio context
  await audioCtx.close();
  
  const targetSampleRate = 16000;
  const duration = audioBuffer.duration;
  const numChannels = 1; // Downmix to 1 channel (mono) for maximum size reduction
  
  if (onProgress) onProgress("Resampling audio to 16kHz mono...");
  
  // Use OfflineAudioContext for fast, hardware-accelerated rendering in-memory
  const offlineCtx = new OfflineAudioContext(
    numChannels,
    Math.ceil(duration * targetSampleRate),
    targetSampleRate
  );
  
  const bufferSource = offlineCtx.createBufferSource();
  bufferSource.buffer = audioBuffer;
  bufferSource.connect(offlineCtx.destination);
  bufferSource.start();
  
  const renderedBuffer = await offlineCtx.startRendering();
  
  if (onProgress) onProgress("Formatting audio to WAV...");
  const wavBytes = bufferToWav(renderedBuffer);
  
  return new Blob([wavBytes], { type: "audio/wav" });
}

function bufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const sampleRate = buffer.sampleRate;
  const bitDepth = 16;
  const channelData = buffer.getChannelData(0); // we compiled as Mono
  const bytesPerSample = bitDepth / 8;
  
  const arrayBuffer = new ArrayBuffer(44 + channelData.length * bytesPerSample);
  const view = new DataView(arrayBuffer);
  
  /* RIFF identifier */
  writeString(view, 0, "RIFF");
  /* file length */
  view.setUint32(4, 36 + channelData.length * bytesPerSample, true);
  /* RIFF type */
  writeString(view, 8, "WAVE");
  /* format chunk identifier */
  writeString(view, 12, "fmt ");
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw LPCM = 1) */
  view.setUint16(20, 1, true);
  /* channel count (mono = 1) */
  view.setUint16(22, 1, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * bytesPerSample, true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, bytesPerSample, true);
  /* bits per sample */
  view.setUint16(34, bitDepth, true);
  /* data chunk identifier */
  writeString(view, 36, "data");
  /* data chunk length */
  view.setUint32(40, channelData.length * bytesPerSample, true);
  
  floatTo16BitPCM(view, 44, channelData);
  
  return arrayBuffer;
}

function floatTo16BitPCM(output: DataView, offset: number, input: Float32Array) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
