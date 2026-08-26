# Vercel Build — Errors & Warnings (raw log excerpt)

Commit: 348317c | Build: iad1

## Sentry Errors (403 — permission denied)

```
14:42:41.367 [@sentry/nextjs - Node.js] Error: An error occurred. Couldn't finish all operations: [Error: Command failed: /vercel/path0/node_modules/@sentry/cli-linux-x64/bin/sentry-cli releases new 348317caa6d2ae13de2632ed90716db8fa11f27a
14:42:41.368 error: API request failed
14:42:41.368 
14:42:41.368 Caused by:
14:42:41.368     sentry reported an error: You do not have permission to perform this action. (http status: 403)
14:42:41.368 
14:42:41.368 Add --log-level=[info|debug] or export SENTRY_LOG_LEVEL=[info|debug] to see more output.
14:42:41.368 Please attach the full debug log to all bug reports.
14:42:41.368 ] {
14:42:41.368   code: 1,
14:42:41.368   killed: false,
14:42:41.368   signal: null,
14:42:41.368   cmd: '/vercel/path0/node_modules/@sentry/cli-linux-x64/bin/sentry-cli releases new 348317caa6d2ae13de2632ed90716db8fa11f27a'
14:42:41.368 }
14:42:43.756 > Found 445 files
14:42:43.780 > Analyzing 445 sources
14:42:43.843 > Analyzing completed in 0.062s
14:42:43.854 > Adding source map references
14:42:46.071 > Bundling completed in 2.216s
14:42:46.071 > Bundled 445 files for upload
14:42:46.071 > Bundle ID: dfceb5fb-2faf-5058-bfd1-5b2983f27b42
14:42:46.130 > Optimizing completed in 0.059s
14:42:46.338 error: API request failed
14:42:46.338 
14:42:46.338 Caused by:
14:42:46.338     sentry reported an error: You do not have permission to perform this action. (http status: 403)
14:42:46.338 
14:42:46.338 Add --log-level=[info|debug] or export SENTRY_LOG_LEVEL=[info|debug] to see more output.
14:42:46.338 Please attach the full debug log to all bug reports.
14:42:46.346 [@sentry/nextjs - Node.js] Error: An error occurred. Couldn't finish all operations: [Error: Command --header sentry-trace:2224ce3ecb8346ecbc073acea07e6277-ba0c883ed1a55fa0-1 --header baggage:sentry-environment=production,sentry-release=10.70.0,sentry-public_key=4c2bae7d9fbc413e8f7385f55c515d51,sentry-trace_id=2224ce3ecb8346ecbc073acea07e6277,sentry-org_id=1,sentry-transaction=upload,sentry-sampled=true,sentry-sample_rand=0.19961612950180163,sentry-sample_rate=1 sourcemaps upload -p javascript-nextjs --release 348317caa6d2ae13de2632ed90716db8fa11f27a /tmp/sentry-bundler-plugin-upload-louLyk --ignore node_modules --no-rewrite failed with exit code 1]
14:43:06.494 [@sentry/nextjs - Edge] Error: An error occurred. Couldn't finish all operations: [Error: Command failed: /vercel/path0/node_modules/@sentry/cli-linux-x64/bin/sentry-cli releases new 348317caa6d2ae13de2632ed90716db8fa11f27a
14:43:06.495 error: API request failed
14:43:06.495 
14:43:06.495 Caused by:
14:43:06.495     sentry reported an error: You do not have permission to perform this action. (http status: 403)
14:43:06.495 
14:43:06.495 Add --log-level=[info|debug] or export SENTRY_LOG_LEVEL=[info|debug] to see more output.
14:43:06.495 Please attach the full debug log to all bug reports.
14:43:06.495 ] {
14:43:06.495   code: 1,
14:43:06.495   killed: false,
14:43:06.495   signal: null,
14:43:06.495   cmd: '/vercel/path0/node_modules/@sentry/cli-linux-x64/bin/sentry-cli releases new 348317caa6d2ae13de2632ed90716db8fa11f27a'
14:43:06.495 }
14:43:08.786 > Found 451 files
14:43:08.823 > Analyzing 451 sources
14:43:08.890 > Analyzing completed in 0.066s
14:43:08.905 > Adding source map references
14:43:11.273 > Bundling completed in 2.367s
14:43:11.273 > Bundled 451 files for upload
14:43:11.274 > Bundle ID: 53c5910f-3fc1-5b0e-802d-5a43617f0567
14:43:11.337 > Optimizing completed in 0.063s
14:43:11.548 error: API request failed
14:43:11.548 
14:43:11.549 Caused by:
14:43:11.549     sentry reported an error: You do not have permission to perform this action. (http status: 403)
14:43:11.549 
14:43:11.549 Add --log-level=[info|debug] or export SENTRY_LOG_LEVEL=[info|debug] to see more output.
14:43:11.549 Please attach the full debug log to all bug reports.
14:43:11.556 [@sentry/nextjs - Edge] Error: An error occurred. Couldn't finish all operations: [Error: Command --header sentry-trace:57d07eb0d4254ea99d34c747341efe77-82831aeb8529ff2c-1 --header baggage:sentry-environment=production,sentry-release=10.70.0,sentry-public_key=4c2bae7d9fbc413e8f7385f55c515d51,sentry-trace_id=57d07eb0d4254ea99d34c747341efe77,sentry-org_id=1,sentry-transaction=upload,sentry-sampled=true,sentry-sample_rand=0.11060238403116385,sentry-sample_rate=1 sourcemaps upload -p javascript-nextjs --release 348317caa6d2ae13de2632ed90716db8fa11f27a /tmp/sentry-bundler-plugin-upload-0VRhrF --ignore node_modules --no-rewrite failed with exit code 1]
14:43:31.549 [@sentry/nextjs - Client] Error: An error occurred. Couldn't finish all operations: [Error: Command failed: /vercel/path0/node_modules/@sentry/cli-linux-x64/bin/sentry-cli releases new 348317caa6d2ae13de2632ed90716db8fa11f27a
14:43:31.549 error: API request failed
14:43:31.550 
14:43:31.550 Caused by:
14:43:31.550     sentry reported an error: You do not have permission to perform this action. (http status: 403)
14:43:31.550 
14:43:31.550 Add --log-level=[info|debug] or export SENTRY_LOG_LEVEL=[info|debug] to see more output.
14:43:31.550 Please attach the full debug log to all bug reports.
14:43:31.550 ] {
14:43:31.550   code: 1,
14:43:31.550   killed: false,
14:43:31.550   signal: null,
14:43:31.550   cmd: '/vercel/path0/node_modules/@sentry/cli-linux-x64/bin/sentry-cli releases new 348317caa6d2ae13de2632ed90716db8fa11f27a'
14:43:31.550 }
14:43:33.270 > Found 355 files
14:43:33.286 > Analyzing 355 sources
14:43:33.309 > Analyzing completed in 0.023s
14:43:33.313 > Adding source map references
14:43:34.134 > Bundling completed in 0.819s
14:43:34.135 > Bundled 355 files for upload
14:43:34.135 > Bundle ID: 746fd5ef-a763-5489-8089-8d09c1804960
14:43:34.159 > Optimizing completed in 0.024s
14:43:34.373 error: API request failed
14:43:34.373 
14:43:34.373 Caused by:
14:43:34.373     sentry reported an error: You do not have permission to perform this action. (http status: 403)
14:43:34.373 
14:43:34.373 Add --log-level=[info|debug] or export SENTRY_LOG_LEVEL=[info|debug] to see more output.
14:43:34.374 Please attach the full debug log to all bug reports.
14:43:34.382 [@sentry/nextjs - Client] Error: An error occurred. Couldn't finish all operations: [Error: Command --header sentry-trace:b6554bfd3c06488cbce98d44fc7c2db0-bf37de2e5293d639-1 --header baggage:sentry-environment=production,sentry-release=10.70.0,sentry-public_key=4c2bae7d9fbc413e8f7385f55c515d51,sentry-trace_id=b6554bfd3c06488cbce98d44fc7c2db0,sentry-org_id=1,sentry-transaction=upload,sentry-sampled=true,sentry-sample_rand=0.8737013333716688,sentry-sample_rate=1 sourcemaps upload -p javascript-nextjs --release 348317caa6d2ae13de2632ed90716db8fa11f27a /tmp/sentry-bundler-plugin-upload-uaIXlt --ignore node_modules --no-rewrite failed with exit code 1]
```

