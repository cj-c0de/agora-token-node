// Import required modules
const crypto = require("crypto");
const crc32 = require("crc-32");
const UINT32 = require("cuint").UINT32;

const version = "006";  // Token version
const VERSION_LENGTH = 3;
const APP_ID_LENGTH = 32;

// Agora credentials and token settings (replace it with real values)
const appId = "APP_ID";
const appCertificate = "APP_CERTIFICATE";
const channelName = "CHANNEL_NAME"; // Replace it with your channel name
const uid = 0; // Can be a user ID or left empty
const expirationTimeInSeconds = 3600;

// Generates a random 32-bit unsigned integer
function randomUint32() {
    return Math.floor(Math.random() * 0xffffffff);
}

// AccessToken constructor for building tokens
var AccessToken = function (appID, appCertificate, channelName, uid) {
    this.appID = appID;
    this.appCertificate = appCertificate;
    this.channelName = channelName;
    this.messages = {};
    this.salt = randomUint32();
    this.ts = Math.floor(new Date() / 1000) + 24 * 3600;
    this.uid = uid === 0 ? "" : `${uid}`;

    // Method to build the token by generating a signature and encoding data
    this.build = function () {
        const m = Message({ salt: this.salt, ts: this.ts, messages: this.messages }).pack();
        const toSign = Buffer.concat([
            Buffer.from(this.appID, "utf8"),
            Buffer.from(this.channelName, "utf8"),
            Buffer.from(this.uid, "utf8"),
            m
        ]);

        const signature = encodeHMac(this.appCertificate, toSign);
        const crc_channel = UINT32(crc32.str(this.channelName)).and(UINT32(0xffffffff)).toNumber();
        const crc_uid = UINT32(crc32.str(this.uid)).and(UINT32(0xffffffff)).toNumber();
        const content = AccessTokenContent({
            signature: signature,
            crc_channel: crc_channel,
            crc_uid: crc_uid,
            m: m
        }).pack();
        
        return version + this.appID + content.toString("base64");
    };

    // Adds privileges with expiration timestamps
    this.addPrivilege = function (privilege, expireTimestamp) {
        this.messages[privilege] = expireTimestamp;
    };

    // Parses token string to populate instance properties
    this.fromString = function (originToken) {
        try {
            const originVersion = originToken.substr(0, VERSION_LENGTH);
            if (originVersion !== version) return false;
            this.appID = originToken.substr(VERSION_LENGTH, APP_ID_LENGTH);
            const originContent = originToken.substr(VERSION_LENGTH + APP_ID_LENGTH);
            const originContentDecodedBuf = Buffer.from(originContent, "base64");

            const content = unPackContent(originContentDecodedBuf);
            this.signature = content.signature;
            this.crc_channel_name = content.crc_channel_name;
            this.crc_uid = content.crc_uid;
            this.m = content.m;

            const msgs = unPackMessages(this.m);
            this.salt = msgs.salt;
            this.ts = msgs.ts;
            this.messages = msgs.messages;
        } catch (err) {
            console.error(err);
            return false;
        }
        return true;
    };
};

// Privilege constants for various actions
const Privileges = {
    kJoinChannel: 1,
    kPublishAudioStream: 2,
    kPublishVideoStream: 3,
    kPublishDataStream: 4,
    kRtmLogin: 1000
};

// Helper function to encode HMAC using SHA-256
const encodeHMac = (key, message) => crypto.createHmac("sha256", key).update(message).digest();

