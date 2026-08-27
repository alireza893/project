// Deployment settings that may change over time.
//
// Change UPDATE_HOST here if the update server ever moves; that is the only
// place the address appears. The value is baked into the build, so a change
// takes effect for users on their next update.
//
// It can also be overridden at runtime without rebuilding, which is useful for
// testing against a staging server:
//   PISHFAKTOR_UPDATE_HOST=http://1.2.3.4 npm start

/** DigitalOcean droplet serving the update files. No trailing slash. */
const UPDATE_HOST = process.env.PISHFAKTOR_UPDATE_HOST || 'http://129.212.254.115:8081'

module.exports = { UPDATE_HOST }
