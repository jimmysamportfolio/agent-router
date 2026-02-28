import { vi, type Mock } from "vitest";

vi.mock("@/lib/db/client", () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
}));

import { query, queryOne } from "@/lib/db/client";
import { AgentConfigRepository } from "@/features/pipeline/services/router";

const mockQuery = query as Mock;
const mockQueryOne = queryOne as Mock;

const SAMPLE_ROW = {
  id: "config-1",
  tenant_id: "tenant-1",
  name: "test-agent",
  display_name: "Test Agent",
  system_prompt_template: "You are a test agent.",
  policy_source_files: ["test.md"],
  options: {},
  is_active: true,
  created_at: new Date(),
  updated_at: new Date(),
};

describe("AgentConfigRepository", () => {
  let repo: AgentConfigRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new AgentConfigRepository();
  });

  describe("getActiveByTenant", () => {
    it("returns active configs for tenant", async () => {
      mockQuery.mockResolvedValue([SAMPLE_ROW]);
      const result = await repo.getActiveByTenant("tenant-1");
      expect(result).toEqual([SAMPLE_ROW]);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("is_active = true"),
        ["tenant-1"],
      );
    });

    it("returns empty array when no configs", async () => {
      mockQuery.mockResolvedValue([]);
      const result = await repo.getActiveByTenant("tenant-1");
      expect(result).toEqual([]);
    });
  });

  describe("getById", () => {
    it("returns config by id", async () => {
      mockQueryOne.mockResolvedValue(SAMPLE_ROW);
      const result = await repo.getById("config-1");
      expect(result).toEqual(SAMPLE_ROW);
    });

    it("returns undefined when not found", async () => {
      mockQueryOne.mockResolvedValue(undefined);
      const result = await repo.getById("nonexistent");
      expect(result).toBeUndefined();
    });
  });

  describe("insert", () => {
    it("inserts and returns new config", async () => {
      mockQueryOne.mockResolvedValue(SAMPLE_ROW);
      const result = await repo.insert("tenant-1", {
        name: "test-agent",
        displayName: "Test Agent",
        systemPromptTemplate: "You are a test agent.",
        policySourceFiles: ["test.md"],
        options: {},
      });
      expect(result).toEqual(SAMPLE_ROW);
    });

    it("throws DatabaseError on failure", async () => {
      mockQueryOne.mockResolvedValue(undefined);
      await expect(
        repo.insert("tenant-1", {
          name: "test",
          displayName: "Test",
          systemPromptTemplate: "prompt",
          policySourceFiles: [],
          options: {},
        }),
      ).rejects.toThrow("Failed to insert agent config");
    });
  });

  describe("update", () => {
    it("builds SET clause for single field", async () => {
      mockQueryOne.mockResolvedValue(SAMPLE_ROW);
      await repo.update("config-1", { displayName: "New Name" });
      const sql = mockQueryOne.mock.calls[0]![0] as string;
      expect(sql).toContain("display_name = $1");
      expect(sql).toContain("updated_at = NOW()");
    });

    it("builds SET clause for multiple fields", async () => {
      mockQueryOne.mockResolvedValue(SAMPLE_ROW);
      await repo.update("config-1", {
        displayName: "New Name",
        isActive: false,
      });
      const sql = mockQueryOne.mock.calls[0]![0] as string;
      expect(sql).toContain("display_name = $1");
      expect(sql).toContain("is_active = $2");
    });

    it("throws when no fields to update", async () => {
      await expect(repo.update("config-1", {})).rejects.toThrow(
        "No fields to update",
      );
    });

    it("throws DatabaseError when config not found", async () => {
      mockQueryOne.mockResolvedValue(undefined);
      await expect(
        repo.update("nonexistent", { displayName: "x" }),
      ).rejects.toThrow("Failed to update agent config");
    });
  });

  describe("deactivate", () => {
    it("sets is_active to false", async () => {
      mockQueryOne.mockResolvedValue({ ...SAMPLE_ROW, is_active: false });
      const result = await repo.deactivate("config-1");
      expect(result.is_active).toBe(false);
    });

    it("throws DatabaseError when not found", async () => {
      mockQueryOne.mockResolvedValue(undefined);
      await expect(repo.deactivate("nonexistent")).rejects.toThrow(
        "Failed to deactivate agent config",
      );
    });
  });
});
