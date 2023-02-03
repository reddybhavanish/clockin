const fs = require('fs');
const db = require('../database/secure-database');
const envVariables = require('../env-variables');
const log = require('electron-log');

module.exports = class AutenticationService {
	constructor(keytar, moment, os, oAuthprovider, redirectUri, axios) {
		this._keytar = keytar;
		this._moment = moment;
		this._keytarService = 'timeevents';
		this._oAuthprovider = oAuthprovider;
		this._redirectUri = redirectUri;
		this._keytarAccount = os.userInfo().username;
		this._accessTokenAccount = this._keytarAccount + "accessToken";
		this._refreshTokenAccount = this._keytarAccount + "refreshToken";
		this._accessTokenExpiresAccount = this._keytarAccount + "accessTokenExpires";
		this._axios = axios;
	}

	getRedirectUri() {
		return this._redirectUri;
	}

	getAuthenticationURL() {
		return this._oAuthprovider.getAuthUrl(this._redirectUri);
	}

	getLogOutUrl() {
		return this._oAuthprovider.getLogOutUrl();
	}

	/**
	 * 
	 * @param {String} accessToken 
	 * @description Function to store the access token in the keychain
	 */
	storeAccessToken(accessToken) {
		console.log("Storing token value: ");
		this._keytar.setPassword(this._keytarService, this._accessTokenAccount, accessToken);
	}

	/**
	 * 
	 * @param {String} refreshToken 
	 * @description Function to store the refresh token in the keychain
	 */
	storeRefreshToken(refreshToken) {
		console.log("Storing refresh token value: ");
		this._keytar.setPassword(this._keytarService, this._refreshTokenAccount, refreshToken);
	}

	/**
	 * 
	 * @param {Date} expiresIn 
	 * @description Function to store the expiry time of the access token in the keychain.
	 */
	storeAccessTokenExpiry(expiresIn) {
		let expiry = this._moment().add(expiresIn, 'seconds');
		console.log(" storing expiry: " + expiry.toISOString());
		this._keytar.setPassword(this._keytarService, this._accessTokenExpiresAccount, expiry.toISOString());
	}

	/**
	 * @param {callback} callback - A callback to run
	 * @description Function to get the accesstoken from the keychain after checking whether the token is revoked or not and before the token gets expired.
	 */
	getAccessToken(callback) {
		this._keytar.getPassword(this._keytarService, this._accessTokenAccount).then(token => {
			if (token) {
				this._keytar.getPassword(this._keytarService, this._accessTokenExpiresAccount).then((expiry) => {
					if (this._moment().isBefore(expiry, 'second')) {
                        callback(token);
                        this.increaseAccessTokenValidity(expiry, token)
                    } else {
                        this.getRefreshToken(callback);
                    }
				});
			} else {
				console.log("token is null");
				callback(null);
			}
		})
	}

	/**
	 * 
	 * @param {callback} callback 
	 * @description Function to get the updated token using refresh token and store the updated token in the keychain.
	 */
	getRefreshToken(callback) {
		this._keytar.getPassword(this._keytarService, this._refreshTokenAccount).then(refreshToken => {
			this._oAuthprovider.refreshTokens(refreshToken, (accessToken, expiresIn) => {
				this.storeAccessToken(accessToken);
				this.storeAccessTokenExpiry(expiresIn);
				callback(accessToken);
			},
				(error) => {
					callback(null);
				});
		});
	}

	/**
	 * 
	 * @param {String} code- Exchange code
	 * @description Function to call the loadtokens method to get the accesstoken in exchange for exchange code.
	 */
	loadTokens(code) {
		return new Promise((resolve, reject) => {
			this._oAuthprovider.loadTokens(code, this._redirectUri, (accessToken, refreshToken, expiresIn) => {
				this.storeRefreshToken(refreshToken);
				this.storeAccessToken(accessToken);
				this.storeAccessTokenExpiry(expiresIn);
				// this.getConfigurationSetData(accessToken)
				// this.checkEmployeeIdTally(accessToken)
				resolve(accessToken);
			},
				(err) => {
					error = err;
					console.log("error");
					log.error('Error in loading tokens', err)
					logout();
					reject(err);
				});
		});
	}

	/**
	 * @description Function to call the logout method, implementation is not in place.
	 */
	logout() {
		console.log("Logout Called from Web APp");
	}


	//Custom Code for Preventing another user to login to the system

	/**
	 * 
	 * @param {String} accessToken 
	 * @description Function to get the configuration set data of the employee using access token for the logged in users.
	 */
	getConfigurationSetData(accessToken) {
		return new Promise((resolve, reject) => {
			let hoptions = {
				headers: {
					'Authorization': 'Bearer ' + accessToken,
				}
			};
			const { oDataEndPoint } = envVariables.wcm;
			this._axios.get(oDataEndPoint + '/odata/sap/HCMFAB_MYTIMEEVENTS_SRV/ConfigurationSet', hoptions)
				.then((configurationData) => {
					let configurationDataArray = configurationData.data.d.results;
					if (configurationDataArray.length) {
						console.log('Configuration Data Employee Id', configurationDataArray[0].EmployeeID)
						resolve(configurationDataArray[0].EmployeeID)
					}
					else if (configurationDataArray.length === 0) {
						console.log('Configuration Data Array Records in else block', configurationDataArray)
						resolve()
					}
				})
				.catch((error) => {
					log.error('Error in getting the configuration set data using accesstoken', error)
					reject(error)
					// document.write(error.response.data.error.message.value)
				})
		})

	}

	/**
	 * 
	 * @param {String} employeeId 
	 * @description Function to store the employee data into the keychain, not in use.
	 */
	storeEmployeeId(employeeId) {
		console.log("Storing EmployeeId value: " + employeeId);
		this._keytar.setPassword(this._keytarService, this._keytarAccount + 'EmployeeId', employeeId);
	}

	/**
	 * 
	 * @param {String} employeeId 
	 * @description Function to store the employee data into the local nedb database.
	 */
	storeEmployeeIdToLocalDb(employeeId) {
		let requestObj = {
			module: 'Tokens',
			name: 'employeeId',
			value: employeeId
		}
		db.findOne(requestObj, function (err, employeeData) {
			if (err) {
				log.error('Error in fetching the employee data from the local nedb database from the Tokens Module', err)
			} else if (employeeData) {
				console.log(employeeData, 'Do nothing')
			} else if (!employeeData) {
				db.insert(requestObj, function (err, newDoc) {
					if (err) {
						console.log('Error in inserting a record into local database', err);
						log.error('Error in inserting employeeId into tokens module in local database', err);
					}
					else if (newDoc) {
						console.log(newDoc, 'Created')
					}
				});
			}
		})
	}

	/**
	 * 
	 * @param {String} token -Access Token
	 * @description Function to check whether the user is a returning user or a new user by comparing the employee data present in the local database.
	 */
	checkEmployeeIdTally(token) {
		return new Promise((resolve, reject) => {
			let _this = this;
			this.getConfigurationSetData(token).then((employeeId) => {
				let requestObj = {
					module: 'Tokens',
					name: 'employeeId',
				}
				db.findOne(requestObj, function (err, employeeData) {
					if (err) {
						console.log('Error in finding the request Object', err)
						log.error("Error in fetching the employee data in checkEmployeeIdTally function", err)
					} else if (employeeData) {
						console.log(employeeData, 'Inside nothing')
						if (employeeData.value === employeeId) {
							console.log('Same User')
							resolve({
								isReturningUser: 1,
								isDifferentUser: 0,
								isUnauthorizedUser: 0
							})
						}
						else if (employeeData.value !== employeeId) {
							console.log('User Mismatch')
							_this.deleteTokensFromKeyChain();
							resolve({
								isReturningUser: 0,
								isDifferentUser: 1,
								isUnauthorizedUser: 0
							})
						}
					} else if (!employeeData) {
						requestObj.value = employeeId
						db.insert(requestObj, function (err, newDoc) {
							if (err) {
								console.log('Error in inserting a record into local database', err);
								log.error('Error in inserting employeeId into local database inside checkEmployeeIdTally function', err)
							}
							else if (newDoc) {
								console.log(newDoc, 'Created')
								resolve({
									isReturningUser: 1,
									isDifferentUser: 0,
									isUnauthorizedUser: 0
								})
							}
						});
					}
				})

			}).catch((error) => {
				log.error('Error in checking the employee id response', error.response)
				if (error.response && error.response.data.error.message.value) {
					_this.deleteTokensFromKeyChain();
					resolve({
						isReturningUser: 0,
						isDifferentUser: 1,
						isUnauthorizedUser: 1
						// errorCode : error.response.data.error.code,
						// errorMessage : error.response.data.error.message.value
					})
				}
			})
		})


	}

	/**
	 * @description Function to delete the access token from the keychain.
	 */
	deleteAccessToken() {
		this._keytar.deletePassword(this._keytarService, this._accessTokenAccount);
	}

	/**
	 * @description Function to delete the Access Token Expiry from the keychain
	 */
	deleteAccessTokenExpiry() {
		this._keytar.deletePassword(this._keytarService, this._accessTokenExpiresAccount);
	}

	/**
	 * @description Function to delete the refresh token from the keychain
	 */
	deleteRefreshToken() {
		this._keytar.deletePassword(this._keytarService, this._refreshTokenAccount);
	}

	/**
	 * @description Function to delete all the timeevents related passwords present in the keychain
	 */
	deleteTokensFromKeyChain() {
		this.deleteAccessToken();
		this.deleteAccessTokenExpiry();
		this.deleteRefreshToken();

	}

	/**
	 * 
	 * @param {Date} expiry - Expiry Time
	 * @param {String} token - Access Token
	 * @description Function to increase the validity of the access token when the token is about to expiring.
	 */
	increaseAccessTokenValidity(expiry, token) {
		let a = new Date();
		if ((new Date(expiry) - new Date()) < (9 * 1000 * 86400)) {
			this._keytar.getPassword(this._keytarService, this._refreshTokenAccount).then(refreshToken => {
				log.info("Calling refreshtoken api for refreshtoken")
				this._oAuthprovider.refreshTokens(refreshToken, (accessToken, expiresIn) => {
					this.storeAccessToken(accessToken);
					this.storeAccessTokenExpiry(expiresIn);
					// callback(accessToken);
				},
					(error) => {
						// callback(null);
					});
			});
		}
		else {
			console.log('Inside else condition in increase Access Token Validity')
		}

	}

	/**
	 * 
	 * @param {String} accessToken 
	 * @description Function to check whether the access token has been revoked or not.
	 * @returns {String}
	 */
	checkRevokedAccessToken(accessToken) {
		return new Promise((resolve, reject) => {
			let hoptions = {
				headers: {
					'Authorization': 'Bearer ' + accessToken,
				}
			};
			const { oDataEndPoint } = envVariables.wcm;
			this._axios.get(oDataEndPoint + '/odata/sap/HCMFAB_COMMON_SRV/EmployeeDetailSet?$format=json', hoptions)
				.then((configurationData) => {
					if (configurationData && configurationData.headers['content-type'] === 'text/html;charset=utf-8') {
						resolve('revoked')
					}
					if (configurationData && configurationData.headers['content-type'] === 'application/json') {
						resolve('active')
					}
				})
				.catch((error) => {
					log.error('Error in fetching employee details set data ', error)
					// reject(error)
					resolve('offline')
				})
		})
	}
}


