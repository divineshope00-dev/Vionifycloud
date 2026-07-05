import serverless from 'serverless-http';
import { app } from '../../src/api';

export const handler = serverless(app, {
  request(request: any, event: any) {
    if (event.body) {
      request.rawBody = event.isBase64Encoded
        ? Buffer.from(event.body, 'base64')
        : Buffer.from(event.body);
    }
  }
});