// Byte buffer for writing data with specific formats
const ByteBuf = function () {
  const buffer = Buffer.alloc(1024);
  let position = 0;
  buffer.fill(0);

  return {
      pack: function () {
          // Only the portion filled with data will be returned
          return buffer.slice(0, position);
      },
      putUint16: function (v) {
          buffer.writeUInt16LE(v, position);
          position += 2;
          return this;  // Ensuring method chaining
      },
      putUint32: function (v) {
          buffer.writeUInt32LE(v, position);
          position += 4;
          return this;  // Ensuring method chaining
      },
      putBytes: function (bytes) {
          this.putUint16(bytes.length);
          bytes.copy(buffer, position);
          position += bytes.length;
          return this;  // Ensuring method chaining
      },
      putString: function (str) {
          return this.putBytes(Buffer.from(str));  // Using putBytes to handle length and data
      },
      putTreeMapUInt32: function (map) {
          this.putUint16(Object.keys(map).length);  // Add number of items
          for (const key in map) {
              this.putUint16(Number(key));  // Add key
              this.putUint32(map[key]);     // Add value
          }
          return this;  // Ensuring method chaining
      }
  };
};

// Read buffer to read structured data from buffer
const ReadByteBuf = function (bytes) {
    let position = 0;

    return {
        getUint16: () => { const ret = bytes.readUInt16LE(position); position += 2; return ret; },
        getUint32: () => { const ret = bytes.readUInt32LE(position); position += 4; return ret; },
        getString: () => { const len = this.getUint16(); const out = bytes.slice(position, position + len); position += len; return out; },
        getTreeMapUInt32: () => { const map = {}; const len = this.getUint16(); for (let i = 0; i < len; i++) { const key = this.getUint16(); map[key] = this.getUint32(); } return map; }
    };
};

// Data structure for AccessToken content
const AccessTokenContent = (options) => ({
  ...options,
  pack: function () {
      // Creating a ByteBuf and chaining methods
      return new ByteBuf()
          .putString(options.signature)
          .putUint32(options.crc_channel)
          .putUint32(options.crc_uid)
          .putString(options.m)
          .pack();
  }
});

// Data structure for message
const Message = (options) => ({
  ...options,
  pack: function () {
      return new ByteBuf()
          .putUint32(options.salt)
          .putUint32(options.ts)
          .putTreeMapUInt32(options.messages)
          .pack();
  }
});

// Unpack content from buffer
const unPackContent = (bytes) => {
    const readbuf = new ReadByteBuf(bytes);
    return AccessTokenContent({
        signature: readbuf.getString(),
        crc_channel_name: readbuf.getUint32(),
        crc_uid: readbuf.getUint32(),
        m: readbuf.getString()
    });
};

// Unpack message content
const unPackMessages = (bytes) => {
    const readbuf = new ReadByteBuf(bytes);
    return Message({
        salt: readbuf.getUint32(),
        ts: readbuf.getUint32(),
        messages: readbuf.getTreeMapUInt32()
    });
};

// Role constants
const Role = { ATTENDEE: 0, PUBLISHER: 1, SUBSCRIBER: 2, ADMIN: 101 };

// RtcTokenBuilder class for token generation
class RtcTokenBuilder {
    static buildTokenWithUid(appID, appCertificate, channelName, uid, role, privilegeExpiredTs) {
        return this.buildTokenWithAccount(appID, appCertificate, channelName, uid, role, privilegeExpiredTs);
    }

    static buildTokenWithAccount(appID, appCertificate, channelName, account, role, privilegeExpiredTs) {
        const key = new AccessToken(appID, appCertificate, channelName, account);
        key.addPrivilege(Privileges.kJoinChannel, privilegeExpiredTs);
        if ([Role.ATTENDEE, Role.PUBLISHER, Role.ADMIN].includes(role)) {
            key.addPrivilege(Privileges.kPublishAudioStream, privilegeExpiredTs);
            key.addPrivilege(Privileges.kPublishVideoStream, privilegeExpiredTs);
            key.addPrivilege(Privileges.kPublishDataStream, privilegeExpiredTs);
        }
        return key.build();
    }
}

// Generate token and output result
const currentTimestamp = Math.floor(Date.now() / 1000);
const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;
const role = Role.PUBLISHER;
const token = RtcTokenBuilder.buildTokenWithUid(appId, appCertificate, channelName, uid, role, privilegeExpiredTs);

console.log("Token:", token);