## Dynamic Server Usage Error (/blog)

```
14:44:24.150 Failed to load blog posts: Error: Dynamic server usage: Route /blog couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
14:44:24.150     at s (.next/server/chunks/1893.js:1:11952)
14:44:24.150     at n (.next/server/chunks/7697.js:1:14109)
14:44:24.151     at f (.next/server/app/api/admin/ai/generate/route.js:61:2053)
14:44:24.151     at q (.next/server/app/blog/page.js:1:11671)
14:44:24.151     at <unknown> (.next/server/chunks/7688.js:198:212697)
14:44:24.151     at b.handleCallbackErrors (.next/server/chunks/7688.js:10:276986)
14:44:24.151     at Object.apply (.next/server/chunks/7688.js:198:212670)
14:44:24.151     at Object.apply (.next/server/app/blog/page.js:1:14895) {
14:44:24.151   description: "Route /blog couldn't be rendered statically because it used `cookies`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
14:44:24.151   digest: 'DYNAMIC_SERVER_USAGE'
14:44:24.152 }
```

## ESLint Warnings

```
./src/app/(auth)/complete-profile/page.tsx
4:8  Warning: 'Link' is defined but never used.  @typescript-eslint/no-unused-vars
14:3  Warning: 'signInWithCredential' is defined but never used.  @typescript-eslint/no-unused-vars
62:55  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
64:22  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
65:18  Warning: 'e' is defined but never used.  @typescript-eslint/no-unused-vars
66:20  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
76:15  Warning: 'hasEmailProvider' is assigned a value but never used.  @typescript-eslint/no-unused-vars
90:24  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
159:24  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
161:24  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
162:20  Warning: 'e' is defined but never used.  @typescript-eslint/no-unused-vars
163:22  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
169:20  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
178:38  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
189:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
258:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/(auth)/forgot-password/page.tsx
45:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/(auth)/login/AdminLogin.tsx
40:28  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
139:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/(auth)/login/CustomerLogin.tsx
52:55  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
54:22  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
55:18  Warning: 'e' is defined but never used.  @typescript-eslint/no-unused-vars
58:20  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
83:28  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
160:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
195:24  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
197:24  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
198:20  Warning: 'e' is defined but never used.  @typescript-eslint/no-unused-vars
199:22  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
205:20  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
213:38  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
224:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
226:55  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
228:22  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
229:18  Warning: 'e' is defined but never used.  @typescript-eslint/no-unused-vars
230:20  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
282:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
336:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
388:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/(auth)/reset-password/page.tsx
76:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/(auth)/set-password/page.tsx
18:3  Warning: 'ArrowRight' is defined but never used.  @typescript-eslint/no-unused-vars
123:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/(auth)/signup/page.tsx
43:55  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
45:22  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
46:18  Warning: 'e' is defined but never used.  @typescript-eslint/no-unused-vars
49:20  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
148:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
181:24  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
183:24  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
184:20  Warning: 'e' is defined but never used.  @typescript-eslint/no-unused-vars
185:22  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
191:20  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
199:38  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
210:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
212:55  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
214:22  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
215:18  Warning: 'e' is defined but never used.  @typescript-eslint/no-unused-vars
216:20  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
297:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
371:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
445:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/(policies)/cancellation-policy/page.tsx
25:26  Warning: `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`.  react/no-unescaped-entities
25:34  Warning: `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`.  react/no-unescaped-entities
25:39  Warning: `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`.  react/no-unescaped-entities
25:49  Warning: `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`.  react/no-unescaped-entities
29:54  Warning: `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`.  react/no-unescaped-entities
29:62  Warning: `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`.  react/no-unescaped-entities

./src/app/(policies)/data-deletion/page.tsx
36:22  Warning: `'` can be escaped with `&apos;`, `&lsquo;`, `&#39;`, `&rsquo;`.  react/no-unescaped-entities
37:41  Warning: `'` can be escaped with `&apos;`, `&lsquo;`, `&#39;`, `&rsquo;`.  react/no-unescaped-entities
57:40  Warning: `'` can be escaped with `&apos;`, `&lsquo;`, `&#39;`, `&rsquo;`.  react/no-unescaped-entities
124:21  Warning: `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`.  react/no-unescaped-entities
125:52  Warning: `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`.  react/no-unescaped-entities

./src/app/(policies)/privacy-policy/page.tsx
185:50  Warning: `'` can be escaped with `&apos;`, `&lsquo;`, `&#39;`, `&rsquo;`.  react/no-unescaped-entities

./src/app/(policies)/shipping-policy/page.tsx
79:13  Warning: `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`.  react/no-unescaped-entities
79:23  Warning: `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`.  react/no-unescaped-entities

./src/app/account/addresses/page.tsx
99:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
123:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
193:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
459:19  Warning: `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`.  react/no-unescaped-entities
459:35  Warning: `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`.  react/no-unescaped-entities

./src/app/account/coins/page.tsx
22:40  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
73:50  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/account/notifications/page.tsx
150:52  Warning: `'` can be escaped with `&apos;`, `&lsquo;`, `&#39;`, `&rsquo;`.  react/no-unescaped-entities

./src/app/account/page.tsx
105:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
122:17  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
144:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
159:17  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
194:28  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
269:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
310:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
331:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
403:47  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
408:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
412:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/account/referrals/ReferralLink.tsx
41:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/account/referrals/page.tsx
40:53  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
102:26  Warning: `'` can be escaped with `&apos;`, `&lsquo;`, `&#39;`, `&rsquo;`.  react/no-unescaped-entities
106:35  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/account/returns/page.tsx
8:3  Warning: 'Clock' is defined but never used.  @typescript-eslint/no-unused-vars
9:3  Warning: 'CheckCircle2' is defined but never used.  @typescript-eslint/no-unused-vars
10:3  Warning: 'XCircle' is defined but never used.  @typescript-eslint/no-unused-vars
11:3  Warning: 'ShieldCheck' is defined but never used.  @typescript-eslint/no-unused-vars
12:3  Warning: 'ShoppingBag' is defined but never used.  @typescript-eslint/no-unused-vars
188:19  Warning: `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`.  react/no-unescaped-entities
188:34  Warning: `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`.  react/no-unescaped-entities

