import {
  logAuditEvent,
  logAuthEvent,
  log2FAEvent,
  logFileEvent,
  logRateLimitExceeded,
  getUserAuditLogs,
  getAuditLogsByAction,
} from "@/lib/auditLog";

// Mock dependencies
jest.mock("@/lib/prismaClient", () => ({
  prismaClient: {
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

jest.mock("@/lib/rateLimit", () => ({
  getClientIP: jest.fn().mockReturnValue("127.0.0.1"),
}));

import { prismaClient } from "@/lib/prismaClient";

describe("auditLog", () => {
  // Mock Request object
  function createMockRequest(headers: Record<string, string> = {}): Request {
    const mockHeaders = new Headers(headers);
    return {
      headers: mockHeaders,
    } as unknown as Request;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    (prismaClient.auditLog.create as jest.Mock).mockResolvedValue({
      id: "test-id",
    });
    (prismaClient.auditLog.findMany as jest.Mock).mockResolvedValue([]);
  });

  describe("logAuditEvent", () => {
    it("should log audit event successfully", async () => {
      const request = createMockRequest({ "user-agent": "test-agent" });
      const metadata = { test: "value" };

      await logAuditEvent("LOGIN_SUCCESS", true, request, "user-123", metadata);

      expect(prismaClient.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: "user-123",
          action: "LOGIN_SUCCESS",
          success: true,
          ipAddress: "127.0.0.1",
          userAgent: "test-agent",
          metadata: JSON.stringify(metadata),
        },
      });
    });

    it("should handle null userId", async () => {
      const request = createMockRequest();

      await logAuditEvent("RATE_LIMIT_EXCEEDED", false, request, null);

      expect(prismaClient.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: null,
          action: "RATE_LIMIT_EXCEEDED",
          success: false,
          ipAddress: "127.0.0.1",
          userAgent: null,
          metadata: null,
        },
      });
    });

    it("should handle missing user agent", async () => {
      const request = createMockRequest();

      await logAuditEvent("LOGIN_SUCCESS", true, request, "user-123");

      expect(prismaClient.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userAgent: null,
        }),
      });
    });

    it("should not throw on database error", async () => {
      const request = createMockRequest();
      (prismaClient.auditLog.create as jest.Mock).mockRejectedValue(
        new Error("DB error"),
      );

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      await expect(
        logAuditEvent("LOGIN_SUCCESS", true, request, "user-123"),
      ).resolves.not.toThrow();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe("logAuthEvent", () => {
    it("should log login success", async () => {
      const request = createMockRequest();

      await logAuthEvent("LOGIN_SUCCESS", true, request, "user-123");

      expect(prismaClient.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: "LOGIN_SUCCESS",
          success: true,
          userId: "user-123",
        }),
      });
    });

    it("should log login failure", async () => {
      const request = createMockRequest();

      await logAuthEvent("LOGIN_FAILED", false, request, null, {
        error: "Invalid credentials",
      });

      expect(prismaClient.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: "LOGIN_FAILED",
          success: false,
          userId: null,
          metadata: expect.stringContaining("Invalid credentials"),
        }),
      });
    });
  });

  describe("log2FAEvent", () => {
    it("should log 2FA setup", async () => {
      const request = createMockRequest();

      await log2FAEvent("TWO_FACTOR_SETUP", true, request, "user-123");

      expect(prismaClient.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: "TWO_FACTOR_SETUP",
          success: true,
        }),
      });
    });

    it("should log 2FA verification success", async () => {
      const request = createMockRequest();

      await log2FAEvent("TWO_FACTOR_VERIFY_SUCCESS", true, request, "user-123");

      expect(prismaClient.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: "TWO_FACTOR_VERIFY_SUCCESS",
          success: true,
        }),
      });
    });

    it("should log backup code usage", async () => {
      const request = createMockRequest();

      await log2FAEvent("BACKUP_CODE_USED", true, request, "user-123");

      expect(prismaClient.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: "BACKUP_CODE_USED",
          success: true,
        }),
      });
    });
  });

  describe("logFileEvent", () => {
    it("should log file upload", async () => {
      const request = createMockRequest();

      await logFileEvent(
        "FILE_UPLOADED",
        true,
        request,
        "user-123",
        "file-456",
        { fileName: "test.pdf", size: 1024 },
      );

      expect(prismaClient.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: "FILE_UPLOADED",
          success: true,
          userId: "user-123",
          metadata: expect.stringContaining("file-456"),
        }),
      });
    });

    it("should log file download", async () => {
      const request = createMockRequest();

      await logFileEvent(
        "FILE_DOWNLOADED",
        true,
        request,
        "user-123",
        "file-456",
      );

      expect(prismaClient.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: "FILE_DOWNLOADED",
          success: true,
        }),
      });
    });

    it("should log file deletion", async () => {
      const request = createMockRequest();

      await logFileEvent("FILE_DELETED", true, request, "user-123", "file-456");

      expect(prismaClient.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: "FILE_DELETED",
          success: true,
        }),
      });
    });
  });

  describe("logRateLimitExceeded", () => {
    it("should log rate limit exceeded event", async () => {
      const request = createMockRequest();

      await logRateLimitExceeded(request, "/api/files/upload", "192.168.1.1");

      expect(prismaClient.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: "RATE_LIMIT_EXCEEDED",
          success: false,
          userId: null,
          metadata: expect.stringContaining("/api/files/upload"),
        }),
      });
    });
  });

  describe("getUserAuditLogs", () => {
    it("should get audit logs for user", async () => {
      const mockLogs = [
        { id: "1", action: "LOGIN_SUCCESS", userId: "user-123" },
        { id: "2", action: "FILE_UPLOADED", userId: "user-123" },
      ];
      (prismaClient.auditLog.findMany as jest.Mock).mockResolvedValue(mockLogs);

      const logs = await getUserAuditLogs("user-123", 10, 0);

      expect(prismaClient.auditLog.findMany).toHaveBeenCalledWith({
        where: { userId: "user-123" },
        orderBy: { createdAt: "desc" },
        take: 10,
        skip: 0,
      });
      expect(logs).toEqual(mockLogs);
    });

    it("should use default limit and offset", async () => {
      await getUserAuditLogs("user-123");

      expect(prismaClient.auditLog.findMany).toHaveBeenCalledWith({
        where: { userId: "user-123" },
        orderBy: { createdAt: "desc" },
        take: 100,
        skip: 0,
      });
    });
  });

  describe("getAuditLogsByAction", () => {
    it("should get audit logs by action", async () => {
      const mockLogs = [
        { id: "1", action: "LOGIN_SUCCESS" },
        { id: "2", action: "LOGIN_SUCCESS" },
      ];
      (prismaClient.auditLog.findMany as jest.Mock).mockResolvedValue(mockLogs);

      const logs = await getAuditLogsByAction("LOGIN_SUCCESS", 20, 10);

      expect(prismaClient.auditLog.findMany).toHaveBeenCalledWith({
        where: { action: "LOGIN_SUCCESS" },
        orderBy: { createdAt: "desc" },
        take: 20,
        skip: 10,
      });
      expect(logs).toEqual(mockLogs);
    });
  });
});
