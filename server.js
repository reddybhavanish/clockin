var express = require('express');
var path = require('path');
const keytar = require('keytar')
const os = require('os')
var app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.get('/electrons', (req, res, next) => {
    console.log(os.userInfo().username, "accessToken", os.userInfo().username + "accessToken")
    console.log(os.userInfo().username, "refreshToken", os.userInfo().username + "refreshToken")
    let osUserName = os.userInfo().username;
    let accessTokenAccount = osUserName + "accessToken";
    let refreshTokenAccount = osUserName + 'refreshToken';
    let accessTokenExpiresAccount = osUserName + 'accessTokenExpires';
    // let service = 'electron-openid-oauth'
    let service = 'timeevents'
    
    keytar.getPassword(service, accessTokenAccount).then((token) => {
        keytar.getPassword(service, refreshTokenAccount).then((refreshToken) => {
            res.json({
                accessToken: token,
                refreshToken
            })
        }).catch((error) => {
            res.json({
                error: error,
                errorMessage: 'Error in Fetching  Refresh Token'
            })
        })
    }).catch((err) => {
        res.json({
            error: err,
            errorMessage: 'Error in Fetching the Access Token'
        })
    })
})

app.get('/delete-tokens', (req, res, next) => {
    console.log(os.userInfo().username, "accessToken", os.userInfo().username + "accessToken")
    console.log(os.userInfo().username, "refreshToken", os.userInfo().username + "refreshToken")
    let osUserName = os.userInfo().username;
    let accessTokenAccount = osUserName + "accessToken";
    let refreshTokenAccount = osUserName + 'refreshToken';
    // let service = 'electron-openid-oauth'
    let service = 'timeevents'

    let myarr = [accessTokenAccount, refreshTokenAccount, osUserName + 'accessTokenExpires', osUserName + 'EmplyeeId']
    myarr.map((record) => {
        let account = record;
        keytar.deletePassword(service, account).then((data) => {
            console.log('Account' + account + ' is deleted')
        }).catch((error) => {
            console.log('Unable to delete account' + account + ' from the keychain')
        })
    })
    res.json({ data: 'Tokens Deleted Successfully' })
})
// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;
