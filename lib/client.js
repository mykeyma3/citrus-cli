'use strict';

const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');
const config = require('./config');

/**
 * HTTP client for the Citrus Platform API.
 *
 * Handles authentication, JSON serialization, error handling,
 * and provides a clean interface for all API operations.
 *
 * Usage:
 *   const client = require('./client');
 *   const workspaces = await client.get('/api/workspaces');
 *   const flow = await client.post('/api/flows', { name: 'My Flow', workspace_id: 1 });
 */
class Client {
  constructor() {
    this._baseUrl = null;
    this._token = null;
    this._profile = null;
  }

  /**
   * Initialize with CLI options (called once per command execution).
   * @param {object} opts - { baseUrl, profile, json, quiet }
   */
  init(opts = {}) {
    this._profile = opts.profile || config.activeProfile;
    this._baseUrl = opts.baseUrl || config.getBaseUrl(this._profile);
    this._token = config.getToken(this._profile);

    // Strip trailing slash
    if (this._baseUrl.endsWith('/')) {
      this._baseUrl = this._baseUrl.slice(0, -1);
    }
  }

  /** Set token directly (used during login before it's saved) */
  setToken(token) {
    this._token = token;
  }

  /** Build full URL */
  _url(path) {
    return `${this._baseUrl}${path}`;
  }

  /** Build headers */
  _headers(extra = {}) {
    const h = {
      'Accept': 'application/json',
      'User-Agent': 'citrus-cli',
      ...extra
    };
    if (this._token) {
      h['Authorization'] = `Bearer ${this._token}`;
    }
    return h;
  }

  /**
   * Make an HTTP request.
   * @param {string} method - GET, POST, PUT, PATCH, DELETE
   * @param {string} path - API path (e.g., '/api/workspaces')
   * @param {object|null} body - Request body (JSON)
   * @param {object} opts - { headers, raw, formData }
   * @returns {Promise<object>} - Parsed JSON response
   */
  async request(method, path, body = null, opts = {}) {
    const url = this._url(path);
    const fetchOpts = {
      method,
      headers: this._headers(opts.headers || {})
    };

    if (body && !opts.formData) {
      fetchOpts.headers['Content-Type'] = 'application/json';
      fetchOpts.body = JSON.stringify(body);
    } else if (opts.formData) {
      // FormData sets its own content-type with boundary
      delete fetchOpts.headers['Content-Type'];
      fetchOpts.body = opts.formData;
      // Merge FormData headers
      Object.assign(fetchOpts.headers, opts.formData.getHeaders());
    }

    let res;
    try {
      res = await fetch(url, fetchOpts);
    } catch (err) {
      throw new Error(`Network error: ${err.message}. Is the Citrus server running at ${this._baseUrl}?`);
    }

    // Handle non-JSON responses (e.g., CSV export)
    if (opts.raw) {
      if (!res.ok) {
        const text = await res.text();
        throw new ClientError(res.status, text);
      }
      return { status: res.status, body: await res.text(), headers: res.headers };
    }

    let data;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await res.json();
    } else {
      const text = await res.text();
      if (!res.ok) throw new ClientError(res.status, text);
      return { status: res.status, body: text };
    }

    if (!res.ok) {
      const msg = data.error || data.message || JSON.stringify(data);
      throw new ClientError(res.status, msg);
    }

    return data;
  }

  /** GET */
  async get(path, opts) {
    return this.request('GET', path, null, opts);
  }

  /** POST */
  async post(path, body, opts) {
    return this.request('POST', path, body, opts);
  }

  /** PUT */
  async put(path, body, opts) {
    return this.request('PUT', path, body, opts);
  }

  /** PATCH */
  async patch(path, body, opts) {
    return this.request('PATCH', path, body, opts);
  }

  /** DELETE */
  async del(path, body, opts) {
    return this.request('DELETE', path, body, opts);
  }

  /**
   * Upload a file via multipart/form-data.
   * @param {string} path - API path
   * @param {string} fieldName - Form field name
   * @param {string} filePath - Path to the file on disk
   * @param {object} extraFields - Additional form fields
   */
  async upload(path, fieldName, filePath, extraFields = {}) {
    const form = new FormData();
    form.append(fieldName, fs.createReadStream(filePath));
    for (const [k, v] of Object.entries(extraFields)) {
      form.append(k, v);
    }
    return this.request('POST', path, null, { formData: form });
  }
}

class ClientError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'ClientError';
    this.status = status;
  }
}

// Singleton
const client = new Client();
client.ClientError = ClientError;

module.exports = client;
