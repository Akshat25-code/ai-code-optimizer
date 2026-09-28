import React from 'react';
import LegalLayout, { H2, P, UL } from './LegalLayout';

export default function TermsPage() {
  return (
    <LegalLayout title="Terms & Conditions" updated="September 28, 2026">
      <P>
        By creating an account or using AI Code Optimizer ("the Service"), you agree to these
        terms. If you do not agree, do not use the Service.
      </P>
      <H2>1. The Service</H2>
      <P>
        We provide AI-assisted code analysis, optimization, sandboxed execution, and reporting.
        AI output and static analysis are advisory: always review results and test before
        production use. We do not guarantee correctness, security, or fitness for any purpose.
      </P>
      <H2>2. Accounts and acceptable use</H2>
      <UL
        items={[
          'You must be at least 13 years old and keep your credentials confidential.',
          'Free-tier daily analysis quotas apply; abuse may lead to rate limiting or suspension.',
          'Do not attempt to escape execution sandboxes, probe other users\u2019 data, scrape at abusive rates, or upload malware.',
          'You must have the rights to any code you submit and any repository you connect.',
        ]}
      />
      <H2>3. Your content and keys</H2>
      <P>
        You retain ownership of code you submit. You grant us a limited license to process it to
        operate the Service (including sending it to your selected AI provider). API keys you
        provide (BYOK) are yours to manage: quota spend and key secrecy are your responsibility.
        Do not paste secrets into code inputs; use the secret scanner.
      </P>
      <H2>4. Sandboxed execution</H2>
      <P>
        Executed code runs in isolated containers with CPU, memory, process, and network limits.
        Long-running or resource-abusive jobs are killed automatically. Execution features may be
        disabled without notice to protect the platform.
      </P>
      <H2>5. Availability and changes</H2>
      <P>
        The Service is provided "as is" without warranties. We may modify, suspend, or
        discontinue features with reasonable notice. We are not liable for indirect or
        consequential damages; our aggregate liability is limited to amounts you paid us, if any.
      </P>
      <H2>6. Termination</H2>
      <P>
        You may delete your account anytime. We may suspend accounts violating these terms.
        Sections 3–5 survive termination.
      </P>
      <H2>7. Contact</H2>
      <P>Questions about these terms: support@aicodeoptimizerpromax.com.</P>
    </LegalLayout>
  );
}
