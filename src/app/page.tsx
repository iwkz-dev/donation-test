import { fetchDonationPackages } from "@/lib/api";
import { Hero, heroPropsFromData } from "@/components/Hero";
import { DonationList } from "@/components/DonationList";
import { CheckoutDrawer } from "@/components/CheckoutDrawer";

export default async function Home() {
  let data;
  try {
    const res = await fetchDonationPackages();
    data = res.data;
  } catch (error) {
    console.error("Failed to fetch donation packages:", error);
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="mx-auto max-w-md px-6 text-center">
          <div className="mb-4 text-5xl">😔</div>
          <h1 className="text-xl font-bold text-gray-800">
            Oops, something went wrong
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            We couldn&apos;t load the donation packages. Please try again later.
          </p>
        </div>
      </main>
    );
  }

  const heroProps = heroPropsFromData(data);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-7xl">
        <Hero {...heroProps} />
        <div className="px-4 pb-12 pt-6 sm:px-6 lg:px-8">
          <DonationList packages={data.donationPackages} />
        </div>
        <CheckoutDrawer />

        {/* Footer */}
        <footer className="px-6 pb-8 pt-4 text-center">
          <p className="text-sm font-medium text-slate-400">
            © {new Date().getFullYear()} IWKZ · Made with ❤️
          </p>
        </footer>
      </div>
    </main>
  );
}
