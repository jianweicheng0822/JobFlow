// Read only: each iteration is one user browsing Dashboard, Jobs, Companies, Interviews.
import { buildOptions, loginAllUsers, randomToken, readFlow, READ_ENDPOINTS } from './lib/common.js';

export const options = buildOptions(READ_ENDPOINTS);

export function setup() {
  return { tokens: loginAllUsers() };
}

export default function (data) {
  readFlow(randomToken(data.tokens));
}
