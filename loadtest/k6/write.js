// Write only: each iteration creates an application, changes its status, stars it, deletes it.
import { buildOptions, markStep, loginAllUsers, randomToken, writeFlow, WRITE_ENDPOINTS } from './lib/common.js';

export const options = buildOptions(WRITE_ENDPOINTS);

export function setup() {
  return { tokens: loginAllUsers() };
}

export default function (data) {
  markStep();
  writeFlow(randomToken(data.tokens));
}