./src/app/account/settings/page.tsx
7:3  Warning: 'Settings' is defined but never used.  @typescript-eslint/no-unused-vars
13:3  Warning: 'MessageSquare' is defined but never used.  @typescript-eslint/no-unused-vars
18:3  Warning: 'Info' is defined but never used.  @typescript-eslint/no-unused-vars
19:3  Warning: 'Trash2' is defined but never used.  @typescript-eslint/no-unused-vars
21:3  Warning: 'Smartphone' is defined but never used.  @typescript-eslint/no-unused-vars
25:3  Warning: 'LogOut' is defined but never used.  @typescript-eslint/no-unused-vars
26:3  Warning: 'Sparkles' is defined but never used.  @typescript-eslint/no-unused-vars
265:17  Warning: 'profile' is assigned a value but never used.  @typescript-eslint/no-unused-vars
404:31  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
411:35  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
443:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
468:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
798:48  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
838:52  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/account/support/[ticketId]/page.tsx
13:3  Warning: 'User' is defined but never used.  @typescript-eslint/no-unused-vars
42:36  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
50:6  Warning: React Hook useEffect has a missing dependency: 'fetchTicket'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps
199:31  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
295:36  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/account/support/page.tsx
9:3  Warning: 'CheckCircle2' is defined but never used.  @typescript-eslint/no-unused-vars
13:3  Warning: 'Plus' is defined but never used.  @typescript-eslint/no-unused-vars
36:42  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/account/wallet/page.tsx
86:6  Warning: React Hook useCallback has an unnecessary dependency: 'profile.wallet_balance'. Either exclude it or remove the dependency array.  react-hooks/exhaustive-deps
207:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/admin/actions/auth.ts
49:17  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
80:17  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/admin/actions/marketing.ts
22:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/admin/actions/settings.ts
46:11  Warning: 'data' is assigned a value but never used.  @typescript-eslint/no-unused-vars

./src/app/admin/ai-settings/page.tsx
49:46  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
50:44  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
51:42  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
52:52  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
53:36  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
55:46  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
148:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
274:52  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/admin/audit-logs/page.tsx
24:28  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
29:56  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/admin/categories/page.tsx
27:6  Warning: React Hook useEffect has a missing dependency: 'fetchCategories'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps
164:111  Warning: `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`.  react/no-unescaped-entities
164:124  Warning: `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`.  react/no-unescaped-entities

./src/app/admin/collections/page.tsx
6:54  Warning: 'Sparkles' is defined but never used.  @typescript-eslint/no-unused-vars
33:6  Warning: React Hook useEffect has a missing dependency: 'fetchCollections'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps
175:112  Warning: `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`.  react/no-unescaped-entities
175:127  Warning: `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`.  react/no-unescaped-entities

./src/app/admin/coupons/page.tsx
100:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
355:75  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/admin/dashboard/DashboardCharts.tsx
128:57  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
245:21  Warning: `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`.  react/no-unescaped-entities
245:42  Warning: `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`.  react/no-unescaped-entities

./src/app/admin/dashboard/MarketingDashboard.tsx
4:3  Warning: 'Megaphone' is defined but never used.  @typescript-eslint/no-unused-vars
7:3  Warning: 'CheckCircle2' is defined but never used.  @typescript-eslint/no-unused-vars
17:72  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
18:18  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
26:17  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
129:32  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/admin/dashboard/SalesDashboard.tsx
5:47  Warning: 'Star' is defined but never used.  @typescript-eslint/no-unused-vars
64:20  Warning: `'` can be escaped with `&apos;`, `&lsquo;`, `&#39;`, `&rsquo;`.  react/no-unescaped-entities

./src/app/admin/dashboard/page.tsx
38:29  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
411:53  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
425:53  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/admin/layout.tsx
42:29  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/admin/notifications/page.tsx
37:6  Warning: React Hook useEffect has a missing dependency: 'fetchHistory'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps
83:21  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
101:22  Warning: `'` can be escaped with `&apos;`, `&lsquo;`, `&#39;`, `&rsquo;`.  react/no-unescaped-entities

./src/app/admin/orders/[id]/page.tsx
11:3  Warning: 'Clock' is defined but never used.  @typescript-eslint/no-unused-vars
29:6  Warning: React Hook React.useEffect has a missing dependency: 'fetchOrder'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps
49:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/admin/orders/page.tsx
10:3  Warning: 'ExternalLink' is defined but never used.  @typescript-eslint/no-unused-vars
120:26  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
121:14  Warning: 'err' is defined but never used.  @typescript-eslint/no-unused-vars
121:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
157:32  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
158:32  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
193:30  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
194:30  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
288:65  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
347:55  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
351:55  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/admin/payments/page.tsx
38:43  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
132:62  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
141:62  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/admin/products/[id]/edit/page.tsx
7:10  Warning: 'DEMO_PRODUCTS' is defined but never used.  @typescript-eslint/no-unused-vars
8:21  Warning: 'Product' is defined but never used.  @typescript-eslint/no-unused-vars
32:50  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
33:46  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
35:40  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
72:48  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
77:21  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
148:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
297:60  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
380:37  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/admin/products/new/page.tsx
29:50  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
30:46  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
179:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
478:37  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/admin/products/page.tsx
11:3  Warning: 'ArrowLeft' is defined but never used.  @typescript-eslint/no-unused-vars
14:3  Warning: 'Trash2' is defined but never used.  @typescript-eslint/no-unused-vars
15:3  Warning: 'ExternalLink' is defined but never used.  @typescript-eslint/no-unused-vars
17:3  Warning: 'CheckCircle2' is defined but never used.  @typescript-eslint/no-unused-vars
18:3  Warning: 'XCircle' is defined but never used.  @typescript-eslint/no-unused-vars
19:3  Warning: 'Sparkles' is defined but never used.  @typescript-eslint/no-unused-vars
56:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
85:68  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
100:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
105:58  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
126:68  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
141:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
146:58  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
349:27  Warning: Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element

./src/app/admin/refunds/page.tsx
71:27  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
272:45  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
275:45  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
283:46  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
285:43  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
288:54  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
354:47  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
360:48  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
368:48  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/admin/reports/abandoned-carts/page.tsx
9:3  Warning: 'Clock' is defined but never used.  @typescript-eslint/no-unused-vars
13:3  Warning: 'Mail' is defined but never used.  @typescript-eslint/no-unused-vars
14:3  Warning: 'MessageCircle' is defined but never used.  @typescript-eslint/no-unused-vars
33:10  Warning: 'loading' is assigned a value but never used.  @typescript-eslint/no-unused-vars
64:34  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
90:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
118:14  Warning: 'err' is defined but never used.  @typescript-eslint/no-unused-vars

./src/app/admin/reports/coupons-referrals/page.tsx
9:3  Warning: 'Percent' is defined but never used.  @typescript-eslint/no-unused-vars
14:3  Warning: 'Users' is defined but never used.  @typescript-eslint/no-unused-vars
22:10  Warning: 'loading' is assigned a value but never used.  @typescript-eslint/no-unused-vars
62:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/admin/reports/inventory/page.tsx
9:3  Warning: 'CheckCircle' is defined but never used.  @typescript-eslint/no-unused-vars
57:67  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
82:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/admin/reports/sales/page.tsx
3:38  Warning: 'useMemo' is defined but never used.  @typescript-eslint/no-unused-vars
12:3  Warning: 'Calendar' is defined but never used.  @typescript-eslint/no-unused-vars
14:3  Warning: 'Truck' is defined but never used.  @typescript-eslint/no-unused-vars
15:3  Warning: 'CheckCircle2' is defined but never used.  @typescript-eslint/no-unused-vars
32:10  Warning: 'loading' is assigned a value but never used.  @typescript-eslint/no-unused-vars
100:26  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
121:40  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
157:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
168:6  Warning: React Hook useEffect has a missing dependency: 'fetchSalesReport'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps

./src/app/admin/seo/page.tsx
63:21  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
163:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
185:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
210:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
429:25  Warning: Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element
626:23  Warning: Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element
651:25  Warning: Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element

./src/app/admin/settings/page.tsx
12:3  Warning: 'Search' is defined but never used.  @typescript-eslint/no-unused-vars
709:37  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/admin/support-analytics/page.tsx
44:36  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
296:47  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/admin/tools/bulk-management/page.tsx
164:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/admin/users/page.tsx
68:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
94:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
137:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
155:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
176:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
479:68  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/admin/wallet/page.tsx
4:10  Warning: 'Wallet' is defined but never used.  @typescript-eslint/no-unused-vars

