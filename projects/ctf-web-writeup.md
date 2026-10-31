

## Summary

A web challenge in **[2026]** presented a login form with no visible way in. The application built its database query by joining user input into a string, which let me change the query's logic and sign in without valid credentials.

The finding is a textbook case of injection, ranked in the OWASP Top 10 for years. The interesting part is not the trick itself but how little it takes to prevent it.

## Scope and rules

- **Target:** a deliberately vulnerable challenge host provided by the organisers
- **Permission:** the event rules explicitly allowed testing and public write-ups after the event closed
- **Out of scope:** any other host, and any attack on the event platform itself

## Approach

1. **Mapped the application.** Browsed every page, noted the login form, the parameters it sent and the error messages it returned.
2. **Tested how input was handled.** Sent harmless characters (such as a single quote) to see whether the application treated them as data or as part of a query.
3. **Read the response.** A database error in the page confirmed that input reached the query unescaped.
4. **Confirmed the logic flaw.** Showed that the condition in the query could be altered so the password check no longer applied.
5. **Stopped at proof.** Recorded the evidence needed for the write-up and went no further.

## Evidence

The bypass returned a flag: ||flag{sample_value_not_real}|| (click the bar to reveal it). Redaction bars are for presentation only. Anything in a `.md` file is public, so never put a real secret in one.

## Findings

| Finding | Impact | Recommended fix |
| --- | --- | --- |
| User input concatenated into a SQL query | Authentication bypass, possible data exposure | Use parameterised queries |
| Verbose database errors shown to users | Reveals query structure to an attacker | Log errors server-side, show a generic message |
| No limit on failed logins | Allows unlimited guessing | Add rate limiting and lockout |

## The fix

In PHP with PDO, the safe version keeps data and query separate, so input can never change the query's meaning:

```php
$stmt = $pdo->prepare('SELECT id, password_hash FROM users WHERE username = :username');
$stmt->execute([':username' => $username]);
$user = $stmt->fetch();

if ($user && password_verify($password, $user['password_hash'])) {
    // signed in
}
```

Passwords are compared with `password_verify()` against a stored hash, never as plain text inside the query.

## Lessons learned

- Reading error messages carefully is often faster than trying clever inputs.
- The same flaw looks different from a defender's seat. A reviewer wants to know where input crosses a trust boundary, and this write-up is written for them.
- Writing the remediation first made the attack steps easier to explain.

> **Mapping to controls.** This finding supports secure development controls such as input validation and secure coding practice in frameworks like ISO 27001 (Annex A) and the NIST Cybersecurity Framework. Name the exact control references you rely on in your own version.
