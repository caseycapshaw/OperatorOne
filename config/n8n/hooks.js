// n8n Forward Auth Hook
// Reads the authenticated user's email from the reverse proxy header
// (set by authentik) and auto-issues an n8n session cookie.
//
// Requires:
//   EXTERNAL_HOOK_FILES=/home/node/.n8n/hooks.js
//   N8N_FORWARD_AUTH_HEADER=X-authentik-email

const { dirname, resolve } = require('path');
const Layer = require('router/lib/layer');
const { issueCookie } = require(resolve(dirname(require.resolve('n8n')), 'auth/jwt'));

const ignoreAuthRegexp = /^\/(assets|healthz|webhook|rest\/oauth2-credential)/;

module.exports = {
	n8n: {
		ready: [
			async function ({ app }, config) {
				const { stack } = app.router;
				const index = stack.findIndex((l) => l.name === 'cookieParser');

				stack.splice(index + 1, 0, new Layer('/', {
					strict: false,
					end: false,
				}, async (req, res, next) => {
					if (ignoreAuthRegexp.test(req.url)) return next();
					if (!config.get('userManagement.isInstanceOwnerSetUp', false)) return next();
					if (req.cookies?.['n8n-auth']) return next();
					if (!process.env.N8N_FORWARD_AUTH_HEADER) return next();

					const email = req.headers[process.env.N8N_FORWARD_AUTH_HEADER.toLowerCase()];
					if (!email) return next();

					const user = await this.dbCollections.User.findOneBy({ email });
					if (!user) {
						res.statusCode = 401;
						res.end(`User ${email} not found in n8n. Ask an admin to invite this user first.`);
						return;
					}
					if (!user.role) user.role = {};

					issueCookie(res, user);
					return next();
				}));
			},
		],
	},
};
