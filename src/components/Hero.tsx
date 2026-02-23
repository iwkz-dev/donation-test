import type { DonationPackageData } from "@/types/api";

interface HeroProps {
    headline: string;
    subHeadline: string;
    backgroundImageUrl: string | null;
}

export function Hero({ headline, subHeadline, backgroundImageUrl }: HeroProps) {
    return (
        <section className="relative w-full overflow-hidden sm:rounded-3xl shadow-sm mt-4 lg:mt-6 group">
            <div className="relative min-h-[25vh] sm:min-h-[30vh] md:min-h-[35vh] flex flex-col items-center justify-center p-6 md:p-12 lg:p-16 overflow-hidden bg-slate-900 transition-all duration-700">
                {/* Background image & gradient overlay */}
                <div className="absolute inset-0 z-0">
                    {backgroundImageUrl ? (
                        <>
                            <img
                                src={backgroundImageUrl}
                                alt="Campaign Background"
                                className="h-full w-full object-cover opacity-60 mix-blend-overlay transition-transform duration-[15s] ease-linear group-hover:scale-105"
                            />
                            {/* Modern soft overlay */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-slate-900 via-teal-900/40 to-emerald-900/60 mix-blend-multiply" />
                            <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-slate-900 to-transparent" />
                        </>
                    ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-teal-500 via-emerald-400 to-teal-400" />
                    )}
                </div>

                {/* Content Container */}
                <div className="relative z-10 w-full max-w-4xl text-center space-y-6">
                    <div className="animate-slide-up bg-white/5 backdrop-blur-sm border border-white/10 rounded-[2rem] p-8 md:p-12 lg:p-16 shadow-2xl transition-all hover:bg-white/10">
                        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-white mb-6 drop-shadow-md">
                            {headline}
                        </h1>
                        <p className="text-lg sm:text-xl md:text-2xl font-medium text-emerald-50 max-w-2xl mx-auto leading-relaxed drop-shadow">
                            {subHeadline}
                        </p>
                    </div>
                </div>

                {/* Decorative floating elements for large screens */}
                <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-teal-400/20 blur-[80px] animate-pulse" />
                <div className="absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-emerald-400/20 blur-[100px] animate-pulse delay-1000" />
            </div>
        </section>
    );
}

export function heroPropsFromData(data: DonationPackageData): HeroProps {
    const heroImage = data.image?.url ?? null;
    return {
        headline: data.headline,
        subHeadline: data.subHeadline,
        backgroundImageUrl: heroImage,
    };
}