./src/app/api/admin/ai/audit/route.ts
113:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/api/admin/ai/credentials/route.ts
17:3  Warning: 'getAllCredentials' is defined but never used.  @typescript-eslint/no-unused-vars
21:3  Warning: 'getCredentialKey' is defined but never used.  @typescript-eslint/no-unused-vars
27:41  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
47:32  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
178:23  Warning: 'credRow' is assigned a value but never used.  @typescript-eslint/no-unused-vars
208:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
242:16  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
358:32  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/api/admin/ai/diagnostics/route.ts
15:27  Warning: 'req' is defined but never used.  @typescript-eslint/no-unused-vars
34:17  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
118:17  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
131:30  Warning: 'req' is defined but never used.  @typescript-eslint/no-unused-vars
143:17  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/api/admin/ai/discover-models/route.ts
54:13  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
82:28  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
100:46  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
113:44  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
124:44  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
133:44  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
144:44  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
165:20  Warning: 'e' is defined but never used.  @typescript-eslint/no-unused-vars
184:23  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
206:36  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
214:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
221:22  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
236:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
249:17  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/api/admin/ai/generate/route.ts
67:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/api/admin/ai/logs/route.ts
50:11  Warning: 'now' is assigned a value but never used.  @typescript-eslint/no-unused-vars
99:38  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
122:40  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
185:17  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/api/admin/ai/models/route.ts
17:3  Warning: 'inferModelCapabilities' is defined but never used.  @typescript-eslint/no-unused-vars
22:41  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
151:13  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
193:23  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
196:20  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
206:23  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
207:20  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
216:44  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
225:44  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
229:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/api/admin/ai/playground/route.ts
59:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/api/admin/ai/settings/route.ts
89:27  Warning: 'req' is defined but never used.  @typescript-eslint/no-unused-vars
116:34  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
124:23  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
147:43  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
148:39  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
156:53  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
161:13  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
164:13  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
291:17  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
331:32  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
337:53  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
340:16  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
418:23  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
454:29  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
463:45  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
464:41  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
471:54  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
476:15  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
479:15  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
520:17  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/api/admin/ai/simulate/route.ts
20:41  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
75:28  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
77:17  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
78:15  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
78:23  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
99:20  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
102:34  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
136:11  Warning: 'invalidCredentials' is assigned a value but never used.  @typescript-eslint/no-unused-vars

./src/app/api/admin/ai/test-connection/route.ts
50:13  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
194:16  Warning: 'e' is defined but never used.  @typescript-eslint/no-unused-vars
201:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
232:17  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/api/admin/bulk/import/route.ts
53:42  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
120:17  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/api/admin/export/route.ts
6:29  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
73:21  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
98:41  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
134:41  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
176:41  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
218:17  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/api/admin/marketing/campaigns/route.ts
8:27  Warning: 'request' is defined but never used.  @typescript-eslint/no-unused-vars
23:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
84:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/api/admin/marketing/coupons/[id]/route.ts
56:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
87:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/api/admin/marketing/coupons/route.ts
7:27  Warning: 'request' is defined but never used.  @typescript-eslint/no-unused-vars
26:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
97:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/api/admin/marketing/promotions/[id]/route.ts
54:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
87:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/api/admin/marketing/promotions/route.ts
7:27  Warning: 'request' is defined but never used.  @typescript-eslint/no-unused-vars
29:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
84:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/api/admin/notifications/route.ts
73:20  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
123:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/api/admin/orders/status/route.ts
93:48  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
94:44  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
96:43  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
97:32  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
107:54  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
108:51  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
109:52  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
110:58  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
112:52  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
145:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/api/admin/shiprocket/create-order/route.ts
68:55  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
69:40  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
80:53  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
204:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/api/admin/support-analytics/route.ts
81:13  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
90:17  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
94:44  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
99:45  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
108:38  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
109:39  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
110:46  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
113:17  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
116:17  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
118:43  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
120:41  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
121:43  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
125:38  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
126:41  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
127:39  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
128:41  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
131:51  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
136:42  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
145:55  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
151:44  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
161:17  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/api/admin/whatsapp/campaign/route.ts
186:36  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
228:66  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
238:23  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
275:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/api/auth/change-password/route.ts
166:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/api/auth/forgot-password/route.ts
150:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/api/auth/hybrid-login/route.ts
178:23  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
189:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/api/auth/logout/route.ts
3:28  Warning: 'request' is defined but never used.  @typescript-eslint/no-unused-vars

./src/app/api/auth/reset-password/route.ts
86:14  Warning: 'err' is defined but never used.  @typescript-eslint/no-unused-vars
86:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
145:11  Warning: 'updateRes' is assigned a value but never used.  @typescript-eslint/no-unused-vars
180:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/api/auth/session/route.ts
56:43  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
117:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/api/auth/sync-token/route.ts
45:43  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/api/capi/route.ts
62:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/api/chat/route.ts
85:20  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
109:17  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/api/checkout/phonepe/route.ts
195:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/api/checkout/validate-coupon/route.ts
50:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/api/checkout/verify/route.ts
45:35  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
101:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
280:30  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/api/checkout/verify-turnstile/route.ts
82:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/api/cron/ai-health/route.ts
6:27  Warning: 'req' is defined but never used.  @typescript-eslint/no-unused-vars
24:46  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
50:21  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
77:17  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/api/cron/automations/route.ts
116:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/api/emails/welcome/route.ts
16:15  Warning: 'session' is assigned a value but never used.  @typescript-eslint/no-unused-vars
27:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/api/support/analytics/route.ts
133:17  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/api/support/auto-assign/route.ts
72:26  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
120:30  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
121:22  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
122:30  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
129:24  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
218:17  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/api/support/canned-responses/route.ts
64:27  Warning: 'req' is defined but never used.  @typescript-eslint/no-unused-vars
74:17  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/api/support/categories/route.ts
8:27  Warning: 'req' is defined but never used.  @typescript-eslint/no-unused-vars
39:17  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/api/support/chat/route.ts
651:50  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
688:45  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
704:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
706:37  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
738:44  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
770:23  Warning: 'action' is assigned a value but never used.  @typescript-eslint/no-unused-vars
809:22  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
827:18  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
829:25  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
831:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
846:15  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
878:16  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
926:28  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
1029:32  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
1063:21  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
1122:17  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/api/support/team/route.ts
11:27  Warning: 'req' is defined but never used.  @typescript-eslint/no-unused-vars
119:17  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/api/support/tickets/[id]/messages/route.ts
12:46  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
28:44  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
157:62  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
189:26  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
235:17  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/api/support/tickets/[id]/notify/route.ts
10:46  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
143:17  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/api/support/tickets/[id]/route.ts
13:46  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
29:44  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
140:20  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
156:22  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
173:21  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
188:26  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
201:26  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
222:17  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
258:41  Warning: 'fetchError' is assigned a value but never used.  @typescript-eslint/no-unused-vars
268:20  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
269:25  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
422:17  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/api/support/tickets/batch/route.ts
47:25  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
48:30  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
99:22  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
179:17  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/api/support/tickets/route.ts
13:46  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
29:44  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
175:17  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
395:17  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/api/support/tickets/status/route.ts
10:46  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
125:17  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/api/wallet/topup/route.ts
168:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/api/webhooks/phonepe/route.ts
61:18  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/api/webhooks/phonepe-wallet/route.ts
35:18  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/api/webhooks/shiprocket/route.ts
27:11  Warning: 'location' is assigned a value but never used.  @typescript-eslint/no-unused-vars
28:11  Warning: 'activity' is assigned a value but never used.  @typescript-eslint/no-unused-vars
29:11  Warning: 'timestamp' is assigned a value but never used.  @typescript-eslint/no-unused-vars

./src/app/cart/page.tsx
10:3  Warning: 'ArrowRight' is defined but never used.  @typescript-eslint/no-unused-vars
15:3  Warning: 'ImageOff' is defined but never used.  @typescript-eslint/no-unused-vars
61:6  Warning: React Hook useEffect has a missing dependency: 'subtotal'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps

