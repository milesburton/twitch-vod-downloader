import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { fetchVideoIDs } from "./scraper";

describe("fetchVideoIDs", () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test("fetches video IDs successfully", async () => {
    const mockVideoIDs = ["12345678", "87654321", "11223344"];

    global.fetch = async (url: string | URL | Request, init?: RequestInit) => {
      expect(url).toBe("https://gql.twitch.tv/gql");
      expect(init?.method).toBe("POST");

      return new Response(
        JSON.stringify({
          data: {
            user: {
              videos: {
                edges: mockVideoIDs.map((id) => ({ node: { id } })),
              },
            },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    };

    const result = await fetchVideoIDs("testchannel");
    expect(result).toEqual(mockVideoIDs);
  });

  test("returns empty array when user not found", async () => {
    global.fetch = async () => {
      return new Response(
        JSON.stringify({
          data: {
            user: null,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    };

    const result = await fetchVideoIDs("nonexistent");
    expect(result).toEqual([]);
  });

  test("returns empty array when no videos exist", async () => {
    global.fetch = async () => {
      return new Response(
        JSON.stringify({
          data: {
            user: {
              videos: {
                edges: [],
              },
            },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    };

    const result = await fetchVideoIDs("emptychannel");
    expect(result).toEqual([]);
  });

  test("returns empty array when videos field is null", async () => {
    global.fetch = async () => {
      return new Response(
        JSON.stringify({
          data: {
            user: {
              videos: null,
            },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    };

    const result = await fetchVideoIDs("channelwithnovideos");
    expect(result).toEqual([]);
  });

  test("returns empty array when edges field is null", async () => {
    global.fetch = async () => {
      return new Response(
        JSON.stringify({
          data: {
            user: {
              videos: {
                edges: null,
              },
            },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    };

    const result = await fetchVideoIDs("channelwithnulledges");
    expect(result).toEqual([]);
  });

  test("returns empty array when data field is missing", async () => {
    global.fetch = async () => {
      return new Response(
        JSON.stringify({}),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    };

    const result = await fetchVideoIDs("channel");
    expect(result).toEqual([]);
  });

  test("sends correct GraphQL query", async () => {
    let capturedBody: string | undefined;

    global.fetch = async (url: string | URL | Request, init?: RequestInit) => {
      capturedBody = init?.body as string;
      return new Response(
        JSON.stringify({ data: { user: { videos: { edges: [] } } } }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    };

    await fetchVideoIDs("testchannel");

    expect(capturedBody).toBeDefined();
    const parsed = JSON.parse(capturedBody!);
    expect(parsed.query).toContain('user(login: "testchannel")');
    expect(parsed.query).toContain("videos");
    expect(parsed.query).toContain("id");
  });

  test("sends correct headers", async () => {
    let capturedHeaders: Headers | undefined;

    global.fetch = async (url: string | URL | Request, init?: RequestInit) => {
      capturedHeaders = new Headers(init?.headers);
      return new Response(
        JSON.stringify({ data: { user: { videos: { edges: [] } } } }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    };

    await fetchVideoIDs("testchannel");

    expect(capturedHeaders?.get("Client-Id")).toBe("kimne78kx3ncx6brgo4mv6wki5h1ko");
    expect(capturedHeaders?.get("Content-Type")).toBe("application/json");
  });
});
