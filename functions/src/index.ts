/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import axios, { AxiosError } from 'axios';
import { PassThrough } from 'stream';

exports.forwardDlpRequest = onRequest({ cors: true }, async (request, response) => {
  logger.info("Received request to forward DLP request", { structuredData: true });

  try {
    const urlinput = request.query.url; // Assuming URL comes as query param
    if (!urlinput) {
      response.status(400).send('URL parameter is required');
    }

    const streamResponse = await axios.get(
      encodeURI(`https://ytdlp.online/stream?command=${urlinput}`),
      {
        responseType: 'stream',
        timeout: 30000 // 30-second timeout
      }
    );

    // Forward appropriate headers
    response.setHeader('Content-Type', streamResponse.headers['content-type'] || 'application/octet-stream');
    if (streamResponse.headers['content-length']) {
      response.setHeader('Content-Length', streamResponse.headers['content-length']);
    }

    // Create a pass-through stream for better error handling
    const passThrough = new PassThrough();

    // Pipe the axios stream through our pass-through to the response
    streamResponse.data.pipe(passThrough).pipe(response);

    // Cleanup on client disconnect
    request.on('close', () => {
      streamResponse.data.destroy();
      passThrough.destroy();
    });

    // Handle stream errors
    passThrough.on('error', (error) => {
      logger.error('Stream error:', error);
      if (!response.headersSent) {
        response.status(500).send('Stream error occurred');
      }
      streamResponse.data.destroy();
    });

  } catch (error) {
    logger.error('Proxy error:', error);

    if (axios.isAxiosError(error)) {
      if (error.response) {
        // Forward error response from upstream
        response.status(error.response.status)
          .set(error.response.headers)
          .send(error.response.data);
      }
      response.status(500).send(error.message || 'Upstream request failed');
    }

    response.status(500).send('Internal server error');
  }

});


exports.fileProxy = onRequest({cors: true}, async (req, res) => {
  const url = req.query.url;

  if (!url) {
    res.status(400).send('Missing URL parameter');
    return;
  }

  try {
    const response = await axios.get(url.toString(), {
      responseType: 'arraybuffer',
    });

    if (response.headers['content-type']) {
      res.set('Content-Type', response.headers['content-type']);
    }

    res.status(response.status).send(response.data);
  } catch (error) {
    console.error('Error fetching file:', error);

    const axiosError = error as AxiosError;
    if (axiosError.response) {
      // Forward the status code and message from the upstream error
      res.status(axiosError.response.status)
        .send(`Failed to fetch: ${axiosError.message}`);
    } else if (axiosError.request) {
      // The request was made but no response was received
      res.status(504).send('Upstream server did not respond');
    } else {
      // Something happened in setting up the request
      res.status(500).send('Internal server error');

    }
  }
});