./src/app/category/[slug]/page.tsx
29:67  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
69:67  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
85:10  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/checkout/page.tsx
6:8  Warning: 'Script' is defined but never used.  @typescript-eslint/no-unused-vars
36:35  Warning: 'authLoading' is assigned a value but never used.  @typescript-eslint/no-unused-vars
50:55  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
52:22  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
53:18  Warning: 'e' is defined but never used.  @typescript-eslint/no-unused-vars
54:20  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
82:31  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
283:60  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
354:31  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
369:14  Warning: 'err' is defined but never used.  @typescript-eslint/no-unused-vars
596:25  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
603:22  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
619:22  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
627:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
649:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
656:49  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
707:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
1661:17  Warning: `'` can be escaped with `&apos;`, `&lsquo;`, `&#39;`, `&rsquo;`.  react/no-unescaped-entities

./src/app/collections/[type]/page.tsx
45:40  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
183:42  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
196:37  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
276:46  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/faq/page.tsx
134:21  Warning: `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`.  react/no-unescaped-entities
134:31  Warning: `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`.  react/no-unescaped-entities
147:46  Warning: `'` can be escaped with `&apos;`, `&lsquo;`, `&#39;`, `&rsquo;`.  react/no-unescaped-entities
165:37  Warning: `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`.  react/no-unescaped-entities
165:45  Warning: `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`.  react/no-unescaped-entities
225:15  Warning: `'` can be escaped with `&apos;`, `&lsquo;`, `&#39;`, `&rsquo;`.  react/no-unescaped-entities

./src/app/jewelry-care/page.tsx
9:3  Warning: 'HeartHandshake' is defined but never used.  @typescript-eslint/no-unused-vars

./src/app/layout.tsx
114:8  Warning: 'Script' is defined but never used.  @typescript-eslint/no-unused-vars

./src/app/marketing/campaigns/page.tsx
6:3  Warning: 'Plus' is defined but never used.  @typescript-eslint/no-unused-vars
59:14  Warning: 'e' is defined but never used.  @typescript-eslint/no-unused-vars
129:14  Warning: 'e' is defined but never used.  @typescript-eslint/no-unused-vars

./src/app/marketing/coupons/page.tsx
71:14  Warning: 'e' is defined but never used.  @typescript-eslint/no-unused-vars
127:14  Warning: 'e' is defined but never used.  @typescript-eslint/no-unused-vars
149:14  Warning: 'e' is defined but never used.  @typescript-eslint/no-unused-vars
164:14  Warning: 'e' is defined but never used.  @typescript-eslint/no-unused-vars

./src/app/marketing/layout.tsx
34:29  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/marketing/promotions/page.tsx
53:14  Warning: 'e' is defined but never used.  @typescript-eslint/no-unused-vars
95:14  Warning: 'e' is defined but never used.  @typescript-eslint/no-unused-vars
119:14  Warning: 'e' is defined but never used.  @typescript-eslint/no-unused-vars
134:14  Warning: 'e' is defined but never used.  @typescript-eslint/no-unused-vars

./src/app/offers/OffersClient.tsx
9:10  Warning: 'Breadcrumbs' is defined but never used.  @typescript-eslint/no-unused-vars

./src/app/operations/cms/actions.ts
35:17  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
77:17  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
117:17  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
133:17  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/operations/cms/page.tsx
37:40  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
38:52  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
153:43  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/operations/inventory/actions.ts
46:17  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/operations/inventory/adjustment/page.tsx
12:44  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
13:58  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
42:41  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
71:16  Warning: 'err' is defined but never used.  @typescript-eslint/no-unused-vars

./src/app/operations/inventory/page.tsx
15:60  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
16:62  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/operations/layout.tsx
5:8  Warning: 'Image' is defined but never used.  @typescript-eslint/no-unused-vars
15:3  Warning: 'Settings' is defined but never used.  @typescript-eslint/no-unused-vars
17:3  Warning: 'Search' is defined but never used.  @typescript-eslint/no-unused-vars
23:3  Warning: 'Home' is defined but never used.  @typescript-eslint/no-unused-vars
36:29  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
300:9  Warning: 'displayRole' is assigned a value but never used.  @typescript-eslint/no-unused-vars

./src/app/operations/products/ProductForm.tsx
14:3  Warning: 'AlertTriangle' is defined but never used.  @typescript-eslint/no-unused-vars
15:3  Warning: 'Check' is defined but never used.  @typescript-eslint/no-unused-vars
25:17  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
32:48  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
49:44  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
54:46  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
95:50  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
200:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
243:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
299:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
367:16  Warning: 'err' is defined but never used.  @typescript-eslint/no-unused-vars
367:21  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
864:21  Warning: Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element

./src/app/operations/products/[id]/page.tsx
35:11  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
35:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/operations/products/actions.ts
85:17  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
170:17  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
185:17  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/operations/products/page.tsx
11:44  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
37:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
49:6  Warning: React Hook useEffect has a missing dependency: 'fetchProducts'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps

./src/app/order-success/[orderId]/page.tsx
22:52  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
39:45  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
49:43  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/orders/[id]/invoice/page.tsx
8:3  Warning: 'Download' is defined but never used.  @typescript-eslint/no-unused-vars
10:3  Warning: 'Sparkles' is defined but never used.  @typescript-eslint/no-unused-vars

./src/app/orders/[id]/page.tsx
13:3  Warning: 'Truck' is defined but never used.  @typescript-eslint/no-unused-vars
14:3  Warning: 'CheckCircle2' is defined but never used.  @typescript-eslint/no-unused-vars
15:3  Warning: 'ShieldCheck' is defined but never used.  @typescript-eslint/no-unused-vars
330:23  Warning: `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`.  react/no-unescaped-entities
330:44  Warning: `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`.  react/no-unescaped-entities

./src/app/orders/[id]/return/page.tsx
4:8  Warning: 'Link' is defined but never used.  @typescript-eslint/no-unused-vars
12:3  Warning: 'Upload' is defined but never used.  @typescript-eslint/no-unused-vars

./src/app/orders/page.tsx
9:3  Warning: 'Clock' is defined but never used.  @typescript-eslint/no-unused-vars
10:3  Warning: 'CheckCircle' is defined but never used.  @typescript-eslint/no-unused-vars
11:3  Warning: 'AlertCircle' is defined but never used.  @typescript-eslint/no-unused-vars

./src/app/page.tsx
9:3  Warning: 'Star' is defined but never used.  @typescript-eslint/no-unused-vars
10:3  Warning: 'Layers' is defined but never used.  @typescript-eslint/no-unused-vars
11:3  Warning: 'Gem' is defined but never used.  @typescript-eslint/no-unused-vars
14:3  Warning: 'BadgeCheck' is defined but never used.  @typescript-eslint/no-unused-vars
18:10  Warning: 'TiltCard' is defined but never used.  @typescript-eslint/no-unused-vars
19:8  Warning: 'Hero3D' is defined but never used.  @typescript-eslint/no-unused-vars

./src/app/portal-orders/[id]/page.tsx
26:28  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
177:10  Warning: 'EventIcon' is defined but never used.  @typescript-eslint/no-unused-vars
198:9  Warning: 'isLast' is assigned a value but never used.  @typescript-eslint/no-unused-vars
293:6  Warning: React Hook React.useEffect has missing dependencies: 'fetchEvents' and 'fetchOrder'. Either include them or remove the dependency array.  react-hooks/exhaustive-deps
313:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/portal-orders/all/page.tsx
10:3  Warning: 'ExternalLink' is defined but never used.  @typescript-eslint/no-unused-vars
100:26  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
101:14  Warning: 'err' is defined but never used.  @typescript-eslint/no-unused-vars
101:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
137:32  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
138:32  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
224:65  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
283:55  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
287:55  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/portal-orders/dashboard/page.tsx
11:30  Warning: `'` can be escaped with `&apos;`, `&lsquo;`, `&#39;`, `&rsquo;`.  react/no-unescaped-entities

