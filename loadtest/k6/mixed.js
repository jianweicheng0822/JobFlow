// Realistic mix: 80% browsing, 15% editing, 5% logging in.
// This is the one we use for the system's overall limit.
import {
  buildOptions, loginAllUsers, randomToken,
  readFlow, writeFlow, loginFlow,
  READ_ENDPOINTS, WRITE_ENDPOINTS, LOGIN_ENDPOINTS,
} from './lib/common.js';

export const options = buildOptions([...READ_ENDPOINTS, ...WRITE_ENDPOINTS, ...LOGIN_ENDPOINTS]);

export function setup() {
  return { tokens: loginAllUsers() };
}

export default function (data) {
  const roll = Math.random();
  if (roll < 0.8) {
    readFlow(randomToken(data.tokens));
  } else if (roll < 0.95) {
    writeFlow(randomToken(data.tokens));
  } else {
    loginFlow();
  }
}
