import type {
    DonationPackageResponse,
    PaymentConfigResponse,
    PaypalCheckoutRequest,
    PaypalCheckoutResponse,
    PaypalCaptureRequest,
} from "@/types/api";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
const TOKEN = process.env.NEXT_PUBLIC_API_TOKEN ?? "";

function buildUrl(path: string): string {
    // Ensure base URL has protocol
    let base = BASE_URL;
    if (base && !base.startsWith("http")) {
        const protocol = base.startsWith("localhost") || base.startsWith("127.0.0.1") ? "http" : "https";
        base = `${protocol}://${base}`;
    }
    // Remove trailing slash from base
    base = base.replace(/\/+$/, "");
    // Remove leading slash from path to avoid double slash
    const cleanPath = path.replace(/^\/+/, "");
    return `${base}/${cleanPath}`;
}

function headers(): HeadersInit {
    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TOKEN}`,
    };
}

export async function fetchDonationPackages(): Promise<DonationPackageResponse> {
    const res = await fetch(buildUrl("donation-package"), {
        headers: headers(),
        next: { revalidate: 60 },
    });
    if (!res.ok) throw new Error("Failed to fetch donation packages");
    return res.json();
}

export async function fetchPaymentConfig(): Promise<PaymentConfigResponse> {
    const res = await fetch(buildUrl("payment-config"), {
        headers: headers(),
    });
    if (!res.ok) throw new Error("Failed to fetch payment config");
    return res.json();
}

export async function createPaypalCheckout(
    payload: PaypalCheckoutRequest
): Promise<PaypalCheckoutResponse> {
    const res = await fetch(buildUrl("donation-package/paypal"), {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to create PayPal checkout");
    return res.json();
}

export async function capturePaypalPayment(
    payload: PaypalCaptureRequest
): Promise<Response> {
    const res = await fetch(buildUrl("donation-package/paypal/capture"), {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(payload),
    });
    return res;
}