./src/app/portal-orders/layout.tsx
31:29  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/products/ProductsCatalogClient.tsx
33:48  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
309:69  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
351:64  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/products/[slug]/ProductDetailPageClient.tsx
31:10  Warning: 'SpatialPage' is defined but never used.  @typescript-eslint/no-unused-vars

./src/app/products/[slug]/page.tsx
42:10  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
108:10  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
144:24  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
171:24  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
182:43  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/products/page.tsx
1:17  Warning: 'Suspense' is defined but never used.  @typescript-eslint/no-unused-vars

./src/app/sitemap.ts
46:39  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
52:12  Warning: 'error' is defined but never used.  @typescript-eslint/no-unused-vars

./src/app/size-guide/page.tsx
114:40  Warning: `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`.  react/no-unescaped-entities
120:40  Warning: `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`.  react/no-unescaped-entities
126:40  Warning: `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`.  react/no-unescaped-entities
132:40  Warning: `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`.  react/no-unescaped-entities

./src/app/support/analytics/page.tsx
11:3  Warning: 'Users' is defined but never used.  @typescript-eslint/no-unused-vars
12:3  Warning: 'Shield' is defined but never used.  @typescript-eslint/no-unused-vars
27:3  Warning: 'Legend' is defined but never used.  @typescript-eslint/no-unused-vars
48:36  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
114:9  Warning: 'categoryData' is assigned a value but never used.  @typescript-eslint/no-unused-vars
250:46  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
332:40  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/support/canned-responses/page.tsx
5:3  Warning: 'MessageSquare' is defined but never used.  @typescript-eslint/no-unused-vars
9:3  Warning: 'Sparkles' is defined but never used.  @typescript-eslint/no-unused-vars
10:3  Warning: 'Tag' is defined but never used.  @typescript-eslint/no-unused-vars
11:3  Warning: 'BookOpen' is defined but never used.  @typescript-eslint/no-unused-vars

./src/app/support/dashboard/page.tsx
11:3  Warning: 'TrendingUp' is defined but never used.  @typescript-eslint/no-unused-vars
12:3  Warning: 'UserCheck' is defined but never used.  @typescript-eslint/no-unused-vars
13:3  Warning: 'AlertCircle' is defined but never used.  @typescript-eslint/no-unused-vars
18:3  Warning: 'ShieldAlert' is defined but never used.  @typescript-eslint/no-unused-vars
24:3  Warning: 'PieChart' is defined but never used.  @typescript-eslint/no-unused-vars
25:3  Warning: 'Pie' is defined but never used.  @typescript-eslint/no-unused-vars
129:10  Warning: 'unassignedTickets' is assigned a value but never used.  @typescript-eslint/no-unused-vars

./src/app/support/layout.tsx
5:8  Warning: 'Image' is defined but never used.  @typescript-eslint/no-unused-vars
18:3  Warning: 'Bell' is defined but never used.  @typescript-eslint/no-unused-vars
31:11  Warning: 'NavChild' is defined but never used.  @typescript-eslint/no-unused-vars
39:29  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
290:9  Warning: 'userEmail' is assigned a value but never used.  @typescript-eslint/no-unused-vars

./src/app/support/team/page.tsx
6:3  Warning: 'Users' is defined but never used.  @typescript-eslint/no-unused-vars
9:3  Warning: 'CheckCircle2' is defined but never used.  @typescript-eslint/no-unused-vars
10:3  Warning: 'Ticket' is defined but never used.  @typescript-eslint/no-unused-vars
11:3  Warning: 'Clock' is defined but never used.  @typescript-eslint/no-unused-vars
15:3  Warning: 'AlertCircle' is defined but never used.  @typescript-eslint/no-unused-vars
16:3  Warning: 'Shield' is defined but never used.  @typescript-eslint/no-unused-vars
42:10  Warning: 'unassignedTickets' is assigned a value but never used.  @typescript-eslint/no-unused-vars
42:62  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/support/tickets/[id]/page.tsx
12:3  Warning: 'Package' is defined but never used.  @typescript-eslint/no-unused-vars
14:3  Warning: 'MapPin' is defined but never used.  @typescript-eslint/no-unused-vars
17:3  Warning: 'AlertTriangle' is defined but never used.  @typescript-eslint/no-unused-vars
18:3  Warning: 'CheckCircle2' is defined but never used.  @typescript-eslint/no-unused-vars
20:3  Warning: 'ExternalLink' is defined but never used.  @typescript-eslint/no-unused-vars
21:3  Warning: 'Shield' is defined but never used.  @typescript-eslint/no-unused-vars
24:3  Warning: 'Zap' is defined but never used.  @typescript-eslint/no-unused-vars
25:3  Warning: 'Users' is defined but never used.  @typescript-eslint/no-unused-vars
28:3  Warning: 'CreditCard' is defined but never used.  @typescript-eslint/no-unused-vars
29:3  Warning: 'Truck' is defined but never used.  @typescript-eslint/no-unused-vars
30:3  Warning: 'HelpCircle' is defined but never used.  @typescript-eslint/no-unused-vars
32:3  Warning: 'Phone' is defined but never used.  @typescript-eslint/no-unused-vars
33:3  Warning: 'Mail' is defined but never used.  @typescript-eslint/no-unused-vars
34:3  Warning: 'Wallet' is defined but never used.  @typescript-eslint/no-unused-vars
35:3  Warning: 'Coins' is defined but never used.  @typescript-eslint/no-unused-vars
86:36  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
116:6  Warning: React Hook useEffect has a missing dependency: 'fetchTicket'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps
151:40  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
269:15  Warning: 'isVideo' is assigned a value but never used.  @typescript-eslint/no-unused-vars
292:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
333:5  Warning: 'trackingUpdates' is assigned a value but never used.  @typescript-eslint/no-unused-vars
341:42  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
343:13  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
349:35  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
363:19  Warning: Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element
557:34  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
560:23  Warning: 'isStaff' is assigned a value but never used.  @typescript-eslint/no-unused-vars
561:23  Warning: 'isSystem' is assigned a value but never used.  @typescript-eslint/no-unused-vars
1026:46  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
1121:43  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
1155:38  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/support/tickets/new/page.tsx
10:3  Warning: 'User' is defined but never used.  @typescript-eslint/no-unused-vars
11:3  Warning: 'ShoppingBag' is defined but never used.  @typescript-eslint/no-unused-vars
12:3  Warning: 'Tag' is defined but never used.  @typescript-eslint/no-unused-vars
98:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/support/tickets/page.tsx
17:3  Warning: 'UserCheck' is defined but never used.  @typescript-eslint/no-unused-vars
22:3  Warning: 'Users' is defined but never used.  @typescript-eslint/no-unused-vars
23:3  Warning: 'MoreHorizontal' is defined but never used.  @typescript-eslint/no-unused-vars
144:9  Warning: 'router' is assigned a value but never used.  @typescript-eslint/no-unused-vars
145:10  Warning: 'isPending' is assigned a value but never used.  @typescript-eslint/no-unused-vars
145:21  Warning: 'startTransition' is assigned a value but never used.  @typescript-eslint/no-unused-vars

