'use strict';

const Conf = require('conf');
const path = require('path');

const CONFIG_DEFAULTS = {
  baseUrl: 'https://app.needcitrus.com',
  profile: 'default'
};

/**
 * Config manages CLI configuration and authentication tokens.
 *
 * Storage layout (per profile):
 *   profiles.<name>.token   — JWT auth token
 *   profiles.<name>.baseUrl — API base URL
 *   profiles.<name>.user    — { id, email, display_name, role }
 *   activeProfile           — current profile name
 */
class Config {
  constructor() {
    this._store = new Conf({
      projectName: 'citrus-cli',
      schema: {
        activeProfile: { type: 'string', default: 'default' },
        profiles: { type: 'object', default: {} }
      }
    });
  }

  /** Get the active profile name */
  get activeProfile() {
    return this._store.get('activeProfile', 'default');
  }

  /** Set the active profile */
  set activeProfile(name) {
    this._store.set('activeProfile', name);
  }

  /** Get a profile's data */
  getProfile(name) {
    const profiles = this._store.get('profiles', {});
    return profiles[name || this.activeProfile] || {};
  }

  /** Set a profile's data (merge) */
  setProfile(name, data) {
    const profileName = name || this.activeProfile;
    const profiles = this._store.get('profiles', {});
    profiles[profileName] = { ...(profiles[profileName] || {}), ...data };
    this._store.set('profiles', profiles);
  }

  /** Delete a profile */
  deleteProfile(name) {
    const profiles = this._store.get('profiles', {});
    delete profiles[name];
    this._store.set('profiles', profiles);
  }

  /** List all profile names */
  listProfiles() {
    return Object.keys(this._store.get('profiles', {}));
  }

  /** Get the auth token for the current (or given) profile */
  getToken(profileName) {
    const p = this.getProfile(profileName);
    return p.token || null;
  }

  /** Set auth token + user info after login */
  setAuth(token, user, profileName) {
    this.setProfile(profileName, { token, user });
  }

  /** Clear auth for a profile */
  clearAuth(profileName) {
    const pName = profileName || this.activeProfile;
    const profiles = this._store.get('profiles', {});
    if (profiles[pName]) {
      delete profiles[pName].token;
      delete profiles[pName].user;
      this._store.set('profiles', profiles);
    }
  }

  /** Get the base URL for the current (or given) profile */
  getBaseUrl(profileName) {
    const p = this.getProfile(profileName);
    return p.baseUrl || CONFIG_DEFAULTS.baseUrl;
  }

  /** Set the base URL for a profile */
  setBaseUrl(url, profileName) {
    this.setProfile(profileName, { baseUrl: url });
  }

  /** Get the user info for the current profile */
  getUser(profileName) {
    const p = this.getProfile(profileName);
    return p.user || null;
  }

  /** Get the config file path (for debugging) */
  get path() {
    return this._store.path;
  }

  /** Reset all config */
  reset() {
    this._store.clear();
  }
}

module.exports = new Config();
