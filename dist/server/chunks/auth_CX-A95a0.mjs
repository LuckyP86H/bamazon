globalThis.process ??= {};
globalThis.process.env ??= {};
import { n as encodeBase64, r as encodeBase64urlNoPadding } from "./dist_p9uMA4_5.mjs";
import { o as createStaffSession, s as deleteStaffSession, u as findStaffSession } from "./runtime_BJ0x1Rmi.mjs";
// node_modules/@oslojs/binary/dist/uint.js
var BigEndian = class {
	uint8(data, offset) {
		if (data.byteLength < offset + 1) throw new TypeError("Insufficient bytes");
		return data[offset];
	}
	uint16(data, offset) {
		if (data.byteLength < offset + 2) throw new TypeError("Insufficient bytes");
		return data[offset] << 8 | data[offset + 1];
	}
	uint32(data, offset) {
		if (data.byteLength < offset + 4) throw new TypeError("Insufficient bytes");
		let result = 0;
		for (let i = 0; i < 4; i++) result |= data[offset + i] << 24 - i * 8;
		return result;
	}
	uint64(data, offset) {
		if (data.byteLength < offset + 8) throw new TypeError("Insufficient bytes");
		let result = 0n;
		for (let i = 0; i < 8; i++) result |= BigInt(data[offset + i]) << BigInt(56 - i * 8);
		return result;
	}
	putUint8(target, value, offset) {
		if (target.length < offset + 1) throw new TypeError("Not enough space");
		if (value < 0 || value > 255) throw new TypeError("Invalid uint8 value");
		target[offset] = value;
	}
	putUint16(target, value, offset) {
		if (target.length < offset + 2) throw new TypeError("Not enough space");
		if (value < 0 || value > 65535) throw new TypeError("Invalid uint16 value");
		target[offset] = value >> 8;
		target[offset + 1] = value & 255;
	}
	putUint32(target, value, offset) {
		if (target.length < offset + 4) throw new TypeError("Not enough space");
		if (value < 0 || value > 4294967295) throw new TypeError("Invalid uint32 value");
		for (let i = 0; i < 4; i++) target[offset + i] = value >> (3 - i) * 8 & 255;
	}
	putUint64(target, value, offset) {
		if (target.length < offset + 8) throw new TypeError("Not enough space");
		if (value < 0 || value > 18446744073709551615n) throw new TypeError("Invalid uint64 value");
		for (let i = 0; i < 8; i++) target[offset + i] = Number(value >> BigInt((7 - i) * 8) & 255n);
	}
};
var LittleEndian = class {
	uint8(data, offset) {
		if (data.byteLength < offset + 1) throw new TypeError("Insufficient bytes");
		return data[offset];
	}
	uint16(data, offset) {
		if (data.byteLength < offset + 2) throw new TypeError("Insufficient bytes");
		return data[offset] | data[offset + 1] << 8;
	}
	uint32(data, offset) {
		if (data.byteLength < offset + 4) throw new TypeError("Insufficient bytes");
		let result = 0;
		for (let i = 0; i < 4; i++) result |= data[offset + i] << i * 8;
		return result;
	}
	uint64(data, offset) {
		if (data.byteLength < offset + 8) throw new TypeError("Insufficient bytes");
		let result = 0n;
		for (let i = 0; i < 8; i++) result |= BigInt(data[offset + i]) << BigInt(i * 8);
		return result;
	}
	putUint8(target, value, offset) {
		if (target.length < 1 + offset) throw new TypeError("Insufficient space");
		if (value < 0 || value > 255) throw new TypeError("Invalid uint8 value");
		target[offset] = value;
	}
	putUint16(target, value, offset) {
		if (target.length < 2 + offset) throw new TypeError("Insufficient space");
		if (value < 0 || value > 65535) throw new TypeError("Invalid uint16 value");
		target[offset + 1] = value >> 8;
		target[offset] = value & 255;
	}
	putUint32(target, value, offset) {
		if (target.length < 4 + offset) throw new TypeError("Insufficient space");
		if (value < 0 || value > 4294967295) throw new TypeError("Invalid uint32 value");
		for (let i = 0; i < 4; i++) target[offset + i] = value >> i * 8 & 255;
	}
	putUint64(target, value, offset) {
		if (target.length < 8 + offset) throw new TypeError("Insufficient space");
		if (value < 0 || value > 18446744073709551615n) throw new TypeError("Invalid uint64 value");
		for (let i = 0; i < 8; i++) target[offset + i] = Number(value >> BigInt(i * 8) & 255n);
	}
};
new BigEndian();
new LittleEndian();
new Uint32Array([
	1116352408,
	1899447441,
	3049323471,
	3921009573,
	961987163,
	1508970993,
	2453635748,
	2870763221,
	3624381080,
	310598401,
	607225278,
	1426881987,
	1925078388,
	2162078206,
	2614888103,
	3248222580,
	3835390401,
	4022224774,
	264347078,
	604807628,
	770255983,
	1249150122,
	1555081692,
	1996064986,
	2554220882,
	2821834349,
	2952996808,
	3210313671,
	3336571891,
	3584528711,
	113926993,
	338241895,
	666307205,
	773529912,
	1294757372,
	1396182291,
	1695183700,
	1986661051,
	2177026350,
	2456956037,
	2730485921,
	2820302411,
	3259730800,
	3345764771,
	3516065817,
	3600352804,
	4094571909,
	275423344,
	430227734,
	506948616,
	659060556,
	883997877,
	958139571,
	1322822218,
	1537002063,
	1747873779,
	1955562222,
	2024104815,
	2227730452,
	2361852424,
	2428436474,
	2756734187,
	3204031479,
	3329325298
]);
new Uint32Array([
	1116352408,
	1899447441,
	3049323471,
	3921009573,
	961987163,
	1508970993,
	2453635748,
	2870763221,
	3624381080,
	310598401,
	607225278,
	1426881987,
	1925078388,
	2162078206,
	2614888103,
	3248222580,
	3835390401,
	4022224774,
	264347078,
	604807628,
	770255983,
	1249150122,
	1555081692,
	1996064986,
	2554220882,
	2821834349,
	2952996808,
	3210313671,
	3336571891,
	3584528711,
	113926993,
	338241895,
	666307205,
	773529912,
	1294757372,
	1396182291,
	1695183700,
	1986661051,
	2177026350,
	2456956037,
	2730485921,
	2820302411,
	3259730800,
	3345764771,
	3516065817,
	3600352804,
	4094571909,
	275423344,
	430227734,
	506948616,
	659060556,
	883997877,
	958139571,
	1322822218,
	1537002063,
	1747873779,
	1955562222,
	2024104815,
	2227730452,
	2361852424,
	2428436474,
	2756734187,
	3204031479,
	3329325298
]);
new BigUint64Array([
	4794697086780616226n,
	8158064640168781261n,
	13096744586834688815n,
	16840607885511220156n,
	4131703408338449720n,
	6480981068601479193n,
	10538285296894168987n,
	12329834152419229976n,
	15566598209576043074n,
	1334009975649890238n,
	2608012711638119052n,
	6128411473006802146n,
	8268148722764581231n,
	9286055187155687089n,
	11230858885718282805n,
	13951009754708518548n,
	16472876342353939154n,
	17275323862435702243n,
	1135362057144423861n,
	2597628984639134821n,
	3308224258029322869n,
	5365058923640841347n,
	6679025012923562964n,
	8573033837759648693n,
	10970295158949994411n,
	12119686244451234320n,
	12683024718118986047n,
	13788192230050041572n,
	14330467153632333762n,
	15395433587784984357n,
	489312712824947311n,
	1452737877330783856n,
	2861767655752347644n,
	3322285676063803686n,
	5560940570517711597n,
	5996557281743188959n,
	7280758554555802590n,
	8532644243296465576n,
	9350256976987008742n,
	10552545826968843579n,
	11727347734174303076n,
	12113106623233404929n,
	14000437183269869457n,
	14369950271660146224n,
	15101387698204529176n,
	15463397548674623760n,
	17586052441742319658n,
	1182934255886127544n,
	1847814050463011016n,
	2177327727835720531n,
	2830643537854262169n,
	3796741975233480872n,
	4115178125766777443n,
	5681478168544905931n,
	6601373596472566643n,
	7507060721942968483n,
	8399075790359081724n,
	8693463985226723168n,
	9568029438360202098n,
	10144078919501101548n,
	10430055236837252648n,
	11840083180663258601n,
	13761210420658862357n,
	14299343276471374635n,
	14566680578165727644n,
	15097957966210449927n,
	16922976911328602910n,
	17689382322260857208n,
	500013540394364858n,
	748580250866718886n,
	1242879168328830382n,
	1977374033974150939n,
	2944078676154940804n,
	3659926193048069267n,
	4368137639120453308n,
	4836135668995329356n,
	5532061633213252278n,
	6448918945643986474n,
	6902733635092675308n,
	7801388544844847127n
]);
// node_modules/arctic/dist/oauth2.js
var OAuth2Tokens = class {
	data;
	constructor(data) {
		this.data = data;
	}
	tokenType() {
		if ("token_type" in this.data && typeof this.data.token_type === "string") return this.data.token_type;
		throw new Error("Missing or invalid 'token_type' field");
	}
	accessToken() {
		if ("access_token" in this.data && typeof this.data.access_token === "string") return this.data.access_token;
		throw new Error("Missing or invalid 'access_token' field");
	}
	accessTokenExpiresInSeconds() {
		if ("expires_in" in this.data && typeof this.data.expires_in === "number") return this.data.expires_in;
		throw new Error("Missing or invalid 'expires_in' field");
	}
	accessTokenExpiresAt() {
		return new Date(Date.now() + this.accessTokenExpiresInSeconds() * 1e3);
	}
	hasRefreshToken() {
		return "refresh_token" in this.data && typeof this.data.refresh_token === "string";
	}
	refreshToken() {
		if ("refresh_token" in this.data && typeof this.data.refresh_token === "string") return this.data.refresh_token;
		throw new Error("Missing or invalid 'refresh_token' field");
	}
	hasScopes() {
		return "scope" in this.data && typeof this.data.scope === "string";
	}
	scopes() {
		if ("scope" in this.data && typeof this.data.scope === "string") return this.data.scope.split(" ");
		throw new Error("Missing or invalid 'scope' field");
	}
	idToken() {
		if ("id_token" in this.data && typeof this.data.id_token === "string") return this.data.id_token;
		throw new Error("Missing or invalid field 'id_token'");
	}
};
function generateState() {
	const randomValues = /* @__PURE__ */ new Uint8Array(32);
	crypto.getRandomValues(randomValues);
	return encodeBase64urlNoPadding(randomValues);
}
// node_modules/arctic/dist/request.js
function createOAuth2Request(endpoint, body) {
	const bodyBytes = new TextEncoder().encode(body.toString());
	const request = new Request(endpoint, {
		method: "POST",
		body: bodyBytes
	});
	request.headers.set("Content-Type", "application/x-www-form-urlencoded");
	request.headers.set("Accept", "application/json");
	request.headers.set("User-Agent", "arctic");
	request.headers.set("Content-Length", bodyBytes.byteLength.toString());
	return request;
}
function encodeBasicCredentials(username, password) {
	const bytes = new TextEncoder().encode(`${username}:${password}`);
	return encodeBase64(bytes);
}
function createOAuth2RequestError(result) {
	let code;
	if ("error" in result && typeof result.error === "string") code = result.error;
	else throw new Error("Invalid error response");
	let description = null;
	let uri = null;
	let state = null;
	if ("error_description" in result) {
		if (typeof result.error_description !== "string") throw new Error("Invalid data");
		description = result.error_description;
	}
	if ("error_uri" in result) {
		if (typeof result.error_uri !== "string") throw new Error("Invalid data");
		uri = result.error_uri;
	}
	if ("state" in result) {
		if (typeof result.state !== "string") throw new Error("Invalid data");
		state = result.state;
	}
	return new OAuth2RequestError(code, description, uri, state);
}
var ArcticFetchError = class extends Error {
	constructor(cause) {
		super("Failed to send request", { cause });
	}
};
var OAuth2RequestError = class extends Error {
	code;
	description;
	uri;
	state;
	constructor(code, description, uri, state) {
		super(`OAuth request error: ${code}`);
		this.code = code;
		this.description = description;
		this.uri = uri;
		this.state = state;
	}
};
var UnexpectedResponseError = class extends Error {
	status;
	constructor(responseStatus) {
		super("Unexpected error response");
		this.status = responseStatus;
	}
};
var UnexpectedErrorResponseBodyError = class extends Error {
	status;
	data;
	constructor(status, data) {
		super("Unexpected error response body");
		this.status = status;
		this.data = data;
	}
};
// node_modules/arctic/dist/client.js
var CodeChallengeMethod;
(function(CodeChallengeMethod) {
	CodeChallengeMethod[CodeChallengeMethod["S256"] = 0] = "S256";
	CodeChallengeMethod[CodeChallengeMethod["Plain"] = 1] = "Plain";
})(CodeChallengeMethod || (CodeChallengeMethod = {}));
// node_modules/@oslojs/jwt/node_modules/@oslojs/encoding/dist/base32.js
var EncodingPadding$1;
(function(EncodingPadding) {
	EncodingPadding[EncodingPadding["Include"] = 0] = "Include";
	EncodingPadding[EncodingPadding["None"] = 1] = "None";
})(EncodingPadding$1 || (EncodingPadding$1 = {}));
var DecodingPadding$1;
(function(DecodingPadding) {
	DecodingPadding[DecodingPadding["Required"] = 0] = "Required";
	DecodingPadding[DecodingPadding["Ignore"] = 1] = "Ignore";
})(DecodingPadding$1 || (DecodingPadding$1 = {}));
// node_modules/@oslojs/jwt/node_modules/@oslojs/encoding/dist/base64.js
var EncodingPadding;
(function(EncodingPadding) {
	EncodingPadding[EncodingPadding["Include"] = 0] = "Include";
	EncodingPadding[EncodingPadding["None"] = 1] = "None";
})(EncodingPadding || (EncodingPadding = {}));
var DecodingPadding;
(function(DecodingPadding) {
	DecodingPadding[DecodingPadding["Required"] = 0] = "Required";
	DecodingPadding[DecodingPadding["Ignore"] = 1] = "Ignore";
})(DecodingPadding || (DecodingPadding = {}));
// node_modules/arctic/dist/providers/github.js
var authorizationEndpoint = "https://github.com/login/oauth/authorize";
var tokenEndpoint = "https://github.com/login/oauth/access_token";
var GitHub = class {
	clientId;
	clientSecret;
	redirectURI;
	constructor(clientId, clientSecret, redirectURI) {
		this.clientId = clientId;
		this.clientSecret = clientSecret;
		this.redirectURI = redirectURI;
	}
	createAuthorizationURL(state, scopes) {
		const url = new URL(authorizationEndpoint);
		url.searchParams.set("response_type", "code");
		url.searchParams.set("client_id", this.clientId);
		url.searchParams.set("state", state);
		if (scopes.length > 0) url.searchParams.set("scope", scopes.join(" "));
		if (this.redirectURI !== null) url.searchParams.set("redirect_uri", this.redirectURI);
		return url;
	}
	async validateAuthorizationCode(code) {
		const body = new URLSearchParams();
		body.set("grant_type", "authorization_code");
		body.set("code", code);
		if (this.redirectURI !== null) body.set("redirect_uri", this.redirectURI);
		const request = createOAuth2Request(tokenEndpoint, body);
		const encodedCredentials = encodeBasicCredentials(this.clientId, this.clientSecret);
		request.headers.set("Authorization", `Basic ${encodedCredentials}`);
		return await sendTokenRequest(request);
	}
	async refreshAccessToken(refreshToken) {
		const body = new URLSearchParams();
		body.set("grant_type", "refresh_token");
		body.set("refresh_token", refreshToken);
		const request = createOAuth2Request(tokenEndpoint, body);
		const encodedCredentials = encodeBasicCredentials(this.clientId, this.clientSecret);
		request.headers.set("Authorization", `Basic ${encodedCredentials}`);
		return await sendTokenRequest(request);
	}
};
async function sendTokenRequest(request) {
	let response;
	try {
		response = await fetch(request);
	} catch (e) {
		throw new ArcticFetchError(e);
	}
	if (response.status !== 200) {
		if (response.body !== null) await response.body.cancel();
		throw new UnexpectedResponseError(response.status);
	}
	let data;
	try {
		data = await response.json();
	} catch {
		throw new UnexpectedResponseError(response.status);
	}
	if (typeof data !== "object" || data === null) throw new UnexpectedErrorResponseBodyError(response.status, data);
	if ("error" in data && typeof data.error === "string") {
		let error;
		try {
			error = createOAuth2RequestError(data);
		} catch {
			throw new UnexpectedErrorResponseBodyError(response.status, data);
		}
		throw error;
	}
	return new OAuth2Tokens(data);
}
// src/lib/auth.ts
/**
* Staff sign-in with GitHub (OAuth authorization code, with a one-time `state` check). No
* passwords are stored. A GitHub login only gets in if it appears in STAFF_GITHUB_LOGINS.
*/
var STAFF_COOKIE = "bamazon_staff";
var OAUTH_COOKIE = "bamazon_oauth";
var SESSION_MS = 6048e5;
function staffAllowlist(env) {
	return new Set((env.STAFF_GITHUB_LOGINS ?? "").split(",").map((login) => login.trim().toLowerCase()).filter(Boolean));
}
var isStaffLogin = (env, login) => staffAllowlist(env).has(login.toLowerCase());
function githubClient(env, origin) {
	if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) return null;
	return new GitHub(env.GITHUB_CLIENT_ID, env.GITHUB_CLIENT_SECRET, `${origin}/auth/github/callback`);
}
function newOAuthState() {
	return generateState();
}
function randomToken() {
	const bytes = crypto.getRandomValues(/* @__PURE__ */ new Uint8Array(32));
	return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}
async function sha256Hex(value) {
	const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
	return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
async function openStaffSession(db, login, now = Date.now()) {
	const token = randomToken();
	await createStaffSession(db, await sha256Hex(token), login, now + SESSION_MS);
	return token;
}
/** The signed-in staff member's GitHub login, or null. Expired and unknown tokens both return null. */
async function currentStaff(db, token, now = Date.now()) {
	if (!token) return null;
	return (await findStaffSession(db, await sha256Hex(token), now))?.github_login ?? null;
}
async function closeStaffSession(db, token) {
	if (token) await deleteStaffSession(db, await sha256Hex(token));
}
export { currentStaff as a, newOAuthState as c, closeStaffSession as i, openStaffSession as l, SESSION_MS as n, githubClient as o, STAFF_COOKIE as r, isStaffLogin as s, OAUTH_COOKIE as t };

//# sourceMappingURL=auth_CX-A95a0.mjs.map