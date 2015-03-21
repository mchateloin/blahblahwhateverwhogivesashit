var express = require('express'); // Express web server framework
var request = require('request'); // "Request" library
var querystring = require('querystring');
var cookieParser = require('cookie-parser');

var spotify_client_id = 'dd2fe3ab80ba4853a0b3c6dd6c919e3d'; // Your client id
var spotify_client_secret = '4902c49e25fa49d092989d579b0cd1c8'; // Your client secret
var spotify_callback_url = 'http://localhost:8888/callback';
var lastfm_api_key = 'dfcfa1d46b9c653c708b7840f98f7b1f'
var lastfm_secret =  '5cc262f75a83de702aff7e3ec28d3f27'
var lastfm_callback_url = 'http://localhost:8888/callback/lastfm';
var echonest_api_key = 'ING7YKMEMYCTJJHGT';
var echonest_consumer_key = 'e45e7b50ea464e12e8b6dbde3070eb8f';
var echonest_shared_secret = 'Le4kIQhOQ8SdyZ2Mk6Z7CA';


/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
var generateRandomString = function(length) {
    var text = '';
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (var i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};

var spotifyKey = 'spotify_auth';
var lastfmKey = 'lastfm_auth';

var app = express();

app.use(express.static(__dirname + '/public'))
    .use(cookieParser());

app.get('/mockup', function(req, res){
    res.sendfile('public/mockup.html');
});

app.get('/login/lastfm', function(req, res) {
    res.redirect('http://www.last.fm/api/auth/?' +
    querystring.stringify({
        api_key: lastfm_api_key,
		cb: lastfm_callback_url,
    }));

    console.log(querystring.stringify({
        api_key: lastfm_api_key,
		cb: lastfm_callback_url,
    }));
});


app.get('/login/spotify', function(req, res) {

    var state = generateRandomString(16);
    res.cookie(spotifyKey, state);

    // your application requests authorization
    var scope = 'user-read-private user-read-email user-library-read playlist-read-private playlist-modify playlist-modify-public playlist-modify-private';
    res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
        response_type: 'code',
        client_id: spotify_client_id,
        scope: scope,
        redirect_uri: spotify_callback_url,
        state: state
    }));

    console.log(querystring.stringify({
        response_type: 'code',
        client_id: spotify_client_id,
        scope: scope,
        redirect_uri: spotify_callback_url,
        state: state
    }));
});

app.get('/callback/lastfm', function(req, res) {
	var token = req.query.token || null;
    var storedToken = req.cookies ? req.cookies[lastfmKey] : null;
	
	if (token === null || token !== storedTolken) {
        res.redirect('/#' +
        querystring.stringify({
            error: 'state_mismatch'
        }));
    } else {
		res.clearCookie(lastfmToken);
		var authOptions = {
            url: 'http://ws.audioscrobbler.com/2.0/?' +
			querystring.stringify({
				method: 'auth.gettoken',
				api_sig: 'auth.gettoken',
				api_key: lastfm_api_key,
				token: token,
				format: 'json'
			})
        };
		
		request.get(authOptions, function(error, response, body){
				console.log(response.statusCode);
				console.log(body);
				
				if (!error && response.statusCode === 200) {

				var sessionKey = body.session.key,
					  username = bodysession.name;

                res.redirect('/#' +
                querystring.stringify({
                    sessionKey: sessionKey,
                    username: username
                }));
            } else {
                res.redirect('/#' +
                querystring.stringify({
                    error: 'invalid_token'
                }));
            }
		});
    }
});

//Spotify requires the callback URL path to be named 'callback.' Will keep it like this for now until some other API
//requires the same thing and then we can just conditionally redirect based on the sender.
app.get('/callback', function(req, res) {

    // your application requests refresh and access tokens
    // after checking the state parameter

    var code = req.query.code || null;
    var state = req.query.state || null;
    var storedState = req.cookies ? req.cookies[spotifyKey] : null;

    if (state === null || state !== storedState) {
        res.redirect('/#' +
        querystring.stringify({
            error: 'state_mismatch'
        }));
    } else {
        res.clearCookie(spotifyKey);
        var authOptions = {
            url: 'https://accounts.spotify.com/api/token',
            form: {
                code: code,
                redirect_uri: spotify_callback_url,
                grant_type: 'authorization_code'
            },
            headers: {
                'Authorization': 'Basic ' + (new Buffer(spotify_client_id + ':' + spotify_client_secret).toString('base64'))
            },
            json: true
        };

        request.post(authOptions, function(error, response, body) {
            if (!error && response.statusCode === 200) {

                var access_token = body.access_token,
                    refresh_token = body.refresh_token;

                var options = {
                    url: 'https://api.spotify.com/v1/me',
                    headers: { 'Authorization': 'Bearer ' + access_token },
                    json: true
                };

                // use the access token to access the Spotify Web API
                request.get(options, function(error, response, body) {
                    console.log(body);
                });

                // we can also pass the token to the browser to make requests from there
                res.redirect('/#' +
                querystring.stringify({
                    access_token: access_token,
                    refresh_token: refresh_token
                }));
            } else {
                res.redirect('/#' +
                querystring.stringify({
                    error: 'invalid_token'
                }));
            }
        });
    }
});

app.get('/refresh_token', function(req, res) {

    // requesting access token from refresh token
    var refresh_token = req.query.refresh_token;
    var authOptions = {
        url: 'https://accounts.spotify.com/api/token',
        headers: { 'Authorization': 'Basic ' + (new Buffer(spotify_client_id + ':' + spotify_client_secret).toString('base64')) },
        form: {
            grant_type: 'refresh_token',
            refresh_token: refresh_token
        },
        json: true
    };

    request.post(authOptions, function(error, response, body) {
        if (!error && response.statusCode === 200) {
            var access_token = body.access_token;
            res.send({
                'access_token': access_token
            });
        }
    });
});

console.log('Listening on 8888');
app.listen(8888);
