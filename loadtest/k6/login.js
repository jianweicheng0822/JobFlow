// Login only. Kept apart from the rest because BCrypt is CPU-heavy and would
// drag down every other endpoint's numbers if mixed in.
import { buildOptions, markStep, loginFlow, LOGIN_ENDPOINTS } from './lib/common.js';

// One login is ~75ms of BCrypt, so this tops out far lower than the other scripts
export const options = buildOptions(LOGIN_ENDPOINTS, { stress: { start: 5, step: 5, max: 60 } });

export default function () {
  markStep();
  loginFlow();
}
