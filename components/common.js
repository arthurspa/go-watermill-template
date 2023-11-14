const _ = require('lodash');

/**
 * Input: parsed asyncapi object
 * Output: object which indicates what protocols are present in the async api document
 * Curently supports AMQP alone
 * Example Output:
 * {
 *   "hasGooglePubSub": true
 * }
 */
export function GetProtocolFlags(asyncapi) {
  const protocolFlags = {
    hasGooglePubSub: false
  };

  const serverEntries = Object.keys(asyncapi.servers()).length ? Object.entries(asyncapi.servers()) : [];
  //if there are no servers do nothing
  if (serverEntries.length === 0) {
    return protocolFlags;
  }

  //if there are no supported servers do nothing
  const hasGooglePubSub = serverEntries.filter(([serverName, server]) => {
    return server.protocol() === 'googlepubsub';
  }).length > 0;

  protocolFlags.hasGooglePubSub = hasGooglePubSub;

  return protocolFlags;
}

export function hasPubOrSub(asyncapi) {
  return hasPub(asyncapi) || hasSub(asyncapi);
}

export function hasSupportedProtocol(asyncapi) {
  const protocolFlags = GetProtocolFlags(asyncapi);
  for (const protocol in protocolFlags) {
    if (protocolFlags[`${protocol}`] === true) {
      return true;
    }
  }
  return false;
}

export function channelHasPub(channel) {
  return channel.operations().filterByReceive().length > 0;
}

export function channelHasSub(channel) {
  return channel.operations().filterBySend().length > 0;
}


export function hasSub(asyncapi) {

  for (const channel of asyncapi.channels()) {
    if (channelHasSub(channel)) {
      return true;
    }
  }

  return false;
}

export function hasPub(asyncapi) {

  for (const channel of asyncapi.channels()) {
    if (channelHasPub(channel)) {
      return true;
    }
  }

  return false
}

export function pascalCase(string) {
  string = _.camelCase(string);
  return string.charAt(0).toUpperCase() + string.slice(1);
}
