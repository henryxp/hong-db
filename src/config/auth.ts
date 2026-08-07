// Auth credentials for the Hong-DB landing demo.
//
// The plaintext password is kept here for reference only — at runtime we only
// compare the MD5 digest of the user input against `passwordMd5` below.
//
// To rotate the password, change `password` to the new plaintext, then update
// `passwordMd5` to its MD5 digest (e.g. `node -e "console.log(require('crypto').createHash('md5').update('NEWPASS').digest('hex'))"`).
export const AUTH_CONFIG = {
  username: 'admin',
  password: '5bing2yu',
  passwordMd5: '898038925ceacec49503e11392e78a74',
} as const
