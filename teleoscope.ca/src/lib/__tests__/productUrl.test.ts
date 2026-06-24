import { getProductBaseUrl, productRoute } from "@/lib/productUrl";

describe("productRoute", () => {
  const originalBaseUrl = process.env.NEXT_PUBLIC_PRODUCT_BASE_URL;

  afterEach(() => {
    if (originalBaseUrl === undefined) {
      delete process.env.NEXT_PUBLIC_PRODUCT_BASE_URL;
      return;
    }
    process.env.NEXT_PUBLIC_PRODUCT_BASE_URL = originalBaseUrl;
  });

  it("returns a relative path when no product host override is set", () => {
    delete process.env.NEXT_PUBLIC_PRODUCT_BASE_URL;

    expect(getProductBaseUrl()).toBe("");
    expect(productRoute("/demo")).toBe("/demo");
    expect(productRoute("auth/signup")).toBe("/auth/signup");
  });

  it("prefixes paths with the configured product host", () => {
    process.env.NEXT_PUBLIC_PRODUCT_BASE_URL = "https://app.teleoscope.ca/";

    expect(getProductBaseUrl()).toBe("https://app.teleoscope.ca");
    expect(productRoute("/demo")).toBe("https://app.teleoscope.ca/demo");
    expect(productRoute("auth/signin")).toBe(
      "https://app.teleoscope.ca/auth/signin"
    );
  });
});