./src/app/support-status/page.tsx
13:3  Warning: 'ArrowRight' is defined but never used.  @typescript-eslint/no-unused-vars
20:8  Warning: 'Link' is defined but never used.  @typescript-eslint/no-unused-vars
35:40  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
36:44  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
37:50  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
70:15  Warning: 'isVideo' is assigned a value but never used.  @typescript-eslint/no-unused-vars
92:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
119:6  Warning: React Hook useEffect has missing dependencies: 'email' and 'handleSearch'. Either include them or remove the dependency array.  react-hooks/exhaustive-deps
147:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
188:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
195:42  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
197:13  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
203:35  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
217:19  Warning: Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element

./src/app/test-auth/page.tsx
8:3  Warning: 'signInWithFacebook' is defined but never used.  @typescript-eslint/no-unused-vars
14:3  Warning: 'linkFacebookToSession' is defined but never used.  @typescript-eslint/no-unused-vars
23:64  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
27:27  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/testimonials/page.tsx
113:19  Warning: `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`.  react/no-unescaped-entities
113:45  Warning: `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`.  react/no-unescaped-entities

./src/app/tracking/[orderId]/page.tsx
5:28  Warning: 'Package' is defined but never used.  @typescript-eslint/no-unused-vars
5:37  Warning: 'ShieldCheck' is defined but never used.  @typescript-eslint/no-unused-vars
5:50  Warning: 'MapPin' is defined but never used.  @typescript-eslint/no-unused-vars
11:58  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
119:37  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/wishlist/WishlistClient.tsx
4:8  Warning: 'Link' is defined but never used.  @typescript-eslint/no-unused-vars
11:3  Warning: 'ArrowRight' is defined but never used.  @typescript-eslint/no-unused-vars
37:38  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/app/wishlist/share/[userId]/SharedWishlistClient.tsx
38:26  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/components/CustomerSupportChat.tsx
4:19  Warning: 'Paperclip' is defined but never used.  @typescript-eslint/no-unused-vars
106:14  Warning: 'err' is defined but never used.  @typescript-eslint/no-unused-vars
158:14  Warning: 'err' is defined but never used.  @typescript-eslint/no-unused-vars
275:14  Warning: 'err' is defined but never used.  @typescript-eslint/no-unused-vars

./src/components/MetaPixel.tsx
10:10  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
11:11  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
61:9  Warning: Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element

./src/components/OneSignalInit.tsx
21:16  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/components/admin/AIProductAssistant.tsx
23:20  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
24:18  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
33:40  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
62:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
160:17  Warning: `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`.  react/no-unescaped-entities
160:56  Warning: `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`.  react/no-unescaped-entities

./src/components/admin/Product360Editor.tsx
4:10  Warning: 'Product360Set' is defined but never used.  @typescript-eslint/no-unused-vars
26:23  Warning: 'error' is assigned a value but never used.  @typescript-eslint/no-unused-vars
37:16  Warning: 'e' is defined but never used.  @typescript-eslint/no-unused-vars
85:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
124:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
151:21  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
194:17  Warning: Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element

./src/components/admin/ai/AiAnalytics.tsx
41:35  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
41:59  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
59:3  Warning: 'features' is assigned a value but never used.  @typescript-eslint/no-unused-vars
123:36  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
410:36  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
461:36  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/components/admin/ai/AiDashboard.tsx
15:3  Warning: 'XCircle' is defined but never used.  @typescript-eslint/no-unused-vars
16:3  Warning: 'Clock' is defined but never used.  @typescript-eslint/no-unused-vars
20:3  Warning: 'TrendingUp' is defined but never used.  @typescript-eslint/no-unused-vars

./src/components/admin/ai/AiDiagnostics.tsx
14:3  Warning: 'Cpu' is defined but never used.  @typescript-eslint/no-unused-vars
15:3  Warning: 'Layers' is defined but never used.  @typescript-eslint/no-unused-vars
17:3  Warning: 'Activity' is defined but never used.  @typescript-eslint/no-unused-vars
21:3  Warning: 'Info' is defined but never used.  @typescript-eslint/no-unused-vars
49:29  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
52:39  Warning: 'props' is defined but never used.  @typescript-eslint/no-unused-vars
54:38  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
121:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
149:13  Warning: 'data' is assigned a value but never used.  @typescript-eslint/no-unused-vars
160:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
184:25  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
195:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/components/admin/ai/AiGlobalSettings.tsx
6:3  Warning: 'Settings' is defined but never used.  @typescript-eslint/no-unused-vars
18:45  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/components/admin/ai/AiPlayground.tsx
6:3  Warning: 'providers' is defined but never used.  @typescript-eslint/no-unused-vars
7:3  Warning: 'features' is defined but never used.  @typescript-eslint/no-unused-vars
13:40  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
53:14  Warning: 'err' is defined but never used.  @typescript-eslint/no-unused-vars
53:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/components/admin/ai/AiProviders.tsx
7:3  Warning: 'Plus' is defined but never used.  @typescript-eslint/no-unused-vars
23:3  Warning: 'RotateCcw' is defined but never used.  @typescript-eslint/no-unused-vars
24:3  Warning: 'Sparkles' is defined but never used.  @typescript-eslint/no-unused-vars
108:61  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
133:63  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
134:43  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
136:11  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
166:43  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
203:14  Warning: 'err' is defined but never used.  @typescript-eslint/no-unused-vars
203:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
214:43  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
245:14  Warning: 'err' is defined but never used.  @typescript-eslint/no-unused-vars
245:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
895:40  Warning: `'` can be escaped with `&apos;`, `&lsquo;`, `&#39;`, `&rsquo;`.  react/no-unescaped-entities

./src/components/admin/ai/AiRouting.tsx
12:3  Warning: 'AlertTriangle' is defined but never used.  @typescript-eslint/no-unused-vars
20:3  Warning: 'Send' is defined but never used.  @typescript-eslint/no-unused-vars
22:3  Warning: 'Server' is defined but never used.  @typescript-eslint/no-unused-vars
50:12  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
51:14  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
56:9  Warning: 'getProviderLatency' is assigned a value but never used.  @typescript-eslint/no-unused-vars
97:61  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
123:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
208:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
970:45  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/components/admin/ai/AiSecurity.tsx
8:3  Warning: 'Key' is defined but never used.  @typescript-eslint/no-unused-vars
30:3  Warning: 'providers' is defined but never used.  @typescript-eslint/no-unused-vars
48:14  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
51:45  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
574:62  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
842:67  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
915:68  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/components/admin/ai/CredentialManager.tsx
9:3  Warning: 'X' is defined but never used.  @typescript-eslint/no-unused-vars
12:3  Warning: 'ShieldAlert' is defined but never used.  @typescript-eslint/no-unused-vars
201:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
434:15  Warning: 'cfg' is assigned a value but never used.  @typescript-eslint/no-unused-vars

./src/components/admin/ai/types.ts
42:32  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
50:14  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
51:21  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
52:13  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
53:20  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
54:12  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
55:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
56:17  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
57:24  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
58:9  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
61:40  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/components/layout/AccountDrawer.tsx
6:8  Warning: 'Image' is defined but never used.  @typescript-eslint/no-unused-vars
22:3  Warning: 'Sparkles' is defined but never used.  @typescript-eslint/no-unused-vars
23:3  Warning: 'Shield' is defined but never used.  @typescript-eslint/no-unused-vars
37:9  Warning: 'router' is assigned a value but never used.  @typescript-eslint/no-unused-vars
89:6  Warning: React Hook useEffect has a missing dependency: 'onClose'. Either include it or remove the dependency array. If 'onClose' changes too often, find the parent component that defines it and wrap that definition in useCallback.  react-hooks/exhaustive-deps

