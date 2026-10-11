// Read only: each iteration is one user browsing Dashboard, Jobs, Companies, Interviews.
import { buildOptions, markStep, loginAllUsers, randomToken, readFlow, READ_ENDPOINTS } from './lib/common.js';

export const options = buildOptions(READ_ENDPOINTS);

export function setup() {
  return { tokens: loginAllUsers() };
}

export default function (data) {
  markStep();
  readFlow(randomToken(data.tokens));
}
