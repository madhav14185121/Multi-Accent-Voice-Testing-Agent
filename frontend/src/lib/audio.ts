export async function playBase64Wav(base64: string, mimeType: string = "audio/wav"): Promise<HTMLAudioElement> {
  return new Promise((resolve, reject) => {
    try {
      const binaryStr = window.atob(base64);
      const len = binaryStr.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      
      const blob = new Blob([bytes], { type: mimeType });
      const url = URL.createObjectURL(blob);
      
      const audio = new Audio();
      audio.src = url;
      
      const cleanup = () => {
        URL.revokeObjectURL(url);
      };
      
      audio.addEventListener("ended", cleanup, { once: true });
      audio.addEventListener("error", (e) => {
        cleanup();
        reject(e);
      }, { once: true });
      
      audio.play().then(() => {
        resolve(audio);
      }).catch(err => {
        cleanup();
        reject(err);
      });
      
    } catch (err) {
      reject(err);
    }
  });
}

export function getWavDurationMs(base64: string): number {
  try {
    // Best effort duration extraction from wav header could go here.
    // Since we receive the duration from the backend, we don't strictly need it in this task,
    // but the requirement asks for a best-effort getWavDurationMs.
    const binaryStr = window.atob(base64.substring(0, 100)); // only need header
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    
    // Check 'RIFF' and 'WAVE'
    if (bytes[0] === 82 && bytes[1] === 73 && bytes[2] === 70 && bytes[3] === 70 &&
        bytes[8] === 87 && bytes[9] === 65 && bytes[10] === 86 && bytes[11] === 69) {
          
      const view = new DataView(bytes.buffer);
      const byteRate = view.getUint32(28, true); // bytes per second
      
      // Find 'data' chunk size
      let offset = 12;
      while (offset < bytes.length - 8) {
        if (bytes[offset] === 100 && bytes[offset+1] === 97 && bytes[offset+2] === 116 && bytes[offset+3] === 97) {
          const dataSize = view.getUint32(offset + 4, true);
          return Math.floor((dataSize / byteRate) * 1000);
        }
        const chunkSize = view.getUint32(offset + 4, true);
        offset += 8 + chunkSize;
      }
    }
  } catch (e) {
    console.error("Failed to parse wav duration", e);
  }
  return 0;
}
