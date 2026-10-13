import express, { Request, Response } from 'express';
import { GoogleAuthService } from './services/google-auth.service.js';

export function createHttpServer(googleAuthService: GoogleAuthService) {
  const app = express();
  const port = parseInt(process.env.HTTP_PORT || '3000', 10);

  // OAuth2 callback endpoint
  app.get('/oauth2callback', async (req: Request, res: Response) => {
    const code = req.query.code as string;
    const state = req.query.state as string;

    if (!code) {
      return res.status(400).send('Missing authorization code');
    }

    try {
      await googleAuthService.exchangeCodeForToken('default_user', code);
      
      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Authorization Successful</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              }
              .container {
                text-align: center;
                background: white;
                padding: 40px;
                border-radius: 10px;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
              }
              h1 {
                color: #333;
                margin: 0 0 10px 0;
              }
              p {
                color: #666;
                margin: 0;
              }
              .checkmark {
                font-size: 48px;
                margin-bottom: 20px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="checkmark">✅</div>
              <h1>Authorization Successful!</h1>
              <p>Your Google account has been connected.</p>
              <p>You can now close this window and return to your app.</p>
            </div>
            <script>
              setTimeout(() => {
                window.close();
              }, 2000);
            </script>
          </body>
        </html>
      `);
    } catch (error: any) {
      res.status(500).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Authorization Failed</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
              }
              .container {
                text-align: center;
                background: white;
                padding: 40px;
                border-radius: 10px;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
              }
              h1 {
                color: #333;
                margin: 0 0 10px 0;
              }
              p {
                color: #666;
                margin: 0;
              }
              .error-icon {
                font-size: 48px;
                margin-bottom: 20px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="error-icon">❌</div>
              <h1>Authorization Failed</h1>
              <p>${error.message}</p>
              <p>Please try again.</p>
            </div>
          </body>
        </html>
      `);
    }
  });

  // Health check endpoint
  app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  return app.listen(port, '0.0.0.0', () => {
    console.log(`HTTP server listening on http://0.0.0.0:${port}`);
  });
}
