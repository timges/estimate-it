import styles from "./SeoContent.module.css";

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is planning poker?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Planning poker is a consensus-based estimation technique used by agile teams. Each team member selects a card representing their estimate, and all cards are revealed simultaneously to avoid anchoring bias.",
      },
    },
    {
      "@type": "Question",
      name: "Why use Fibonacci numbers?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The Fibonacci sequence (1, 2, 3, 5, 8, 13, 21) reflects the increasing uncertainty of larger tasks. The gaps between numbers force teams to make deliberate choices rather than debating minor differences.",
      },
    },
    {
      "@type": "Question",
      name: "Is estimate-it free?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, completely free. No sign-up, no limits, no hidden costs. Create as many rooms and run as many sessions as you need.",
      },
    },
  ],
};

export default function SeoContent() {
  return (
    <section className={styles.section}>
      <div className={styles.divider} />

      <h2 className={styles.sectionTitle}>How It Works</h2>
      <div className={styles.steps}>
        <div className={styles.step}>
          <div className={styles.stepNum}>1</div>
          <h3 className={styles.stepTitle}>Create a Room</h3>
          <p className={styles.stepDesc}>
            Pick a name and share the room code with your team. No sign-up, no
            accounts.
          </p>
        </div>
        <div className={styles.step}>
          <div className={styles.stepNum}>2</div>
          <h3 className={styles.stepTitle}>Vote Together</h3>
          <p className={styles.stepDesc}>
            Each person selects a Fibonacci card. Votes stay hidden until
            everyone is ready.
          </p>
        </div>
        <div className={styles.step}>
          <div className={styles.stepNum}>3</div>
          <h3 className={styles.stepTitle}>Reveal &amp; Discuss</h3>
          <p className={styles.stepDesc}>
            Reveal all estimates at once. No anchoring bias — just honest
            discussion.
          </p>
        </div>
      </div>

      <h2 className={styles.sectionTitle}>Why estimate-it</h2>
      <div className={styles.benefits}>
        <div className={styles.benefit}>
          <div className={styles.benefitIcon}>&#9670;</div>
          <h3 className={styles.benefitTitle}>Bias-Free by Design</h3>
          <p className={styles.benefitDesc}>
            Votes are hidden until reveal. No one anchors on the first number
            shown.
          </p>
        </div>
        <div className={styles.benefit}>
          <div className={styles.benefitIcon}>&rarr;</div>
          <h3 className={styles.benefitTitle}>Zero Friction</h3>
          <p className={styles.benefitDesc}>
            No accounts, no installs, no setup. Create a room and start
            estimating in seconds.
          </p>
        </div>
        <div className={styles.benefit}>
          <div className={styles.benefitIcon}>&#9673;</div>
          <h3 className={styles.benefitTitle}>Real-Time Sync</h3>
          <p className={styles.benefitDesc}>
            Everyone sees updates instantly. Built on WebSockets for seamless
            collaboration.
          </p>
        </div>
      </div>

      <h2 className={styles.sectionTitle}>FAQ</h2>
      <div className={styles.faq}>
        <div className={styles.faqItem}>
          <h3 className={styles.faqQuestion}>What is planning poker?</h3>
          <p className={styles.faqAnswer}>
            Planning poker is a consensus-based estimation technique used by
            agile teams. Each team member selects a card representing their
            estimate, and all cards are revealed simultaneously to avoid
            anchoring bias.
          </p>
        </div>
        <div className={styles.faqItem}>
          <h3 className={styles.faqQuestion}>Why use Fibonacci numbers?</h3>
          <p className={styles.faqAnswer}>
            The Fibonacci sequence (1, 2, 3, 5, 8, 13, 21) reflects the
            increasing uncertainty of larger tasks. The gaps between numbers
            force teams to make deliberate choices rather than debating minor
            differences.
          </p>
        </div>
        <div className={styles.faqItem}>
          <h3 className={styles.faqQuestion}>Is estimate-it free?</h3>
          <p className={styles.faqAnswer}>
            Yes, completely free. No sign-up, no limits, no hidden costs. Create
            as many rooms and run as many sessions as you need.
          </p>
        </div>
      </div>

      <nav className={styles.footerLinks}>
        <a href="/what-is-planning-poker" className={styles.footerLink}>
          What is Planning Poker
        </a>
        <a href="/sprint-planning-guide" className={styles.footerLink}>
          Sprint Planning Guide
        </a>
      </nav>

      <script type="application/ld+json">
        {JSON.stringify(faqSchema)}
      </script>
    </section>
  );
}
