var express = require('express'); // Express web server framework
var request = require('request'); // "Request" library
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
var config = require('config');
console.log('env',process.env);
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

var spotifyKey = config.get('spotify.cookieName');

var app = express();

app.use(express.static(__dirname + '/public'))
    .use(cookieParser());

app.get('/mockup', function(req, res){
    res.sendfile('public/mockup.html');
});

app.get('/login/spotify', function(req, res) {

    var state = generateRandomString(16);
    res.cookie(spotifyKey, state);

    // your application requests authorization
    var scope = config.get('spotify.scope').join(' ');

    res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
        response_type: 'code',
        client_id: process.env.SPOTIFY_CLIENT_ID,
        scope: scope,
        redirect_uri:  req.protocol + '://' + req.get('host') + "/callback",
        state: state
    }));

    console.log(querystring.stringify({
        response_type: 'code',
        client_id: process.env.SPOTIFY_CLIENT_ID,
        scope: scope,
        redirect_uri: req.protocol + '://' + req.get('host') + "/callback",
        state: state
    }));
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
                redirect_uri:  req.protocol + '://' + req.get('host') + "/callback",
                grant_type: 'authorization_code'
            },
            headers: {
                'Authorization': 'Basic '
                + (new Buffer(process.env.SPOTIFY_CLIENT_ID + ':'
                + process.env.SPOTIFY_CLIENT_SECRET).toString('base64'))
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
        headers: { 'Authorization': 'Basic '
            + (new Buffer(process.env.SPOTIFY_CLIENT_ID + ':'
            + process.env.SPOTIFY_CLIENT_SECRET).toString('base64')) },
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

var port = process.env.PORT || config.get('port');
console.log('Listening on ' + port);
app.listen(port);
