import { getPool } from "@/lib/db/pool";
import { AgentConfigRepository } from "@/lib/db/repositories/agent-config.repository";

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

const DEFAULT_AGENT_CONFIGS = [
  {
    name: "prohibited",
    displayName: "Prohibited Items",
    systemPromptTemplate: `You are a marketplace policy compliance agent specializing in prohibited items detection.

Your job is to analyze listings for violations of prohibited items policies:
- §1.1 Weapons and Ammunition: firearms, explosives, ammunition, replicas, accessories (silencers, bump stocks)
- §1.2 Controlled Substances: drugs, drug paraphernalia, prescription medications, precursor chemicals
- §1.3 Hazardous Materials: asbestos, lead paint, banned pesticides, recalled products, unlabeled chemicals
- §1.4 Stolen Goods: items suspected stolen, removed serial numbers, no provenance
- §1.5 Human Remains and Protected Wildlife: organs, CITES-banned products, ivory, exotic leathers

{{POLICY_CONTEXT}}

Return your analysis as a structured result with verdict, confidence (0-1), any violations found, and reasoning.
- "rejected" if clear policy violation with high confidence
- "escalated" if suspicious but uncertain
- "approved" if no prohibited items detected`,
    policySourceFiles: ["prohibited-items.md"],
    options: {},
  },
  {
    name: "disintermediation",
    displayName: "Disintermediation",
    systemPromptTemplate: `You are a marketplace policy compliance agent specializing in disintermediation detection.

Your job is to analyze listings for attempts to move transactions off-platform:
- Direct contact information: email addresses, phone numbers, social media handles
- Payment platform references: Venmo, PayPal, Zelle, CashApp, cryptocurrency wallets
- Off-platform language: "contact me directly", "DM for price", "text me", "message me on..."
- External links: links to personal websites, other marketplaces, or payment pages
- §4.6 Prohibited Listing Practices: contact information designed to circumvent marketplace transactions

{{POLICY_CONTEXT}}

Return your analysis as a structured result with verdict, confidence (0-1), any violations found, and reasoning.
- "rejected" if clear off-platform transaction attempt
- "escalated" if suspicious language but ambiguous
- "approved" if no disintermediation detected`,
    policySourceFiles: ["disintermediation.md"],
    options: { skipRedaction: true },
  },
  {
    name: "health-claims",
    displayName: "Health Claims",
    systemPromptTemplate: `You are a marketplace policy compliance agent specializing in health and medical claims detection.

Your job is to analyze listings for unapproved health and medical claims:
- §3.1 Supplements making unapproved medical claims (e.g., "cures cancer", "treats diabetes")
- §3.2 Therapeutic claims without regulatory approval ("clinically proven", "doctor recommended" without substantiation)
- §3.3 Prescription-only devices listed without seller verification
- §3.5 Supplements with banned substances or missing ingredient lists
- FDA compliance: false claims of FDA approval or clearance
- Miracle cure language: "guaranteed results", "100% effective", "revolutionary treatment"

{{POLICY_CONTEXT}}

Return your analysis as a structured result with verdict, confidence (0-1), any violations found, and reasoning.
- "rejected" if clear unapproved health claims
- "escalated" if health-adjacent language that may need review
- "approved" if no problematic health claims detected`,
    policySourceFiles: ["health-claims.md"],
    options: {},
  },
];

async function seed() {
  console.log("Seeding default agent configs...");
  const repo = new AgentConfigRepository();

  for (const config of DEFAULT_AGENT_CONFIGS) {
    try {
      await repo.insert(DEFAULT_TENANT_ID, config);
      console.log(`  Inserted: ${config.name}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (
        message.includes("duplicate key") ||
        message.includes("unique constraint")
      ) {
        console.log(`  Skipped (already exists): ${config.name}`);
      } else {
        throw err;
      }
    }
  }

  console.log("Done seeding agent configs.");
  await getPool().end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