./src/components/layout/Navbar.tsx
8:3  Warning: 'Heart' is defined but never used.  @typescript-eslint/no-unused-vars
14:3  Warning: 'Bell' is defined but never used.  @typescript-eslint/no-unused-vars
15:3  Warning: 'LogOut' is defined but never used.  @typescript-eslint/no-unused-vars
16:3  Warning: 'Package' is defined but never used.  @typescript-eslint/no-unused-vars
17:3  Warning: 'ShieldCheck' is defined but never used.  @typescript-eslint/no-unused-vars
38:11  Warning: 'wishlistCount' is assigned a value but never used.  @typescript-eslint/no-unused-vars
39:11  Warning: 'unreadCount' is assigned a value but never used.  @typescript-eslint/no-unused-vars
40:26  Warning: 'signOut' is assigned a value but never used.  @typescript-eslint/no-unused-vars

./src/components/products/Product360Viewer.tsx
3:46  Warning: 'useCallback' is defined but never used.  @typescript-eslint/no-unused-vars
205:9  Warning: Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element

./src/components/products/ProductReviews.tsx
199:19  Warning: `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`.  react/no-unescaped-entities
199:40  Warning: `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`.  react/no-unescaped-entities

./src/components/search/SearchBar.tsx
7:18  Warning: 'Tag' is defined but never used.  @typescript-eslint/no-unused-vars
7:35  Warning: 'PackageCheck' is defined but never used.  @typescript-eslint/no-unused-vars
98:37  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
136:14  Warning: 'err' is defined but never used.  @typescript-eslint/no-unused-vars

./src/context/AuthContext.tsx
54:41  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
57:17  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
123:41  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
145:47  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
216:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
231:11  Warning: 'supabase' is assigned a value but never used.  @typescript-eslint/no-unused-vars
235:47  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
245:32  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
328:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
330:44  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/context/CartContext.tsx
91:14  Warning: 'error' is defined but never used.  @typescript-eslint/no-unused-vars
120:14  Warning: 'error' is defined but never used.  @typescript-eslint/no-unused-vars
141:14  Warning: 'error' is defined but never used.  @typescript-eslint/no-unused-vars

./src/context/WishlistContext.tsx
56:14  Warning: 'error' is defined but never used.  @typescript-eslint/no-unused-vars
69:14  Warning: 'error' is defined but never used.  @typescript-eslint/no-unused-vars

./src/hooks/useSupportRealtime.ts
11:12  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
16:26  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
17:30  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
18:28  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
22:29  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
40:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
57:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
74:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
93:6  Warning: React Hook useEffect has missing dependencies: 'addEvent' and 'options'. Either include them or remove the dependency array.  react-hooks/exhaustive-deps

./src/lib/ai/__tests__/routing.test.ts
22:30  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
24:10  Warning: 'mockSupabase' is defined but never used.  @typescript-eslint/no-unused-vars
27:16  Warning: 'cols' is defined but never used.  @typescript-eslint/no-unused-vars
28:23  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
39:29  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
74:28  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
79:24  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
80:23  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
81:26  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
84:42  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
98:28  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
98:35  Warning: 'opts' is defined but never used.  @typescript-eslint/no-unused-vars
98:42  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/lib/ai/credential-encryption.ts
33:12  Warning: 'error' is defined but never used.  @typescript-eslint/no-unused-vars

./src/lib/ai/credentials.ts
71:42  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
98:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
118:26  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
133:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
138:17  Warning: 'error' is assigned a value but never used.  @typescript-eslint/no-unused-vars
155:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
184:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
254:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
306:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
331:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
363:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
391:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
419:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
466:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
485:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
512:9  Warning: 'now' is assigned a value but never used.  @typescript-eslint/no-unused-vars
516:11  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
519:11  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
523:30  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
525:24  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
529:24  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/lib/ai/diagnostics.ts
34:29  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
64:5  Warning: 'totalPurgedLifetime' is assigned a value but never used.  @typescript-eslint/no-unused-vars
224:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/lib/ai/error-classifier.ts
128:35  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
140:42  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
155:10  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/lib/ai/index.ts
69:29  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
83:17  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
107:20  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
150:16  Warning: 'createAdminClientFromCookies' is defined but never used.  @typescript-eslint/no-unused-vars
176:18  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
177:17  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
253:30  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
293:27  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
388:12  Warning: 'e' is defined but never used.  @typescript-eslint/no-unused-vars
403:15  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
416:26  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
425:68  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
576:16  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
599:15  Warning: 'modelSucceeded' is assigned a value but never used.  @typescript-eslint/no-unused-vars
750:27  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
1020:23  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/lib/ai/keys.ts
152:18  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/lib/ai/knowledge.ts
151:42  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
170:53  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
182:47  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
191:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
209:11  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
219:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
237:11  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
248:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
275:56  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
295:11  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
307:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/lib/ai/model-health.ts
79:42  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
102:22  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
134:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
158:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
187:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
213:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
237:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
267:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
305:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
327:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
344:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/lib/ai/prompts.ts
4:16  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/lib/ai/providers/anthropic.ts
18:29  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/lib/ai/providers/custom.ts
9:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
12:23  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
25:29  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
96:15  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
107:22  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
134:16  Warning: 'e' is defined but never used.  @typescript-eslint/no-unused-vars
149:53  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/lib/ai/providers/deepseek.ts
18:29  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
71:53  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/lib/ai/providers/gemini.ts
47:29  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
82:21  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
95:17  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
106:35  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
139:21  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/lib/ai/providers/openai.ts
18:29  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/lib/ai/providers/openrouter.ts
18:29  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/lib/ai/tools/brevo.ts
31:42  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
67:42  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
93:42  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/lib/ai/tools/index.ts
16:30  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
23:34  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
23:51  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/lib/analytics.ts
12:64  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/lib/audit.ts
11:28  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/lib/auth/rbac.ts
8:20  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/lib/auth/require-admin-client.ts
5:13  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/lib/auth/server.ts
41:12  Warning: 'error' is defined but never used.  @typescript-eslint/no-unused-vars

./src/lib/brevo/mcp.ts
70:70  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/lib/brevo.ts
171:31  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
194:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
219:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/lib/fcm.ts
47:63  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/lib/firebase-admin.ts
129:22  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/lib/gtag.ts
5:21  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
36:74  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/lib/order-events.ts
35:18  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
116:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
153:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/lib/orders/create-order.ts
15:10  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
16:12  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
43:9  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
44:13  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
146:19  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
176:56  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
267:47  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/lib/orders/finalize-phonepe-order.ts
7:11  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
67:34  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
119:49  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
119:61  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
167:33  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
169:46  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/lib/products.ts
1:29  Warning: 'ImageType' is defined but never used.  @typescript-eslint/no-unused-vars

./src/lib/resend.ts
64:71  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
90:66  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
114:73  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
138:68  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
162:68  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
186:69  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
210:67  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
249:67  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/lib/sales-metrics.ts
26:15  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
71:37  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/lib/security/ssrf.ts
35:57  Warning: 'd' is defined but never used.  @typescript-eslint/no-unused-vars

./src/lib/shiprocket.ts
62:52  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/lib/supabase/client.ts
3:23  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/lib/support/serverAuth.ts
13:60  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/lib/wallet/topup.ts
106:32  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
139:32  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/lib/whatsapp.ts
15:15  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/middleware.ts
229:13  Warning: 'email' is assigned a value but never used.  @typescript-eslint/no-unused-vars

./src/services/authService.ts
2:10  Warning: 'createClient' is defined but never used.  @typescript-eslint/no-unused-vars
16:3  Warning: 'PhoneAuthProvider' is defined but never used.  @typescript-eslint/no-unused-vars
47:44  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/services/cloudinaryService.ts
67:42  Warning: 'publicId' is defined but never used.  @typescript-eslint/no-unused-vars

./src/types/database.ts
77:33  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
78:31  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
276:28  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
283:25  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
283:32  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any

./src/types/declarations.d.ts
2:21  Warning: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
```

Note: Build ultimately completed successfully (`Build Completed in /vercel/output [3m]`). The Sentry 403 errors and the /blog dynamic-server-usage error did not fail the build.
