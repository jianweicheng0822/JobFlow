// Login only. Kept apart from the rest because BCrypt is CPU-heavy and would
// drag down every other endpoint's numbers if mixed in.
import { buildOptions, loginFlow, LOGIN_ENDPOINTS } from './lib/common.js';

export const options = buildOptions(LOGIN_ENDPOINTS);

export default function () {
  loginFlow();
}
