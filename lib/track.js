var defaults = require('./defaults')
var lastfm = require('./lastfm')(defaults.api)
var spotify = require('./spotify')

/**
 * Create track entry.
 * @constructor
 * @param {string} entry - The track to search for.
 * @param {JSON} [response] - Track response object.
 * Should have the property `popularity`.
 * @param {JSON} [responseSimple] - Simplified track response object.
 */
function Track (entry, response) {
  /**
   * Entry string.
   */
  this.entry = entry.trim()

  /**
   * Full track object.
   */
  this.response = null

  /**
   * Simplified track object.
   */
  this.responseSimple = null

  if (this.isFullResponse(response)) {
    this.response = response
  } else {
    this.responseSimple = response
  }
}

/**
 * Track album.
 * @return {string} The track album,
 * or the empty string if not available.
 */
Track.prototype.album = function () {
  if (this.response &&
      this.response.album &&
      this.response.album.name) {
    return this.response.album.name
  } else {
    return ''
  }
}

/**
 * Track main artist.
 * @return {string} The main artist.
 */
Track.prototype.artist = function () {
  var response = this.response || this.responseSimple
  if (response &&
      response.artists &&
      response.artists[0] &&
      response.artists[0].name) {
    return response.artists[0].name.trim()
  } else {
    return ''
  }
}

/**
 * Track artists.
 * @return {string} All the track artists, separated by `, `.
 */
Track.prototype.artists = function () {
  var artists = []
  var response = this.response || this.responseSimple
  if (response &&
      response.artists) {
    artists = this.response.artists.map(function (artist) {
      return artist.name.trim()
    })
  }
  return artists.join(', ')
}

/**
 * Dispatch entry.
 * @return {Promise | Track} Itself.
 */
Track.prototype.dispatch = function () {
  if (this.response) {
    return Promise.resolve(this)
  } else if (this.responseSimple) {
    return this.fetchTrack()
  } else if (this.isURI(this.entry)) {
    return this.fetchTrack()
  } else if (this.isLink(this.entry)) {
    return this.fetchTrack()
  } else {
    return this.searchForTrack(this.entry)
  }
}

/**
 * Whether this track is identical to another track.
 * @param {Track} track - The track to compare against.
 * @return {boolean} `true` if the tracks are identical,
 * `false` otherwise.
 */
Track.prototype.equals = function (track) {
  var str1 = this.toString().toLowerCase()
  var str2 = track.toString().toLowerCase()
  return str1 === str2
}

/**
 * Fetch Last.fm information.
 * @return {Promise | Track} Itself.
 */
Track.prototype.fetchLastfm = function () {
  var artist = this.artist()
  var title = this.title()
  var self = this
  return lastfm.getInfo(artist, title).then(function (result) {
    self.lastfmResponse = result
    return self
  })
}

/**
 * Fetch track metadata.
 * @return {Promise | Track} Itself.
 */
Track.prototype.fetchTrack = function () {
  var id = this.id()
  var url = 'https://api.spotify.com/v1/tracks/'
  url += encodeURIComponent(id)
  var self = this
  return spotify.request(url).then(function (result) {
    self.response = result
    return self
  })
}

/**
 * Spotify ID.
 * @return {string} The Spotify ID of the track,
 * or `-1` if not available.
 */
Track.prototype.id = function () {
  if (this.response &&
      this.response.id) {
    return this.response.id
  } else if (this.responseSimple &&
             this.responseSimple.id) {
    return this.responseSimple.id
  } else if (this.isURI(this.entry)) {
    return this.entry.substring(14)
  } else if (this.isLink(this.entry)) {
    return this.entry.split('/')[4]
  } else {
    return -1
  }
}

/**
 * Whether a track object is full or simplified.
 * A full object includes information (like popularity)
 * that a simplified object does not.
 */
Track.prototype.isFullResponse = function (response) {
  return response && response.popularity
}

/**
 * Whether a string is a Spotify link
 * on the form `http://open.spotify.com/track/ID`.
 * @param {string} str - A potential Spotify link.
 * @return {boolean} `true` if `str` is a link, `false` otherwise.
 */
Track.prototype.isLink = function (str) {
  return str.match(/^https?:\/\/open\.spotify\.com\/track\//i)
}

/**
 * Whether a string is a Spotify URI
 * on the form `spotify:track:xxxxxxxxxxxxxxxxxxxxxx`.
 * @return {boolean} `true`
 * or `-1` if not available.
 */
Track.prototype.isURI = function (str) {
  return str.match(/^spotify:track:/i)
}

/**
 * Last.fm playcount.
 * @return {integer} The playcount, or `-1` if not available.
 */
Track.prototype.lastfm = function () {
  if (this.lastfmResponse) {
    return parseInt(this.lastfmResponse.track.playcount)
  } else {
    return -1
  }
}

/**
 * Full track name.
 * @return {string} The track name, on the form `Title - Artist`.
 */
Track.prototype.name = function () {
  var title = this.title()
  if (title !== '') {
    var artist = this.artist()
    if (artist !== '') {
      return title + ' - ' + artist
    } else {
      return title
    }
  } else {
    return ''
  }
}

/**
 * Spotify popularity.
 * @return {int} The Spotify popularity, or `-1` if not available.
 */
Track.prototype.popularity = function () {
  if (this.response) {
    return this.response.popularity
  } else {
    return -1
  }
}

/**
 * Search for track.
 * @param {string} query - The query text.
 * @return {Promise | Track} Itself.
 */
Track.prototype.searchForTrack = function (query) {
  // https://developer.spotify.com/web-api/search-item/
  var url = 'https://api.spotify.com/v1/search?type=track&q='
  url += encodeURIComponent(query)
  var self = this
  return spotify.request(url).then(function (result) {
    if (result.tracks &&
        result.tracks.items[0] &&
        result.tracks.items[0].uri) {
      self.responseSimple = result.tracks.items[0]
      return self
    }
  })
}

/**
 * Track title.
 * @return {string} The track title.
 */
Track.prototype.title = function () {
  var response = this.response || this.responseSimple
  if (response &&
      response.name) {
    return response.name
  } else {
    return ''
  }
}

/**
 * Full track title.
 * @return {string} The track title, on the form `Title - Artist`.
 */
Track.prototype.toString = function () {
  var name = this.name()
  if (name !== '') {
    return name
  } else {
    return this.entry
  }
}

/**
 * Spotify URI.
 * @return {string} The Spotify URI
 * (a string on the form `spotify:track:xxxxxxxxxxxxxxxxxxxxxx`),
 * or the empty string if not available.
 */
Track.prototype.uri = function () {
  if (this.response) {
    return this.response.uri
  } else if (this.responseSimple) {
    return this.responseSimple.uri
  } else {
    return ''
  }
}

module.exports = Track