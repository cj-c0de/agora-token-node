# Agora Token Generator

A Node.js-based utility to generate secure tokens for Agora's Real-Time Engagement (RTE) services. This project simplifies the process of generating tokens, which are necessary for authenticating users in Agora's services, such as voice and video streaming, messaging, and live interactive streaming.

## Table of Contents

- [About](#about)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Usage](#usage)
- [Example](#example)
- [Available Privileges](#available-privileges)
- [License](#license)

---

## About

Agora's Real-Time Engagement (RTE) platform allows developers to integrate real-time video and voice, live streaming, and interactive streaming functionalities into their applications. To secure communication within Agora channels, tokens are required to authenticate users.

This project provides a simple API to generate tokens for specific users, roles, and channels. Tokens can be configured with expiration times and permissions tailored to various use cases within Agora's services.

## Prerequisites

- [Node.js](https://nodejs.org/) v12.0 or higher.
- Agora App ID and App Certificate from the [Agora Developer Console](https://console.agora.io/).

## Installation

1. Clone this repository:

   ```bash
   git clone https://github.com/dastgerdidev/agora-token-node.git
   
2. Navigate to the project directory:

   ```bash
   cd agora-token-node

2. Install the required dependencies:

   ```bash
   npm install

## Usage

To generate an Agora token, you need your App ID, App Certificate, Channel Name, User ID (UID), role, and expiration timestamp.
The main script is `RtcTokenBuilder.buildTokenWithUid` which constructs a token with the provided configuration.

### Parameters
- **appID:** The App ID from Agora.
- **appCertificate:** The App Certificate from Agora.
- **channelName:** The name of the Agora channel.
- **uid:** The unique user ID.
- **role:** The role for this user in the channel (e.g., PUBLISHER, SUBSCRIBER).
- **privilegeExpiredTs:** Timestamp (in seconds) when the token should expire.

## Example

Modify the `appId`, `appCertificate`, `channelName`, and other parameters in `index.js` to match your Agora credentials and desired configuration. Then run:

   ```bash
   npm start
   ```

Example output:

   ```bash
   Token: 006706a719a9d8d4c1d96fc130078366bb3IAC85D7FD8H4D...
   ```

## Available Privileges

The `Priviledges` object in the code defines various privileges:
- **kJoinChannel:** Permission to join a channel.
- **kPublishAudioStream:** Permission to publish an audio stream.
- **kPublishVideoStream:** Permission to publish a video stream.
- **kPublishDataStream:** Permission to publish a data stream.
- **kRtmLogin:** Permission to log in to the Agora RTM system.

To add a privilege to a token, call `addPrivilege` on the `AccessToken` instance.

## License

This project is open-source and available under the MIT License.
