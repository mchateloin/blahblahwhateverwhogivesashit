/* Tools for making working with the Spotify and Echo Nest APIs easier */

/* converts full URI to just the simple spotify id */
function fidToSpid(fid) {
    var fields = fid.split(':');
    return fields[fields.length - 1];
}

function getSpotifyPlayer(sessionId, seededArtists, callback) {
    var curSong = 0;
    var audio = null;
    var player = createPlayer();
    var seeds = seededArtists;

    window.playlist = [];
    var sessionId = sessionId;

    function addSpotifyInfoToPlaylist(list) {

        var tids = [];
        list.forEach(function(song) {
            var tid = fidToSpid(song.tracks[0].foreign_id);
            tids.push(tid);
        });

        if(tids.length == 0){
            return;
        }

        var spotify = new SpotifyWebApi();
        spotify.getTracks(tids).then(function(data){
            console.log('sptracks', tids, data);
            data.tracks.forEach(function(track, i) {
                list[i].spotifyTrackInfo = track;
                console.log("trackinfo", list[i].spotifyTrackInfo);
            });

            console.log('addSpotifyInfoToPlaylist list', list);
            var filtered = filterSongs(list);
            console.log('addSpotifyInfoToPlaylist filtered', filtered);
            playlist = playlist.concat(filtered);
            console.log('addSpotifyInfoToPlaylist playlist', playlist);

            //Some initialization only logic
            if(curSong === 0) {
                showCurSong(true);
                callback(player);
            }
        }).catch(function(error) {
            info("Whoops, had some trouble getting that playlist");
        });
    }


    function banArtist(artistUri){
        console.log("banArtist", "entering...");
        var url = config.echoNestHost + 'api/v4/playlist/dynamic/feedback';
        $.get(url, {
            'api_key': config.apiKey,
            'session_id': sessionId,
            'ban_artist': artistUri,
            '_': Math.floor(Date.now())
        })
        .done(function(data) {
            //info("");
            console.log('banArtists data', data);
        });

    }

    function filterSongs(songs) {
        var out = [];

        function isGoodSong(song) {
            if(!song.spotifyTrackInfo.preview_url){
                return false;
            }

            for(var iSeed = 0; iSeed < seededArtists.length; iSeed++){
                for(var iArtist = 0; iArtist < song.artist_foreign_ids.length; iArtist++){
                    console.log("checking", seededArtists[iSeed].uri, song.artist_foreign_ids[iArtist].foreign_id);
                    if(seededArtists[iSeed].uri === song.artist_foreign_ids[iArtist].foreign_id){
                        return false;
                    }
                }

            }

            return true;
        }

        songs.forEach(function(song) {
            if (isGoodSong(song)) {
                out.push(song);
            }
        });

        return out;
    }

    function showSong(song, autoplay) {
        $(player).find(".sp-album-art").attr('src', getBestImage(song.spotifyTrackInfo.album.images, 300).url);
        $(player).find(".sp-title").text(song.title);
        $(player).find(".sp-artist").text(song.artist_name);
        audio.attr('src', song.spotifyTrackInfo.preview_url);
        console.log("that song!", song);
        if (autoplay) {
            audio.get(0).play();
        }
    }


    function getBestImage(images, maxWidth) {
        var best = images[0];
        images.reverse().forEach(
            function(image) {
                if (image.width <= maxWidth) {
                    best = image;
                }
            }
        );
        return best;
    }

    function showCurSong(autoplay) {
        console.log('showCurSong', curSong, playlist[curSong]);
        showSong(playlist[curSong], autoplay);
    }

    function nextSong() {
        curSong++;

        console.log('nextSong curSong to from', curSong - 1, curSong);
        console.log('nextSong playlist', playlist);

        if (curSong < playlist.length) {
            showCurSong(true);
        } else {
            fetchNextTracks();
        }
    }

    function fetchNextTracks(){
        console.log("fetchNextTracks", "entering...");
        var url = config.echoNestHost + 'api/v4/playlist/dynamic/next';
        $.getJSON(url, {
                'api_key': config.apiKey,
                results: 1,
                'session_id': sessionId,
                '_': Math.floor(Date.now())
            })
            .done(function(data) {
                //info("");
                if (! ('songs' in data.response)) {
                    //info("Can't find that artist");
                } else {
                    console.log('fetchNextTracks', data);
                    addSpotifyInfoToPlaylist(data.response.songs);

                    if(curSong >= playlist.length){
                        fetchNextTracks();
                    } else {
                        showCurSong(true);
                    }
                }
            })
            .error( function() {
                //info("Whoops, had some trouble getting that batch of songs");
            }) ;
    }


    function prevSong() {
        if (curSong > 0) {
            curSong--;
            showCurSong(true);
        }
    }

    function togglePausePlay() {
        console.log('tpp', audio.get(0).paused);
        if (audio.get(0).paused) {
            audio.get(0).play();
        } else {
            audio.get(0).pause();
        }
    }

    function createPlayer() {
        var main = $("<div class='sp-player'>");
        var img = $("<img class='sp-album-art'>");
        var info  = $("<div class='sp-info'>");
        var title = $("<div class='sp-title'>");
        var artist = $("<div class='sp-artist'>");
        var controls = $("<div class='btn-group sp-controls'>");

        var next = $('<button class="btn btn-primary btn-sm" type="button"><span class="glyphicon glyphicon-forward"></span></button>');
        var prev = $('<button class="btn btn-primary btn-sm" type="button"><span class="glyphicon glyphicon-backward"></span></button>');
        var pausePlay = $('<button class="btn btn-primary btn-sm" type="button"><span class="glyphicon glyphicon-play"></span></button>');
        var ban = $('<button class="btn btn-primary btn-sm" type="button"><span class="glyphicon glyphicon-remove"></span></button>');

        audio = $("<audio>");
        audio.on('pause', function() {
            var pp = pausePlay.find("span");
            pp.removeClass('glyphicon-pause');
            pp.addClass('glyphicon-play');
        });

        audio.on('play', function() {
            var pp = pausePlay.find("span");
            pp.addClass('glyphicon-pause');
            pp.removeClass('glyphicon-play');
        });

        audio.on('ended', function() {
            console.log('ended');
            nextSong();
        });

        next.on('click', function() {
            nextSong();
        });

        pausePlay.on('click', function() {
            togglePausePlay();
        });

        prev.on('click', function() {
            prevSong();
        });

        ban.on('click', function(){
            for(var iArtist = 0; iArtist < playlist[curSong].artist_foreign_ids.length; iArtist++){
                banArtist(fidToSpid(playlist[curSong].artist_foreign_ids[iArtist].foreign_id));
            }
            nextSong();
        });

        info.append(title);
        info.append(artist);

        controls.append(prev);
        controls.append(pausePlay);
        controls.append(ban);
        controls.append(next);

        main.append(img);
        main.append(info);
        main.append(controls);

        main.bind('destroyed', function() {
            console.log('player destroyed');
            audio.pause();
        });
        return main;
    }

    fetchNextTracks();

    return player;
}

// set up a handler so if an element is destroyed,
// the 'destroyed' handler is invoked.
// See // http://stackoverflow.com/questions/2200494/jquery-trigger-event-when-an-element-is-removed-from-the-dom

(function($){
    $.event.special.destroyed = {
        remove: function(o) {
            if (o.handler) {
                o.handler()
            }
        }
    }
})(jQuery);