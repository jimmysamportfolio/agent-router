import { vi, type Mock } from "vitest";

vi.mock("@/lib/db/pool", () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
}));

import { query, queryOne } from "@/lib/db/pool";
import {
  getActiveAgentConfigsByTenant,
  getAgentConfigById,
  insertAgentConfig,
  updateAgentConfig,
  deactivateAgentConfig,
} from "@/lib/db/queries/agent-configs";

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

describe("agent-configs queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getActiveAgentConfigsByTenant", () => {
    it("returns active configs for tenant", async () => {
      mockQuery.mockResolvedValue([SAMPLE_ROW]);
      const result = await getActiveAgentConfigsByTenant("tenant-1");
      expect(result).toEqual([SAMPLE_ROW]);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("is_active = true"),
        ["tenant-1"],
      );
    });

    it("returns empty array when no configs", async () => {
      mockQuery.mockResolvedValue([]);
      const result = await getActiveAgentConfigsByTenant("tenant-1");
      expect(result).toEqual([]);
    });
  });

  describe("getAgentConfigById", () => {
    it("returns config by id", async () => {
      mockQueryOne.mockResolvedValue(SAMPLE_ROW);
      const result = await getAgentConfigById("config-1");
      expect(result).toEqual(SAMPLE_ROW);
    });

    it("returns undefined when not found", async () => {
      mockQueryOne.mockResolvedValue(undefined);
      const result = await getAgentConfigById("nonexistent");
      expect(result).toBeUndefined();
    });
  });

  describe("insertAgentConfig", () => {
    it("inserts and returns new config", async () => {
      mockQueryOne.mockResolvedValue(SAMPLE_ROW);
      const result = await insertAgentConfig("tenant-1", {
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
        insertAgentConfig("tenant-1", {
          name: "test",
          displayName: "Test",
          systemPromptTemplate: "prompt",
          policySourceFiles: [],
          options: {},
        }),
      ).rejects.toThrow("Failed to insert agent config");
    });
  });

  describe("updateAgentConfig", () => {
    it("builds SET clause for single field", async () => {
      mockQueryOne.mockResolvedValue(SAMPLE_ROW);
      await updateAgentConfig("config-1", { displayName: "New Name" });
      const sql = mockQueryOne.mock.calls[0]![0] as string;
      expect(sql).toContain("display_name = $1");
      expect(sql).toContain("updated_at = NOW()");
    });

    it("builds SET clause for multiple fields", async () => {
      mockQueryOne.mockResolvedValue(SAMPLE_ROW);
      await updateAgentConfig("config-1", {
        displayName: "New Name",
        isActive: false,
      });
      const sql = mockQueryOne.mock.calls[0]![0] as string;
      expect(sql).toContain("display_name = $1");
      expect(sql).toContain("is_active = $2");
    });

    it("throws when no fields to update", async () => {
      await expect(updateAgentConfig("config-1", {})).rejects.toThrow(
        "No fields to update",
      );
    });

    it("throws DatabaseError when config not found", async () => {
      mockQueryOne.mockResolvedValue(undefined);
      await expect(
        updateAgentConfig("nonexistent", { displayName: "x" }),
      ).rejects.toThrow("Failed to update agent config");
    });
  });

  describe("deactivateAgentConfig", () => {
    it("sets is_active to false", async () => {
      mockQueryOne.mockResolvedValue({ ...SAMPLE_ROW, is_active: false });
      const result = await deactivateAgentConfig("config-1");
      expect(result.is_active).toBe(false);
    });

    it("throws DatabaseError when not found", async () => {
      mockQueryOne.mockResolvedValue(undefined);
      await expect(deactivateAgentConfig("nonexistent")).rejects.toThrow(
        "Failed to deactivate agent config",
      );
    });
  });
});
