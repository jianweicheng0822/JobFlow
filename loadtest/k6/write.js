// Write only: each iteration creates an application, changes its status, stars it, deletes it.
import { buildOptions, loginAllUsers, randomToken, writeFlow, WRITE_ENDPOINTS } from './lib/common.js';

export const options = buildOptions(WRITE_ENDPOINTS);

export function setup() {
  return { tokens: loginAllUsers() };
}

export default function (data) {
  writeFlow(randomToken(data.tokens));
}
