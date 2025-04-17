import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { emit } from '@tauri-apps/api/event';
import { isTauri } from './platform';

interface PopoutWindowOptions {
  title: string;
  content: string;
  width?: number;
  height?: number;
}

export async function createPopoutWindow({ title, content, width = 800, height = 600 }: PopoutWindowOptions): Promise<void> {
  try {
    // Create window with unique label to avoid conflicts
    const label = `popout-${Date.now()}`;
    const webview = new WebviewWindow(label, {
      title,
      width,
      height,
      url: '/popout.html',
      center: true,
      focus: true,
      visible: false, // Start invisible to avoid flashing
    });

    // Handle window creation events properly
    const windowReady = new Promise<void>((resolve, reject) => {
      // Listen for window creation
      webview.once('tauri://created', () => {
        // Show window after it's ready
        webview.show();
        resolve();
      });

      // Listen for errors
      webview.once('tauri://error', (e) => {
        console.error('Error creating window:', e);
        reject(new Error('Failed to create window'));
      });

      // Set a timeout in case the window creation hangs
      setTimeout(() => {
        reject(new Error('Window creation timed out'));
      }, 10000);
    });

    // Wait for the window to be ready
    await windowReady;

    // Send content after a short delay to ensure the window is fully loaded
    setTimeout(async () => {
      try {
        await emit('set-content', { content, title });
      } catch (e) {
        console.error('Failed to send content to popout:', e);
      }
    }, 100);

  } catch (e) {
    console.error('Error creating popout window:', e);
    // Fallback to browser popup if Tauri window fails
    const popup = window.open('', title, `width=${width},height=${height}`);
    if (popup) {
      popup.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${title}</title>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <style>
              body { 
                margin: 0; 
                padding: 16px; 
                font-family: system-ui;
                background: var(--background, white);
                color: var(--foreground, black);
              }
              @media (prefers-color-scheme: dark) {
                body {
                  background: rgb(9, 9, 11);
                  color: rgb(250, 250, 250);
                }
              }
            </style>
          </head>
          <body>${content}</body>
        </html>
      `);
      popup.document.close();
    }
  }
} 