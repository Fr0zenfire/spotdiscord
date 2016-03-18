var Discord = require("discord.js");
var Spotify = require('spotify-web');
var SpotifyWebApi = require('spotify-web-api-node');
var shuffle = require('knuth-shuffle').knuthShuffle;
var express = require('express'),
  app = express(),
  router = express.Router()

// configuration shit
config = require("./config.json");

var spotifyApi = new SpotifyWebApi({
  clientId : config.spotify.api.clientId,
  clientSecret : config.spotify.api.clientSecret,
  redirectUri : config.spotify.api.redirectUri
});


/*

uncomment this shit when your auth code is rip

app.get('/callback', function (req, res) {
  var accessToken = req.params.token;
  res.send(accessToken);
});

*/

var reu = new Discord.Client();

reu.on("ready", function () {
  reu.joinVoiceChannel(config.discord.music_channel, function (error) {
    if (error != null) {
        console.log(error);
        process.exit(1);
    }
  });

  Spotify.login(config.spotify.username, config.spotify.password, function (err, spotify) {
    if (err) throw err;

    spotifyApi.clientCredentialsGrant()
      .then(function(data) {
        // Save the access token so that it's used in future calls
        spotifyApi.setAccessToken(data.body['access_token']);
        get_playlist(function (playlist) {
          play_track(spotify, playlist, playlist.pop());
        })
      });

  });

});

reu.on("disconnected", function () {
  console.log("Disconnected from Discord");
  process.exit(1);
});

reu.on("message", function (message) {
  if(message.cleanContent.indexOf('.add ') === 0) {
    search = message.cleanContent.replace('.add ','');
    reu.reply(message, "Searching for _" + search + "_.");
    spotifyApi.searchTracks(search)
      .then(function(data) {
        tracks = data.body.tracks.items;
        tracks.reverse
        track = tracks.pop()

      spotifyApi.authorizationCodeGrant(config.spotify.api.code)
        .then(function(data) {
          spotifyApi.setAccessToken(data.body['access_token']);
          return spotifyApi.addTracksToPlaylist(config.spotify.username, config.spotify.playlist, [track.uri])
        }).then(function(data) {
          reu.reply(message, "Added track **" + track.name + "** by **" + track.artists[0].name + "** to playlist.");
        }).catch(function(err) {
          reu.reply(message, "Unable to add song to the playlist.");
          console.log('Something went wrong!', err);
        });

      }, function(err) {
        console.error(err);
      });

  }
});

reu.login(config.discord.email, config.discord.password);

function play_track(spotify, playlist, uri) {
  spotify.get(uri, function (err, track) {
    if (err) throw err;
    reu.sendMessage(config.discord.announcement_channel, "Playing **" + track.name + "** by **" + track.artist[0].name + "**");
    reu.setStatus("idle", track.name + " by " + track.artist[0].name);

    // play() returns a readable stream of MP3 audio data
    stream = track.play()
    .on('finish', function () {
      if(playlist.length !== 0) {
        play_track(spotify, playlist, playlist.pop());
      } else {
        get_playlist(function (playlist) {
          play_track(spotify, playlist, playlist.pop());
        })
      }
    });

    reu.voiceConnection.playRawStream(stream, {});
  });
}

function get_playlist(callback) {
  var playlist = []

  spotifyApi.getPlaylist(config.spotify.username, config.spotify.playlist)
  .then(function(data) {

    total = data.body.tracks.total - 100
    offset = Math.floor(Math.random()*(total+1))


    // Get tracks in a playlist
    spotifyApi.getPlaylistTracks(config.spotify.username, config.spotify.playlist, { 'offset' : offset })
      .then(function(data) {
        //console.log('The playlist contains these tracks', data.body);
        tracks = data.body.items

        shuffle(tracks);

        tracks.forEach(function (element, index, array) {
          playlist.push(element.track.uri)
        });

        if(callback) callback(playlist);
      }, function(err) {
        console.log('Something went wrong!', err);
      });
  }, function(err) {
    console.log('Something went wrong!', err);
  });
}

/*
var scopes = ['playlist-read-private', 'playlist-modify-public', 'playlist-modify-private', ],
    state = 'connecting-to-spotify';

var authorizeURL = spotifyApi.createAuthorizeURL(scopes, state);

app.listen(6969, console.log('Server is running in port: 6969'));
*/
