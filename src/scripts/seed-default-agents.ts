import { getPool } from "@/lib/db/client";
import {
  AgentConfigRepository,
  AgentFactoryService,
} from "@/features/pipeline";
import { DEFAULT_TENANT_ID } from "@/config/constants";

const defaultTemplate = AgentFactoryService.getDefaultSystemPromptTemplate();

const DEFAULT_AGENT_CONFIGS = [
  {
    name: "prohibited",
    displayName: "Prohibited Items",
    systemPromptTemplate: defaultTemplate,
    policySourceFiles: ["prohibited_items.md"],
  },
  {
    name: "restricted-categories",
    displayName: "Restricted Categories",
    systemPromptTemplate: defaultTemplate,
    policySourceFiles: ["restricted_categories.md"],
  },
  {
    name: "quality-standards",
    displayName: "Quality Standards",
    systemPromptTemplate: defaultTemplate,
    policySourceFiles: ["quality_standards.md"],
  },
  {
    name: "counterfeit",
    displayName: "Counterfeit Items",
    systemPromptTemplate: defaultTemplate,
    policySourceFiles: ["counterfeit_items.md"],
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
      const code =
        err != null && typeof err === "object" && "code" in err
          ? (err as { code: unknown }).code
          : undefined;
      const isDuplicate =
        code === "23505" ||
        (code === undefined &&
          err instanceof Error &&
          (err.message.includes("duplicate key") ||
            err.message.includes("unique constraint")));
      if (isDuplicate) {
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
