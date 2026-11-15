globalThis.process ??= {};
globalThis.process.env ??= {};
// node_modules/@oslojs/encoding/dist/base32.js
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
// node_modules/@oslojs/encoding/dist/base64.js
function encodeBase64(bytes) {
	return encodeBase64_internal(bytes, base64Alphabet, EncodingPadding.Include);
}
function encodeBase64urlNoPadding(bytes) {
	return encodeBase64_internal(bytes, base64urlAlphabet, EncodingPadding.None);
}
function encodeBase64_internal(bytes, alphabet, padding) {
	let result = "";
	for (let i = 0; i < bytes.byteLength; i += 3) {
		let buffer = 0;
		let bufferBitSize = 0;
		for (let j = 0; j < 3 && i + j < bytes.byteLength; j++) {
			buffer = buffer << 8 | bytes[i + j];
			bufferBitSize += 8;
		}
		for (let j = 0; j < 4; j++) if (bufferBitSize >= 6) {
			result += alphabet[buffer >> bufferBitSize - 6 & 63];
			bufferBitSize -= 6;
		} else if (bufferBitSize > 0) {
			result += alphabet[buffer << 6 - bufferBitSize & 63];
			bufferBitSize = 0;
		} else if (padding === EncodingPadding.Include) result += "=";
	}
	return result;
}
var base64Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
var base64urlAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
function decodeBase64(encoded) {
	return decodeBase64_internal(encoded, base64DecodeMap, DecodingPadding.Required);
}
function decodeBase64_internal(encoded, decodeMap, padding) {
	const result = new Uint8Array(Math.ceil(encoded.length / 4) * 3);
	let totalBytes = 0;
	for (let i = 0; i < encoded.length; i += 4) {
		let chunk = 0;
		let bitsRead = 0;
		for (let j = 0; j < 4; j++) {
			if (padding === DecodingPadding.Required && encoded[i + j] === "=") continue;
			if (padding === DecodingPadding.Ignore && (i + j >= encoded.length || encoded[i + j] === "=")) continue;
			if (j > 0 && encoded[i + j - 1] === "=") throw new Error("Invalid padding");
			if (!(encoded[i + j] in decodeMap)) throw new Error("Invalid character");
			chunk |= decodeMap[encoded[i + j]] << (3 - j) * 6;
			bitsRead += 6;
		}
		if (bitsRead < 24) {
			let unused;
			if (bitsRead === 12) unused = chunk & 65535;
			else if (bitsRead === 18) unused = chunk & 255;
			else throw new Error("Invalid padding");
			if (unused !== 0) throw new Error("Invalid padding");
		}
		const byteLength = Math.floor(bitsRead / 8);
		for (let i = 0; i < byteLength; i++) {
			result[totalBytes] = chunk >> 16 - i * 8 & 255;
			totalBytes++;
		}
	}
	return result.slice(0, totalBytes);
}
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
var base64DecodeMap = {
	"0": 52,
	"1": 53,
	"2": 54,
	"3": 55,
	"4": 56,
	"5": 57,
	"6": 58,
	"7": 59,
	"8": 60,
	"9": 61,
	A: 0,
	B: 1,
	C: 2,
	D: 3,
	E: 4,
	F: 5,
	G: 6,
	H: 7,
	I: 8,
	J: 9,
	K: 10,
	L: 11,
	M: 12,
	N: 13,
	O: 14,
	P: 15,
	Q: 16,
	R: 17,
	S: 18,
	T: 19,
	U: 20,
	V: 21,
	W: 22,
	X: 23,
	Y: 24,
	Z: 25,
	a: 26,
	b: 27,
	c: 28,
	d: 29,
	e: 30,
	f: 31,
	g: 32,
	h: 33,
	i: 34,
	j: 35,
	k: 36,
	l: 37,
	m: 38,
	n: 39,
	o: 40,
	p: 41,
	q: 42,
	r: 43,
	s: 44,
	t: 45,
	u: 46,
	v: 47,
	w: 48,
	x: 49,
	y: 50,
	z: 51,
	"+": 62,
	"/": 63
};
export { encodeBase64 as n, encodeBase64urlNoPadding as r, decodeBase64 as t };

//# sourceMappingURL=dist_p9uMA4_5.mjs.map