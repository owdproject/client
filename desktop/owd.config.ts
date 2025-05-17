import { defineDesktopConfig } from '@owdproject/core'

export default defineDesktopConfig({
  theme: '@owdproject/theme-win95',
  apps: [
    '@owdproject/app-about',
    '@owdproject/app-todo',
    '@owdproject/app-wasmboy',
    '@owdproject/app-atproto',
    '@owdproject/app-youtube',
    '@owdproject/app-soundcloud',
    '@owdproject/app-terminal',
    'owd-app-template',
    '@owdproject/app-debug',
  ],
  modules: [
    '@owdproject/module-atproto',
    '@owdproject/module-atproto-persistence',
    '@owdproject/module-atproto-jetstream',
    '@owdproject/module-webscrobbler',
    //'@owdproject/module-fs',
  ],
  fs: {
    mounts: {
      '/mnt/public': '/hUGETracker-1.0.11-linux.zip',
      '/tmp': 'InMemory',
      '/home': 'IndexedDB',
    },
  },
  atproto: {
    serviceEndpoint: {
      private: 'https://bsky.social',
      public: 'https://public.api.bsky.app',
    },
    oauth: {
      clientMetadata: {
        // url of your remote client_metadata.json, leave the field empty
        // to let `nuxt-atproto` generate a local /public/client_metadata.json
        remote: '',
        // configuration for the local client_metadata.json
        local: {
          client_id: 'http://127.0.0.1/client-metadata.json',
          client_name: 'nuxt-atproto',
          client_uri: 'http://127.0.0.1',
          logo_uri: 'http://127.0.0.1/logo.png',
          tos_uri: 'http://127.0.0.1',
          policy_uri: 'http://127.0.0.1',
          redirect_uris: ['http://127.0.0.1'],
          scope: 'atproto',
          grant_types: ['authorization_code', 'refresh_token'],
          response_types: ['code'],
          token_endpoint_auth_method: 'none',
          application_type: 'web',
          dpop_bound_access_tokens: true,
        },
      },
      signInOptions: {
        state: '',
        prompt: 'login',
        scope: 'atproto',
        ui_locales: 'en',
      },
    },
    debug: true,
  },
  atprotoDesktop: {
    owner: {
      did: 'did:plc:2pkidgvfnbxx7sq3shporxij',
    },
    name: {
      title: 'atproto',
      affix: 'OS',
    },
  },
  atprotoPersistence: {
    loadOwnerDesktopOnMounted: true,
  },
  atprotoJetstream: {
    startOwnerDesktopStreamOnMounted: true,
  },
})
