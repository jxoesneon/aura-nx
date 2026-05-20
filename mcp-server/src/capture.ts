import * as net from 'net';

/**
 * Requests a screen capture frame from the Aura-NX sysmodule.
 * 
 * @param ip The IP address of the Nintendo Switch console.
 * @returns A base64 encoded string representing the captured frame (JPEG).
 */
export async function handleCaptureScreen(ip: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    const port = 12346;
    let chunks: Buffer[] = [];

    client.connect(port, ip, () => {
      const request = {
        jsonrpc: '2.0',
        method: 'capture_screen',
        params: {},
        id: 1
      };
      client.write(JSON.stringify(request));
    });

    client.on('data', (dataChunk) => {
      const chunk = Buffer.isBuffer(dataChunk) ? dataChunk : Buffer.from(dataChunk);
      chunks.push(chunk);
      
      // Attempt to parse only if we might have a complete JSON message
      // To be efficient, we don't toString() the whole thing unless it looks like it's done
      const lastChunk = chunk;
      if (lastChunk[lastChunk.length - 1] === 125 || lastChunk[lastChunk.length - 1] === 10) { // '}' or '\n'
        try {
          const data = Buffer.concat(chunks).toString('utf8');
          const response = JSON.parse(data);
          if (response.result) {
            resolve(response.result);
            client.destroy();
          } else if (response.error) {
            reject(new Error(response.error.message || 'Unknown JSON-RPC error'));
            client.destroy();
          }
        } catch (e) {
          // Incomplete JSON or other error, continue collecting chunks
        }
      }
    });

    client.on('error', (err) => {
      reject(err);
    });

    client.on('close', () => {
      if (chunks.length > 0) {
        try {
          const data = Buffer.concat(chunks).toString('utf8');
          const response = JSON.parse(data);
          if (response.result) {
            resolve(response.result);
          } else {
            reject(new Error('Incomplete or invalid response from sysmodule'));
          }
        } catch (e) {
          reject(new Error('Failed to parse response from sysmodule'));
        }
      } else {
        reject(new Error('Connection closed without data'));
      }
    });

    // Set a timeout
    client.setTimeout(5000);
    client.on('timeout', () => {
      client.destroy();
      reject(new Error('Connection timed out'));
    });
  });
}
