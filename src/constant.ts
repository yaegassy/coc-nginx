/**
 * System-wide constants.
 *
 * May be read from package.json
 */

// @ts-ignore
import { nginxLsVersion, nginxFmtVersion } from '../package.json';

export const NGINX_LS_VERSION = nginxLsVersion;
export const NGINX_FMT_VERSION = nginxFmtVersion;
