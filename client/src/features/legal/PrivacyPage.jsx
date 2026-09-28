import React from 'react';
import LegalLayout, { H2, P, UL } from './LegalLayout';

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" updated="September 28, 2026">
      <P>
        AI Code Optimizer ("we") helps you analyze and optimize code. This policy explains what we
        collect, why, and the choices you have. Contact: support@aicodeoptimizerpromax.com.
      </P>
      <H2>1. Data we collect</H2>
      <UL
        items={[
          'Account data: name, email, password hash (never plaintext), optional phone number.',
          'Content you submit: code snippets, optimization sessions, projects, and reports.',
          'Usage data: daily analysis counts for quota enforcement, login history for security.',
          'Device data (only with consent): pages visited and feature usage via privacy-friendly analytics.',
        ]}
      />
      <H2>2. Code you paste and secrets</H2>
      <P>
        Pasted code may accidentally contain secrets. We scan submissions for 20+ secret patterns
        and redact true secrets before storing sessions and projects by default. OAuth tokens we
        store for integrations are encrypted at rest. Never paste secrets you cannot afford to
        share — use the built-in secret scanner first.
      </P>
      <H2>3. AI providers (BYOK)</H2>
      <P>
        Optimization uses third-party AI providers (OpenAI, Anthropic, Google, and others) with
        API keys you supply or configure. Submitted code is sent to the selected provider to
        produce results and is subject to that provider's privacy policy. We do not sell your data.
      </P>
      <H2>4. Cookies</H2>
      <UL
        items={[
          'Strictly necessary: httpOnly auth cookies (sign-in session), theme preference.',
          'Analytics cookies: only after you click Accept in the cookie banner; Decline disables them entirely.',
          'Your browser Do-Not-Track signal is honored and disables analytics regardless of consent.',
        ]}
      />
      <P>
        Change your choice anytime via "Cookie settings" in the site footer.
      </P>
      <H2>5. Retention and deletion</H2>
      <P>
        Sessions, projects, and reports are kept while your account is active. Delete them
        anytime from the app; deleting your account removes your personal data within 30 days,
        except where retention is required by law or for security logs.
      </P>
      <H2>6. Security</H2>
      <P>
        Transport is HTTPS-only in production, auth cookies are httpOnly + Secure + SameSite,
        and untrusted code runs in isolated Docker sandboxes. No system is impenetrable; report
        issues to support@aicodeoptimizerpromax.com.
      </P>
      <H2>7. Your rights</H2>
      <P>
        Depending on your jurisdiction (GDPR/CCPA), you may request access, correction, export,
        or deletion of your personal data. We respond within 30 days.
      </P>
    </LegalLayout>
  );
}
