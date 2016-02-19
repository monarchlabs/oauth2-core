/**
 * Copyright 2013-present NightWorld.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var mongoose = require('mongoose'),
    encrypt = require('mongoose-encryption'),
    Schema = mongoose.Schema,
    model = module.exports;

mongoose.connect('mongodb://localhost:27017/test');
var secret = process.env.AES_KEY; //keep this key somewhere

//
// Schemas definitions
//
var OAuthAccessTokensSchema = new Schema({
    accessToken: {
        type: String
    },
    clientId: {
        type: String
    },
    userId: {
        type: String
    },
    expires: {
        type: Date
    }
});

var OAuthRefreshTokensSchema = new Schema({
    refreshToken: {
        type: String
    },
    clientId: {
        type: String
    },
    userId: {
        type: String
    },
    expires: {
        type: Date
    }
});

var OAuthClientsSchema = new Schema({
    clientId: {
        type: String
    },
    clientSecret: {
        type: String
    },
    redirectUri: {
        type: String
    }
});

var OAuthUsersSchema = new Schema({
    username: {
        type: String,
        index: {
            unique: true
        }
    },
    password: {
        type: String
    },
    firstname: {
        type: String
    },
    lastname: {
        type: String
    },
    email: {
        type: String,
        default: ''
    }
});

OAuthUsersSchema.plugin(encrypt, {
    key: secret,
    encryptedFields: ['password']
});

mongoose.model('OAuthAccessTokens', OAuthAccessTokensSchema);
mongoose.model('OAuthRefreshTokens', OAuthRefreshTokensSchema);
mongoose.model('OAuthClients', OAuthClientsSchema);
mongoose.model('OAuthUsers', OAuthUsersSchema);

var OAuthAccessTokensModel = mongoose.model('OAuthAccessTokens'),
    OAuthRefreshTokensModel = mongoose.model('OAuthRefreshTokens'),
    OAuthClientsModel = mongoose.model('OAuthClients'),
    OAuthUsersModel = mongoose.model('OAuthUsers');

//
// oauth2-server callbacks
//
model.getAccessToken = function(bearerToken, callback) {
    console.log('in getAccessToken (bearerToken: ' + bearerToken + ')');

    OAuthAccessTokensModel.findOne({
        accessToken: bearerToken
    }, callback);
};

model.getClient = function(clientId, clientSecret, callback) {
    console.log('in getClient (clientId: ' + clientId + ', clientSecret: ' + clientSecret + ')');

    if (clientSecret === null) {
        return OAuthClientsModel.findOne({
            clientId: clientId
        }, callback);
    }
    OAuthClientsModel.findOne({
        clientId: clientId,
        clientSecret: clientSecret
    }, callback);
};

model.testConnection = function() {
    console.log('testing mongo connection.....');

    //OAuthAccessTokensModel.findOne({ accessToken: bearerToken }, callback);
    return mongoose.connection.readyState;
};

// This will very much depend on your setup, I wouldn't advise doing anything exactly like this but
// it gives an example of how to use the method to resrict certain grant types
var authorizedClientIds = ['s6BhdRkqt3', 'login'];
model.grantTypeAllowed = function(clientId, grantType, callback) {
    console.log('in grantTypeAllowed (clientId: ' + clientId + ', grantType: ' + grantType + ')');

    if (grantType === 'password') {
        return callback(false, authorizedClientIds.indexOf(clientId) >= 0);
    }

    callback(false, true);
};

model.saveAccessToken = function(token, clientId, expires, userId, callback) {
    console.log('in saveAccessToken (token: ' + token + ', clientId: ' + clientId + ', userId: ' + userId + ', expires: ' + expires + ')');

    var accessToken = new OAuthAccessTokensModel({
        accessToken: token,
        clientId: clientId,
        userId: userId,
        expires: expires
    });

    accessToken.save(callback);
};

/*
 * Required to support password grant type
 */
model.getUser = function(username, password, callback) {
    console.log('in getUser (username: ' + username);

    OAuthUsersModel.findOne({
        username: username
    }, function(err, user) {
        if (err) return callback(err);
        if (user.password === password) {
            return callback(null, user._id);
        } else {
            return callback(err);
        }
    });
};


model.checkUsername = function(username, callback) {

    OAuthUsersModel.findOne({
        username: username
    }, function(err, user) {
        if (err) return callback(err);
        if (user) {
            return callback(null, true);
        } else {
            return callback(null, false);
        }
    });

}

model.checkEmail = function(email, callback) {

    OAuthUsersModel.findOne({
        email: email
    }, function(err, user) {
        if (err) return callback(err);
        if (user) {
            return callback(null, true);
        } else {
            return callback(null, false);
        }
    });

}



model.saveUser = function(post, callback) {

    newuser = new OAuthUsersModel({
        username: post.username,
        password: post.password,
        email: post.email
    });

    newuser.save(callback);
};

/*
 * Required to support refreshToken grant type
 */
model.saveRefreshToken = function(token, clientId, expires, userId, callback) {
    console.log('in saveRefreshToken (token: ' + token + ', clientId: ' + clientId + ', userId: ' + userId + ', expires: ' + expires + ')');

    var refreshToken = new OAuthRefreshTokensModel({
        refreshToken: token,
        clientId: clientId,
        userId: userId,
        expires: expires
    });

    refreshToken.save(callback);
};

model.getRefreshToken = function(refreshToken, callback) {
    console.log('in getRefreshToken (refreshToken: ' + refreshToken + ')');

    OAuthRefreshTokensModel.findOne({
        refreshToken: refreshToken
    }, callback);
};
