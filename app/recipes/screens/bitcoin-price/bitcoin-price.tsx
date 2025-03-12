import { PreSatori } from "@/utils/pre-satori";

interface BitcoinPriceProps {
	price?: string;
	change24h?: string;
	marketCap?: string;
	volume24h?: string;
	lastUpdated?: string;
	high24h?: string;
	low24h?: string;
}

export default function BitcoinPrice({
	price = "Loading...",
	change24h = "0",
	marketCap = "Loading...",
	volume24h = "Loading...",
	lastUpdated = "Loading...",
	high24h = "Loading...",
	low24h = "Loading...",
}: BitcoinPriceProps) {
	// Calculate if price change is positive or negative
	const isPositive = !change24h.startsWith("-");
	const changeValue = isPositive ? change24h : change24h.substring(1);

	// Pre-generated array for Bitcoin price statistics
	const priceStats = [
		{ label: "Market Cap", value: marketCap },
		{ label: "24h Volume", value: volume24h },
		{ label: "24h High", value: high24h },
		{ label: "24h Low", value: low24h },
	];

	return (
		<PreSatori>
			{(transform) => (
				<>
					{transform(
						<div className="flex flex-col w-[800px] h-[480px] bg-white p-0">
							<div className="flex-none p-4 border-b border-black">
								<h1 className="text-[42px] text-black truncate">
									Bitcoin Price Tracker
								</h1>
							</div>
							<div className="flex-1 overflow-hidden p-4 flex flex-col">
								<div className="flex items-center">
									<div className="flex-1">
										<h2 className="text-9xl text-black">${price}</h2>
									</div>
									<div className="w-[120px] h-[120px]">
										<picture>
											<source
												srcSet="https://cryptologos.cc/logos/bitcoin-btc-logo.png"
												type="image/png"
											/>
											<img
												src="https://cryptologos.cc/logos/bitcoin-btc-logo.png"
												alt="Bitcoin Logo"
												width={120}
												height={120}
												style={{
													objectFit: "contain",
													width: "120px",
													height: "120px",
												}}
												className="grayscale-100 brightness-50 contrast-200"
											/>
										</picture>
									</div>
								</div>
                <div className="text-4xl text-black">{isPositive ? "∆" : "↓"} {changeValue}%</div>
							</div>
							<div className="flex-none p-4 flex flex-col">
								<div className="w-full flex flex-row mb-4 [&>div]:text-[48px]" style={{ gap: "16px" }}>
									{priceStats.map((stat, index) => (
										<div key={index} className="p-2 rounded-[8px] border border-black flex-grow flex flex-col">
											<div className="text-black text-[24px]">{stat.label}</div>
											<div className="text-black text-[24px]">${stat.value}</div>
										</div>
									))}
								</div>
								<div className="w-full flex justify-end text-[24px] text-black p-2 rounded-[8px] dither-100">
									{lastUpdated && <span>Last updated: {lastUpdated}</span>}
								</div>
							</div>
						</div>,
					)}
				</>
			)}
		</PreSatori>
	);
}
